export const OPENTIX_DIR = '.opentix';
export const TICKETS_DIR = 'tickets';
export const TEMPLATES_DIR = 'templates';
export const INDEX_FILE = 'index.json';
export const CONFIG_FILE = 'config.yml';
export const SPRINTS_FILE = 'sprints.json';
export const AGENTS_FILE = 'AGENTS.md';
export const WORKTREE_DIR = '.opentix-worktree';

export const DEFAULT_PREFIX = 'OPTX';
export const SPRINT_PREFIX = 'SPR';
export const DEFAULT_STATUSES = [
  'backlog',
  'in-progress',
  'review',
  'done',
  'cancelled',
] as const;

export const DEFAULT_SYNC_INTERVAL_SECONDS = 60;

export const COMMIT_PREFIX = 'opentix';

export const TEAM_FILE = 'team.yml';
export const CURRENT_TICKET_FILE = 'CURRENT_TICKET.md';

export type TicketStatus = (typeof DEFAULT_STATUSES)[number];
