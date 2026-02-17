/**
 * Generate a ticket ID from a numeric sequence.
 * Example: generateTicketId('OPTX', 1) => 'OPTX-0001'
 */
export function generateTicketId(prefix: string, seq: number): string {
  const padded = String(seq).padStart(4, '0');
  return `${prefix}-${padded}`;
}

/**
 * Extract the numeric sequence from a ticket ID.
 * Example: parseTicketSeq('OPTX-0042') => 42
 */
export function parseTicketSeq(id: string): number {
  const parts = id.split('-');
  if (parts.length < 2) {
    return 0;
  }
  return parseInt(parts[parts.length - 1], 10) || 0;
}

/**
 * Generate a filename from a ticket ID.
 * Example: ticketFilename('OPTX-0001') => 'OPTX-0001.md'
 */
export function ticketFilename(id: string): string {
  return `${id}.md`;
}
