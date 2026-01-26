import { atom } from "jotai";
import type {
  Project,
  Health,
  Organization,
  UserProfile,
} from "../shared/api/types";

export const tokenAtom = atom<string | null>(null);
export const folderAtom = atom<string | undefined>(undefined);
export const autoStartAtom = atom<boolean>(false);
export const logsAtom = atom<Array<{ message: string; ts: number }>>([]);
export const syncStatusAtom = atom<string>("idle");
export const projectsAtom = atom<Project[]>([]);
export const healthAtom = atom<Health | null>(null);
export const currentUserAtom = atom<string | null>(null);
export const userProfileAtom = atom<UserProfile | null>(null);
export const organizationsAtom = atom<Organization[]>([]);
export const activeOrgAtom = atom<Organization | null>(null);

/**
 * Tracks whether the app is currently validating the auth token against the server.
 * Used to show a loading screen during initial app startup.
 */
export const isValidatingAtom = atom<boolean>(true);
