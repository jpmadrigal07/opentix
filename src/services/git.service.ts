import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import simpleGit, { SimpleGit } from 'simple-git';
import {
    WORKTREE_DIR,
    OPENTIX_DIR,
    TICKETS_DIR,
    INDEX_FILE,
    CONFIG_FILE,
    SPRINTS_FILE,
    TEAM_FILE,
    TEMPLATES_DIR,
    AGENTS_FILE,
    COMMIT_PREFIX,
    CURRENT_TICKET_FILE,
} from '../utils/constants';
import { DEFAULT_CONFIG, OpentixConfig } from '../models/config.model';
import type { TeamMember } from '../models/ticket.model';
import { buildAgentsTemplate } from '../utils/agents-template';
import { extractTicketIdFromBranch } from '../utils/branch-utils';

export class GitService {
  private workspaceRoot: string;
  private repoGit: SimpleGit;
  private worktreeGit: SimpleGit | null = null;
  private _defaultBranch: string | null = null;
  private _worktreePath: string | null = null;
  private _gitOpInProgress = false;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.repoGit = simpleGit(workspaceRoot);
  }

  /**
   * Get the worktree base path.
   * When already on the default branch, this is the workspace root.
   * Otherwise it is the dedicated .opentix-worktree directory.
   */
  get worktreePath(): string {
    if (!this._worktreePath) {
      this._worktreePath = path.join(this.workspaceRoot, WORKTREE_DIR);
    }
    return this._worktreePath;
  }

  /**
   * Whether Opentix is using the workspace root (no separate worktree).
   */
  get useWorkspaceRoot(): boolean {
    return this._worktreePath === this.workspaceRoot;
  }

  /**
   * Get the current branch name of the workspace.
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const ref = await this.repoGit.revparse(['--abbrev-ref', 'HEAD']);
      return ref.trim();
    } catch {
      return '';
    }
  }

  /**
   * Get the .opentix directory inside the worktree.
   */
  get opentixPath(): string {
    return path.join(this.worktreePath, OPENTIX_DIR);
  }

  /**
   * Get the tickets directory path.
   */
  get ticketsPath(): string {
    return path.join(this.opentixPath, TICKETS_DIR);
  }

  /**
   * Get the index.json path.
   */
  get indexPath(): string {
    return path.join(this.opentixPath, INDEX_FILE);
  }

  /**
   * Get the config.yml path.
   */
  get configPath(): string {
    return path.join(this.opentixPath, CONFIG_FILE);
  }

  /**
   * Get the sprints.json path.
   */
  get sprintsPath(): string {
    return path.join(this.opentixPath, SPRINTS_FILE);
  }

  /**
   * Get the team.yml path.
   */
  get teamPath(): string {
    return path.join(this.opentixPath, TEAM_FILE);
  }

  /**
   * Detect the repository's default branch dynamically.
   * Tries origin/HEAD first, falls back to common names, then first available branch.
   */
  async detectDefaultBranch(): Promise<string> {
    if (this._defaultBranch) {
      return this._defaultBranch;
    }

    try {
      // Try symbolic-ref for origin/HEAD
      const ref = await this.repoGit.raw([
        'symbolic-ref',
        'refs/remotes/origin/HEAD',
      ]);
      this._defaultBranch = ref.trim().replace('refs/remotes/origin/', '');
      return this._defaultBranch;
    } catch {
      // origin/HEAD not set -- try common names
    }

    // Fallback: check common branch names
    const candidates = ['main', 'master', 'trunk'];
    try {
      const branches = await this.repoGit.branchLocal();
      for (const candidate of candidates) {
        if (branches.all.includes(candidate)) {
          this._defaultBranch = candidate;
          return this._defaultBranch;
        }
      }
      // Last resort: first available branch
      if (branches.all.length > 0) {
        this._defaultBranch = branches.all[0];
        return this._defaultBranch;
      }
    } catch {
      // No branches at all
    }

    this._defaultBranch = 'main';
    return this._defaultBranch;
  }

  /**
   * Check if we're inside a git repository.
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.repoGit.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a remote is configured.
   */
  async hasRemote(): Promise<boolean> {
    try {
      const remotes = await this.repoGit.getRemotes();
      return remotes.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check whether the project has been explicitly initialized with Opentix.
   * Looks for config.yml on the local filesystem (default-branch checkout)
   * and via git plumbing (feature-branch checkout) to avoid creating a worktree.
   */
  async isInitialized(): Promise<boolean> {
    try {
      await fs.access(path.join(this.workspaceRoot, OPENTIX_DIR, CONFIG_FILE));
      return true;
    } catch {
      // Not on filesystem -- check the default branch via git plumbing
    }

    try {
      const defaultBranch = await this.detectDefaultBranch();
      await this.repoGit.raw([
        'cat-file', '-e', `${defaultBranch}:${OPENTIX_DIR}/${CONFIG_FILE}`,
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the worktree exists and is checked out to the default branch.
   * If the workspace is already on the default branch, we use the workspace root
   * instead of creating a second worktree (Git does not allow the same branch
   * checked out in two places).
   */
  async ensureWorktree(): Promise<void> {
    const defaultBranch = await this.detectDefaultBranch();
    const currentBranch = await this.getCurrentBranch();

    // Already on the default branch: use workspace root, no separate worktree
    if (currentBranch === defaultBranch) {
      this._worktreePath = this.workspaceRoot;
      this.worktreeGit = this.repoGit;
      return;
    }

    const wtPath = path.join(this.workspaceRoot, WORKTREE_DIR);

    try {
      // Check if worktree already exists
      await fs.access(path.join(wtPath, '.git'));
      // Worktree exists -- ensure we have a simple-git instance
      this._worktreePath = wtPath;
      if (!this.worktreeGit) {
        this.worktreeGit = simpleGit(wtPath);
      }
      return;
    } catch {
      // Worktree doesn't exist -- create it
    }

    try {
      // Clean up any stale worktree entry
      await this.repoGit.raw(['worktree', 'prune']);
    } catch {
      // Ignore prune errors
    }

    try {
      // Remove leftover directory if it exists without being a proper worktree
      await fs.rm(wtPath, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Create the worktree
    await this.repoGit.raw([
      'worktree',
      'add',
      wtPath,
      defaultBranch,
    ]);

    this._worktreePath = wtPath;
    this.worktreeGit = simpleGit(wtPath);
  }

  /**
   * Ensure the .opentix directory structure exists in the worktree.
   */
  async ensureOpentixStructure(config?: OpentixConfig): Promise<void> {
    await fs.mkdir(this.ticketsPath, { recursive: true });
    await fs.mkdir(path.join(this.opentixPath, TEMPLATES_DIR), {
      recursive: true,
    });

    // Write config: always write if explicitly provided, otherwise only create defaults
    if (config) {
      const configContent = buildConfigYaml(config);
      await fs.writeFile(this.configPath, configContent, 'utf-8');
    } else {
      try {
        await fs.access(this.configPath);
      } catch {
        const configContent = buildConfigYaml(DEFAULT_CONFIG);
        await fs.writeFile(this.configPath, configContent, 'utf-8');
      }
    }

    // Create default index if it doesn't exist
    try {
      await fs.access(this.indexPath);
    } catch {
      const defaultIndex = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        nextId: 1,
        tickets: [],
      };
      await fs.writeFile(
        this.indexPath,
        JSON.stringify(defaultIndex, null, 2),
        'utf-8',
      );
    }

    // Create default sprints config if it doesn't exist
    try {
      await fs.access(this.sprintsPath);
    } catch {
      const defaultSprints = {
        version: 1,
        nextId: 1,
        sprints: [],
      };
      await fs.writeFile(
        this.sprintsPath,
        JSON.stringify(defaultSprints, null, 2),
        'utf-8',
      );
    }

    // Create default team.yml if it doesn't exist
    try {
      await fs.access(this.teamPath);
    } catch {
      await fs.writeFile(this.teamPath, 'members: []\n', 'utf-8');
    }

    // Create default template if it doesn't exist
    const defaultTemplatePath = path.join(
      this.opentixPath,
      TEMPLATES_DIR,
      'default.md',
    );
    try {
      await fs.access(defaultTemplatePath);
    } catch {
      const template = `---
id: ""
title: ""
status: backlog
priority: medium
assignees: []
labels: []
---

## Description

Describe the ticket here.

## Acceptance Criteria

- [ ] Criterion 1

## Comments
`;
      await fs.writeFile(defaultTemplatePath, template, 'utf-8');
    }

    // Always regenerate AGENTS.md to stay in sync with config
    let resolvedConfig: OpentixConfig = DEFAULT_CONFIG;
    try {
      const configRaw = await fs.readFile(this.configPath, 'utf-8');
      resolvedConfig = parseConfigYaml(configRaw);
    } catch {
      // Config not readable yet -- use defaults
    }
    const agentsContent = buildAgentsTemplate(resolvedConfig);
    await fs.writeFile(
      path.join(this.opentixPath, AGENTS_FILE),
      agentsContent,
      'utf-8',
    );

    // Ensure CURRENT_TICKET.md is in the project's .gitignore
    await this.ensureGitignoreEntry(CURRENT_TICKET_FILE);
  }

  /**
   * Append an entry to the workspace root .gitignore if not already present.
   */
  private async ensureGitignoreEntry(entry: string): Promise<void> {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    let content = '';
    try {
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch {
      // .gitignore doesn't exist yet -- will be created
    }

    const lines = content.split('\n').map((l) => l.trim());
    if (!lines.includes(entry)) {
      const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
      await fs.writeFile(gitignorePath, `${content}${separator}${entry}\n`, 'utf-8');
    }
  }

  /**
   * Read a file from the worktree.
   */
  async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.worktreePath, relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write a file in the worktree.
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.worktreePath, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Delete a file from the worktree.
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.worktreePath, relativePath);
    await fs.unlink(fullPath);
  }

  /**
   * Check if a file exists in the worktree.
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.worktreePath, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory within the worktree.
   */
  async listFiles(relativePath: string): Promise<string[]> {
    const fullPath = path.join(this.worktreePath, relativePath);
    try {
      const entries = await fs.readdir(fullPath);
      return entries.filter((e) => e.endsWith('.md'));
    } catch {
      return [];
    }
  }

  /**
   * Stage, commit, and push changes in the worktree.
   * Returns true if push succeeded, false if in local-only mode or skipped.
   * Guarded by a reentrancy flag to prevent concurrent git mutations.
   */
  async commitAndPush(message: string): Promise<boolean> {
    if (this._gitOpInProgress) {
      console.log('Opentix: Skipping commitAndPush, git operation in progress');
      return false;
    }
    if (!this.worktreeGit) {
      throw new Error('Worktree not initialized');
    }

    this._gitOpInProgress = true;
    try {
      // Stage all changes in the .opentix directory
      await this.worktreeGit.add(
        path.join(OPENTIX_DIR, '*'),
      );

      // Commit
      const commitMsg = `${COMMIT_PREFIX}: ${message}`;
      await this.worktreeGit.commit(commitMsg);

      // Push if remote exists
      if (await this.hasRemote()) {
        try {
          const defaultBranch = await this.detectDefaultBranch();
          await this.worktreeGit.push('origin', defaultBranch);
          return true;
        } catch (err: unknown) {
          // Push rejected -- try pull-rebase-retry
          try {
            const defaultBranch = await this.detectDefaultBranch();
            await this.worktreeGit.pull('origin', defaultBranch, {
              '--rebase': null,
            });
            await this.worktreeGit.push('origin', defaultBranch);
            return true;
          } catch (retryErr: unknown) {
            const errMsg =
              retryErr instanceof Error ? retryErr.message : String(retryErr);
            vscode.window.showWarningMessage(
              `Opentix: Push failed after retry. Changes saved locally. Error: ${errMsg}`,
            );
            return false;
          }
        }
      }

      return false; // Local-only mode
    } finally {
      this._gitOpInProgress = false;
    }
  }

  /**
   * Pull latest changes from remote into the worktree.
   * Returns true if there were new changes.
   * Guarded by a reentrancy flag to prevent concurrent git mutations.
   */
  async pull(): Promise<boolean> {
    if (this._gitOpInProgress) {
      console.log('Opentix: Skipping pull, git operation in progress');
      return false;
    }
    if (!this.worktreeGit || !(await this.hasRemote())) {
      return false;
    }

    this._gitOpInProgress = true;
    try {
      const defaultBranch = await this.detectDefaultBranch();
      const result = await this.worktreeGit.pull('origin', defaultBranch, {
        '--rebase': null,
      });
      return (result.summary?.changes ?? 0) > 0;
    } catch {
      return false;
    } finally {
      this._gitOpInProgress = false;
    }
  }

  /**
   * Get the git user name for commit attribution.
   */
  async getAuthor(): Promise<string> {
    try {
      const name = await this.repoGit.raw(['config', 'user.name']);
      return name.trim() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get the git user email for identification.
   */
  async getAuthorEmail(): Promise<string> {
    try {
      const email = await this.repoGit.raw(['config', 'user.email']);
      return email.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Read and parse the .opentix/team.yml file.
   * Returns an empty array if the file is missing or unparseable.
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const raw = await fs.readFile(this.teamPath, 'utf-8');
      return parseTeamYaml(raw);
    } catch {
      return [];
    }
  }

  /**
   * Auto-register the current developer in team.yml.
   * Reads git config user.name and user.email, then adds or updates
   * the entry (deduplication by email). Commits and pushes if changed.
   */
  async ensureTeamMember(): Promise<void> {
    const name = await this.getAuthor();
    const email = await this.getAuthorEmail();

    if (name === 'Unknown' || email === 'unknown') {
      return;
    }

    const members = await this.getTeamMembers();
    const existing = members.find(
      (m) => m.email.toLowerCase() === email.toLowerCase(),
    );

    if (existing) {
      if (existing.name === name) {
        return; // Already registered, name unchanged
      }
      // Update name if it changed
      existing.name = name;
    } else {
      members.push({ name, email });
    }

    // Sort alphabetically by name for deterministic diffs
    members.sort((a, b) => a.name.localeCompare(b.name));

    const content = buildTeamYaml(members);
    await fs.writeFile(this.teamPath, content, 'utf-8');
    await this.commitAndPush(`update team - ${name}`);
  }

  /**
   * Read and parse the .opentix/config.yml into an OpentixConfig object.
   * Falls back to DEFAULT_CONFIG for missing or unparseable fields.
   */
  async readConfig(): Promise<OpentixConfig> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8');
      return parseConfigYaml(raw);
    } catch {
      return { ...DEFAULT_CONFIG, aiContext: { ...DEFAULT_CONFIG.aiContext } };
    }
  }

  /**
   * Resolve the actual path to the git HEAD file.
   * Handles worktree setups where `.git` is a file pointing to another gitdir.
   */
  async resolveGitHeadPath(): Promise<string> {
    const result = await this.repoGit.raw(['rev-parse', '--git-path', 'HEAD']);
    const resolved = result.trim();
    return path.isAbsolute(resolved)
      ? resolved
      : path.join(this.workspaceRoot, resolved);
  }

  /**
   * Check if there are uncommitted changes under .opentix/ in the worktree.
   * Returns true if any files are modified, untracked, or deleted.
   */
  async hasDirtyOpentixFiles(): Promise<boolean> {
    if (!this.worktreeGit) {
      return false;
    }
    const status = await this.worktreeGit.status();
    return status.files.some((f) =>
      f.path.startsWith(OPENTIX_DIR + '/'),
    );
  }

  /**
   * Extract a ticket ID from a branch name using the configured prefix.
   * Delegates to the standalone function in branch-utils.ts for testability.
   */
  extractTicketIdFromBranch(branchName: string, prefix: string): string | null {
    return extractTicketIdFromBranch(branchName, prefix);
  }
}

function buildConfigYaml(config: OpentixConfig): string {
  const statusList = config.statuses.map((s) => `  - ${s}`).join('\n');
  return `prefix: ${config.prefix}
statuses:
${statusList}
defaultAssignee: ${config.defaultAssignee || 'null'}
autoSync: ${config.autoSync}
syncIntervalSeconds: ${config.syncIntervalSeconds}
pushMode: ${config.pushMode}
commitStrategy: ${config.commitStrategy}
commitDebounceSeconds: ${config.commitDebounceSeconds}
# Default branch is auto-detected from origin/HEAD; override only if needed
# defaultBranch: main
# AI context auto-detection
# Automatically writes CURRENT_TICKET.md with the active ticket based on branch name
aiContext:
  enabled: ${config.aiContext.enabled}
`;
}

/**
 * Parse a config.yml string back into an OpentixConfig object.
 * Falls back to DEFAULT_CONFIG values for any missing or unparseable fields.
 */
function parseConfigYaml(raw: string): OpentixConfig {
  const config = { ...DEFAULT_CONFIG, aiContext: { ...DEFAULT_CONFIG.aiContext } };
  const lines = raw.split('\n');
  const statuses: string[] = [];
  let inStatuses = false;
  let inAiContext = false;

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (inStatuses) { inStatuses = false; }
      continue;
    }

    // Collect status list items
    if (inStatuses) {
      if (trimmed.startsWith('- ')) {
        statuses.push(trimmed.slice(2).trim());
        continue;
      }
      inStatuses = false;
    }

    // Parse aiContext nested fields (indented under aiContext:)
    if (inAiContext) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        const nestedColonIdx = trimmed.indexOf(':');
        if (nestedColonIdx !== -1) {
          const nestedKey = trimmed.slice(0, nestedColonIdx).trim();
          const nestedVal = trimmed.slice(nestedColonIdx + 1).trim();
          if (nestedKey === 'enabled') {
            config.aiContext.enabled = nestedVal === 'true';
          }
        }
        continue;
      }
      inAiContext = false;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) { continue; }

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case 'prefix':
        config.prefix = val || DEFAULT_CONFIG.prefix;
        break;
      case 'statuses':
        inStatuses = true;
        break;
      case 'defaultAssignee':
        config.defaultAssignee = val === 'null' || !val ? null : val;
        break;
      case 'autoSync':
        config.autoSync = val === 'true';
        break;
      case 'syncIntervalSeconds':
        config.syncIntervalSeconds = parseInt(val, 10) || DEFAULT_CONFIG.syncIntervalSeconds;
        break;
      case 'pushMode':
        if (val === 'direct' || val === 'branch-pr') {
          config.pushMode = val;
        }
        break;
      case 'commitStrategy':
        if (val === 'immediate' || val === 'debounce') {
          config.commitStrategy = val;
        }
        break;
      case 'commitDebounceSeconds':
        config.commitDebounceSeconds = parseInt(val, 10) || DEFAULT_CONFIG.commitDebounceSeconds;
        break;
      case 'defaultBranch':
        if (val) { config.defaultBranch = val; }
        break;
      case 'aiContext':
        inAiContext = true;
        break;
    }
  }

  if (statuses.length > 0) {
    config.statuses = statuses;
  }

  return config;
}

/**
 * Parse team.yml content into an array of TeamMember objects.
 * Handles the format:
 *   members:
 *     - name: Alice
 *       email: alice@example.com
 */
function parseTeamYaml(raw: string): TeamMember[] {
  const members: TeamMember[] = [];
  const lines = raw.split('\n');
  let inMembers = false;
  let currentMember: Partial<TeamMember> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed === 'members: []') {
      return [];
    }

    if (trimmed === 'members:') {
      inMembers = true;
      continue;
    }

    if (!inMembers) {
      continue;
    }

    // New list item: "- name: ..."
    if (trimmed.startsWith('- name:')) {
      // Push previous member if complete
      if (currentMember.name && currentMember.email) {
        members.push(currentMember as TeamMember);
      }
      currentMember = { name: trimmed.slice('- name:'.length).trim() };
      continue;
    }

    // Continuation field: "  email: ..."
    if (trimmed.startsWith('email:')) {
      currentMember.email = trimmed.slice('email:'.length).trim();
      continue;
    }

    // Non-indented, non-list line means end of members block
    if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('-')) {
      break;
    }
  }

  // Push last member
  if (currentMember.name && currentMember.email) {
    members.push(currentMember as TeamMember);
  }

  return members;
}

/**
 * Serialize an array of TeamMember objects into team.yml content.
 */
function buildTeamYaml(members: TeamMember[]): string {
  if (members.length === 0) {
    return 'members: []\n';
  }

  const entries = members
    .map((m) => `  - name: ${m.name}\n    email: ${m.email}`)
    .join('\n');

  return `members:\n${entries}\n`;
}
