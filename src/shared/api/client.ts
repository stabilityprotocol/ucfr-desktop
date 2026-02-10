import { UserProfile, Project, CreateProjectClaimDto } from "./types";

const BASE_URL = "https://api.ucfr.io";

export class TokenExpiredError extends Error {
  constructor() {
    super("Token has expired");
    this.name = "TokenExpiredError";
  }
}

async function fetchWithAuth(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new TokenExpiredError();
  }

  return response;
}

export async function fetchUserProfile(
  email: string,
  token: string
): Promise<UserProfile | null> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/users/${encodeURIComponent(email)}/profile`,
      token,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch user profile: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function fetchUserMarks(
  email: string,
  token: string
): Promise<Project[]> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/users/${encodeURIComponent(email)}/projects`,
      token,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch user marks: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching user marks:", error);
    return [];
  }
}

export async function fetchOrganizationMarks(
  orgId: string,
  token: string
): Promise<Project[]> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/projects/organization/${orgId}`,
      token,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch organization marks: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching organization marks:", error);
    return [];
  }
}

export async function fetchMark(
  markId: string,
  token: string
): Promise<Project | null> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/projects/${markId}`,
      token,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch mark: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching mark:", error);
    return null;
  }
}

export async function createMarkClaim(
  markId: string,
  token: string,
  payload: CreateProjectClaimDto
): Promise<any | null> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/projects/${markId}/claims`,
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `Failed to create artifact: ${response.status} ${response.statusText}`,
        errText
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error creating mark artifact:", error);
    return null;
  }
}

/**
 * Create an image mark artifact with file upload
 * @param markId - ID of the mark
 * @param token - Authentication token
 * @param payload - Artifact data payload
 * @param filePath - Path to the image file
 * @param fileBuffer - Buffer containing the file data
 * @returns Created artifact object or null on failure
 */
export async function createImageMarkClaim(
  markId: string,
  token: string,
  payload: CreateProjectClaimDto,
  filePath: string,
  fileBuffer: Buffer,
  mimeTypeOverride?: string
): Promise<any | null> {
  try {
    const formData = new FormData();
    
    // Add individual artifact fields as per OpenAPI spec (CreateProjectClaimDto)
    // Required fields: methodId, externalId, fingerprint, data
    formData.append("methodId", payload.methodId.toString());
    formData.append("externalId", payload.externalId.toString());
    formData.append("fingerprint", payload.fingerprint);
    formData.append("data", payload.data);
    
    // Optional fields
    if (payload.signature) {
      formData.append("signature", payload.signature);
    }
    if (payload.pubKey) {
      formData.append("pubKey", payload.pubKey);
    }
    
    // Add the image file (CreateImageProjectClaimDto requires field name "image")
    // Use require for mime v3 (CommonJS) - works in both dev and production
    const mime = require("mime");
    const mimeType = mimeTypeOverride || mime.getType(filePath) || "application/octet-stream";
    const fileName = require("path").basename(filePath);
    const uint8Array = new Uint8Array(fileBuffer);
    const fileBlob = new Blob([uint8Array], { type: mimeType });
    formData.append("image", fileBlob, fileName);

    const response = await fetch(
      `${BASE_URL}/api/projects/${markId}/claims/image`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (response.status === 401) {
      throw new TokenExpiredError();
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `Failed to create image artifact: ${response.status} ${response.statusText}`,
        errText
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error creating image mark artifact:", error);
    return null;
  }
}
