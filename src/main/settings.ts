import Store from 'electron-store';

type Settings = {
  folderPath?: string;
  autoStart?: boolean;
  projectFolders?: Record<string, string[]>;
};

const settings = new Store<Settings>({
  name: 'settings',
  defaults: {
    folderPath: undefined,
    autoStart: false,
    projectFolders: {}
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
