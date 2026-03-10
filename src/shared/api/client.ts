/**
 * UCFR API Client
 *
 * HTTP client for communicating with the UCFR backend API.
 * All authenticated requests use Bearer token authorization.
 * The primary identity endpoint is GET /api/users/me which returns the
 * authenticated user's full profile in a single call.
 */

import {
  UserProfile,
  Project,
  ProjectWithClaimsCount,
  CreateProjectClaimDto,
} from "./types";

const BASE_URL = "https://api.ucfr.io";

/**
 * Custom error thrown when the API returns HTTP 401 (token expired/invalid).
 * Callers should handle this to trigger re-authentication flows.
 */
export class TokenExpiredError extends Error {
  constructor() {
    super("Token has expired");
    this.name = "TokenExpiredError";
  }
}

/**
 * Wraps fetch with Bearer token authorization header and 401 detection.
 * Automatically sets Content-Type to application/json.
 */
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

// =============================================================================
// User Identity & Profile
// =============================================================================

/**
 * Fetches the authenticated user's own profile via GET /api/users/me.
 * This is the primary identity endpoint — it returns the full profile including
 * id, email, username, organizations, projects, and recent claims in one call.
 * If the user has no profile, one is auto-created (lazy provisioning).
 */
export async function fetchMe(token: string): Promise<UserProfile | null> {
  try {
    const response = await fetchWithAuth(`${BASE_URL}/api/users/me`, token, {
      method: "GET",
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch /api/users/me: ${response.status} ${response.statusText}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching /api/users/me:", error);
    return null;
  }
}

/**
 * Fetches a user profile by username via GET /api/users/username/{username}/profile.
 * Username matching is case-insensitive on the server.
 * Token is optional — when provided, self-view fields (email, ethAddress) are included
 * if the username matches the authenticated user.
 */
export async function fetchUserProfileByUsername(
  username: string,
  token?: string
): Promise<UserProfile | null> {
  try {
    const url = `${BASE_URL}/api/users/username/${encodeURIComponent(username)}/profile`;
    const options: RequestInit = { method: "GET" };

    let response: Response;
    if (token) {
      response = await fetchWithAuth(url, token, options);
    } else {
      response = await fetch(url, options);
    }

    if (!response.ok) {
      console.error(
        `Failed to fetch user profile by username: ${response.status} ${response.statusText}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching user profile by username:", error);
    return null;
  }
}

// =============================================================================
// Marks (Projects)
// =============================================================================

/**
 * Fetches all marks for the authenticated user via GET /api/projects.
 * Returns marks where the user is admin, member, or part of the owning organization.
 * The API returns ProjectWithClaimsCount (Project + claimsCount).
 */
export async function fetchMyMarks(
  token: string,
): Promise<ProjectWithClaimsCount[]> {
  try {
    const response = await fetchWithAuth(`${BASE_URL}/api/projects`, token, {
      method: "GET",
    });

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

/**
 * Fetches marks owned by a user (by username) via GET /api/users/username/{username}/projects.
 * Username matching is case-insensitive. Private marks are included when authenticated
 * as the owner or a project member.
 */
export async function fetchUserMarksByUsername(
  username: string,
  token?: string
): Promise<Project[]> {
  try {
    const url = `${BASE_URL}/api/users/username/${encodeURIComponent(username)}/projects`;
    const options: RequestInit = { method: "GET" };

    let response: Response;
    if (token) {
      response = await fetchWithAuth(url, token, options);
    } else {
      response = await fetch(url, options);
    }

    if (!response.ok) {
      console.error(
        `Failed to fetch user marks by username: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching user marks by username:", error);
    return [];
  }
}

/**
 * Fetches marks belonging to a specific organization via GET /api/projects/organization/{orgId}.
 * This is a public endpoint; token is optional. When provided, private marks are
 * included if the authenticated user is an organization member.
 */
export async function fetchOrganizationMarks(
  orgId: string,
  token?: string
): Promise<Project[]> {
  try {
    const url = `${BASE_URL}/api/projects/organization/${orgId}`;
    const options: RequestInit = { method: "GET" };

    let response: Response;
    if (token) {
      response = await fetchWithAuth(url, token, options);
    } else {
      response = await fetch(url, options);
    }

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

/**
 * Fetches a single mark by ID via GET /api/projects/{markId}.
 * Token is optional; private marks require the requester to be a project member
 * or part of the owning organization.
 */
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

// =============================================================================
// Artifact (Claim) Submission
// =============================================================================

/**
 * Submits a new artifact claim for a mark via POST /api/projects/{markId}/claims.
 */
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
 * Submits an image artifact claim with file upload via
 * POST /api/projects/{markId}/claims/image (multipart/form-data).
 *
 * @param markId - ID of the mark
 * @param token - Authentication token
 * @param payload - Artifact data payload
 * @param filePath - Path to the image file
 * @param fileBuffer - Buffer containing the file data
 * @param mimeTypeOverride - Optional MIME type override
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
    const mimeType =
      mimeTypeOverride || mime.getType(filePath) || "application/octet-stream";
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
