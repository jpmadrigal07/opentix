import { IndexService } from './index.service';
import { GitService } from './git.service';

/**
 * Watches the worktree's ticket directory for external changes
 * (e.g., from git pull or AI agents) and triggers index rebuilds.
 * Also auto-commits uncommitted .opentix/ changes detected by the
 * file watcher so external tools don't leave dirty state.
 */
export class WatcherService {
  private gitService: GitService;
  private indexService: IndexService;
  private _isAutoCommitting = false;
  private autoCommitTimer: NodeJS.Timeout | null = null;
  private watcherRebuildDisposable: { dispose(): void } | null = null;

  constructor(gitService: GitService, indexService: IndexService) {
    this.gitService = gitService;
    this.indexService = indexService;
  }

  /**
   * Start the file watcher on the tickets directory and subscribe
   * to watcher-triggered rebuilds for auto-commit.
   */
  start(): void {
    this.indexService.startWatching();

    this.watcherRebuildDisposable = this.indexService.onWatcherRebuild(() => {
      this.scheduleAutoCommit();
    });
  }

  /**
   * Schedule an auto-commit check after a short delay.
   * The delay reduces unnecessary git-status calls; the dirty check
   * itself is the correctness mechanism.
   */
  private scheduleAutoCommit(): void {
    if (this.autoCommitTimer) {
      clearTimeout(this.autoCommitTimer);
    }
    this.autoCommitTimer = setTimeout(() => {
      this.autoCommitIfDirty();
    }, 2000);
  }

  /**
   * Check for uncommitted .opentix/ files and auto-commit them.
   * Guarded to prevent concurrent auto-commit attempts.
   */
  private async autoCommitIfDirty(): Promise<void> {
    if (this._isAutoCommitting) {
      return;
    }
    this._isAutoCommitting = true;
    try {
      const hasDirty = await this.gitService.hasDirtyOpentixFiles();
      if (hasDirty) {
        await this.gitService.commitAndPush('auto-commit external changes');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`Opentix: Auto-commit failed: ${errMsg}`);
    } finally {
      this._isAutoCommitting = false;
    }
  }

  /**
   * Stop the file watcher and auto-commit scheduling.
   */
  stop(): void {
    this.indexService.stopWatching();
    if (this.autoCommitTimer) {
      clearTimeout(this.autoCommitTimer);
      this.autoCommitTimer = null;
    }
    if (this.watcherRebuildDisposable) {
      this.watcherRebuildDisposable.dispose();
      this.watcherRebuildDisposable = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}
