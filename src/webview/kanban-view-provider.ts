import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { TicketService } from '../services/ticket.service';
import { IndexService } from '../services/index.service';
import { SyncService } from '../services/sync.service';
import { SprintService } from '../services/sprint.service';
import { GitService } from '../services/git.service';
import {
    BoardData, HostToWebviewMessage,
    WebviewToHostMessage,
    TicketDetailData
} from './kanban/bridge';
import { TicketIndex } from '../models/ticket.model';
import { Ticket } from '../models/ticket.model';
import { DEFAULT_STATUSES } from '../utils/constants';

export class KanbanViewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private extensionUri: vscode.Uri;
  private ticketService: TicketService;
  private indexService: IndexService;
  private syncService: SyncService;
  private sprintService: SprintService;
  private gitService: GitService;
  private statuses: string[];
  private disposables: vscode.Disposable[] = [];

  constructor(
    extensionUri: vscode.Uri,
    ticketService: TicketService,
    indexService: IndexService,
    syncService: SyncService,
    sprintService: SprintService,
    gitService: GitService,
    statuses?: string[],
  ) {
    this.extensionUri = extensionUri;
    this.ticketService = ticketService;
    this.indexService = indexService;
    this.syncService = syncService;
    this.sprintService = sprintService;
    this.gitService = gitService;
    this.statuses = statuses || [...DEFAULT_STATUSES];

    // Listen for index changes
    this.disposables.push(
      this.indexService.onIndexChanged((index) => {
        this.sendBoardUpdate(index);
      }),
    );

    // Listen for sync status changes
    this.disposables.push(
      this.syncService.onSyncStatusChanged((status) => {
        this.sendMessage({ type: 'syncStatus', status });
      }),
    );
  }

  /**
   * Open or reveal the Kanban board panel.
   */
  async openBoard(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'opentix.kanban',
      'Opentix Board',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'kanban', 'styles'),
        ],
      },
    );

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'resources', 'icon.png');

    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToHostMessage) => this.handleWebviewMessage(msg),
      undefined,
      this.disposables,
    );

    this.panel.onDidDispose(
      () => {
        this.panel = null;
      },
      undefined,
      this.disposables,
    );
  }

  /**
   * Handle messages received from the webview.
   */
  private async handleWebviewMessage(
    msg: WebviewToHostMessage,
  ): Promise<void> {
    switch (msg.type) {
      case 'ready': {
        // Send initial config, sprint config, team members, and board data
        this.sendMessage({ type: 'config', statuses: this.statuses });
        await this.sendSprintConfig();
        await this.sendTeamMembers();
        const index = await this.indexService.getIndex();
        this.sendBoardUpdate(index);
        break;
      }

      case 'createTicket': {
        try {
          await this.ticketService.createTicket({
            title: msg.title,
            description: msg.description,
            sprint: msg.sprint,
            assignees: msg.assignees,
          });
          // Index will be updated via the file watcher
          const index = await this.indexService.getIndex();
          this.sendBoardUpdate(index);
          vscode.window.showInformationMessage(
            `Opentix: Ticket created.`,
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to create ticket: ${errMsg}`,
          );
        }
        break;
      }

      case 'moveTicket': {
        try {
          await this.ticketService.updateTicket(msg.id, {
            status: msg.newStatus as any,
          });
          const index = await this.indexService.getIndex();
          this.sendBoardUpdate(index);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to move ticket: ${errMsg}`,
          );
        }
        break;
      }

      case 'openTicket': {
        try {
          const ticket = await this.ticketService.getTicket(msg.id);
          if (ticket) {
            this.sendMessage({
              type: 'ticketDetail',
              ticket: this.buildTicketDetail(ticket),
            });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to load ticket: ${errMsg}`,
          );
        }
        break;
      }

      case 'updateTicket': {
        try {
          const updated = await this.ticketService.updateTicket(
            msg.id,
            msg.updates as any,
          );
          if (updated) {
            this.sendMessage({
              type: 'ticketDetail',
              ticket: this.buildTicketDetail(updated),
            });
            const index = await this.indexService.getIndex();
            this.sendBoardUpdate(index);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to update ticket: ${errMsg}`,
          );
        }
        break;
      }

      case 'deleteTicket': {
        try {
          await this.ticketService.deleteTicket(msg.id);
          this.sendMessage({ type: 'ticketDetail', ticket: null });
          const index = await this.indexService.getIndex();
          this.sendBoardUpdate(index);
          vscode.window.showInformationMessage(
            `Opentix: Ticket ${msg.id} deleted.`,
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to delete ticket: ${errMsg}`,
          );
        }
        break;
      }

      case 'addComment': {
        try {
          const updated = await this.ticketService.addComment(
            msg.id,
            msg.body,
          );
          if (updated) {
            this.sendMessage({
              type: 'ticketDetail',
              ticket: this.buildTicketDetail(updated),
            });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to add comment: ${errMsg}`,
          );
        }
        break;
      }

      case 'sync': {
        await this.syncService.sync();
        break;
      }

      case 'closeDetail': {
        // Nothing to do on the host side
        break;
      }

      case 'createSprint': {
        try {
          await this.sprintService.createSprint(msg.input);
          await this.sendSprintConfig();
          vscode.window.showInformationMessage('Opentix: Sprint created.');
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to create sprint: ${errMsg}`,
          );
        }
        break;
      }

      case 'updateSprint': {
        try {
          await this.sprintService.updateSprint(msg.id, msg.updates);
          await this.sendSprintConfig();
          vscode.window.showInformationMessage('Opentix: Sprint updated.');
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: Failed to update sprint: ${errMsg}`,
          );
        }
        break;
      }

      case 'deleteSprint': {
        try {
          await this.sprintService.deleteSprint(msg.id);
          await this.sendSprintConfig();
          vscode.window.showInformationMessage('Opentix: Sprint deleted.');
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Opentix: ${errMsg}`,
          );
        }
        break;
      }
    }
  }

  /**
   * Build a TicketDetailData object from a Ticket.
   */
  private buildTicketDetail(ticket: Ticket): TicketDetailData {
    return {
      id: ticket.frontmatter.id,
      title: ticket.frontmatter.title,
      status: ticket.frontmatter.status,
      priority: ticket.frontmatter.priority,
      sprint: ticket.frontmatter.sprint,
      assignees: ticket.frontmatter.assignees,
      labels: ticket.frontmatter.labels,
      description: ticket.description,
      acceptanceCriteria: ticket.acceptanceCriteria,
      createdAt: ticket.frontmatter.createdAt,
      updatedAt: ticket.frontmatter.updatedAt,
      createdBy: ticket.frontmatter.createdBy,
      branch: ticket.frontmatter.branch,
      comments: ticket.comments,
    };
  }

  /**
   * Send the sprint configuration to the webview.
   */
  private async sendSprintConfig(): Promise<void> {
    const config = await this.sprintService.getSprintConfig();
    const currentSprint = this.sprintService.getCurrentSprint(config.sprints);
    this.sendMessage({
      type: 'sprintConfig',
      sprints: config.sprints,
      currentSprintId: currentSprint?.id ?? null,
    });
  }

  /**
   * Send the team members list to the webview.
   */
  private async sendTeamMembers(): Promise<void> {
    const members = await this.gitService.getTeamMembers();
    const name = await this.gitService.getAuthor();
    const email = await this.gitService.getAuthorEmail();
    this.sendMessage({
      type: 'teamMembers',
      members,
      currentUser: { name, email },
    });
  }

  /**
   * Send a board update to the webview.
   */
  private sendBoardUpdate(index: TicketIndex): void {
    const board: BoardData = this.statuses.map((status) => ({
      status,
      tickets: index.tickets
        .filter((t) => t.status === status)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          sprint: t.sprint,
          assignees: t.assignees,
          updatedAt: t.updatedAt,
        })),
    }));

    this.sendMessage({ type: 'updateBoard', tickets: board });
  }

  /**
   * Send a message to the webview.
   */
  private sendMessage(msg: HostToWebviewMessage): void {
    if (this.panel) {
      this.panel.webview.postMessage(msg);
    }
  }

  /**
   * Generate the HTML for the webview.
   */
  private getWebviewContent(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');

    // Build URIs for scripts and styles
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'kanban.js'),
    );
    const themeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'dist',
        'webview',
        'styles',
        'theme.css',
      ),
    );
    const boardUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'dist',
        'webview',
        'styles',
        'board.css',
      ),
    );

    // Read the HTML template and replace placeholders
    const htmlPath = path.join(
      this.extensionUri.fsPath,
      'dist',
      'webview',
      'index.html',
    );
    let html = fs.readFileSync(htmlPath, 'utf-8');

    html = html.replace(/\{\{nonce\}\}/g, nonce);
    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
    html = html.replace(/\{\{themeUri\}\}/g, themeUri.toString());
    html = html.replace(/\{\{boardUri\}\}/g, boardUri.toString());

    return html;
  }

  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
