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
  const current = settings.store;
  
  // Defensive migration: ensure all default fields exist
  const migrated: Settings = {
    folderPath: current.folderPath,
    autoStart: current.autoStart ?? false,
    projectFolders: current.projectFolders ?? {},
    hasCompletedFirstLogin: current.hasCompletedFirstLogin ?? false,
  };
  
  // If migration occurred, persist the updated settings
  if (current.hasCompletedFirstLogin === undefined) {
    settings.set(migrated);
  }
  
  return migrated;
}

export function updateSettings(update: Partial<Settings>): Settings {
  const next = { ...settings.store, ...update };
  settings.set(next);
  return next;
}
