/**
 * Escape special regex characters in a string so it can be safely
 * interpolated into a RegExp constructor.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract a ticket ID from a branch name using the configured prefix.
 * Returns null if no ticket ID pattern is found.
 *
 * Detached HEAD returns the literal string "HEAD" which won't match,
 * naturally falling into the "no ticket" path.
 */
export function extractTicketIdFromBranch(branchName: string, prefix: string): string | null {
  if (!branchName) {
    return null;
  }
  const escaped = escapeRegExp(prefix);
  const regex = new RegExp(`(${escaped}-\\d{4})`, 'i');
  const match = branchName.match(regex);
  return match ? match[1].toUpperCase() : null;
}
