/**
 * Settings store for the application
 * Manages persistent configuration including auto-start preferences
 * and first-time login state. Note: projectFolders have been migrated
 * to the SQLite database in src/main/db.ts
 */
import Store from 'electron-store';
import { addWatchedFolder, getAllWatchedFolders, getCurrentUser } from './db';

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

/**
 * Migrates projectFolders from electron-store to the SQLite database.
 * This is a one-time migration that runs when the app starts.
 * After migration, projectFolders are removed from electron-store.
 */
export async function migrateProjectFoldersToDb(): Promise<void> {
  // Access raw store with type assertion for legacy data
  const current = settings.store as Settings & { projectFolders?: Record<string, string[]> };
  
  // Check if there's data to migrate
  if (!current.projectFolders || Object.keys(current.projectFolders).length === 0) {
    return;
  }
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log('[settings] Cannot migrate projectFolders: no current user set');
    return;
  }
  
  console.log('[settings] Migrating projectFolders to database...');
  
  try {
    // Get existing folders from database to avoid duplicates
    const existingFolders = await getAllWatchedFolders();
    
    // Migrate each mark's folders
    for (const [markId, folders] of Object.entries(current.projectFolders)) {
      if (Array.isArray(folders)) {
        for (const folderPath of folders) {
          // Only add if not already in database
          if (!existingFolders[markId]?.includes(folderPath)) {
            await addWatchedFolder(markId, folderPath);
            console.log(`[settings] Migrated folder: ${folderPath} -> mark ${markId}`);
          }
        }
      }
    }
    
    // Remove projectFolders from settings after successful migration
    settings.delete('projectFolders' as any);
    console.log('[settings] Migration complete. projectFolders removed from settings.');
  } catch (error) {
    console.error('[settings] Migration failed:', error);
  }
}

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
