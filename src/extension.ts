import * as vscode from 'vscode';
import { GitService } from './services/git.service';
import { TicketService } from './services/ticket.service';
import { IndexService } from './services/index.service';
import { SyncService } from './services/sync.service';
import { WatcherService } from './services/watcher.service';
import { KanbanViewProvider } from './webview/kanban-view-provider';
import { SprintService } from './services/sprint.service';
import { AIService } from './services/ai.service';
import { BranchWatcherService } from './services/branch-watcher.service';
import { createTicketCommand } from './commands/create-ticket';
import { openBoardCommand } from './commands/open-board';
import { syncTicketsCommand } from './commands/sync-tickets';
import { initProjectCommand } from './commands/init-project';
import { DEFAULT_STATUSES, DEFAULT_SYNC_INTERVAL_SECONDS } from './utils/constants';

let gitService: GitService;
let ticketService: TicketService;
let indexService: IndexService;
let syncService: SyncService;
let watcherService: WatcherService;
let sprintService: SprintService;
let kanbanProvider: KanbanViewProvider;
let aiService: AIService;
let branchWatcher: BranchWatcherService | null = null;
let statusBarItem: vscode.StatusBarItem;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return; // No workspace open
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  // Initialize services
  gitService = new GitService(workspaceRoot);

  // Check if this is a git repo
  const isRepo = await gitService.isGitRepo();
  if (!isRepo) {
    // Register init command even if not a repo -- user may want to init later
    context.subscriptions.push(
      vscode.commands.registerCommand('opentix.initProject', () =>
        vscode.window.showErrorMessage(
          'Opentix: This folder is not a git repository.',
        ),
      ),
    );
    return;
  }

  ticketService = new TicketService(gitService);
  indexService = new IndexService(ticketService, gitService);
  syncService = new SyncService(gitService, indexService);
  watcherService = new WatcherService(gitService, indexService);
  sprintService = new SprintService(gitService, ticketService);
  aiService = new AIService(ticketService, indexService, workspaceRoot);

  // Create Kanban view provider
  kanbanProvider = new KanbanViewProvider(
    context.extensionUri,
    ticketService,
    indexService,
    syncService,
    sprintService,
    gitService,
    [...DEFAULT_STATUSES],
  );

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.command = 'opentix.openBoard';
  statusBarItem.text = '$(kanban) Opentix';
  statusBarItem.tooltip = 'Open Opentix Board';

  // Listen for sync status changes to update status bar
  syncService.onSyncStatusChanged((status) => {
    switch (status) {
      case 'syncing':
        statusBarItem.text = '$(sync~spin) Opentix';
        statusBarItem.tooltip = 'Syncing tickets...';
        break;
      case 'synced':
        statusBarItem.text = '$(check) Opentix';
        statusBarItem.tooltip = 'Opentix - Synced';
        break;
      case 'error':
        statusBarItem.text = '$(warning) Opentix';
        statusBarItem.tooltip = 'Opentix - Sync error';
        break;
      default:
        statusBarItem.text = '$(kanban) Opentix';
        statusBarItem.tooltip = 'Open Opentix Board';
    }
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('opentix.openBoard', () =>
      openBoardCommand(kanbanProvider),
    ),
    vscode.commands.registerCommand('opentix.createTicket', () =>
      createTicketCommand(ticketService),
    ),
    vscode.commands.registerCommand('opentix.syncTickets', () =>
      syncTicketsCommand(syncService),
    ),
    vscode.commands.registerCommand('opentix.initProject', () =>
      initProjectCommand(gitService),
    ),
    vscode.commands.registerCommand('opentix.getTicketContext', async () => {
      const id = await vscode.window.showInputBox({
        prompt: 'Ticket ID',
        placeHolder: 'e.g. OPTX-0001',
      });
      if (id) {
        const ctx = await aiService.getTicketContext(id);
        if (ctx) {
          const doc = await vscode.workspace.openTextDocument({
            content: ctx,
            language: 'json',
          });
          await vscode.window.showTextDocument(doc);
        } else {
          vscode.window.showWarningMessage(`Opentix: Ticket ${id} not found.`);
        }
      }
    }),
    vscode.commands.registerCommand(
      'opentix.getAllTicketsContext',
      async () => {
        const ctx = await aiService.getAllTicketsContext();
        const doc = await vscode.workspace.openTextDocument({
          content: ctx,
          language: 'json',
        });
        await vscode.window.showTextDocument(doc);
      },
    ),
  );

  // Register disposables
  context.subscriptions.push(
    statusBarItem,
    { dispose: () => indexService.dispose() },
    { dispose: () => syncService.dispose() },
    { dispose: () => watcherService.dispose() },
    { dispose: () => kanbanProvider.dispose() },
  );

  // Try to initialize the worktree and start services
  try {
    await gitService.ensureWorktree();
    await gitService.ensureOpentixStructure();

    // Auto-register current developer in team.yml
    try {
      await gitService.ensureTeamMember();
    } catch (teamErr: unknown) {
      console.log(`Opentix: Could not register team member (${teamErr instanceof Error ? teamErr.message : String(teamErr)})`);
    }

    // Start file watcher
    watcherService.start();

    // Load initial index
    await indexService.rebuild();

    // Start auto-sync if remote is available
    if (await gitService.hasRemote()) {
      syncService.startAutoSync(DEFAULT_SYNC_INTERVAL_SECONDS);
    }

    // AI context auto-detection (guarded by config)
    // Precedence: VS Code user setting (if explicitly set) > config.yml > default (true)
    const config = await gitService.readConfig();
    const vscodeSetting = vscode.workspace.getConfiguration('opentix').inspect<boolean>('aiContext.enabled');
    const userExplicitlySet = vscodeSetting?.globalValue !== undefined
      || vscodeSetting?.workspaceValue !== undefined
      || vscodeSetting?.workspaceFolderValue !== undefined;
    const aiContextEnabled = userExplicitlySet
      ? vscode.workspace.getConfiguration('opentix').get<boolean>('aiContext.enabled', true)
      : (config.aiContext?.enabled ?? true);

    if (aiContextEnabled) {
      branchWatcher = new BranchWatcherService(gitService, config.prefix);
      branchWatcher.onBranchChanged(async ({ branchName, ticketId }) => {
        await aiService.generateCurrentTicketContext(branchName, ticketId);
      });
      await branchWatcher.start();

      // Generate initial context for current branch
      const currentBranch = await gitService.getCurrentBranch();
      const ticketId = gitService.extractTicketIdFromBranch(currentBranch, config.prefix);
      await aiService.generateCurrentTicketContext(currentBranch, ticketId);

      context.subscriptions.push({ dispose: () => branchWatcher?.dispose() });
    }

    // Show status bar
    statusBarItem.show();

    console.log('Opentix: Extension activated successfully.');
  } catch (err: unknown) {
    // Extension activation is not critical -- the user can init manually
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`Opentix: Deferred initialization (${errMsg}). Use "Opentix: Initialize Project" to set up.`);
    statusBarItem.text = '$(kanban) Opentix (init)';
    statusBarItem.tooltip = 'Click to initialize Opentix';
    statusBarItem.command = 'opentix.initProject';
    statusBarItem.show();
  }
}

export function deactivate(): void {
  // All disposables are cleaned up via context.subscriptions
}
