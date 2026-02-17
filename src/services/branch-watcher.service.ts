import * as vscode from 'vscode';
import { GitService } from './git.service';

export interface BranchChangedEvent {
  branchName: string;
  ticketId: string | null;
}

/**
 * Watches the resolved git HEAD path for branch changes and fires
 * an event when the current branch changes. Handles detached HEAD
 * as a "no ticket" state.
 *
 * Reusable by the future Git Event Automations feature.
 */
export class BranchWatcherService {
  private gitService: GitService;
  private prefix: string;
  private watcher: vscode.FileSystemWatcher | null = null;
  private lastBranch: string | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _onBranchChanged = new vscode.EventEmitter<BranchChangedEvent>();
  readonly onBranchChanged = this._onBranchChanged.event;

  constructor(gitService: GitService, prefix: string) {
    this.gitService = gitService;
    this.prefix = prefix;
  }

  /**
   * Start watching for branch changes.
   * Resolves the HEAD path and sets up a file system watcher.
   */
  async start(): Promise<void> {
    const headPath = await this.gitService.resolveGitHeadPath();

    // Read the initial branch
    this.lastBranch = await this.gitService.getCurrentBranch();

    // Watch the resolved HEAD file for changes
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(headPath),
      '*',
    );
    // Use a glob that matches the HEAD file itself
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(headPath).with({ path: vscode.Uri.file(headPath).path.replace(/\/[^/]+$/, '') }),
        headPath.split('/').pop()!,
      ),
    );

    this.watcher.onDidChange(() => this.handleHeadChange());
    this.watcher.onDidCreate(() => this.handleHeadChange());
  }

  /**
   * Handle a HEAD file change with debounce to avoid rapid-fire
   * events during rebase/merge operations.
   */
  private handleHeadChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      this.debounceTimer = null;
      try {
        const currentBranch = await this.gitService.getCurrentBranch();

        // Dedupe: only fire if the branch actually changed
        if (currentBranch === this.lastBranch) {
          return;
        }

        this.lastBranch = currentBranch;

        // Detached HEAD returns literal "HEAD" which won't match PREFIX-\d{4}
        const ticketId = this.gitService.extractTicketIdFromBranch(
          currentBranch,
          this.prefix,
        );

        this._onBranchChanged.fire({ branchName: currentBranch, ticketId });
      } catch {
        // Ignore transient read failures during git operations
      }
    }, 500);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    this._onBranchChanged.dispose();
  }
}
