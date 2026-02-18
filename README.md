# Opentix

Git-native ticket management for Agentic Coders. Store tickets as Markdown files in your repository. Visualize them on a Kanban board, manage sprints, auto-sync with your team, and give AI assistants full ticket context — all without leaving your editor.

## Features

- **Kanban Board** — A drag-and-drop board inside VS Code. Move tickets between columns to change their status. Create, edit, and delete tickets directly from the board.
- **Markdown Tickets** — Each ticket is a .md file with structured YAML frontmatter and Markdown sections for description, acceptance criteria, and comments. All ticket data lives in .opentix/ on your repository's default branch.
- **Git-Native Storage** — All ticket data syncs through Git — no external server needed. Opentix uses a git worktree so your working branch is never affected by ticket operations.
- **Sprint Management** — Define sprints and breaks, assign tickets to sprints, and filter the board by sprint. Auto-detects the current sprint based on date.
- **Team & Assignees** — Self-registering team member list. Team members are automatically added from Git config. Assign tickets to yourself or teammates with multi-select support.
- **AI Context Auto-Detection** — Automatically detects the current ticket from your branch name (e.g., feat/OPTX-0012-auth) and writes CURRENT_TICKET.md at the workspace root for AI assistants like Cursor, Copilot, Windsurf, and Claude Code.
- **Sync & Collaboration** — Background pull/push keeps the team in sync automatically (60-second interval). Auto-commits external changes from AI agents and scripts. Supports immediate and debounced commit strategies.

### Coming Soon

- **CLI** — Standalone command-line interface for AI agents and scripts to manage tickets and create full automation of creating tickets and finishing them.
- **Web Kanban Board** — View and manage your Opentix board from the browser — no IDE required. This can be use by non-developers to see the latest state of the tickets and interact with it.
- **Git Event Automations** — Rule engine to auto-transition ticket status based on branch and pull request events.
- **Ticket Attachments** — Attach files and images to ticket descriptions and comments.
- **Managed Backend Support** — Hosted sync infrastructure option while keeping the same git-native workflow.

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
