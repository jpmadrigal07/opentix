import * as vscode from 'vscode';
import { TicketService } from '../services/ticket.service';

/**
 * Command handler for opentix.createTicket.
 * Opens a quick-input flow to create a ticket from the Command Palette.
 */
export async function createTicketCommand(
  ticketService: TicketService,
): Promise<void> {
  const title = await vscode.window.showInputBox({
    prompt: 'Ticket title',
    placeHolder: 'What needs to be done?',
    validateInput: (value) => {
      if (!value || !value.trim()) {
        return 'Title is required';
      }
      return null;
    },
  });

  if (!title) {
    return; // User cancelled
  }

  const description = await vscode.window.showInputBox({
    prompt: 'Description (optional)',
    placeHolder: 'Describe the ticket...',
  });

  try {
    const ticket = await ticketService.createTicket({
      title: title.trim(),
      description: description?.trim() || undefined,
    });
    vscode.window.showInformationMessage(
      `Opentix: Created ${ticket.frontmatter.id} - ${ticket.frontmatter.title}`,
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(
      `Opentix: Failed to create ticket: ${errMsg}`,
    );
  }
}
