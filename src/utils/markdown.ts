import matter from 'gray-matter';
import {
  Ticket,
  TicketFrontmatter,
  TicketComment,
  CreateTicketInput,
} from '../models/ticket.model';
import { TicketStatus } from './constants';

/**
 * Parse a ticket markdown file into a structured Ticket object.
 */
export function parseTicket(raw: string): Ticket {
  const { data, content } = matter(raw);
  const frontmatter = data as TicketFrontmatter;

  // Ensure arrays exist
  frontmatter.assignees = frontmatter.assignees || [];
  frontmatter.labels = frontmatter.labels || [];
  frontmatter.linkedCommits = frontmatter.linkedCommits || [];

  const description = extractSection(content, 'Description');
  const acceptanceCriteria = extractSection(content, 'Acceptance Criteria');
  const comments = parseComments(content);

  return {
    frontmatter,
    description,
    acceptanceCriteria,
    comments,
    rawContent: raw,
  };
}

/**
 * Serialize a Ticket object back to markdown.
 */
export function serializeTicket(ticket: Ticket): string {
  const fm: Record<string, unknown> = {
    id: ticket.frontmatter.id,
    title: ticket.frontmatter.title,
    status: ticket.frontmatter.status,
    priority: ticket.frontmatter.priority,
    assignees: ticket.frontmatter.assignees,
    labels: ticket.frontmatter.labels,
    createdAt: ticket.frontmatter.createdAt,
    updatedAt: ticket.frontmatter.updatedAt,
    createdBy: ticket.frontmatter.createdBy,
  };

  if (ticket.frontmatter.sprint) {
    fm.sprint = ticket.frontmatter.sprint;
  }
  if (ticket.frontmatter.branch) {
    fm.branch = ticket.frontmatter.branch;
  }
  if (
    ticket.frontmatter.linkedCommits &&
    ticket.frontmatter.linkedCommits.length > 0
  ) {
    fm.linkedCommits = ticket.frontmatter.linkedCommits;
  }

  const frontmatterStr = matter.stringify('', fm).trim();

  let body = '';
  body += '\n\n## Description\n\n';
  body += ticket.description || 'No description provided.';
  body += '\n';

  if (ticket.acceptanceCriteria) {
    body += '\n## Acceptance Criteria\n\n';
    body += ticket.acceptanceCriteria;
    body += '\n';
  }

  body += '\n## Comments\n';

  for (const comment of ticket.comments) {
    body += `\n### ${comment.timestamp} | ${comment.author}\n\n`;
    body += comment.body;
    body += '\n';
  }

  return frontmatterStr + body + '\n';
}

/**
 * Build a new ticket markdown string from creation input.
 */
export function buildNewTicket(
  id: string,
  input: CreateTicketInput,
  author: string,
): string {
  const now = new Date().toISOString();
  const status: TicketStatus = input.status || 'backlog';

  const ticket: Ticket = {
    frontmatter: {
      id,
      title: input.title,
      status,
      sprint: input.sprint,
      priority: input.priority || 'medium',
      assignees: input.assignees || [],
      labels: input.labels || [],
      createdAt: now,
      updatedAt: now,
      createdBy: author,
    },
    description: input.description || 'No description provided.',
    acceptanceCriteria: '',
    comments: [
      {
        timestamp: now,
        author,
        body: 'Ticket created.',
      },
    ],
    rawContent: '',
  };

  return serializeTicket(ticket);
}

/**
 * Extract a markdown section by heading name.
 */
function extractSection(content: string, heading: string): string {
  const regex = new RegExp(
    `## ${escapeRegex(heading)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
  );
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Parse H3-level comments from the markdown content.
 */
function parseComments(content: string): TicketComment[] {
  const commentsSection = extractSection(content, 'Comments');
  if (!commentsSection) {
    return [];
  }

  const comments: TicketComment[] = [];
  const commentRegex = /### (.+?) \| (.+?)\s*\n([\s\S]*?)(?=\n### |$)/g;
  let match: RegExpExecArray | null;

  while ((match = commentRegex.exec(commentsSection)) !== null) {
    comments.push({
      timestamp: match[1].trim(),
      author: match[2].trim(),
      body: match[3].trim(),
    });
  }

  return comments;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
