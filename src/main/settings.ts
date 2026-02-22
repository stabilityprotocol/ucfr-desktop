/**
 * Settings store for the application
 * Manages persistent configuration including auto-start preferences
 * and first-time login state.
 */
import Store from 'electron-store';

type Settings = {
  folderPath?: string;
  autoStart?: boolean;
  hasCompletedFirstLogin?: boolean;
};

const settings = new Store<Settings>({
  name: 'settings',
  defaults: {
    folderPath: undefined,
    autoStart: false,
    hasCompletedFirstLogin: false
  }
});

export function getSettings(): Settings {
  const current = settings.store;
  
  // Defensive migration: ensure all default fields exist
  const migrated: Settings = {
    folderPath: current.folderPath,
    autoStart: current.autoStart ?? false,
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

/**
 * Resets all settings to their defaults.
 * Called during logout to ensure the next user starts fresh.
 */
export function resetSettings(): void {
  settings.clear();
}
