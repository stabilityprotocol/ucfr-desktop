import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { BrowserWindow } from "electron";
import { getSettings } from "./settings";
import { tokenManager } from "./tokenStore";
import {
  fetchMark,
  createMarkClaim,
  createImageMarkClaim,
  TokenExpiredError,
} from "../shared/api/client";
import { fileHistoryService } from "./fileHistory";
import { processImageForArtifact } from "./imageTransformService";

/**
 * Lazily loaded mime module
 * Using lazy initialization to handle potential import issues in development
 */
let mime: any;

/**
 * Get MIME type for a file path
 * @param filePath - Path to the file
 * @returns MIME type string or fallback to application/octet-stream
 */
async function getMimeType(filePath: string): Promise<string> {
  if (!mime) {
    try {
      // Use require for mime v3 (CommonJS) - works in both dev and production
      mime = require("mime");
    } catch (error) {
      console.error("[ArtifactService] Failed to load mime module:", error);
      return "application/octet-stream";
    }
  }
  return mime.getType(filePath) || "application/octet-stream";
}

/**
 * Check if a MIME type represents an image
 * @param mimeType - MIME type string to check
 * @returns true if the MIME type starts with "image/"
 */
async function isImageMimeType(mimeType: string): Promise<boolean> {
  return mimeType.startsWith("image/");
}

async function getFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return `0x${hashSum.digest("hex")}`;
}

async function getAuthorizedEmail(token: string): Promise<string | null> {
  // Verify token and get email.
  try {
    const response = await fetch(
      "https://auth.stabilityprotocol.com/v1/auth/is-authorized",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      ok: boolean;
      value?: { email: string };
    };
    return data.ok ? data.value?.email ?? null : null;
  } catch (e) {
    console.error("Error getting authorized user:", e);
    return null;
  }
}

export async function handleFileChange(filePath: string, event: string) {
  if (event !== "change" && event !== "add") return;

  try {
    console.log(`[ArtifactService] Processing file: ${filePath} (${event})`);

    const settings = getSettings();
    const markFolders = settings.projectFolders || {};

    // Find mark ID for this file
    let markId: string | null = null;
    for (const [pid, folders] of Object.entries(markFolders)) {
      if (folders.some((folder) => filePath.startsWith(folder))) {
        markId = pid;
        break;
      }
    }

    if (!markId) {
      console.log("[ArtifactService] No mark found for file:", filePath);
      return;
    }

    const token = await tokenManager.getToken();
    if (!token) {
      console.log("[ArtifactService] No token available, skipping artifact.");
      return;
    }

    // 1. Get File Stats & Hash
    const stats = await fs.stat(filePath);
    const fingerprint = await getFileHash(filePath);
    const mimeType = await getMimeType(filePath);
    const fileName = path.basename(filePath);

    // Get previous fingerprint from history
    const previousFingerprint = await fileHistoryService.getPreviousHash(
      filePath,
      fingerprint
    );

    // 2. Get Mark & User Info
    // We fetch the mark to get name and organization
    let mark;
    try {
      mark = await fetchMark(markId, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log("[ArtifactService] Token expired, skipping artifact");
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged")
        );
        return;
      }
      throw error;
    }
    if (!mark) {
      console.error(`[ArtifactService] Could not fetch mark ${markId}`);
      return;
    }

    const userEmail = await getAuthorizedEmail(token);
    if (!userEmail) {
      console.error("[ArtifactService] Could not identify user email");
      return;
    }

    // 3. Construct Data JSON
    // API expects certain top-level fields inside `data`
    const artifactData = {
      // Required by server-side schema
      filename: fileName,
      userEmail,
      markId,
      markName: mark.name,
      fingerprint,

      // Additional descriptive metadata
      version: "1.0",
      lang: "en",
      title: `UCFR Artifact for ${fileName}`,
      description: `Submitted by ${userEmail}. Mark ${mark.name}. Artifact covers ${fileName}`,
      keywords: [
        "UCFR",
        "artifact",
        mark.organization?.name || "Personal",
        mark.name,
        mimeType,
        fileName,
      ],
      license: "https://ucfr.io/LICENSE.txt",
      canonicalUrl: "https://www.ucfr.io/",
      author: {
        email: userEmail,
        organizationId: mark.organization?.id || markId,
        projectId: markId,
      },
      subject: {
        name: fileName,
        mediaType: mimeType,
        size: stats.size,
        fingerprint,
        lastModified: Math.floor(stats.mtimeMs),
        ...(previousFingerprint ? { previousFingerprint } : {}),
      },
    };

    // 4. Defensive validation prior to submit
    const requiredStrFields: Array<[string, unknown]> = [
      ["filename", artifactData.filename],
      ["userEmail", artifactData.userEmail],
      ["markId", artifactData.markId],
      ["markName", artifactData.markName],
      ["fingerprint", artifactData.fingerprint],
    ];
    const missing = requiredStrFields
      .filter(([_, v]) => typeof v !== "string" || (v as string).trim() === "")
      .map(([k]) => k);
    const fpValid = /^0x[0-9a-f]{64}$/.test(artifactData.fingerprint as string);
    if (missing.length > 0 || !fpValid) {
      console.error(
        "[ArtifactService] Validation failed; not submitting artifact",
        JSON.stringify(
          {
            filePath,
            markId,
            markName: mark.name,
            missingFields: missing,
            fingerprintValid: fpValid,
            fingerprintSample:
              typeof artifactData.fingerprint === "string"
                ? (artifactData.fingerprint as string).slice(0, 10)
                : null,
          },
          null,
          2
        )
      );
      return;
    }

    // 5. Submit Artifact
    const payload = {
      methodId: 0,
      externalId: 1,
      fingerprint,
      data: JSON.stringify(artifactData),
    };

    console.log(
      `[ArtifactService] Submitting artifact for ${fileName} in mark ${mark.name}`
    );

    const isImage = await isImageMimeType(mimeType);
    let result;

    try {
      if (isImage) {
        // Use image upload endpoint for image files
        const originalBuffer = await fs.readFile(filePath);

        // Process image (transform if needed, maintaining original for fingerprint)
        const processed = await processImageForArtifact(originalBuffer, mimeType);

        result = await createImageMarkClaim(
          markId,
          token,
          payload,
          filePath,
          processed.buffer,
          processed.mimeType
        );

        if (processed.transformed) {
          console.log(
            `[ArtifactService] Submitted transformed image for ${fileName}`
          );
        }
      } else {
        // Use regular JSON endpoint for non-image files
        result = await createMarkClaim(markId, token, payload);
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log("[ArtifactService] Token expired, skipping artifact");
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged")
        );
        return;
      }
      throw error;
    }

    if (result) {
      console.log(
        `[ArtifactService] ${isImage ? "Image" : ""} artifact submitted successfully: ${result.id} (mark: ${mark.name}, file: ${fileName})`
      );
    } else {
      console.error(
        "[ArtifactService] Failed to submit artifact",
        JSON.stringify(
          { markId, markName: mark.name, fileName, isImage },
          null,
          2
        )
      );
    }
  } catch (err) {
    console.error("[ArtifactService] Error handling file change:", err);
  }
}
