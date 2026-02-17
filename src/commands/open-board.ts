import { KanbanViewProvider } from '../webview/kanban-view-provider';

/**
 * Command handler for opentix.openBoard.
 */
export async function openBoardCommand(
  kanbanProvider: KanbanViewProvider,
): Promise<void> {
  await kanbanProvider.openBoard();
}
