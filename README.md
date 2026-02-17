# Opentix

Git-native ticket management for VS Code. Store tickets as Markdown files, visualize them on a Kanban board, and sync everything through Git.

## Features

- **Kanban Board** -- Visual board inside VS Code with drag-and-drop status transitions
- **Markdown Tickets** -- Each ticket is a structured Markdown file with YAML frontmatter
- **Git-Native** -- All data lives in your repository on the default branch
- **Auto-Sync** -- Background pull/push keeps the team in sync
- **AI-Ready** -- Ticket context is accessible to AI tools via commands and Cursor Rules

## Quick Start

1. Open a Git repository in VS Code
2. Run `Opentix: Initialize Project` from the Command Palette (`Cmd+Shift+P`)
3. Run `Opentix: Open Board` to see the Kanban board
4. Create tickets with `Opentix: Create Ticket` or the "+ New Ticket" button on the board

## How It Works

Opentix uses a **git worktree** checked out to your repository's default branch. This means:

- Ticket files live in `.opentix/tickets/` on the default branch
- Your working branch is never touched
- Changes are committed and pushed automatically
- Multiple developers can update tickets simultaneously

## Commands

| Command | Description |
|---|---|
| `Opentix: Open Board` | Open the Kanban board |
| `Opentix: Create Ticket` | Create a new ticket via quick input |
| `Opentix: Sync Tickets` | Manually sync with remote |
| `Opentix: Initialize Project` | Set up Opentix in the current repo |
| `Opentix: Get Ticket Context (AI)` | View ticket as structured JSON |
| `Opentix: Get All Tickets Context (AI)` | View all tickets as JSON |
| `Opentix: Generate Cursor Rules` | Generate `.cursor/rules/opentix-context.mdc` |

## Ticket Format

```markdown
---
id: OPTX-0001
title: Implement authentication middleware
status: in-progress
priority: high
assignees:
  - jp
labels:
  - backend
createdAt: 2026-02-14T10:30:00Z
updatedAt: 2026-02-14T14:22:00Z
createdBy: jp
---

## Description

Add JWT-based middleware for role-based authentication.

## Comments

### 2026-02-14T10:30:00Z | jp

Initial ticket created.
```

## Development

See **[docs/development.md](docs/development.md)** for how to run Opentix in development mode (F5, reload, debugging, testing against another project).

Quick commands (uses [Bun](https://bun.sh); `npm` works too):

```bash
bun install
bun run compile:all    # build extension + webview
bun run watch:all      # rebuild on file changes
bun run test:unit      # run unit tests
```

Then press **F5** in VS Code to launch the Extension Development Host.

## License

Licensed under the [Apache License 2.0](LICENSE).
