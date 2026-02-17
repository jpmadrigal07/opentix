import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTicket, serializeTicket, buildNewTicket } from '../../src/utils/markdown';

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'sample-ticket.md');
const sampleContent = fs.readFileSync(FIXTURE_PATH, 'utf-8');

describe('parseTicket', () => {
  it('should parse frontmatter fields', () => {
    const ticket = parseTicket(sampleContent);
    expect(ticket.frontmatter.id).toBe('OPTX-0001');
    expect(ticket.frontmatter.title).toBe('Implement authentication middleware');
    expect(ticket.frontmatter.status).toBe('in-progress');
    expect(ticket.frontmatter.priority).toBe('high');
    expect(ticket.frontmatter.assignees).toEqual(['jp', 'alex']);
    expect(ticket.frontmatter.labels).toEqual(['backend', 'security']);
    expect(ticket.frontmatter.createdBy).toBe('jp');
    expect(ticket.frontmatter.branch).toBe('feature/auth-middleware');
    expect(ticket.frontmatter.linkedCommits).toEqual(['abc1234', 'def5678']);
  });

  it('should parse description', () => {
    const ticket = parseTicket(sampleContent);
    expect(ticket.description).toContain(
      'Add JWT-based middleware for role-based authentication',
    );
  });

  it('should parse acceptance criteria', () => {
    const ticket = parseTicket(sampleContent);
    expect(ticket.acceptanceCriteria).toContain('Middleware validates JWT tokens');
    expect(ticket.acceptanceCriteria).toContain('Role-based access control');
  });

  it('should parse comments', () => {
    const ticket = parseTicket(sampleContent);
    expect(ticket.comments).toHaveLength(2);
    expect(ticket.comments[0].author).toBe('jp');
    expect(ticket.comments[0].timestamp).toBe('2026-02-14T10:30:00Z');
    expect(ticket.comments[0].body).toContain('Initial ticket created');
    expect(ticket.comments[1].author).toBe('alex');
    expect(ticket.comments[1].body).toContain('Started implementation');
  });
});

describe('serializeTicket', () => {
  it('should round-trip a parsed ticket', () => {
    const ticket = parseTicket(sampleContent);
    const serialized = serializeTicket(ticket);
    const reparsed = parseTicket(serialized);

    expect(reparsed.frontmatter.id).toBe(ticket.frontmatter.id);
    expect(reparsed.frontmatter.title).toBe(ticket.frontmatter.title);
    expect(reparsed.frontmatter.status).toBe(ticket.frontmatter.status);
    expect(reparsed.frontmatter.assignees).toEqual(ticket.frontmatter.assignees);
    expect(reparsed.comments).toHaveLength(ticket.comments.length);
  });
});

describe('buildNewTicket', () => {
  it('should create a valid ticket with defaults', () => {
    const content = buildNewTicket('OPTX-0042', { title: 'Test ticket' }, 'tester');
    const ticket = parseTicket(content);

    expect(ticket.frontmatter.id).toBe('OPTX-0042');
    expect(ticket.frontmatter.title).toBe('Test ticket');
    expect(ticket.frontmatter.status).toBe('backlog');
    expect(ticket.frontmatter.priority).toBe('medium');
    expect(ticket.frontmatter.createdBy).toBe('tester');
    expect(ticket.comments).toHaveLength(1);
    expect(ticket.comments[0].body).toBe('Ticket created.');
  });

  it('should create a ticket with custom fields', () => {
    const content = buildNewTicket(
      'OPTX-0043',
      {
        title: 'Custom ticket',
        description: 'A custom description',
        status: 'in-progress',
        priority: 'critical',
        assignees: ['alice', 'bob'],
        labels: ['urgent'],
      },
      'manager',
    );
    const ticket = parseTicket(content);

    expect(ticket.frontmatter.status).toBe('in-progress');
    expect(ticket.frontmatter.priority).toBe('critical');
    expect(ticket.frontmatter.assignees).toEqual(['alice', 'bob']);
    expect(ticket.frontmatter.labels).toEqual(['urgent']);
    expect(ticket.description).toContain('A custom description');
  });
});
