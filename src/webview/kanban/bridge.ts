/**
 * Typed message bridge between the webview and the extension host.
 * This file is shared conceptually -- types are duplicated in both
 * the extension host and webview contexts since they run in separate processes.
 */

// ============================================================
// Team types (duplicated for webview context)
// ============================================================

export interface TeamMember {
  name: string;
  email: string;
}

// ============================================================
// Sprint types (duplicated for webview context)
// ============================================================

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'sprint' | 'break';
}

export interface CreateSprintInput {
  name: string;
  startDate: string;
  duration: '1-week' | '2-week' | '3-week' | '4-week' | '5-week' | '6-week';
  type: 'sprint' | 'break';
  endDate?: string;
}

// ============================================================
// Messages FROM the extension host TO the webview
// ============================================================

export type HostToWebviewMessage =
  | { type: 'updateBoard'; tickets: BoardData }
  | { type: 'ticketDetail'; ticket: TicketDetailData | null }
  | { type: 'syncStatus'; status: string }
  | { type: 'config'; statuses: string[] }
  | { type: 'sprintConfig'; sprints: Sprint[]; currentSprintId: string | null }
  | { type: 'teamMembers'; members: TeamMember[]; currentUser: TeamMember };

// ============================================================
// Messages FROM the webview TO the extension host
// ============================================================

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'createTicket'; title: string; description?: string; sprint?: string; assignees?: string[] }
  | { type: 'moveTicket'; id: string; newStatus: string }
  | { type: 'openTicket'; id: string }
  | { type: 'deleteTicket'; id: string }
  | { type: 'addComment'; id: string; body: string }
  | {
      type: 'updateTicket';
      id: string;
      updates: Record<string, unknown>;
    }
  | { type: 'sync' }
  | { type: 'closeDetail' }
  | { type: 'createSprint'; input: CreateSprintInput }
  | { type: 'updateSprint'; id: string; updates: Partial<Omit<Sprint, 'id'>> }
  | { type: 'deleteSprint'; id: string };

// ============================================================
// Data types
// ============================================================

export interface BoardColumn {
  status: string;
  tickets: BoardTicketCard[];
}

export interface BoardTicketCard {
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint?: string;
  assignees: string[];
  updatedAt: string;
}

export type BoardData = BoardColumn[];

export interface TicketDetailData {
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint?: string;
  assignees: string[];
  labels: string[];
  description: string;
  acceptanceCriteria: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  branch?: string;
  comments: Array<{
    timestamp: string;
    author: string;
    body: string;
  }>;
}
