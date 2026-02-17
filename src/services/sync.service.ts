import * as vscode from 'vscode';
import { GitService } from './git.service';
import { IndexService } from './index.service';

export class SyncService {
  private gitService: GitService;
  private indexService: IndexService;
  private syncInterval: NodeJS.Timeout | null = null;
  private _isSyncing = false;
  private _onSyncStatusChanged = new vscode.EventEmitter<SyncStatus>();

  readonly onSyncStatusChanged = this._onSyncStatusChanged.event;

  constructor(gitService: GitService, indexService: IndexService) {
    this.gitService = gitService;
    this.indexService = indexService;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  /**
   * Start background sync with the given interval in seconds.
   */
  startAutoSync(intervalSeconds: number): void {
    this.stopAutoSync();

    // Do an initial sync
    this.sync();

    this.syncInterval = setInterval(
      () => this.sync(),
      intervalSeconds * 1000,
    );
  }

  /**
   * Stop background sync.
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform a single sync: pull from remote, rebuild index if changed,
   * then auto-commit any uncommitted local .opentix/ changes as a safety net
   * (catches non-ticket file edits that the *.md watcher wouldn't see).
   */
  async sync(): Promise<void> {
    if (this._isSyncing) {
      return;
    }

    this._isSyncing = true;
    this._onSyncStatusChanged.fire('syncing');

    try {
      const hasChanges = await this.gitService.pull();
      if (hasChanges) {
        this.indexService.invalidateCache();
        await this.indexService.rebuild();
      }

      // Safety net: auto-commit any uncommitted local .opentix/ changes.
      // Protected by the reentrancy guard on GitService.
      try {
        const hasDirty = await this.gitService.hasDirtyOpentixFiles();
        if (hasDirty) {
          await this.gitService.commitAndPush('auto-commit local changes');
        }
      } catch (commitErr: unknown) {
        const commitErrMsg = commitErr instanceof Error ? commitErr.message : String(commitErr);
        console.log(`Opentix: Auto-commit during sync failed: ${commitErrMsg}`);
      }

      this._onSyncStatusChanged.fire('synced');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Opentix sync error:', errMsg);
      this._onSyncStatusChanged.fire('error');
    } finally {
      this._isSyncing = false;
    }
  }

  dispose(): void {
    this.stopAutoSync();
    this._onSyncStatusChanged.dispose();
  }
}

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'idle';
