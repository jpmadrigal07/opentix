import * as path from 'path';
import {
  Ticket,
  TicketFrontmatter,
  TicketComment,
  CreateTicketInput,
  TicketIndex,
} from '../models/ticket.model';
import { GitService } from './git.service';
import { parseTicket, serializeTicket, buildNewTicket } from '../utils/markdown';
import { generateTicketId, ticketFilename, parseTicketSeq } from '../utils/id-generator';
import { OPENTIX_DIR, TICKETS_DIR, INDEX_FILE } from '../utils/constants';

export class TicketService {
  private gitService: GitService;
  private prefix: string = 'OPTX';

  constructor(gitService: GitService) {
    this.gitService = gitService;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Create a new ticket. Returns the created ticket.
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const index = await this.readIndex();
    const id = generateTicketId(this.prefix, index.nextId);
    const author = await this.gitService.getAuthor();

    // Apply defaultAssignee from config if no assignees provided
    if (!input.assignees || input.assignees.length === 0) {
      try {
        const config = await this.gitService.readConfig();
        if (config.defaultAssignee) {
          input = { ...input, assignees: [config.defaultAssignee] };
        }
      } catch {
        // Config not readable -- skip default assignee
      }
    }

    const content = buildNewTicket(id, input, author);
    const relativePath = path.join(OPENTIX_DIR, TICKETS_DIR, ticketFilename(id));

    await this.gitService.writeFile(relativePath, content);

    // Update index
    index.nextId += 1;
    index.lastUpdated = new Date().toISOString();
    const ticket = parseTicket(content);
    index.tickets.push({
      id: ticket.frontmatter.id,
      title: ticket.frontmatter.title,
      status: ticket.frontmatter.status,
      priority: ticket.frontmatter.priority,
      sprint: ticket.frontmatter.sprint,
      assignees: ticket.frontmatter.assignees,
      updatedAt: ticket.frontmatter.updatedAt,
    });
    await this.writeIndex(index);

    // Commit and push
    await this.gitService.commitAndPush(
      `create ${id} - ${input.title}`,
    );

    return ticket;
  }

  /**
   * Get a single ticket by ID.
   */
  async getTicket(id: string): Promise<Ticket | null> {
    const relativePath = path.join(
      OPENTIX_DIR,
      TICKETS_DIR,
      ticketFilename(id),
    );
    try {
      const content = await this.gitService.readFile(relativePath);
      return parseTicket(content);
    } catch {
      return null;
    }
  }

  /**
   * Get all tickets.
   */
  async getAllTickets(): Promise<Ticket[]> {
    const files = await this.gitService.listFiles(
      path.join(OPENTIX_DIR, TICKETS_DIR),
    );
    const tickets: Ticket[] = [];

    for (const file of files) {
      const relativePath = path.join(OPENTIX_DIR, TICKETS_DIR, file);
      try {
        const content = await this.gitService.readFile(relativePath);
        tickets.push(parseTicket(content));
      } catch {
        // Skip unreadable tickets
      }
    }

    return tickets;
  }

  /**
   * Update a ticket's frontmatter and/or body fields (title, description, etc.).
   */
  async updateTicket(
    id: string,
    updates: Partial<TicketFrontmatter> & {
      description?: string;
      acceptanceCriteria?: string;
    },
  ): Promise<Ticket | null> {
    const ticket = await this.getTicket(id);
    if (!ticket) {
      return null;
    }

    const { description, acceptanceCriteria, ...frontmatterUpdates } = updates;

    const updatedFrontmatter = {
      ...ticket.frontmatter,
      ...frontmatterUpdates,
      updatedAt: new Date().toISOString(),
    };
    updatedFrontmatter.id = ticket.frontmatter.id;

    const updatedTicket: Ticket = {
      ...ticket,
      frontmatter: updatedFrontmatter,
      description:
        description !== undefined ? description : ticket.description,
      acceptanceCriteria:
        acceptanceCriteria !== undefined
          ? acceptanceCriteria
          : ticket.acceptanceCriteria,
    };

    const content = serializeTicket(updatedTicket);
    const relativePath = path.join(
      OPENTIX_DIR,
      TICKETS_DIR,
      ticketFilename(id),
    );
    await this.gitService.writeFile(relativePath, content);

    // Update index entry
    await this.updateIndexEntry(updatedTicket.frontmatter);

    // Build descriptive commit message
    const changedFields = Object.keys(updates).filter(
      (k) => k !== 'updatedAt',
    );
    const summary = changedFields.length > 0
      ? changedFields.join(', ') + ' updated'
      : 'updated';

    await this.gitService.commitAndPush(`update ${id} - ${summary}`);

    return updatedTicket;
  }

  /**
   * Add a comment to a ticket.
   */
  async addComment(id: string, body: string): Promise<Ticket | null> {
    const ticket = await this.getTicket(id);
    if (!ticket) {
      return null;
    }

    const author = await this.gitService.getAuthor();
    const now = new Date().toISOString();

    const comment: TicketComment = {
      timestamp: now,
      author,
      body,
    };

    ticket.comments.push(comment);
    ticket.frontmatter.updatedAt = now;

    const content = serializeTicket(ticket);
    const relativePath = path.join(
      OPENTIX_DIR,
      TICKETS_DIR,
      ticketFilename(id),
    );
    await this.gitService.writeFile(relativePath, content);
    await this.updateIndexEntry(ticket.frontmatter);
    await this.gitService.commitAndPush(`comment ${id} - Added comment`);

    return ticket;
  }

  /**
   * Delete a ticket.
   */
  async deleteTicket(id: string): Promise<boolean> {
    const relativePath = path.join(
      OPENTIX_DIR,
      TICKETS_DIR,
      ticketFilename(id),
    );
    try {
      await this.gitService.deleteFile(relativePath);
    } catch {
      return false;
    }

    // Remove from index
    const index = await this.readIndex();
    index.tickets = index.tickets.filter((t) => t.id !== id);
    index.lastUpdated = new Date().toISOString();
    await this.writeIndex(index);

    await this.gitService.commitAndPush(`delete ${id}`);
    return true;
  }

  /**
   * Read the ticket index.
   */
  async readIndex(): Promise<TicketIndex> {
    try {
      const content = await this.gitService.readFile(
        path.join(OPENTIX_DIR, INDEX_FILE),
      );
      return JSON.parse(content) as TicketIndex;
    } catch {
      return {
        version: 1,
        lastUpdated: new Date().toISOString(),
        nextId: 1,
        tickets: [],
      };
    }
  }

  /**
   * Write the ticket index.
   */
  async writeIndex(index: TicketIndex): Promise<void> {
    await this.gitService.writeFile(
      path.join(OPENTIX_DIR, INDEX_FILE),
      JSON.stringify(index, null, 2),
    );
  }

  /**
   * Update a single entry in the index.
   */
  private async updateIndexEntry(fm: TicketFrontmatter): Promise<void> {
    const index = await this.readIndex();
    const existing = index.tickets.findIndex((t) => t.id === fm.id);

    const entry = {
      id: fm.id,
      title: fm.title,
      status: fm.status,
      priority: fm.priority,
      sprint: fm.sprint,
      assignees: fm.assignees,
      updatedAt: fm.updatedAt,
    };

    if (existing >= 0) {
      index.tickets[existing] = entry;
    } else {
      index.tickets.push(entry);
    }

    index.lastUpdated = new Date().toISOString();
    await this.writeIndex(index);
  }

  /**
   * Rebuild the index from all ticket files.
   * Called after sync to ensure consistency.
   * Skips writing index.json when meaningful content hasn't changed
   * (prevents spurious dirty state that would trigger unnecessary auto-commits).
   */
  async rebuildIndex(): Promise<TicketIndex> {
    const tickets = await this.getAllTickets();
    let maxSeq = 0;

    const entries = tickets.map((t) => {
      const seq = parseTicketSeq(t.frontmatter.id);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
      return {
        id: t.frontmatter.id,
        title: t.frontmatter.title,
        status: t.frontmatter.status,
        priority: t.frontmatter.priority,
        sprint: t.frontmatter.sprint,
        assignees: t.frontmatter.assignees,
        updatedAt: t.frontmatter.updatedAt,
      };
    });

    // Sort deterministically by id to ensure stable comparison
    // regardless of fs.readdir() platform ordering
    entries.sort((a, b) => a.id.localeCompare(b.id));

    const newNextId = maxSeq + 1;

    // Compare against existing index to avoid unnecessary writes.
    // Only lastUpdated is excluded from comparison since it changes on every call.
    const existing = await this.readIndex();
    const contentChanged =
      existing.nextId !== newNextId ||
      JSON.stringify(existing.tickets) !== JSON.stringify(entries);

    if (!contentChanged) {
      return existing;
    }

    const index: TicketIndex = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      nextId: newNextId,
      tickets: entries,
    };

    await this.writeIndex(index);
    return index;
  }
}
