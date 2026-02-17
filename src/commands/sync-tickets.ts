import * as vscode from 'vscode';
import { SyncService } from '../services/sync.service';

/**
 * Command handler for opentix.syncTickets.
 */
export async function syncTicketsCommand(
  syncService: SyncService,
): Promise<void> {
  vscode.window.showInformationMessage('Opentix: Syncing tickets...');
  await syncService.sync();
  vscode.window.showInformationMessage('Opentix: Sync complete.');
}
