# Agent Instructions

## Table of Contents

- [Documentation Maintenance](#documentation-maintenance)
- [Opentix Project Overview](#opentix-project-overview)
- [Supported IDEs](#supported-ides)
- [Core Features](#core-features)
- [Technical Overview](#technical-overview)
- [Project Stack](#project-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Version Control & Release Management](#version-control--release-management)
- [Folder Structure Guidelines](#folder-structure-guidelines)
- [Coding Conventions & Best Practices](#coding-conventions--best-practices)

---

## Documentation Maintenance

> **CRITICAL**: Keep AGENTS.md synchronized with code changes at all times.

### Documentation Update Requirements

**When to Update AGENTS.md**:

- **ALWAYS** update `AGENTS.md` when you:
  - Change folder structure or organization patterns
  - Add, remove, or modify code patterns or conventions
  - Update architectural decisions or approaches
  - Change file naming conventions or organization standards
  - Modify services, utilities, or common code patterns
  - Update the build system or tooling
  - Add new commands, services, or webview features
  - Change the message protocol between host and webview

**Update Process**:

1. **Before or during code changes**: Identify if `AGENTS.md` is affected
2. **Make code changes**: Implement your structural or pattern changes
3. **Update documentation**: Immediately update `AGENTS.md` to reflect the new structure/patterns
4. **Review**: Ensure documentation accurately describes the current state of the codebase
5. **Commit together**: Commit documentation updates alongside code changes

**What to Document**:

- Folder structures and organization patterns
- File naming conventions
- Code patterns and best practices
- Architecture decisions and rationale
- Service responsibilities and dependencies
- Message protocol changes (host <-> webview)

> **Remember**: Outdated documentation is worse than no documentation. If the code structure changes but `AGENTS.md` doesn't, it creates confusion and inconsistency.

---

## Opentix Project Overview

**Opentix** is a VS Code extension for git-native ticket management. Tickets are stored as Markdown files with YAML frontmatter in the repository, visualized on a Kanban board inside the IDE, and synced through Git. All ticket data lives on the repository's default branch, keeping the developer's working branch untouched.

### Supported IDEs

Opentix works with any IDE that supports VS Code extensions:

- **VS Code**
- **Cursor**
- **Windsurf**
- **Antigravity**
- **Eclipse Theia**
- **Gitpod**
- **Code-Server**

### Core Features

1. **Kanban Board**: Visual board inside VS Code with drag-and-drop status transitions
2. **Markdown Tickets**: Each ticket is a structured Markdown file with YAML frontmatter
3. **Git-Native Storage**: All data lives in `.opentix/` on the repository's default branch
4. **Git Worktree Isolation**: Uses a git worktree so the working branch is never affected
5. **Auto-Sync**: Background pull/push keeps the team in sync (60-second interval)
6. **File Watching**: Real-time index updates when ticket files change
7. **AI Integration**: Ticket context export as JSON for AI tools
8. **AI Context Auto-Detection**: Automatically detects the current ticket from the branch name (e.g., `feat/OPTX-0012-auth`) and writes `CURRENT_TICKET.md` (gitignored) at the workspace root with the full ticket context, updated on branch switch. Works with all AI IDEs and tools.
9. **Project Initialization**: Onboarding wizard with two paths -- "Use recommended settings" (instant defaults) or "Customize settings" (step-by-step config for prefix, statuses, sync, push mode, commit strategy, and AI context). Scaffolds the `.opentix/` structure with the chosen config.
10. **Sprint Management**: Define sprints (1-week/2-week) and breaks, assign tickets to sprints, filter the board by sprint with auto-detection of the current sprint based on date

---

## Technical Overview

This project is a **VS Code extension** built with **TypeScript** and **esbuild**, following a clear separation between the **extension host** (Node.js) and the **webview** (browser).

The architecture follows:

- **Extension Host**: Runs in the VS Code Node.js process with full access to the file system, Git, and VS Code API
- **Webview**: Runs in an isolated browser context, communicates with the host via a typed `postMessage` protocol
- **Service-Oriented Architecture**: Core logic is encapsulated in services with explicit dependencies
- **Event-Driven Updates**: File watcher and sync events propagate changes through the system
- **Git Worktree Pattern**: Ticket data is isolated on the default branch using git worktrees

---

## Project Stack

### Extension Host (Node.js)

- **Language**: TypeScript 5.3.3
- **Target**: Node.js 18+ (ES2022)
- **Module System**: CommonJS
- **Build Tool**: esbuild 0.27.3
- **Git Operations**: simple-git 3.22.0
- **Markdown Parsing**: gray-matter 4.0.3 (YAML frontmatter)
- **VS Code API**: @types/vscode ^1.85.0

### Webview (Browser)

- **Language**: TypeScript (compiled to IIFE)
- **Target**: ES2020
- **Styling**: Plain CSS with VS Code CSS variables for theming
- **No Framework**: Vanilla TypeScript with direct DOM manipulation

### Testing

- **Unit Tests**: Vitest 4.0.18
- **Integration Tests**: @vscode/test-electron 2.3.8
- **Test Runner**: `bun run test:unit` (unit), `bun run test:integration` (integration)

### Build & Tooling

- **Package Manager**: Bun (npm compatible)
- **Bundler**: esbuild (separate builds for extension host and webview)
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint
- **CI/CD**: Semantic-release with conventional commits

### Infrastructure

- **Version Control**: Git with Conventional Commits
- **Release Management**: semantic-release 24.2.6
- **Changelog**: conventional-changelog-conventionalcommits
- **Packaging**: vsce (VS Code Extension packaging)

---

## Project Structure

```
opentix/
├── .vscode/
│   ├── launch.json               # Debug configuration (F5 to run)
│   └── tasks.json                # Build tasks
├── dist/                          # Build output (generated)
│   ├── extension.js               # Compiled extension host
│   └── webview/
│       └── kanban.js              # Compiled webview
├── docs/
│   ├── development-setup.md       # Development workflow guide
│   └── opentix_architecture_review_comments.md
├── resources/
│   └── icon.svg                   # Extension icon
├── src/
│   ├── extension.ts               # Main entry point (activate/deactivate)
│   ├── commands/                   # Command handlers
│   │   ├── createTicket.ts
│   │   ├── init-project.ts
│   │   ├── openBoard.ts
│   │   └── syncTickets.ts
│   ├── models/                    # TypeScript interfaces/types
│   │   ├── config.model.ts
│   │   ├── sprint.model.ts        # Sprint, SprintConfig, CreateSprintInput
│   │   └── ticket.model.ts        # Ticket types + TeamMember
│   ├── services/                  # Core business logic
│   │   ├── ai.service.ts          # AI context generation + current ticket context
│   │   ├── branch-watcher.service.ts # Branch change detection via git HEAD
│   │   ├── git.service.ts         # Git operations, worktree management, team member registry, reentrancy guard
│   │   ├── index.service.ts       # Index cache, file watching, events (onIndexChanged + onWatcherRebuild)
│   │   ├── sprint.service.ts      # Sprint CRUD, validation, date math
│   │   ├── sync.service.ts        # Background sync (pull/push) + safety-net auto-commit
│   │   ├── ticket.service.ts      # Ticket CRUD operations, content-aware index rebuild
│   │   └── watcher.service.ts     # File watcher wrapper + auto-commit of external changes
│   ├── utils/                     # Utility functions
│   │   ├── agents-template.ts     # .opentix/AGENTS.md template builder
│   │   ├── branch-utils.ts        # Branch name parsing, ticket ID extraction
│   │   ├── constants.ts           # Directory names, statuses, config
│   │   ├── id-generator.ts        # Ticket ID generation (OPTX-0001)
│   │   └── markdown.ts            # Markdown parse/serialize (gray-matter)
│   └── webview/                   # Webview UI code
│       ├── KanbanViewProvider.ts   # VS Code webview panel manager
│       └── kanban/                # Frontend webview code
│           ├── app.ts             # Main app (state, render, events, drag-drop)
│           ├── bridge.ts          # Typed message protocol definitions
│           ├── index.html         # HTML template with CSP placeholders
│           └── styles/
│               ├── board.css      # Kanban board styles
│               └── theme.css      # VS Code CSS variable theming
├── test/
│   ├── fixtures/
│   │   └── sample-ticket.md       # Test fixture data
│   └── unit/
│       ├── branch-detection.test.ts  # Branch name ticket ID extraction tests
│       ├── id-generator.test.ts
│       ├── markdown.test.ts
│       ├── sprint.test.ts           # Sprint service unit tests
│       └── sprint-markdown.test.ts  # Sprint field round-trip tests
├── .gitignore
├── .releaserc.js                  # Semantic-release configuration
├── .vscodeignore                  # Files excluded from VSIX package
├── AGENTS.md                      # This file
├── changelog.config.js            # Changelog generation config
├── esbuild.config.mjs             # Build configuration (host + webview)
├── package.json
├── README.md
├── tsconfig.json                  # TypeScript config (extension host)
├── tsconfig.webview.json          # TypeScript config (webview)
└── vitest.config.ts               # Vitest test configuration
```

---

## Architecture

### Activation Flow

The extension uses a **two-path activation** gated by `GitService.isInitialized()` (checks for `.opentix/config.yml` on the filesystem or via git plumbing on the default branch):

- **Not initialized**: Services are created and commands registered, but no `.opentix/` files are created. The status bar shows "Opentix (init)" and links to the init command. When the user runs "Opentix: Initialize Project", the init command first checks if `.opentix` already exists on main (remote). If yes, it fetches, pulls, and joins the existing project (no wizard). If no, it runs the full onboarding wizard and scaffolds.
- **Already initialized**: The `startServices()` function runs -- sets up the worktree, performs a one-time bootstrap sync from remote, ensures structure is current, starts the watcher/index, enables auto-sync (if `config.autoSync` is true), and starts AI context services.

If `isInitialized()` initially returns false but a remote exists, activation performs `fetchDefaultBranchFromRemote()` and re-checks initialization once. This lets a newly installed machine discover an already-initialized Opentix setup on `origin/<defaultBranch>` without requiring IDE restarts.

After `initProjectCommand` succeeds, it returns `true` and the command handler in `extension.ts` calls `startServices()` to bring the extension fully online. A `servicesStarted` flag prevents double-initialization.

### Service Dependency Graph

```
extension.ts (Entry Point)
├── GitService             (Git operations, worktree management, team member registry, reentrancy guard)
├── TicketService          (Ticket CRUD, content-aware index rebuild, depends on GitService)
├── IndexService           (Index cache, file watching, onIndexChanged + onWatcherRebuild events, depends on TicketService + GitService)
├── SyncService            (Background sync + safety-net auto-commit, depends on GitService + IndexService)
├── WatcherService         (File watcher + auto-commit of external changes, depends on GitService + IndexService)
├── SprintService          (Sprint CRUD, validation, depends on GitService + TicketService)
├── AIService              (Context generation + current ticket, depends on TicketService + IndexService)
├── BranchWatcherService   (Branch change detection, depends on GitService; guarded by aiContext.enabled)
└── KanbanViewProvider     (Webview provider, depends on TicketService + IndexService + SyncService + SprintService + GitService)
```

### Extension Host <-> Webview Communication

Communication uses a **typed message protocol** defined in `src/webview/kanban/bridge.ts`:

**Host -> Webview Messages**:
- `updateBoard` -- Send full board state (tickets by status, includes sprint field per card)
- `ticketDetail` -- Send single ticket details (includes sprint field)
- `syncStatus` -- Send sync state (syncing, synced, error)
- `config` -- Send configuration data
- `sprintConfig` -- Send sprint list and current sprint ID (auto-detected by date)
- `teamMembers` -- Send team member list and current user identity (name + email)

**Webview -> Host Messages**:
- `ready` -- Webview loaded and ready
- `createTicket` -- Request to create a ticket (includes optional sprint and assignees)
- `moveTicket` -- Drag-and-drop status change
- `openTicket` -- Open ticket details
- `updateTicket` -- Edit ticket fields (title, description, status, sprint, etc.)
- `deleteTicket` -- Delete a ticket
- `addComment` -- Add a comment to a ticket
- `sync` -- Trigger manual sync
- `createSprint` -- Create a new sprint or break
- `updateSprint` -- Update sprint name/dates
- `deleteSprint` -- Delete a sprint (blocked if tickets reference it)

### Data Flow

**Extension-initiated changes** (Kanban board, commands):

1. User action in webview -> `postMessage` -> `KanbanViewProvider.handleWebviewMessage()`
2. Handler calls appropriate service (e.g., `TicketService.updateTicket()`)
3. Service writes file via `GitService`
4. `GitService.commitAndPush()` commits and pushes
5. `KanbanViewProvider` immediately calls `IndexService.rebuild()` after local mutations (create/move/update/delete) and sends a fresh board snapshot, avoiding stale cached board state
6. File watcher still detects changes and may fire additional `IndexService.rebuild()` events
7. Index change event -> `KanbanViewProvider.sendBoardUpdate()`
8. Webview receives update -> re-renders board

**External changes** (AI agents, manual file edits):

1. External tool writes file into `.opentix/tickets/` (e.g., `OPTX-0005.md`)
2. File watcher detects change -> `IndexService.rebuild()` (writes index.json with new entry)
3. `onWatcherRebuild` event fires -> `WatcherService` schedules auto-commit (2s delay)
4. `WatcherService` checks `GitService.hasDirtyOpentixFiles()` -> finds dirty files -> calls `commitAndPush()`
5. Index change event -> `KanbanViewProvider.sendBoardUpdate()`
6. Webview receives update -> re-renders board

**Safety net**: `SyncService.sync()` (every 60 seconds) also checks for uncommitted `.opentix/` changes and auto-commits them, catching non-ticket file edits (e.g., `sprints.json`, `config.yml`) that the `*.md` watcher wouldn't see.

### Git Worktree Strategy

- If workspace is on the **default branch**: uses the workspace root directly (no extra worktree)
- If workspace is on a **feature branch**: creates `.opentix-worktree/` on a dedicated sync branch named `opentix-sync-<defaultBranch>` (seeded from `origin/<defaultBranch>` when available)
- All ticket files live in `.opentix/tickets/` and are pushed to `origin/<defaultBranch>` from the sync branch using `HEAD:<defaultBranch>` refspec
- Auto-commits with prefix: `opentix: <message>`
- Auto-push with merge-retry on conflict (never rebase, to avoid stuck worktree state)
- **Default branch detection** (`detectDefaultBranch()`): checks origin/HEAD → local branches → remote tracking branches (origin/main, etc.). Never falls back to the current branch to prevent misidentifying a feature branch as default.
- **Initialization check** (`isInitialized()`): tries both local ref (`main:path`) and remote tracking ref (`origin/main:path`) via git plumbing, so it works even when the default branch only exists as a remote tracking branch.
- **Worktree branch verification**: `ensureWorktree()` verifies an existing worktree is on the expected sync branch (`opentix-sync-<defaultBranch>`) and recreates it if mismatched. If the default branch doesn't exist locally, creates from the remote tracking branch (`origin/main`).
- **Per-operation worktree revalidation**: file operations (`readFile`/`writeFile`/`deleteFile`/`listFiles`) and git mutations (`pull`/`commitAndPush`/`hasDirtyOpentixFiles`) call `ensureWorktree()` at the start of each operation so branch switches in the active workspace don't leave stale worktree handles.
- **Conflict recovery**: `pull()` and `commitAndPush()` abort any incomplete merge/rebase state on failure via `abortIncompleteGitState()`, restoring the worktree to a clean, usable state
- **Startup health check**: `ensureWorktree()` calls `abortIncompleteGitState()` on startup to recover from stale rebase/merge states left over from a previous session
- **Empty commit safety**: `commitAndPush()` gracefully handles "nothing to commit" instead of throwing, preventing cascading failures when changes were already committed by another code path
- `.opentix-worktree` is auto-added to the user's project `.gitignore`

### Auto-Commit of External Changes

External tools (AI agents, scripts, manual edits) that write files directly into `.opentix/` are automatically detected and committed:

- **File watcher path**: When `*.md` files change in the tickets directory, `IndexService` rebuilds the index and fires `onWatcherRebuild`. `WatcherService` then checks for uncommitted `.opentix/` files (via `GitService.hasDirtyOpentixFiles()`) and auto-commits them within ~3 seconds.
- **Sync safety net**: Every sync cycle (60s), `SyncService` checks for any uncommitted local `.opentix/` changes and auto-commits them. This catches edits to non-ticket files (e.g., `sprints.json`, `config.yml`) that the `*.md` watcher wouldn't see.
- **Double-commit prevention**: `TicketService.rebuildIndex()` compares new index content against the existing index (deterministically sorted by ticket id) and skips writing `index.json` when nothing meaningful changed. This prevents the watcher from seeing a dirty `index.json` after extension-initiated operations that already committed.
- **Reentrancy guard**: `GitService.commitAndPush()` and `pull()` are guarded by a `_gitOpInProgress` flag. If a git mutation is already running, subsequent calls return early (skip-if-busy) to prevent concurrent operations from colliding.

### Ticket Data Model

Tickets are Markdown files with YAML frontmatter:

- **Frontmatter**: id, title, status, sprint (optional), priority, assignees, labels, createdAt, updatedAt, createdBy, branch, linkedCommits
- **Sections**: Description, Acceptance Criteria, Comments
- **Comments**: Stored as H3 headings `### <timestamp> | <author>`
- **File naming**: `<ID>.md` (e.g., `OPTX-0001.md`)
- **ID format**: `OPTX-NNNN` (zero-padded 4-digit number)
- **Sprint field**: Optional reference to a sprint ID (e.g., `SPR-0001`). Only sprints with type `sprint` (not `break`) can be assigned.

### Sprint Data Model

Sprints are stored in `.opentix/sprints.json`:

- **Sprint fields**: id (immutable, `SPR-NNNN`), name (display label), startDate (`YYYY-MM-DD`), endDate (`YYYY-MM-DD`), type (`sprint` | `break`)
- **ID format**: `SPR-NNNN` (zero-padded 4-digit number, auto-generated)
- **Validation**: No overlapping date ranges, `startDate <= endDate`, non-empty name
- **Deletion**: Blocked if any tickets reference the sprint; user must reassign tickets first
- **Current sprint detection**: Compares today's date against sprint ranges (breaks excluded)
- **Sprint filtering**: Webview-local filtering (host sends all data, webview filters in `renderColumns()`)

### Team Data Model

Team members are stored in `.opentix/team.yml`:

- **Self-registering**: Each developer is auto-added from `git config user.name` and `git config user.email` on extension activation
- **Fields**: `name` (display name), `email` (unique identifier for deduplication)
- **Deduplication**: By email (case-insensitive). If a developer changes their `user.name`, the existing entry is updated
- **Sorting**: Members sorted alphabetically by name for deterministic diffs
- **Usage**: Powers the assignee dropdown in the Kanban board webview
- **Config**: `defaultAssignee` in `config.yml` auto-assigns new tickets when no assignees are specified

### AI Context Auto-Detection

Opentix automatically detects the current ticket from the git branch name and writes context files for AI assistants.

- **Detection**: Watches the resolved git HEAD path for branch changes. Extracts ticket IDs matching the pattern `<PREFIX>-NNNN` (e.g., `OPTX-0012`) from the branch name using `extractTicketIdFromBranch()` (in `src/utils/branch-utils.ts`).
- **Context file** (gitignored, branch-specific local state):
  - `CURRENT_TICKET.md` at workspace root -- universal Markdown readable by all AI tools and IDEs
- **Three states**: Ticket found (full context), no ticket ID in branch ("no ticket detected"), ticket ID found but missing file ("ticket not found")
- **Lifecycle**: Always-write on activation and branch change; files persist on deactivate
- **Config**: Controlled by `aiContext.enabled` in `config.yml` (team default) and VS Code setting `opentix.aiContext.enabled` (per-developer override). Precedence: VS Code setting > config.yml > default (`true`)
- **Detached HEAD**: Returns literal string `HEAD` which doesn't match the ticket pattern, naturally treated as "no ticket"

### Default Statuses

```
backlog -> in-progress -> review -> done -> cancelled
```

---

## Version Control & Release Management

The project uses **Conventional Commits** and **semantic-release** for automated version management.

### Conventional Commits

All commit messages follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Supported Commit Types**:

- **`feat`**: A new feature (MINOR version bump)
- **`fix`**: A bug fix (PATCH version bump)
- **`docs`**: Documentation only changes
- **`chore`**: Changes to build process or auxiliary tools
- **`refactor`**: Code change that neither fixes a bug nor adds a feature
- **`perf`**: Performance improvements
- **`test`**: Adding or updating tests
- **`build`**: Changes to build system or dependencies
- **`ci`**: Changes to CI/CD configuration

**Commit Message Examples**:

```bash
# Feature (minor version bump)
feat: add drag-and-drop ticket reordering

# Bug fix (patch version bump)
fix: resolve worktree cleanup on branch switch

# Chore
chore(deps): update esbuild to 0.27.3

# Breaking change (major version bump)
feat!: redesign ticket frontmatter schema
```

**Breaking Changes**:

- Add `!` after the type/scope to indicate a breaking change (MAJOR version bump)

### Semantic Release

**Configuration** (`.releaserc.js`):

- **Branches**: `main` (stable releases), `staging` (prerelease)
- **Plugins**: commit-analyzer, release-notes-generator, changelog, npm (no publish), git, GitHub
- **Changelog**: Generated from conventional commits into `CHANGELOG.md`
- **npm publish**: Disabled (VS Code extensions use `vsce package`)

**Release Workflow**:

1. Developer pushes commits following Conventional Commits format
2. semantic-release analyzes commit messages since last release
3. Version bump calculated (major/minor/patch)
4. CHANGELOG.md and package.json updated
5. Git tag created and GitHub release published

### Best Practices

**Commit Message Guidelines**:

- **ALWAYS** use conventional commit format
- Use clear, descriptive commit messages
- Use imperative mood ("add feature" not "added feature")
- Keep first line under 72 characters
- Add body for complex changes explaining the "why"
- **NEVER** use generic messages like "update", "fix", "changes"

---

## Folder Structure Guidelines

### General Organization Principles

**Service Pattern** (`src/services/`):

- Each service is a class exported from a `*.service.ts` file
- Services receive dependencies via constructor injection
- Services use the VS Code `Disposable` pattern for cleanup (`dispose()` method)
- Services emit events via `vscode.EventEmitter` when applicable

**Command Pattern** (`src/commands/`):

- Each command is an exported async function in its own file
- Commands receive the required service(s) as parameters
- Commands are registered in `extension.ts` via `vscode.commands.registerCommand`

**Model Pattern** (`src/models/`):

- TypeScript interfaces and types in `*.model.ts` files
- Exported as named exports (interfaces, types)
- Keep models focused on data shapes, not behavior

**Utility Pattern** (`src/utils/`):

- Pure utility functions in focused files
- Exported as named function exports
- No side effects, no dependencies on VS Code API (when possible)

**Webview Pattern** (`src/webview/`):

- `KanbanViewProvider.ts` bridges the VS Code API and the webview
- `kanban/` folder contains all browser-side code
- `bridge.ts` defines the typed message protocol (single source of truth)
- `app.ts` is the webview entry point (state management, rendering, event handling)
- `styles/` contains CSS files using VS Code CSS variables for theming

### When to Use Which Folder

- **`services/`**: Business logic, Git operations, file I/O, background tasks
- **`commands/`**: VS Code command palette actions (thin wrappers calling services)
- **`models/`**: TypeScript interfaces, types, and data shape definitions
- **`utils/`**: Pure functions, constants, helpers with no side effects
- **`webview/`**: All browser-context UI code and host-webview communication

### Component Organization

> **CRITICAL RULE**: Keep the boundary between extension host and webview strictly separated. The webview has NO access to Node.js APIs, file system, or VS Code API. All communication goes through the typed message protocol in `bridge.ts`.

- **Extension host code** (`src/` except `src/webview/kanban/`): Has access to Node.js, VS Code API, file system
- **Webview code** (`src/webview/kanban/`): Browser-only context, uses `postMessage` for all external operations
- **Shared types** (`src/webview/kanban/bridge.ts`): Message types used by both sides (duplicated as needed)
- **NEVER** import Node.js or VS Code modules in webview code
- **NEVER** import webview code in extension host code (except the provider)

---

## Coding Conventions & Best Practices

### TypeScript & Type Safety

1. **USE** TypeScript strict mode (configured in `tsconfig.json`)
2. **AVOID** `any` type -- use proper types or `unknown`
3. **ALWAYS** define interfaces for data shapes in `src/models/`
4. **PREFER** type imports when importing only types: `import type { Ticket } from './models/ticket.model'`
5. **USE** `as const` for constant arrays to get literal types (see `DEFAULT_STATUSES`)

### Naming Conventions

1. **Files**: `kebab-case` for all files and folders
   - Services: `*.service.ts` (e.g., `git.service.ts`, `ticket.service.ts`)
   - Models: `*.model.ts` (e.g., `ticket.model.ts`, `config.model.ts`)
   - Tests: `*.test.ts` (e.g., `markdown.test.ts`)
   - Commands: `camelCase.ts` (e.g., `createTicket.ts`, `openBoard.ts`)
2. **Classes**: `PascalCase` (e.g., `GitService`, `TicketService`, `KanbanViewProvider`)
3. **Interfaces**: `PascalCase` (e.g., `Ticket`, `TicketFrontmatter`, `CreateTicketInput`)
4. **Functions**: `camelCase` (e.g., `generateTicketId`, `parseTicket`, `serializeTicket`)
5. **Constants**: `UPPER_SNAKE_CASE` for module-level constants (e.g., `OPENTIX_DIR`, `DEFAULT_STATUSES`)
6. **Variables**: `camelCase` with descriptive names

### Export Patterns

1. **Services**: Named class exports (`export class GitService {}`)
2. **Commands**: Named function exports (`export async function createTicketCommand() {}`)
3. **Models**: Named interface/type exports (`export interface Ticket {}`)
4. **Utils**: Named function exports (`export function generateTicketId() {}`)
5. **Constants**: Named const exports (`export const OPENTIX_DIR = '.opentix'`)

### Error Handling

1. **ALWAYS** handle errors gracefully -- extension operations should not crash VS Code
2. **USE** `try/catch` with proper error typing (`catch (err: unknown)`)
3. **EXTRACT** error messages safely: `err instanceof Error ? err.message : String(err)`
4. **SHOW** user-friendly messages via `vscode.window.showErrorMessage()` or `showWarningMessage()`
5. **LOG** non-critical errors with `console.log()` instead of crashing
6. **NEVER** let unhandled promise rejections propagate

### Async Patterns

1. **USE** `async/await` throughout (no raw Promise chains)
2. **USE** `fs/promises` for all file system operations (never `fs` sync methods)
3. **HANDLE** promise rejections in all async code paths
4. **USE** `simple-git` async API for all Git operations

### VS Code Extension Patterns

1. **Register disposables** via `context.subscriptions.push()` for proper cleanup
2. **USE** `vscode.EventEmitter` for service-to-service event communication
3. **USE** VS Code `StatusBarItem` for user-facing status indicators
4. **USE** `vscode.window.showInputBox()` and `showQuickPick()` for user input
5. **FOLLOW** the `activate()` / `deactivate()` lifecycle pattern
6. **GUARD** activation with workspace, git repo, and `isInitialized()` checks before starting services

### Build System

1. **Two separate builds**: Extension host (CJS, Node) and Webview (IIFE, Browser)
2. **esbuild** handles bundling -- no need for Webpack or Rollup
3. **External `vscode`**: The VS Code module is provided at runtime, not bundled
4. **Source maps** enabled for both builds for debugging
5. **Commands**:
   - `bun run compile` -- Build extension host only
   - `bun run compile:webview` -- Build webview only
   - `bun run compile:all` -- Build both
   - `bun run watch:all` -- Watch mode for development

### Testing

1. **Unit tests** in `test/unit/` for pure utility functions
2. **Test fixtures** in `test/fixtures/` for sample data
3. **Vitest** as the test runner with `globals: false` (explicit imports)
4. **Integration tests** via `@vscode/test-electron` for VS Code API testing
5. **Test naming**: `*.test.ts` matching the source file name
6. **Commands**:
   - `bun run test:unit` -- Run unit tests
   - `bun run test:integration` -- Run integration tests
   - `bun run test` -- Run all tests

### Code Quality

1. **PREFER** small, focused functions (< 50 lines ideally)
2. **SPLIT** large services if they exceed ~400 lines
3. **USE** JSDoc comments for public methods on services
4. **PREFER** meaningful variable names over abbreviations
5. **USE** single quotes for strings (project convention)
6. **USE** Prettier for code formatting
7. **UPDATE** `AGENTS.md` whenever code structure, patterns, or conventions change (see [Documentation Maintenance](#documentation-maintenance))

### Common Commands

```bash
# Install dependencies
bun install

# Build extension + webview
bun run compile:all

# Watch mode (rebuild on changes)
bun run watch:all

# Run unit tests
bun run test:unit

# Run all tests
bun run test

# Lint
bun run lint

# Package VSIX
bun run package

# Debug: Press F5 in VS Code to launch Extension Development Host
```

---

## Quick Reference

### VS Code Commands

| Command | Description |
|---|---|
| `Opentix: Open Board` | Open the Kanban board |
| `Opentix: Create Ticket` | Create a new ticket via quick input |
| `Opentix: Sync Tickets` | Manually sync with remote |
| `Opentix: Initialize Project` | Onboarding wizard — recommended defaults or step-by-step customization |
| `Opentix: Get Ticket Context (AI)` | View ticket as structured JSON |
| `Opentix: Get All Tickets Context (AI)` | View all tickets as JSON |

### Key Directories

- `src/services/` -- Core business logic
- `src/commands/` -- VS Code command handlers
- `src/models/` -- TypeScript interfaces and types
- `src/utils/` -- Pure utility functions and constants
- `src/webview/` -- Webview UI code and host bridge
- `test/` -- Unit and integration tests
- `dist/` -- Build output (gitignored)

### .opentix/AGENTS.md (User Projects)

When Opentix initializes a project, it generates an `AGENTS.md` file inside `.opentix/`. This context file is designed for AI assistants and coding agents working within the user's repository. It documents:

- Directory structure of `.opentix/`
- Ticket format (YAML frontmatter + Markdown sections) with examples
- Sprint format (`sprints.json`)
- Configuration reference (`config.yml`)
- Status workflow and ID conventions
- Rules for reading, creating, and modifying tickets
- Current ticket context (`CURRENT_TICKET.md`) and how to use it
- Quick reference table for common lookups

The template is built dynamically from the project config (prefix, statuses) via `src/utils/agents-template.ts` and is regenerated each time `ensureOpentixStructure()` runs so it stays in sync with `config.yml`.

---

> This document provides context for the Opentix VS Code extension codebase. Keep it updated as the project evolves. When in doubt about a pattern, check the existing source code in the relevant directory for established conventions.
