/**
 * Settings store for the application
 * Manages persistent configuration including project folders,
 * auto-start preferences, and first-time login state
 */
import Store from 'electron-store';

type Settings = {
  folderPath?: string;
  autoStart?: boolean;
  projectFolders?: Record<string, string[]>;
  hasCompletedFirstLogin?: boolean;
};

const settings = new Store<Settings>({
  name: 'settings',
  defaults: {
    folderPath: undefined,
    autoStart: false,
    projectFolders: {},
    hasCompletedFirstLogin: false
  }
});

export function getSettings(): Settings {
  return settings.store;
}

export function updateSettings(update: Partial<Settings>): Settings {
  const next = { ...settings.store, ...update };
  settings.set(next);
  return next;
}
