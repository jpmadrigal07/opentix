import { TicketStatus } from '../utils/constants';

export interface TicketFrontmatter {
  id: string;
  title: string;
  status: TicketStatus;
  sprint?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  branch?: string;
  linkedCommits?: string[];
}

export interface TicketComment {
  timestamp: string;
  author: string;
  body: string;
}

export interface Ticket {
  frontmatter: TicketFrontmatter;
  description: string;
  acceptanceCriteria: string;
  comments: TicketComment[];
  rawContent: string;
}

export interface TicketIndexEntry {
  id: string;
  title: string;
  status: TicketStatus;
  priority: string;
  sprint?: string;
  assignees: string[];
  updatedAt: string;
}

export interface TicketIndex {
  version: number;
  lastUpdated: string;
  nextId: number;
  tickets: TicketIndexEntry[];
}

export interface TeamMember {
  name: string;
  email: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  status?: TicketStatus;
  sprint?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignees?: string[];
  labels?: string[];
}
