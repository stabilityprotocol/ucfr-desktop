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
    this.watcher = chokidar.watch(folderPath, {
      ignoreInitial: true,
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        "**/*.swp",
        "**/*.swo",
        "**/node_modules/**",
        "**/.git/**",
      ],
    });
    this.watcher.on("all", (event, filePath) => {
      // Monitor add, change, and unlink (for rename detection)
      if (event === "add" || event === "change" || event === "unlink") {
        this.onEvent({ event, file: filePath });
      }
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
