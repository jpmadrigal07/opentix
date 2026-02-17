import { describe, it, expect } from 'vitest';
import {
  generateTicketId,
  parseTicketSeq,
  ticketFilename,
} from '../../src/utils/id-generator';

describe('generateTicketId', () => {
  it('should generate a zero-padded ID', () => {
    expect(generateTicketId('OPTX', 1)).toBe('OPTX-0001');
    expect(generateTicketId('OPTX', 42)).toBe('OPTX-0042');
    expect(generateTicketId('OPTX', 999)).toBe('OPTX-0999');
    expect(generateTicketId('OPTX', 1000)).toBe('OPTX-1000');
  });

  it('should use the correct prefix', () => {
    expect(generateTicketId('PROJ', 1)).toBe('PROJ-0001');
    expect(generateTicketId('BUG', 99)).toBe('BUG-0099');
  });

  it('should handle large numbers', () => {
    expect(generateTicketId('OPTX', 12345)).toBe('OPTX-12345');
  });
});

describe('parseTicketSeq', () => {
  it('should extract the numeric sequence', () => {
    expect(parseTicketSeq('OPTX-0001')).toBe(1);
    expect(parseTicketSeq('OPTX-0042')).toBe(42);
    expect(parseTicketSeq('PROJ-1000')).toBe(1000);
  });

  it('should return 0 for invalid IDs', () => {
    expect(parseTicketSeq('invalid')).toBe(0);
    expect(parseTicketSeq('')).toBe(0);
  });
});

describe('ticketFilename', () => {
  it('should append .md extension', () => {
    expect(ticketFilename('OPTX-0001')).toBe('OPTX-0001.md');
    expect(ticketFilename('PROJ-0042')).toBe('PROJ-0042.md');
  });
});
