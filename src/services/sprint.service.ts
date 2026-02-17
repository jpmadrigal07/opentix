import * as path from 'path';
import {
    Sprint,
    SprintConfig,
    CreateSprintInput,
} from '../models/sprint.model';
import { GitService } from './git.service';
import { TicketService } from './ticket.service';
import { generateTicketId } from '../utils/id-generator';
import { OPENTIX_DIR, SPRINTS_FILE, SPRINT_PREFIX } from '../utils/constants';

const DEFAULT_SPRINT_CONFIG: SprintConfig = {
  version: 1,
  nextId: 1,
  sprints: [],
};

export class SprintService {
  private gitService: GitService;
  private ticketService: TicketService;

  constructor(gitService: GitService, ticketService: TicketService) {
    this.gitService = gitService;
    this.ticketService = ticketService;
  }

  /**
   * Read the sprint configuration. Returns default empty config if file is missing.
   */
  async getSprintConfig(): Promise<SprintConfig> {
    try {
      const content = await this.gitService.readFile(
        path.join(OPENTIX_DIR, SPRINTS_FILE),
      );
      return JSON.parse(content) as SprintConfig;
    } catch {
      return { ...DEFAULT_SPRINT_CONFIG, sprints: [] };
    }
  }

  /**
   * Write the sprint configuration to disk.
   * Sprints are always sorted by startDate before persisting.
   */
  private async writeSprintConfig(config: SprintConfig): Promise<void> {
    config.sprints.sort((a, b) => a.startDate.localeCompare(b.startDate));
    await this.gitService.writeFile(
      path.join(OPENTIX_DIR, SPRINTS_FILE),
      JSON.stringify(config, null, 2),
    );
  }

  /**
   * Create a new sprint or break. Validates input, assigns an ID,
   * calculates endDate for sprints, persists, and commits.
   */
  async createSprint(input: CreateSprintInput): Promise<Sprint> {
    const config = await this.getSprintConfig();

    // Calculate endDate
    const endDate = input.type === 'break' && input.endDate
      ? input.endDate
      : calculateEndDate(input.startDate, input.duration);

    const sprint: Sprint = {
      id: generateTicketId(SPRINT_PREFIX, config.nextId),
      name: input.name,
      startDate: input.startDate,
      endDate,
      type: input.type,
    };

    // Validate before persisting
    const error = validateSprintInput(sprint, config.sprints);
    if (error) {
      throw new Error(error);
    }

    config.sprints.push(sprint);
    config.nextId += 1;

    await this.writeSprintConfig(config);
    await this.gitService.commitAndPush(
      `create sprint ${sprint.id} - ${sprint.name}`,
    );

    return sprint;
  }

  /**
   * Update an existing sprint. ID is immutable.
   */
  async updateSprint(
    id: string,
    updates: Partial<Omit<Sprint, 'id'>>,
  ): Promise<Sprint | null> {
    const config = await this.getSprintConfig();
    const idx = config.sprints.findIndex((s) => s.id === id);
    if (idx < 0) {
      return null;
    }

    const updated: Sprint = {
      ...config.sprints[idx],
      ...updates,
      id, // Preserve immutable ID
    };

    // Validate against other sprints (exclude self)
    const others = config.sprints.filter((s) => s.id !== id);
    const error = validateSprintInput(updated, others);
    if (error) {
      throw new Error(error);
    }

    config.sprints[idx] = updated;

    await this.writeSprintConfig(config);
    await this.gitService.commitAndPush(
      `update sprint ${id} - ${updated.name}`,
    );

    return updated;
  }

  /**
   * Delete a sprint. Blocks deletion if any tickets reference the sprint.
   */
  async deleteSprint(id: string): Promise<boolean> {
    // Check referential integrity
    const index = await this.ticketService.readIndex();
    const referencingTickets = index.tickets.filter((t) => t.sprint === id);

    if (referencingTickets.length > 0) {
      throw new Error(
        `Cannot delete sprint: ${referencingTickets.length} ticket${referencingTickets.length !== 1 ? 's' : ''} are assigned to it. Reassign them first.`,
      );
    }

    const config = await this.getSprintConfig();
    const idx = config.sprints.findIndex((s) => s.id === id);
    if (idx < 0) {
      return false;
    }

    const removed = config.sprints[idx];
    config.sprints.splice(idx, 1);

    await this.writeSprintConfig(config);
    await this.gitService.commitAndPush(
      `delete sprint ${id} - ${removed.name}`,
    );

    return true;
  }

  /**
   * Get the current active sprint based on today's date.
   * Only considers sprints with type 'sprint' (not breaks).
   * Returns null if no sprint covers today.
   */
  getCurrentSprint(): Sprint | null;
  getCurrentSprint(sprints: Sprint[]): Sprint | null;
  getCurrentSprint(sprints?: Sprint[]): Sprint | null {
    const today = todayDateString();
    const list = sprints ?? [];
    return (
      list.find(
        (s) =>
          s.type === 'sprint' &&
          s.startDate <= today &&
          today <= s.endDate,
      ) ?? null
    );
  }

  /**
   * Get sprints available for ticket assignment (excludes breaks).
   */
  getSprintsForTicketPicker(sprints: Sprint[]): Sprint[] {
    return sprints.filter((s) => s.type === 'sprint');
  }
}

// ============================================================
// Pure utility functions (exported for testing)
// ============================================================

/**
 * Calculate the end date from a start date and duration.
 * N-week = startDate + (N*7 - 1) days (inclusive).
 */
export function calculateEndDate(
  startDate: string,
  duration: '1-week' | '2-week' | '3-week' | '4-week' | '5-week' | '6-week',
): string {
  const weeks = parseInt(duration, 10); // '3-week' -> 3
  const days = weeks * 7 - 1;
  const date = parseDateString(startDate);
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

/**
 * Validate a sprint against the existing sprint list.
 * Returns an error message string, or null if valid.
 */
export function validateSprintInput(
  sprint: Sprint,
  existingSprints: Sprint[],
): string | null {
  if (!sprint.name || !sprint.name.trim()) {
    return 'Sprint name is required.';
  }

  if (!sprint.startDate || !sprint.endDate) {
    return 'Start date and end date are required.';
  }

  if (sprint.startDate > sprint.endDate) {
    return 'Start date must be on or before end date.';
  }

  // Check for overlapping date ranges
  for (const existing of existingSprints) {
    if (sprint.startDate <= existing.endDate && sprint.endDate >= existing.startDate) {
      return `Date range overlaps with "${existing.name}" (${existing.startDate} to ${existing.endDate}).`;
    }
  }

  return null;
}

/**
 * Get today's date as a YYYY-MM-DD string in local time.
 */
export function todayDateString(): string {
  return formatDateString(new Date());
}

/**
 * Parse a YYYY-MM-DD string into a Date (local time, noon to avoid DST issues).
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format a Date to a YYYY-MM-DD string.
 */
export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
