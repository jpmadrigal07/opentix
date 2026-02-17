import { describe, it, expect } from 'vitest';
import { parseTicket, serializeTicket, buildNewTicket } from '../../src/utils/markdown';

describe('sprint field in markdown', () => {
  it('should round-trip a ticket with a sprint field', () => {
    const content = buildNewTicket(
      'OPTX-0050',
      {
        title: 'Sprint ticket',
        sprint: 'SPR-0001',
      },
      'tester',
    );

    const ticket = parseTicket(content);
    expect(ticket.frontmatter.sprint).toBe('SPR-0001');

    // Re-serialize and re-parse
    const reserialized = serializeTicket(ticket);
    const reparsed = parseTicket(reserialized);
    expect(reparsed.frontmatter.sprint).toBe('SPR-0001');
  });

  it('should handle a ticket without a sprint field', () => {
    const content = buildNewTicket(
      'OPTX-0051',
      {
        title: 'No-sprint ticket',
      },
      'tester',
    );

    const ticket = parseTicket(content);
    expect(ticket.frontmatter.sprint).toBeUndefined();

    // Re-serialize should not include sprint
    const reserialized = serializeTicket(ticket);
    expect(reserialized).not.toContain('sprint:');

    const reparsed = parseTicket(reserialized);
    expect(reparsed.frontmatter.sprint).toBeUndefined();
  });

  it('should preserve sprint when updating other frontmatter', () => {
    const content = buildNewTicket(
      'OPTX-0052',
      {
        title: 'Sprint update ticket',
        sprint: 'SPR-0003',
        priority: 'high',
      },
      'tester',
    );

    const ticket = parseTicket(content);

    // Simulate updating priority
    ticket.frontmatter.priority = 'critical';
    ticket.frontmatter.updatedAt = new Date().toISOString();

    const reserialized = serializeTicket(ticket);
    const reparsed = parseTicket(reserialized);

    expect(reparsed.frontmatter.sprint).toBe('SPR-0003');
    expect(reparsed.frontmatter.priority).toBe('critical');
  });
});
