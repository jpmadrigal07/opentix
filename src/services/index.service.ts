import * as vscode from 'vscode';
import { TicketIndex, TicketIndexEntry } from '../models/ticket.model';
import { TicketService } from './ticket.service';
import { GitService } from './git.service';

export class IndexService {
  private ticketService: TicketService;
  private gitService: GitService;
  private watcher: vscode.FileSystemWatcher | null = null;
  private _onIndexChanged = new vscode.EventEmitter<TicketIndex>();
  private _onWatcherRebuild = new vscode.EventEmitter<TicketIndex>();

  /**
   * Event fired when the index changes (due to file watcher or manual rebuild).
   */
  readonly onIndexChanged = this._onIndexChanged.event;

  /**
   * Event fired only when a rebuild was triggered by the file watcher.
   * Used by WatcherService to auto-commit external changes without
   * reacting to sync-triggered or manual rebuilds.
   */
  readonly onWatcherRebuild = this._onWatcherRebuild.event;

  private cachedIndex: TicketIndex | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(ticketService: TicketService, gitService: GitService) {
    this.ticketService = ticketService;
    this.gitService = gitService;
  }

  /**
   * Start watching the tickets directory for changes.
   */
  startWatching(): void {
    const watchPattern = new vscode.RelativePattern(
      this.gitService.ticketsPath,
      '*.md',
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(watchPattern);

    const handleChange = () => {
      // Debounce to avoid excessive rebuilds
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(async () => {
        const index = await this.rebuild();
        this._onWatcherRebuild.fire(index);
      }, 1000);
    };

    this.watcher.onDidCreate(handleChange);
    this.watcher.onDidChange(handleChange);
    this.watcher.onDidDelete(handleChange);
  }

  /**
   * Stop watching for changes.
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Get the current index, using cache if available.
   */
  async getIndex(): Promise<TicketIndex> {
    if (this.cachedIndex) {
      return this.cachedIndex;
    }
    return this.rebuild();
  }

  /**
   * Rebuild the index from ticket files.
   */
  async rebuild(): Promise<TicketIndex> {
    const index = await this.ticketService.rebuildIndex();
    this.cachedIndex = index;
    this._onIndexChanged.fire(index);
    return index;
  }

  /**
   * Invalidate the cache (e.g., after a sync).
   */
  invalidateCache(): void {
    this.cachedIndex = null;
  }

  /**
   * Get tickets grouped by status for Kanban rendering.
   */
  async getTicketsByStatus(): Promise<Map<string, TicketIndexEntry[]>> {
    const index = await this.getIndex();
    const grouped = new Map<string, TicketIndexEntry[]>();

    for (const ticket of index.tickets) {
      const existing = grouped.get(ticket.status) || [];
      existing.push(ticket);
      grouped.set(ticket.status, existing);
    }

    return grouped;
  }

  dispose(): void {
    this.stopWatching();
    this._onIndexChanged.dispose();
    this._onWatcherRebuild.dispose();
  }
}
