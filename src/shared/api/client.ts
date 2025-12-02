import { UserProfile, Project } from "./types";

const BASE_URL = "https://api.ucfr.io";

export async function fetchUserProfile(
  email: string,
  token: string
): Promise<UserProfile | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/users/${encodeURIComponent(email)}/profile`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
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
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function fetchUserProjects(
  email: string,
  token: string
): Promise<Project[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/users/${encodeURIComponent(email)}/projects`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
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
    console.error("Error fetching user projects:", error);
    return [];
  }
}

export async function fetchOrganizationProjects(
  orgId: string,
  token: string
): Promise<Project[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/projects/organization/${orgId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
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
    console.error("Error fetching organization projects:", error);
    return [];
  }
}
