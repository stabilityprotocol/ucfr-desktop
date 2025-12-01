import { atom } from 'jotai';
import type { MockUser, MockProject, MockHealth } from '../shared/api/types';

export const tokenAtom = atom<string | null>(null);
export const folderAtom = atom<string | undefined>(undefined);
export const autoStartAtom = atom<boolean>(false);
export const logsAtom = atom<Array<{ message: string; ts: number }>>([]);
export const syncStatusAtom = atom<string>('idle');
export const projectsAtom = atom<MockProject[]>([]);
export const healthAtom = atom<MockHealth | null>(null);
export const currentUserAtom = atom<MockUser | null>(null);
