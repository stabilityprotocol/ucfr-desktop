import chokidar, { FSWatcher } from "chokidar";

type SyncCallback = (payload: { event: string; file: string }) => void;

export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private onEvent: SyncCallback;

  constructor(onEvent: SyncCallback) {
    this.onEvent = onEvent;
  }

  start(folderPath: string | string[]) {
    this.stop();
    this.watcher = chokidar.watch(folderPath, { ignoreInitial: true });
    this.watcher.on("all", (event, filePath) => {
      // If watching multiple roots, relative path might be ambiguous or misleading.
      // We'll just pass the full path for now, or let the consumer handle it.
      this.onEvent({ event, file: filePath });
    });
  }

  add(folderPath: string) {
    console.log(`[Watcher] Adding folder: ${folderPath}`);
    if (this.watcher) {
      this.watcher.add(folderPath);
    } else {
      this.start(folderPath);
    }
  }

  unwatch(folderPath: string) {
    console.log(`[Watcher] Unwatching folder: ${folderPath}`);
    if (this.watcher) {
      this.watcher.unwatch(folderPath);
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
