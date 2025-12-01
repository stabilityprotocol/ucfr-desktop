import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';

type SyncCallback = (payload: { event: string; file: string }) => void;

export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private onEvent: SyncCallback;

  constructor(onEvent: SyncCallback) {
    this.onEvent = onEvent;
  }

  start(folderPath: string) {
    this.stop();
    this.watcher = chokidar.watch(folderPath, { ignoreInitial: true });
    this.watcher.on('all', (event, filePath) => {
      const relative = path.relative(folderPath, filePath);
      this.onEvent({ event, file: relative });
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
