/**
 * Settings store for the application
 * Manages persistent configuration including auto-start preferences.
 */
import Store from 'electron-store';

type Settings = {
  folderPath?: string;
  autoStart?: boolean;
};

const settings = new Store<Settings>({
  name: 'settings',
  defaults: {
    folderPath: undefined,
    autoStart: false,
  }
});

export function getSettings(): Settings {
  const current = settings.store;
  
  return {
    folderPath: current.folderPath,
    autoStart: current.autoStart ?? false,
  };
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
