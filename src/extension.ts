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
let extensionContext: vscode.ExtensionContext;
let servicesStarted = false;

/**
 * Start the core Opentix services (worktree, watcher, sync, AI context).
 * Guarded by a flag so it only runs once -- called either during activation
 * (if the project was already initialized) or after the init-project command.
 */
async function startServices(): Promise<void> {
  if (servicesStarted) { return; }
  servicesStarted = true;

  await gitService.ensureWorktree();

  // Bootstrap from remote immediately so new machine installs load the latest
  // ticket state without requiring restarts.
  if (await gitService.hasRemote()) {
    await syncService.sync();
  }

  await gitService.ensureOpentixStructure();

  try {
    await gitService.ensureTeamMember();
  } catch (teamErr: unknown) {
    console.log(`Opentix: Could not register team member (${teamErr instanceof Error ? teamErr.message : String(teamErr)})`);
  }

  watcherService.start();
  await indexService.rebuild();

  const config = await gitService.readConfig();
  if ((await gitService.hasRemote()) && config.autoSync) {
    const intervalSeconds =
      config.syncIntervalSeconds > 0
        ? config.syncIntervalSeconds
        : DEFAULT_SYNC_INTERVAL_SECONDS;
    // Skip immediate sync here; bootstrap sync already ran above.
    syncService.startAutoSync(intervalSeconds, false);
  }

  // AI context auto-detection (guarded by config)
  // Precedence: VS Code user setting (if explicitly set) > config.yml > default (true)
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

    const currentBranch = await gitService.getCurrentBranch();
    const ticketId = gitService.extractTicketIdFromBranch(currentBranch, config.prefix);
    await aiService.generateCurrentTicketContext(currentBranch, ticketId);

    extensionContext.subscriptions.push({ dispose: () => branchWatcher?.dispose() });
  }

  statusBarItem.text = '$(kanban) Opentix';
  statusBarItem.tooltip = 'Open Opentix Board';
  statusBarItem.command = 'opentix.openBoard';
  statusBarItem.show();

  console.log('Opentix: Extension activated successfully.');
}

function showUninitializedStatusBar(): void {
  statusBarItem.text = '$(kanban) Opentix (init)';
  statusBarItem.tooltip = 'Click to initialize Opentix';
  statusBarItem.command = 'opentix.initProject';
  statusBarItem.show();
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return; // No workspace open
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  extensionContext = context;

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
    vscode.commands.registerCommand('opentix.initProject', async () => {
      const success = await initProjectCommand(gitService);
      if (success) {
        await startServices();
      }
    }),
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

  // Only start services if the project was explicitly initialized.
  // Otherwise, show a status bar prompt and wait for the user to run init.
  let initialized = await gitService.isInitialized();
  if (!initialized && await gitService.hasRemote()) {
    // New machine install: refresh holder-branch refs once, then re-check initialization.
    try {
      await gitService.fetchOpentixHolderBranchFromRemote();
      initialized = await gitService.isInitialized();
    } catch {
      // Ignore and fall through to uninitialized prompt
    }
  }
  if (!initialized) {
    showUninitializedStatusBar();
    return;
  }

  try {
    await startServices();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`Opentix: Deferred initialization (${errMsg}). Use "Opentix: Initialize Project" to set up.`);
    showUninitializedStatusBar();
  }
}

export function deactivate(): void {
  // All disposables are cleaned up via context.subscriptions
}
