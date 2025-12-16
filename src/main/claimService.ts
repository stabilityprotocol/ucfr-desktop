import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { BrowserWindow } from "electron";
import { getSettings } from "./settings";
import { tokenManager } from "./tokenStore";
import {
  fetchProject,
  createProjectClaim,
  TokenExpiredError,
} from "../shared/api/client";
import { fileHistoryService } from "./fileHistory";

// Simple mime type mapping
const mimeMap: Record<string, string> = {
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeMap[ext] || "application/octet-stream";
}

async function getFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return `0x${hashSum.digest("hex")}`;
}

async function getAuthorizedEmail(token: string): Promise<string | null> {
  // Verify token and get email.
  // We can use the existing method in client.ts if it exists, or verify via profile.
  // For now, let's assume we can get it from the profile endpoint.
  // But we need to know who "me" is.
  // The mockAuth implementation in ipc.ts uses `is-authorized`.
  // We should reuse that logic or expose it.
  // Since we don't have direct access to `getAuthorizedUserFromApi` from here easily without circular deps or prop drilling,
  // let's try to fetch the user's own profile using the token, or assume the token works.
  // Actually, for the `data` JSON, we need the email.
  // We can decode the JWT if it's a JWT, but it's opaque in this mocked setup?
  // Let's check ipc.ts again. `getAuthorizedUserFromApi` calls `auth/is-authorized`.

  // To avoid code duplication, we'll just call the endpoint directly here as well.
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
    console.log(`[ClaimService] Processing file: ${filePath} (${event})`);

    const settings = getSettings();
    const projectFolders = settings.projectFolders || {};

    // Find project ID for this file
    let projectId: string | null = null;
    for (const [pid, folders] of Object.entries(projectFolders)) {
      if (folders.some((folder) => filePath.startsWith(folder))) {
        projectId = pid;
        break;
      }
    }

    if (!projectId) {
      console.log("[ClaimService] No project found for file:", filePath);
      return;
    }

    const token = await tokenManager.getToken();
    if (!token) {
      console.log("[ClaimService] No token available, skipping claim.");
      return;
    }

    // 1. Get File Stats & Hash
    const stats = await fs.stat(filePath);
    const fingerprint = await getFileHash(filePath);
    const mimeType = getMimeType(filePath);
    const fileName = path.basename(filePath);

    // Get previous fingerprint from history
    const previousFingerprint = await fileHistoryService.getPreviousHash(
      filePath,
      fingerprint
    );

    // 2. Get Project & User Info
    // We fetch project to get name and organization
    let project;
    try {
      project = await fetchProject(projectId, token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log("[ClaimService] Token expired, skipping claim");
        await tokenManager.clear();
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("tokenChanged")
        );
        return;
      }
      throw error;
    }
    if (!project) {
      console.error(`[ClaimService] Could not fetch project ${projectId}`);
      return;
    }

    const userEmail = await getAuthorizedEmail(token);
    if (!userEmail) {
      console.error("[ClaimService] Could not identify user email");
      return;
    }

    // 3. Construct Data JSON
    // API expects certain top-level fields inside `data`
    const claimData = {
      // Required by server-side schema
      filename: fileName,
      userEmail,
      projectId,
      projectName: project.name,
      fingerprint,

      // Additional descriptive metadata
      version: "1.0",
      lang: "en",
      title: `UCFR Claim for ${fileName}`,
      description: `Submitted by ${userEmail}. Project ${project.name}. Claim covers ${fileName}`,
      keywords: [
        "UCFR",
        "claim",
        project.organization?.name || "Personal",
        project.name,
        mimeType,
        fileName,
      ],
      license: "https://ucfr.io/LICENSE.txt",
      canonicalUrl: "https://www.ucfr.io/",
      author: {
        email: userEmail,
        organizationId: project.organization?.id || projectId,
        projectId,
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
      ["filename", claimData.filename],
      ["userEmail", claimData.userEmail],
      ["projectId", claimData.projectId],
      ["projectName", claimData.projectName],
      ["fingerprint", claimData.fingerprint],
    ];
    const missing = requiredStrFields
      .filter(([_, v]) => typeof v !== "string" || (v as string).trim() === "")
      .map(([k]) => k);
    const fpValid = /^0x[0-9a-f]{64}$/.test(claimData.fingerprint as string);
    if (missing.length > 0 || !fpValid) {
      console.error(
        "[ClaimService] Validation failed; not submitting claim",
        JSON.stringify(
          {
            filePath,
            projectId,
            projectName: project.name,
            missingFields: missing,
            fingerprintValid: fpValid,
            fingerprintSample:
              typeof claimData.fingerprint === "string"
                ? (claimData.fingerprint as string).slice(0, 10)
                : null,
          },
          null,
          2
        )
      );
      return;
    }

    // 5. Submit Claim
    const payload = {
      methodId: 0,
      externalId: 1,
      fingerprint,
      data: JSON.stringify(claimData),
    };

    console.log(
      `[ClaimService] Submitting claim for ${fileName} in project ${project.name}`
    );
    let result;
    try {
      result = await createProjectClaim(projectId, token, payload);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log("[ClaimService] Token expired, skipping claim");
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
        `[ClaimService] Claim submitted successfully: ${result.id} (project: ${project.name}, file: ${fileName})`
      );
    } else {
      console.error(
        "[ClaimService] Failed to submit claim",
        JSON.stringify(
          { projectId, projectName: project.name, fileName },
          null,
          2
        )
      );
    }
  } catch (err) {
    console.error("[ClaimService] Error handling file change:", err);
  }
}
