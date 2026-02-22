import fs from "fs";
import path from "path";
import { dbDir } from "./client";

const currentUserFilePath = path.join(dbDir, "current-user.txt");

let currentUserEmail: string | null = null;

function saveCurrentUserToFile(email: string | null): void {
  try {
    if (email) {
      fs.writeFileSync(currentUserFilePath, email, "utf-8");
    } else if (fs.existsSync(currentUserFilePath)) {
      fs.unlinkSync(currentUserFilePath);
    }
  } catch (error) {
    console.error("[db] Failed to persist current user:", error);
  }
}

function loadCurrentUserFromFile(): string | null {
  try {
    if (!fs.existsSync(currentUserFilePath)) {
      return null;
    }
    const value = fs.readFileSync(currentUserFilePath, "utf-8").trim();
    return value || null;
  } catch (error) {
    console.error("[db] Failed to read current user:", error);
    return null;
  }
}

export function initCurrentUser(): void {
  currentUserEmail = loadCurrentUserFromFile();
}

export function setCurrentUserInSession(email: string | null): void {
  currentUserEmail = email;
  saveCurrentUserToFile(email);
}

export function getCurrentUserFromSession(): string | null {
  if (currentUserEmail) {
    return currentUserEmail;
  }

  const saved = loadCurrentUserFromFile();
  if (saved) {
    currentUserEmail = saved;
    return saved;
  }

  return null;
}

export function ensureUser(): string {
  const userEmail = getCurrentUserFromSession();
  if (!userEmail) {
    throw new Error("No current user set. Call setCurrentUser(email) first.");
  }
  return userEmail;
}
