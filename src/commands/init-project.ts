import * as vscode from 'vscode';
import { GitService } from '../services/git.service';
import type { OpentixConfig } from '../models/config.model';
import { DEFAULT_CONFIG } from '../models/config.model';

/**
 * Run the interactive onboarding wizard that asks for each config setting.
 * Every input is pre-filled with the default value so the user can press
 * Enter to keep it or type a new value.
 *
 * Returns the assembled config, or `undefined` if the user cancelled at any step.
 */
async function runCustomizeWizard(): Promise<OpentixConfig | undefined> {
  // --- Prefix ---
  const prefix = await vscode.window.showInputBox({
    title: 'Opentix Setup (1/7) — Ticket Prefix',
    prompt: 'Prefix used for ticket IDs (e.g. OPTX-0001)',
    value: DEFAULT_CONFIG.prefix,
    validateInput: (v) => {
      if (!v.trim()) {
        return 'Prefix cannot be empty';
      }
      if (!/^[A-Za-z0-9]+$/.test(v.trim())) {
        return 'Prefix must be alphanumeric (letters and numbers only)';
      }
      return undefined;
    },
  });
  if (prefix === undefined) { return undefined; }

  // --- Statuses ---
  const keepStatuses = await vscode.window.showQuickPick(
    ['Yes', 'No'],
    {
      title: 'Opentix Setup (2/7) — Ticket Statuses',
      placeHolder: `Keep default statuses? (${DEFAULT_CONFIG.statuses.join(', ')})`,
    },
  );
  if (keepStatuses === undefined) { return undefined; }

  let statuses = DEFAULT_CONFIG.statuses;
  if (keepStatuses === 'No') {
    const statusInput = await vscode.window.showInputBox({
      title: 'Opentix Setup (2/7) — Custom Statuses',
      prompt: 'Enter statuses separated by commas',
      value: DEFAULT_CONFIG.statuses.join(', '),
      validateInput: (v) => {
        const parsed = v.split(',').map((s) => s.trim()).filter(Boolean);
        if (parsed.length < 2) {
          return 'Please provide at least 2 statuses';
        }
        return undefined;
      },
    });
    if (statusInput === undefined) { return undefined; }
    statuses = statusInput.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // --- Auto Sync ---
  const autoSyncChoice = await vscode.window.showQuickPick(
    ['Yes', 'No'],
    {
      title: 'Opentix Setup (3/7) — Auto Sync',
      placeHolder: 'Automatically sync tickets with the remote repository?',
    },
  );
  if (autoSyncChoice === undefined) { return undefined; }
  const autoSync = autoSyncChoice === 'Yes';

  // --- Sync Interval (only if autoSync is enabled) ---
  let syncIntervalSeconds = DEFAULT_CONFIG.syncIntervalSeconds;
  if (autoSync) {
    const syncIntervalInput = await vscode.window.showInputBox({
      title: 'Opentix Setup (4/7) — Sync Interval',
      prompt: 'How often to sync with remote (in seconds)',
      value: String(DEFAULT_CONFIG.syncIntervalSeconds),
      validateInput: (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 5) {
          return 'Please enter a number (minimum 5 seconds)';
        }
        return undefined;
      },
    });
    if (syncIntervalInput === undefined) { return undefined; }
    syncIntervalSeconds = parseInt(syncIntervalInput, 10);
  }

  // --- Push Mode ---
  const pushModeChoice = await vscode.window.showQuickPick(
    [
      { label: 'direct', description: 'Push commits directly to the default branch' },
      { label: 'branch-pr', description: 'Push to a branch and create a pull request' },
    ],
    {
      title: 'Opentix Setup (5/7) — Push Mode',
      placeHolder: 'How should Opentix push ticket changes?',
    },
  );
  if (pushModeChoice === undefined) { return undefined; }
  const pushMode = pushModeChoice.label as 'direct' | 'branch-pr';

  // --- Commit Strategy ---
  const commitStrategyChoice = await vscode.window.showQuickPick(
    [
      { label: 'immediate', description: 'Commit each change immediately' },
      { label: 'debounce', description: 'Batch changes and commit after a delay' },
    ],
    {
      title: 'Opentix Setup (6/7) — Commit Strategy',
      placeHolder: 'When should Opentix commit ticket changes?',
    },
  );
  if (commitStrategyChoice === undefined) { return undefined; }
  const commitStrategy = commitStrategyChoice.label as 'immediate' | 'debounce';

  // --- Debounce Seconds (only if debounce strategy) ---
  let commitDebounceSeconds = DEFAULT_CONFIG.commitDebounceSeconds;
  if (commitStrategy === 'debounce') {
    const debounceInput = await vscode.window.showInputBox({
      title: 'Opentix Setup (6/7) — Debounce Delay',
      prompt: 'Seconds to wait before committing batched changes',
      value: String(DEFAULT_CONFIG.commitDebounceSeconds),
      validateInput: (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 1) {
          return 'Please enter a number (minimum 1 second)';
        }
        return undefined;
      },
    });
    if (debounceInput === undefined) { return undefined; }
    commitDebounceSeconds = parseInt(debounceInput, 10);
  }

  // --- AI Context ---
  const aiContextChoice = await vscode.window.showQuickPick(
    ['Yes', 'No'],
    {
      title: 'Opentix Setup (7/7) — AI Context Auto-Detection',
      placeHolder: 'Automatically write current ticket context for AI assistants?',
    },
  );
  if (aiContextChoice === undefined) { return undefined; }
  const aiContextEnabled = aiContextChoice === 'Yes';

  return {
    prefix: prefix.trim(),
    statuses,
    defaultAssignee: null,
    autoSync,
    syncIntervalSeconds,
    pushMode,
    commitStrategy,
    commitDebounceSeconds,
    aiContext: {
      enabled: aiContextEnabled,
    },
  };
}

/**
 * Check if .opentix exists on the default branch in the remote.
 * Fetches from origin first so the check is accurate on a new machine.
 */
async function isOpentixOnRemoteMain(gitService: GitService): Promise<boolean> {
  if (!(await gitService.hasRemote())) {
    return false;
  }
  await gitService.fetchDefaultBranchFromRemote();
  return gitService.isInitialized();
}

/**
 * Command handler for opentix.initProject.
 *
 * New computer setup:
 * - If .opentix already exists on main (remote): pull changes and join the project.
 * - If not: run the full init wizard and scaffold.
 *
 * Returns `true` if initialization succeeded so the caller can start services.
 */
export async function initProjectCommand(
  gitService: GitService,
): Promise<boolean> {
  try {
    const isRepo = await gitService.isGitRepo();
    if (!isRepo) {
      vscode.window.showErrorMessage(
        'Opentix: This folder is not a git repository. Please initialize git first.',
      );
      return false;
    }

    // New computer: check if project was already initialized on main
    const existsOnRemote = await isOpentixOnRemoteMain(gitService);
    if (existsOnRemote) {
      vscode.window.showInformationMessage(
        'Opentix: Found existing project on main. Pulling changes and joining...',
      );
      // Return true so extension handler calls startServices(), which will
      // ensureWorktree, sync (pull), ensureOpentixStructure, and start all services.
      return true;
    }

    // Full init: project not yet initialized
    const setupMode = await vscode.window.showQuickPick(
      [
        {
          label: '$(check) Use recommended settings',
          description: 'Quick setup with sensible defaults',
          id: 'recommended',
        },
        {
          label: '$(gear) Customize settings',
          description: 'Configure each option step by step',
          id: 'customize',
        },
      ],
      {
        title: 'Opentix — Project Setup',
        placeHolder: 'How would you like to set up Opentix?',
      },
    );

    if (!setupMode) {
      return false;
    }

    let config: OpentixConfig | undefined;
    if (setupMode.id === 'customize') {
      config = await runCustomizeWizard();
      if (config === undefined) {
        return false;
      }
    }

    await gitService.ensureWorktree();
    await gitService.ensureOpentixStructure(config);

    // Commit and push the initial structure
    await gitService.commitAndPush('init - Initialize Opentix project');

    vscode.window.showInformationMessage(
      'Opentix: Project initialized! Open the Kanban board with "Opentix: Open Board".',
    );
    return true;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(
      `Opentix: Failed to initialize: ${errMsg}`,
    );
    return false;
  }
}
