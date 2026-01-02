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

export async function fetchUserProjects(
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
        `Failed to fetch user projects: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching user projects:", error);
    return [];
  }
}

export async function fetchOrganizationProjects(
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
        `Failed to fetch organization projects: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching organization projects:", error);
    return [];
  }
}

export async function fetchProject(
  projectId: string,
  token: string
): Promise<Project | null> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/projects/${projectId}`,
      token,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch project: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error fetching project:", error);
    return null;
  }
}

export async function createProjectClaim(
  projectId: string,
  token: string,
  payload: CreateProjectClaimDto
): Promise<any | null> {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/api/projects/${projectId}/claims`,
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `Failed to create claim: ${response.status} ${response.statusText}`,
        errText
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error creating project claim:", error);
    return null;
  }
}

export async function createImageProjectClaim(
  projectId: string,
  token: string,
  payload: CreateProjectClaimDto,
  filePath: string,
  fileBuffer: Buffer
): Promise<any | null> {
  try {
    const formData = new FormData();
    
    // Add claim data as JSON string
    formData.append(
      "data", 
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
    
    // Add the file
    const mimeModule = await import("mime");
    const mimeInstance = (mimeModule as any).default || mimeModule;
    const mimeType = mimeInstance.getType(filePath) || "application/octet-stream";
    const fileName = require("path").basename(filePath);
    const uint8Array = new Uint8Array(fileBuffer);
    const fileBlob = new Blob([uint8Array], { type: mimeType });
    formData.append("file", fileBlob, fileName);

    const response = await fetch(
      `${BASE_URL}/api/projects/${projectId}/claims/image`,
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
        `Failed to create image claim: ${response.status} ${response.statusText}`,
        errText
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    console.error("Error creating image project claim:", error);
    return null;
  }
}
