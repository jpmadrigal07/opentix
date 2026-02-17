import { describe, it, expect } from 'vitest';
import {
  extractTicketIdFromBranch,
  escapeRegExp,
} from '../../src/utils/branch-utils';

describe('escapeRegExp', () => {
  it('should escape regex metacharacters', () => {
    expect(escapeRegExp('TEAM.OP')).toBe('TEAM\\.OP');
    expect(escapeRegExp('PROJ+')).toBe('PROJ\\+');
    expect(escapeRegExp('A*B')).toBe('A\\*B');
    expect(escapeRegExp('X(Y)')).toBe('X\\(Y\\)');
    expect(escapeRegExp('A[B]')).toBe('A\\[B\\]');
  });

  it('should leave normal prefixes unchanged', () => {
    expect(escapeRegExp('OPTX')).toBe('OPTX');
    expect(escapeRegExp('PROJ')).toBe('PROJ');
    expect(escapeRegExp('BUG')).toBe('BUG');
  });
});

describe('extractTicketIdFromBranch', () => {
  it('should extract ticket ID from feature branch', () => {
    expect(extractTicketIdFromBranch('feat/OPTX-0012-user-auth', 'OPTX')).toBe('OPTX-0012');
  });

  it('should extract ticket ID from bare branch name', () => {
    expect(extractTicketIdFromBranch('OPTX-0003', 'OPTX')).toBe('OPTX-0003');
  });

  it('should extract ticket ID from fix branch', () => {
    expect(extractTicketIdFromBranch('fix/OPTX-0001', 'OPTX')).toBe('OPTX-0001');
  });

  it('should extract ticket ID with nested slashes', () => {
    expect(extractTicketIdFromBranch('feature/team/OPTX-0007-some-work', 'OPTX')).toBe('OPTX-0007');
  });

  it('should return null for branch with no ticket ID', () => {
    expect(extractTicketIdFromBranch('feature/no-ticket-here', 'OPTX')).toBeNull();
  });

  it('should return null for main branch', () => {
    expect(extractTicketIdFromBranch('main', 'OPTX')).toBeNull();
  });

  it('should return null for detached HEAD', () => {
    expect(extractTicketIdFromBranch('HEAD', 'OPTX')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractTicketIdFromBranch('', 'OPTX')).toBeNull();
  });

  it('should work with custom prefix', () => {
    expect(extractTicketIdFromBranch('feat/PROJ-0042-something', 'PROJ')).toBe('PROJ-0042');
  });

  it('should handle prefix with regex metacharacters (dot)', () => {
    expect(extractTicketIdFromBranch('feat/TEAM.OP-0001-fix', 'TEAM.OP')).toBe('TEAM.OP-0001');
  });

  it('should not match dot-prefix against arbitrary characters', () => {
    // Without escaping, "TEAM.OP" would match "TEAMXOP" because . matches any char
    expect(extractTicketIdFromBranch('feat/TEAMXOP-0001-fix', 'TEAM.OP')).toBeNull();
  });

  it('should handle prefix with plus metacharacter', () => {
    expect(extractTicketIdFromBranch('feat/PROJ+-0001-fix', 'PROJ+')).toBe('PROJ+-0001');
  });

  it('should be case-insensitive on branch name', () => {
    expect(extractTicketIdFromBranch('feat/optx-0012-something', 'OPTX')).toBe('OPTX-0012');
  });

  it('should extract the first matching ticket ID', () => {
    expect(extractTicketIdFromBranch('feat/OPTX-0001-then-OPTX-0002', 'OPTX')).toBe('OPTX-0001');
  });
});
