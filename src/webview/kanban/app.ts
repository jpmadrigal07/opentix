import type {
    HostToWebviewMessage,
    WebviewToHostMessage,
    BoardData, BoardTicketCard,
    TicketDetailData,
    Sprint,
    CreateSprintInput,
    TeamMember
} from './bridge';

// Acquire the VS Code API
const vscode = acquireVsCodeApi();

// ============================================================
// State
// ============================================================

const SPRINTS_PER_PAGE = 5;

interface AppState {
  board: BoardData;
  statuses: string[];
  syncStatus: string;
  selectedTicket: TicketDetailData | null;
  showCreateModal: boolean;
  showSprintManager: boolean;
  searchQuery: string;
  draggedCardId: string | null;
  // Sprint state
  sprints: Sprint[];
  currentSprintId: string | null;
  selectedSprintFilter: string; // sprint ID, 'all', or 'none'
  sprintPage: number;
  // Team state
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  selectedAssigneeFilter: string; // assignee name or 'all'
  // Searchable select state
  sprintFilterOpen: boolean;
  sprintFilterSearch: string;
  assigneeFilterOpen: boolean;
  assigneeFilterSearch: string;
}

let state: AppState = {
  board: [],
  statuses: ['backlog', 'in-progress', 'review', 'done'],
  syncStatus: 'idle',
  selectedTicket: null,
  showCreateModal: false,
  showSprintManager: false,
  searchQuery: '',
  draggedCardId: null,
  sprints: [],
  currentSprintId: null,
  selectedSprintFilter: 'all',
  sprintPage: 0,
  teamMembers: [],
  currentUser: { name: '', email: '' },
  selectedAssigneeFilter: 'all',
  sprintFilterOpen: false,
  sprintFilterSearch: '',
  assigneeFilterOpen: false,
  assigneeFilterSearch: '',
};

// ============================================================
// Message handling
// ============================================================

function postMessage(msg: WebviewToHostMessage): void {
  vscode.postMessage(msg);
}

window.addEventListener('message', (event) => {
  const msg = event.data as HostToWebviewMessage;

  switch (msg.type) {
    case 'updateBoard':
      state.board = msg.tickets;
      render();
      break;
    case 'ticketDetail':
      state.selectedTicket = msg.ticket;
      render();
      break;
    case 'syncStatus':
      state.syncStatus = msg.status;
      renderSyncIndicator();
      break;
    case 'config':
      state.statuses = msg.statuses;
      render();
      break;
    case 'sprintConfig':
      state.sprints = msg.sprints;
      state.currentSprintId = msg.currentSprintId;
      // Auto-select current sprint on first load if filter is still default
      if (state.selectedSprintFilter === 'all' && msg.currentSprintId) {
        state.selectedSprintFilter = msg.currentSprintId;
      }
      render();
      break;
    case 'teamMembers':
      state.teamMembers = msg.members;
      state.currentUser = msg.currentUser;
      break;
  }
});

// ============================================================
// Rendering
// ============================================================

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Persist create modal form values before re-render so they are not lost (e.g. when adding assignees)
  if (state.showCreateModal) {
    const titleEl = document.getElementById('create-title') as HTMLInputElement | null;
    const descEl = document.getElementById('create-description') as HTMLTextAreaElement | null;
    const sprintEl = document.getElementById('create-sprint') as HTMLSelectElement | null;
    if (titleEl) createModalTitle = titleEl.value;
    if (descEl) createModalDescription = descEl.value;
    if (sprintEl) createModalSprint = sprintEl.value;
  }

  // Persist detail panel title/description before re-render (only when same ticket)
  if (state.selectedTicket) {
    const panel = document.querySelector('.detail-panel');
    const panelTicketId = panel?.getAttribute('data-ticket-id') ?? null;
    if (panelTicketId === state.selectedTicket.id) {
      const titleInput = document.getElementById('detail-title-input') as HTMLInputElement | null;
      const descTextarea = document.getElementById('detail-description') as HTMLTextAreaElement | null;
      if (titleInput) detailPanelTitle = titleInput.value;
      if (descTextarea) detailPanelDescription = descTextarea.value;
      detailPanelTicketId = state.selectedTicket.id;
    } else {
      detailPanelTicketId = null;
      detailPanelTitle = '';
      detailPanelDescription = '';
    }
  }

  app.innerHTML = `
    ${renderTopbar()}
    <div class="board">${renderColumns()}</div>
    ${renderFooter()}
    ${state.selectedTicket ? renderDetailPanel(state.selectedTicket) : ''}
    ${state.showCreateModal ? renderCreateModal() : ''}
    ${state.showSprintManager ? renderSprintManager() : ''}
  `;

  attachEventListeners();
  attachDragListeners();
}

function renderTopbar(): string {
  return `
    <div class="topbar">
      <div class="topbar-left">
        <h1>Opentix</h1>
        <input
          type="text"
          class="search-input"
          placeholder="Search tickets..."
          id="search-input"
          value="${escapeHtml(state.searchQuery)}"
        />
        ${renderSearchableSprintFilter()}
        ${renderSearchableAssigneeFilter()}
      </div>
      <div class="topbar-right">
        <div class="sync-indicator">
          <span class="sync-dot ${state.syncStatus === 'syncing' ? 'syncing' : ''} ${state.syncStatus === 'error' ? 'error' : ''}"></span>
          <span>${state.syncStatus === 'syncing' ? 'Syncing...' : state.syncStatus === 'error' ? 'Sync error' : 'Synced'}</span>
        </div>
        <button class="btn btn-ghost" id="btn-sync" title="Sync now">&#x21bb;</button>
        <button class="btn btn-ghost" id="btn-sprints" title="Manage Sprints">&#x1f4c5; Sprints</button>
        <button class="btn btn-primary" id="btn-create">+ New Ticket</button>
      </div>
    </div>
  `;
}

function getSprintFilterDisplayValue(): string {
  if (state.selectedSprintFilter === 'all') return 'All Sprints';
  if (state.selectedSprintFilter === 'none') return 'No Sprint';
  const sprint = state.sprints.find((s) => s.id === state.selectedSprintFilter);
  if (sprint) {
    const isCurrent = sprint.id === state.currentSprintId;
    return `${sprint.name}${isCurrent ? ' *' : ''}`;
  }
  return 'All Sprints';
}

function getAssigneeFilterDisplayValue(): string {
  if (state.selectedAssigneeFilter === 'all') return 'All Assignees';
  return state.selectedAssigneeFilter;
}

function updateSprintFilterOptions(): void {
  const optionsContainer = document.querySelector('#sprint-filter-dropdown .searchable-options');
  if (!optionsContainer) return;

  const sprintEntries = state.sprints.filter((s) => s.type === 'sprint');
  const searchLower = state.sprintFilterSearch.toLowerCase();
  const filteredSprints = sprintEntries.filter((s) =>
    s.name.toLowerCase().includes(searchLower)
  );

  let optionsHtml = '';
  
  // All Sprints option
  const allSelected = state.selectedSprintFilter === 'all';
  if (!state.sprintFilterSearch || 'all sprints'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${allSelected ? 'selected' : ''}" data-value="all">All Sprints</div>`;
  }
  
  // No Sprint option
  const noneSelected = state.selectedSprintFilter === 'none';
  if (!state.sprintFilterSearch || 'no sprint'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${noneSelected ? 'selected' : ''}" data-value="none">No Sprint</div>`;
  }

  // Sprint options
  for (const sprint of filteredSprints) {
    const isCurrent = sprint.id === state.currentSprintId;
    const label = `${sprint.name}${isCurrent ? ' *' : ''}`;
    const selected = state.selectedSprintFilter === sprint.id;
    optionsHtml += `<div class="searchable-option ${selected ? 'selected' : ''}" data-value="${escapeHtml(sprint.id)}">${escapeHtml(label)}</div>`;
  }

  optionsContainer.innerHTML = optionsHtml || '<div class="searchable-option-empty">No matches</div>';

  // Re-attach event listeners to new options
  optionsContainer.querySelectorAll('.searchable-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = (e.currentTarget as HTMLElement).dataset.value;
      if (value !== undefined) {
        state.selectedSprintFilter = value;
        state.sprintFilterOpen = false;
        state.sprintFilterSearch = '';
        render();
      }
    });
  });
}

function updateAssigneeFilterOptions(): void {
  const optionsContainer = document.querySelector('#assignee-filter-dropdown .searchable-options');
  if (!optionsContainer) return;

  const searchLower = state.assigneeFilterSearch.toLowerCase();
  const filteredMembers = state.teamMembers.filter((m) =>
    m.name.toLowerCase().includes(searchLower)
  );

  let optionsHtml = '';
  
  // All Assignees option
  const allSelected = state.selectedAssigneeFilter === 'all';
  if (!state.assigneeFilterSearch || 'all assignees'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${allSelected ? 'selected' : ''}" data-value="all">All Assignees</div>`;
  }

  // Member options
  for (const member of filteredMembers) {
    const selected = state.selectedAssigneeFilter === member.name;
    optionsHtml += `<div class="searchable-option ${selected ? 'selected' : ''}" data-value="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>`;
  }

  optionsContainer.innerHTML = optionsHtml || '<div class="searchable-option-empty">No matches</div>';

  // Re-attach event listeners to new options
  optionsContainer.querySelectorAll('.searchable-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = (e.currentTarget as HTMLElement).dataset.value;
      if (value !== undefined) {
        state.selectedAssigneeFilter = value;
        state.assigneeFilterOpen = false;
        state.assigneeFilterSearch = '';
        render();
      }
    });
  });
}

function attachSprintFilterSearchListeners(): void {
  const sprintFilterSearch = document.getElementById('sprint-filter-search') as HTMLInputElement;
  if (!sprintFilterSearch) return;

  // Use a flag to prevent duplicate listeners
  if ((sprintFilterSearch as any).__listenersAttached) return;
  (sprintFilterSearch as any).__listenersAttached = true;

  sprintFilterSearch.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    state.sprintFilterSearch = input.value;
    updateSprintFilterOptions();
  });

  sprintFilterSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.sprintFilterOpen = false;
      state.sprintFilterSearch = '';
      render();
    }
  });

  // Focus the input when dropdown opens
  if (state.sprintFilterOpen) {
    setTimeout(() => sprintFilterSearch.focus(), 10);
  }
}

function attachAssigneeFilterSearchListeners(): void {
  const assigneeFilterSearch = document.getElementById('assignee-filter-search') as HTMLInputElement;
  if (!assigneeFilterSearch) return;

  // Use a flag to prevent duplicate listeners
  if ((assigneeFilterSearch as any).__listenersAttached) return;
  (assigneeFilterSearch as any).__listenersAttached = true;

  assigneeFilterSearch.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    state.assigneeFilterSearch = input.value;
    updateAssigneeFilterOptions();
  });

  assigneeFilterSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.assigneeFilterOpen = false;
      state.assigneeFilterSearch = '';
      render();
    }
  });

  // Focus the input when dropdown opens
  if (state.assigneeFilterOpen) {
    setTimeout(() => assigneeFilterSearch.focus(), 10);
  }
}

function renderSearchableSprintFilter(): string {
  const sprintEntries = state.sprints.filter((s) => s.type === 'sprint');
  const searchLower = state.sprintFilterSearch.toLowerCase();
  const filteredSprints = sprintEntries.filter((s) =>
    s.name.toLowerCase().includes(searchLower)
  );

  const displayValue = getSprintFilterDisplayValue();
  const isOpen = state.sprintFilterOpen;

  let optionsHtml = '';
  
  // All Sprints option
  const allSelected = state.selectedSprintFilter === 'all';
  if (!state.sprintFilterSearch || 'all sprints'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${allSelected ? 'selected' : ''}" data-value="all">All Sprints</div>`;
  }
  
  // No Sprint option
  const noneSelected = state.selectedSprintFilter === 'none';
  if (!state.sprintFilterSearch || 'no sprint'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${noneSelected ? 'selected' : ''}" data-value="none">No Sprint</div>`;
  }

  // Sprint options
  for (const sprint of filteredSprints) {
    const isCurrent = sprint.id === state.currentSprintId;
    const label = `${sprint.name}${isCurrent ? ' *' : ''}`;
    const selected = state.selectedSprintFilter === sprint.id;
    optionsHtml += `<div class="searchable-option ${selected ? 'selected' : ''}" data-value="${escapeHtml(sprint.id)}">${escapeHtml(label)}</div>`;
  }

  return `
    <div class="searchable-select-wrapper">
      <div class="searchable-select-trigger" id="sprint-filter-trigger">
        <span>${escapeHtml(displayValue)}</span>
        <span class="searchable-select-arrow">${isOpen ? '▲' : '▼'}</span>
      </div>
      ${isOpen ? `
        <div class="searchable-select-dropdown" id="sprint-filter-dropdown">
          <input
            type="text"
            class="searchable-select-search"
            id="sprint-filter-search"
            placeholder="Search sprints..."
            value="${escapeHtml(state.sprintFilterSearch)}"
            autofocus
          />
          <div class="searchable-options">
            ${optionsHtml || '<div class="searchable-option-empty">No matches</div>'}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderSearchableAssigneeFilter(): string {
  const searchLower = state.assigneeFilterSearch.toLowerCase();
  const filteredMembers = state.teamMembers.filter((m) =>
    m.name.toLowerCase().includes(searchLower)
  );

  const displayValue = getAssigneeFilterDisplayValue();
  const isOpen = state.assigneeFilterOpen;

  let optionsHtml = '';
  
  // All Assignees option
  const allSelected = state.selectedAssigneeFilter === 'all';
  if (!state.assigneeFilterSearch || 'all assignees'.includes(searchLower)) {
    optionsHtml += `<div class="searchable-option ${allSelected ? 'selected' : ''}" data-value="all">All Assignees</div>`;
  }

  // Member options
  for (const member of filteredMembers) {
    const selected = state.selectedAssigneeFilter === member.name;
    optionsHtml += `<div class="searchable-option ${selected ? 'selected' : ''}" data-value="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>`;
  }

  return `
    <div class="searchable-select-wrapper">
      <div class="searchable-select-trigger" id="assignee-filter-trigger">
        <span>${escapeHtml(displayValue)}</span>
        <span class="searchable-select-arrow">${isOpen ? '▲' : '▼'}</span>
      </div>
      ${isOpen ? `
        <div class="searchable-select-dropdown" id="assignee-filter-dropdown">
          <input
            type="text"
            class="searchable-select-search"
            id="assignee-filter-search"
            placeholder="Search assignees..."
            value="${escapeHtml(state.assigneeFilterSearch)}"
            autofocus
          />
          <div class="searchable-options">
            ${optionsHtml || '<div class="searchable-option-empty">No matches</div>'}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderColumns(): string {
  return state.statuses
    .map((status) => {
      const column = state.board.find((c) => c.status === status);
      let tickets = column?.tickets || [];

      // Filter by sprint
      if (state.selectedSprintFilter === 'none') {
        tickets = tickets.filter((t) => !t.sprint);
      } else if (state.selectedSprintFilter !== 'all') {
        tickets = tickets.filter((t) => t.sprint === state.selectedSprintFilter);
      }

      // Filter by assignee
      if (state.selectedAssigneeFilter !== 'all') {
        tickets = tickets.filter((t) => t.assignees.includes(state.selectedAssigneeFilter));
      }

      // Filter by search query
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        tickets = tickets.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.assignees.some((a) => a.toLowerCase().includes(q)),
        );
      }

      const displayStatus = formatStatus(status);

      return `
        <div class="column" data-status="${escapeHtml(status)}">
          <div class="column-header">
            <span class="column-title">${escapeHtml(displayStatus)}</span>
            <span class="column-count">${tickets.length}</span>
          </div>
          <div class="column-body" data-status="${escapeHtml(status)}">
            ${
              tickets.length > 0
                ? tickets.map((t) => renderCard(t)).join('')
                : '<div class="empty-column">No tickets</div>'
            }
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCard(ticket: BoardTicketCard): string {
  const sprintLabel = getSprintNameById(ticket.sprint);

  return `
    <div class="card" draggable="true" data-id="${escapeHtml(ticket.id)}" data-status="${escapeHtml(ticket.status)}">
      <div class="card-id">${escapeHtml(ticket.id)}</div>
      ${sprintLabel ? `<div class="card-sprint">${escapeHtml(sprintLabel)}</div>` : ''}
      <div class="card-title">${escapeHtml(ticket.title)}</div>
      <div class="card-meta">
        <div class="card-assignees">
          ${ticket.assignees.map((a) => `<span class="assignee-chip">${escapeHtml(a)}</span>`).join('')}
        </div>
        <span class="priority-dot ${escapeHtml(ticket.priority)}" title="${escapeHtml(ticket.priority)}"></span>
      </div>
    </div>
  `;
}

function renderFooter(): string {
  const totalTickets = state.board.reduce(
    (sum, col) => sum + col.tickets.length,
    0,
  );
  return `
    <div class="footer">
      <span>${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}</span>
      <span>Opentix v0.1.0</span>
    </div>
  `;
}

function renderDetailPanel(ticket: TicketDetailData): string {
  const sprintOptions = getSprintPickerOptions(ticket.sprint);
  const titleVal =
    detailPanelTicketId === ticket.id ? detailPanelTitle : ticket.title;
  const descVal =
    detailPanelTicketId === ticket.id ? detailPanelDescription : ticket.description;

  return `
    <div class="detail-overlay" id="detail-overlay">
      <div class="detail-panel" data-ticket-id="${escapeHtml(ticket.id)}">
        <div class="detail-header">
          <div>
            <div class="detail-id">${escapeHtml(ticket.id)}</div>
            <input type="text" class="detail-title-input" id="detail-title-input" value="${escapeHtml(titleVal)}" placeholder="Ticket title" />
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-danger" id="btn-delete-ticket" data-id="${escapeHtml(ticket.id)}" title="Delete ticket">&#x2715; Delete</button>
            <button class="btn btn-ghost" id="btn-close-detail">&#x2715;</button>
          </div>
        </div>

        <div class="detail-meta">
          <div class="detail-meta-item">
            <span class="detail-meta-label">Status</span>
            <select class="status-select" id="detail-status" data-id="${escapeHtml(ticket.id)}">
              ${state.statuses.map((s) => `<option value="${escapeHtml(s)}" ${s === ticket.status ? 'selected' : ''}>${escapeHtml(formatStatus(s))}</option>`).join('')}
            </select>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Priority</span>
            <select class="priority-select" id="detail-priority" data-id="${escapeHtml(ticket.id)}">
              ${['low', 'medium', 'high', 'critical'].map((p) => `<option value="${p}" ${p === ticket.priority ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Sprint</span>
            <select class="sprint-select" id="detail-sprint" data-id="${escapeHtml(ticket.id)}">
              ${sprintOptions}
            </select>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Assignees</span>
            <div class="assignee-picker-wrapper">
              <div class="assignee-tags" id="detail-assignee-tags">
                ${ticket.assignees.length > 0
                  ? ticket.assignees.map((a) => `<span class="assignee-tag">${escapeHtml(a)} <button class="assignee-tag-remove" data-name="${escapeHtml(a)}" data-ticket-id="${escapeHtml(ticket.id)}">&#x2715;</button></span>`).join('')
                  : '<span class="assignee-placeholder">Unassigned</span>'}
              </div>
              ${renderAssignToMeButton(ticket.assignees, ticket.id)}
              <select class="assignee-select" id="detail-assignee-add" data-id="${escapeHtml(ticket.id)}">
                <option value="">+ Add assignee</option>
                ${state.teamMembers
                  .filter((m) => !ticket.assignees.includes(m.name))
                  .map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Created</span>
            <span class="detail-meta-value">${formatDate(ticket.createdAt)}</span>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Updated</span>
            <span class="detail-meta-value">${formatDate(ticket.updatedAt)}</span>
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">Author</span>
            <span class="detail-meta-value">${escapeHtml(ticket.createdBy)}</span>
          </div>
          ${ticket.branch ? `<div class="detail-meta-item"><span class="detail-meta-label">Branch</span><span class="detail-meta-value">${escapeHtml(ticket.branch)}</span></div>` : ''}
        </div>

        <div class="detail-section">
          <h3>Description</h3>
          <textarea class="detail-description-textarea" id="detail-description" placeholder="Describe the ticket...">${escapeHtml(descVal)}</textarea>
        </div>

        ${
          ticket.acceptanceCriteria
            ? `<div class="detail-section">
                <h3>Acceptance Criteria</h3>
                <div class="detail-section-body">${escapeHtml(ticket.acceptanceCriteria)}</div>
              </div>`
            : ''
        }

        <div class="detail-section">
          <h3>Comments (${ticket.comments.length})</h3>
          <div class="comments-list">
            ${ticket.comments.map((c) => renderComment(c)).join('')}
          </div>
          <div class="comment-input-group">
            <textarea class="comment-textarea" id="comment-input" placeholder="Write a comment..."></textarea>
            <button class="btn btn-primary" id="btn-add-comment" data-id="${escapeHtml(ticket.id)}" style="align-self:flex-end;">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getSprintPickerOptions(currentSprint?: string): string {
  const sprintEntries = state.sprints.filter((s) => s.type === 'sprint');
  let html = `<option value="" ${!currentSprint ? 'selected' : ''}>None</option>`;

  for (const sprint of sprintEntries) {
    html += `<option value="${escapeHtml(sprint.id)}" ${currentSprint === sprint.id ? 'selected' : ''}>${escapeHtml(sprint.name)}</option>`;
  }

  return html;
}

function renderComment(comment: {
  timestamp: string;
  author: string;
  body: string;
}): string {
  return `
    <div class="comment">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.author)}</span>
        <span>${formatDate(comment.timestamp)}</span>
      </div>
      <div class="comment-body">${escapeHtml(comment.body)}</div>
    </div>
  `;
}

// Track assignees and form fields in the create modal (persisted across re-renders)
let createModalAssignees: string[] = [];
let createModalTitle = '';
let createModalDescription = '';
let createModalSprint = '';

// Track title/description in detail panel (persisted across re-renders while editing)
let detailPanelTicketId: string | null = null;
let detailPanelTitle = '';
let detailPanelDescription = '';

function renderAssignToMeButton(currentAssignees: string[], ticketId: string): string {
  if (!state.currentUser.name) return '';
  const isAssigned = currentAssignees.includes(state.currentUser.name);
  if (isAssigned) {
    return `<button class="btn btn-ghost btn-sm assign-me-btn" id="detail-unassign-me" data-id="${escapeHtml(ticketId)}">Unassign me</button>`;
  }
  return `<button class="btn btn-ghost btn-sm assign-me-btn" id="detail-assign-me" data-id="${escapeHtml(ticketId)}">Assign to me</button>`;
}

function renderCreateModal(): string {
  const sprintOptions = getSprintPickerOptions(
    createModalSprint || (state.currentSprintId ?? undefined),
  );

  return `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <h2>Create Ticket</h2>
        <div class="form-group">
          <label for="create-title">Title *</label>
          <input type="text" class="form-input" id="create-title" placeholder="What needs to be done?" value="${escapeHtml(createModalTitle)}" autofocus />
        </div>
        <div class="form-group">
          <label for="create-description">Description</label>
          <textarea class="form-textarea" id="create-description" placeholder="Describe the ticket...">${escapeHtml(createModalDescription)}</textarea>
        </div>
        <div class="form-group">
          <label for="create-sprint">Sprint</label>
          <select class="form-select" id="create-sprint">
            ${sprintOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Assignees</label>
          <div class="assignee-picker-wrapper">
            <div class="assignee-tags" id="create-assignee-tags">
              ${createModalAssignees.map((a) => `<span class="assignee-tag">${escapeHtml(a)} <button class="assignee-tag-remove create-assignee-remove" data-name="${escapeHtml(a)}">&#x2715;</button></span>`).join('')}
            </div>
            ${state.currentUser.name ? `<button class="btn btn-ghost btn-sm assign-me-btn" id="create-assign-me">Assign to me</button>` : ''}
            <select class="assignee-select" id="create-assignee-add">
              <option value="">+ Add assignee</option>
              ${state.teamMembers
                .filter((m) => !createModalAssignees.includes(m.name))
                .map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="btn-cancel-create">Cancel</button>
          <button class="btn btn-primary" id="btn-submit-create">Create</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// Sprint Manager
// ============================================================

function renderSprintManager(): string {
  const totalSprints = state.sprints.length;
  const totalPages = Math.max(1, Math.ceil(totalSprints / SPRINTS_PER_PAGE));

  // Clamp page to valid range
  if (state.sprintPage >= totalPages) {
    state.sprintPage = totalPages - 1;
  }
  if (state.sprintPage < 0) {
    state.sprintPage = 0;
  }

  const startIdx = state.sprintPage * SPRINTS_PER_PAGE;
  const pageSprints = state.sprints.slice(startIdx, startIdx + SPRINTS_PER_PAGE);

  const sprintRows = pageSprints
    .map((s) => {
      const isCurrent = s.id === state.currentSprintId;
      const typeBadge = s.type === 'break'
        ? '<span class="sprint-type-badge break">Break</span>'
        : '<span class="sprint-type-badge sprint">Sprint</span>';

      return `
        <tr class="sprint-row ${isCurrent ? 'current' : ''}" data-id="${escapeHtml(s.id)}">
          <td>${typeBadge}</td>
          <td>${escapeHtml(s.name)}${isCurrent ? ' <span class="current-badge">Current</span>' : ''}</td>
          <td>${s.startDate}</td>
          <td>${s.endDate}</td>
          <td>
            <button class="btn btn-ghost btn-sm sprint-delete-btn" data-id="${escapeHtml(s.id)}" title="Delete">&#x2715;</button>
          </td>
        </tr>
      `;
    })
    .join('');

  const showPagination = totalSprints > SPRINTS_PER_PAGE;
  const paginationHtml = showPagination ? `
    <div class="sprint-pagination">
      <button class="btn btn-ghost btn-sm" id="sprint-page-prev" ${state.sprintPage === 0 ? 'disabled' : ''}>&#x25C0; Prev</button>
      <span class="sprint-page-info">${state.sprintPage + 1} / ${totalPages}</span>
      <button class="btn btn-ghost btn-sm" id="sprint-page-next" ${state.sprintPage >= totalPages - 1 ? 'disabled' : ''}>Next &#x25B6;</button>
    </div>
  ` : '';

  // Pre-fill start date: day after last sprint/break ends, or today
  const lastSprint = totalSprints > 0 ? state.sprints[totalSprints - 1] : null;
  const defaultStartDate = lastSprint ? addDays(lastSprint.endDate, 1) : todayString();

  return `
    <div class="modal-overlay" id="sprint-manager-overlay">
      <div class="modal sprint-manager-modal">
        <div class="sprint-manager-header">
          <h2>Manage Sprints</h2>
          <button class="btn btn-ghost" id="btn-close-sprint-manager">&#x2715;</button>
        </div>

        ${totalSprints > 0 ? `
          <table class="sprint-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${sprintRows}
            </tbody>
          </table>
          ${paginationHtml}
        ` : '<p class="sprint-empty">No sprints defined yet.</p>'}

        <div class="sprint-form">
          <h3>Add Sprint / Break</h3>
          <div class="sprint-form-row">
            <div class="form-group">
              <label for="sprint-name">Name</label>
              <input type="text" class="form-input" id="sprint-name" placeholder="e.g. Sprint 1" />
            </div>
            <div class="form-group">
              <label for="sprint-type">Type</label>
              <select class="form-select" id="sprint-type">
                <option value="sprint">Sprint</option>
                <option value="break">Break</option>
              </select>
            </div>
          </div>
          <div class="sprint-form-row">
            <div class="form-group">
              <label for="sprint-start">Start Date</label>
              <input type="date" class="form-input" id="sprint-start" value="${defaultStartDate}" />
            </div>
            <div class="form-group">
              <label for="sprint-duration">Duration</label>
              <select class="form-select" id="sprint-duration">
                <option value="1-week">1 Week</option>
                <option value="2-week">2 Weeks</option>
                <option value="3-week">3 Weeks</option>
                <option value="4-week">4 Weeks</option>
                <option value="5-week">5 Weeks</option>
                <option value="6-week">6 Weeks</option>
              </select>
            </div>
            <div class="form-group">
              <label>End Date</label>
              <span class="sprint-end-preview" id="sprint-end-preview">${calculatePreviewEnd(defaultStartDate, '1-week')}</span>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-add-sprint">Add</button>
        </div>
      </div>
    </div>
  `;
}

function renderSyncIndicator(): void {
  const dot = document.querySelector('.sync-dot');
  const label = dot?.nextElementSibling;
  if (dot) {
    dot.className = `sync-dot ${state.syncStatus === 'syncing' ? 'syncing' : ''} ${state.syncStatus === 'error' ? 'error' : ''}`;
  }
  if (label) {
    label.textContent =
      state.syncStatus === 'syncing'
        ? 'Syncing...'
        : state.syncStatus === 'error'
          ? 'Sync error'
          : 'Synced';
  }
}

// ============================================================
// Event listeners
// ============================================================

function attachEventListeners(): void {
  // Search
  const searchInput = document.getElementById(
    'search-input',
  ) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    render();
  });

  // Sprint filter - searchable select
  const sprintFilterTrigger = document.getElementById('sprint-filter-trigger');
  sprintFilterTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.sprintFilterOpen = !state.sprintFilterOpen;
    state.assigneeFilterOpen = false; // Close other dropdown
    state.assigneeFilterSearch = '';
    render();
    // Attach search input listener after render
    if (state.sprintFilterOpen) {
      attachSprintFilterSearchListeners();
    }
  });

  attachSprintFilterSearchListeners();

  // Sprint filter options
  document.querySelectorAll('#sprint-filter-dropdown .searchable-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = (e.currentTarget as HTMLElement).dataset.value;
      if (value !== undefined) {
        state.selectedSprintFilter = value;
        state.sprintFilterOpen = false;
        state.sprintFilterSearch = '';
        render();
      }
    });
  });

  // Assignee filter - searchable select
  const assigneeFilterTrigger = document.getElementById('assignee-filter-trigger');
  assigneeFilterTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.assigneeFilterOpen = !state.assigneeFilterOpen;
    state.sprintFilterOpen = false; // Close other dropdown
    state.sprintFilterSearch = '';
    render();
    // Attach search input listener after render
    if (state.assigneeFilterOpen) {
      attachAssigneeFilterSearchListeners();
    }
  });

  attachAssigneeFilterSearchListeners();

  // Assignee filter options
  document.querySelectorAll('#assignee-filter-dropdown .searchable-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = (e.currentTarget as HTMLElement).dataset.value;
      if (value !== undefined) {
        state.selectedAssigneeFilter = value;
        state.assigneeFilterOpen = false;
        state.assigneeFilterSearch = '';
        render();
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const sprintDropdown = document.getElementById('sprint-filter-dropdown');
    const assigneeDropdown = document.getElementById('assignee-filter-dropdown');
    const sprintTrigger = document.getElementById('sprint-filter-trigger');
    const assigneeTrigger = document.getElementById('assignee-filter-trigger');

    const clickedInsideSprint = sprintDropdown?.contains(target) || sprintTrigger?.contains(target);
    const clickedInsideAssignee = assigneeDropdown?.contains(target) || assigneeTrigger?.contains(target);

    let needsRender = false;
    if (!clickedInsideSprint && state.sprintFilterOpen) {
      state.sprintFilterOpen = false;
      state.sprintFilterSearch = '';
      needsRender = true;
    }
    if (!clickedInsideAssignee && state.assigneeFilterOpen) {
      state.assigneeFilterOpen = false;
      state.assigneeFilterSearch = '';
      needsRender = true;
    }
    if (needsRender) {
      render();
    }
  });

  // Create button
  document.getElementById('btn-create')?.addEventListener('click', () => {
    createModalAssignees = [];
    createModalTitle = '';
    createModalDescription = '';
    createModalSprint = state.currentSprintId ?? '';
    state.showCreateModal = true;
    render();
    document.getElementById('create-title')?.focus();
  });

  // Sprints button
  document.getElementById('btn-sprints')?.addEventListener('click', () => {
    state.showSprintManager = true;
    render();
  });

  // Sync button
  document.getElementById('btn-sync')?.addEventListener('click', () => {
    postMessage({ type: 'sync' });
  });

  // Card clicks
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const id = (card as HTMLElement).dataset.id;
      if (id) {
        postMessage({ type: 'openTicket', id });
      }
    });
  });

  // Detail panel
  document
    .getElementById('btn-close-detail')
    ?.addEventListener('click', () => {
      state.selectedTicket = null;
      render();
      postMessage({ type: 'closeDetail' });
    });

  document
    .getElementById('detail-overlay')
    ?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'detail-overlay') {
        state.selectedTicket = null;
        render();
        postMessage({ type: 'closeDetail' });
      }
    });

  // Title edit (save on blur)
  document
    .getElementById('detail-title-input')
    ?.addEventListener('blur', (e) => {
      const input = e.target as HTMLInputElement;
      const id = state.selectedTicket?.id;
      const value = input.value.trim();
      if (id && value && value !== state.selectedTicket?.title) {
        postMessage({
          type: 'updateTicket',
          id,
          updates: { title: value },
        });
      }
    });

  // Description edit (save on blur)
  document
    .getElementById('detail-description')
    ?.addEventListener('blur', (e) => {
      const textarea = e.target as HTMLTextAreaElement;
      const id = state.selectedTicket?.id;
      const value = textarea.value;
      if (id && value !== state.selectedTicket?.description) {
        postMessage({
          type: 'updateTicket',
          id,
          updates: { description: value },
        });
      }
    });

  // Status change
  document
    .getElementById('detail-status')
    ?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const id = select.dataset.id;
      if (id) {
        postMessage({
          type: 'updateTicket',
          id,
          updates: { status: select.value },
        });
      }
    });

  // Priority change
  document
    .getElementById('detail-priority')
    ?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const id = select.dataset.id;
      if (id) {
        postMessage({
          type: 'updateTicket',
          id,
          updates: { priority: select.value },
        });
      }
    });

  // Sprint change in detail panel
  document
    .getElementById('detail-sprint')
    ?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const id = select.dataset.id;
      if (id) {
        postMessage({
          type: 'updateTicket',
          id,
          updates: { sprint: select.value || undefined },
        });
      }
    });

  // Delete ticket
  document
    .getElementById('btn-delete-ticket')
    ?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const id = btn.dataset.id;
      if (id) {
        postMessage({ type: 'deleteTicket', id });
        state.selectedTicket = null;
        render();
      }
    });

  // Add comment
  document
    .getElementById('btn-add-comment')
    ?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const id = btn.dataset.id;
      const textarea = document.getElementById(
        'comment-input',
      ) as HTMLTextAreaElement;
      if (id && textarea && textarea.value.trim()) {
        postMessage({ type: 'addComment', id, body: textarea.value.trim() });
        textarea.value = '';
      }
    });

  // Create modal
  document
    .getElementById('btn-cancel-create')
    ?.addEventListener('click', () => {
      createModalTitle = '';
      createModalDescription = '';
      createModalSprint = '';
      state.showCreateModal = false;
      render();
    });

  document
    .getElementById('modal-overlay')
    ?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'modal-overlay') {
        createModalTitle = '';
        createModalDescription = '';
        createModalSprint = '';
        state.showCreateModal = false;
        render();
      }
    });

  document
    .getElementById('btn-submit-create')
    ?.addEventListener('click', () => {
      const titleInput = document.getElementById(
        'create-title',
      ) as HTMLInputElement;
      const descInput = document.getElementById(
        'create-description',
      ) as HTMLTextAreaElement;
      const sprintSelect = document.getElementById(
        'create-sprint',
      ) as HTMLSelectElement;

      const title = titleInput?.value.trim();
      if (!title) {
        titleInput?.focus();
        return;
      }

      postMessage({
        type: 'createTicket',
        title,
        description: descInput?.value.trim() || undefined,
        sprint: sprintSelect?.value || undefined,
        assignees: createModalAssignees.length > 0 ? createModalAssignees : undefined,
      });

      createModalAssignees = [];
      createModalTitle = '';
      createModalDescription = '';
      createModalSprint = '';
      state.showCreateModal = false;
      render();
    });

  // Enter key in title input
  document
    .getElementById('create-title')
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-submit-create')?.click();
      }
    });

  // Assignee picker: detail panel - add assignee
  document
    .getElementById('detail-assignee-add')
    ?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const id = select.dataset.id;
      const name = select.value;
      if (id && name && state.selectedTicket) {
        const updated = [...state.selectedTicket.assignees, name];
        postMessage({
          type: 'updateTicket',
          id,
          updates: { assignees: updated },
        });
      }
    });

  // Assignee picker: detail panel - remove assignee (tag X button)
  document.querySelectorAll('.assignee-tag-remove:not(.create-assignee-remove)').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const name = el.dataset.name;
      const ticketId = el.dataset.ticketId;
      if (name && ticketId && state.selectedTicket) {
        const updated = state.selectedTicket.assignees.filter((a) => a !== name);
        postMessage({
          type: 'updateTicket',
          id: ticketId,
          updates: { assignees: updated },
        });
      }
    });
  });

  // Assignee picker: detail panel - assign to me
  document
    .getElementById('detail-assign-me')
    ?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const id = btn.dataset.id;
      if (id && state.selectedTicket && state.currentUser.name) {
        const updated = [...state.selectedTicket.assignees, state.currentUser.name];
        postMessage({
          type: 'updateTicket',
          id,
          updates: { assignees: updated },
        });
      }
    });

  // Assignee picker: detail panel - unassign me
  document
    .getElementById('detail-unassign-me')
    ?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const id = btn.dataset.id;
      if (id && state.selectedTicket && state.currentUser.name) {
        const updated = state.selectedTicket.assignees.filter((a) => a !== state.currentUser.name);
        postMessage({
          type: 'updateTicket',
          id,
          updates: { assignees: updated },
        });
      }
    });

  // Assignee picker: create modal - add assignee
  document
    .getElementById('create-assignee-add')
    ?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const name = select.value;
      if (name && !createModalAssignees.includes(name)) {
        createModalAssignees.push(name);
        render();
      }
    });

  // Assignee picker: create modal - remove assignee (tag X button)
  document.querySelectorAll('.create-assignee-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = (e.currentTarget as HTMLElement).dataset.name;
      if (name) {
        createModalAssignees = createModalAssignees.filter((a) => a !== name);
        render();
      }
    });
  });

  // Assignee picker: create modal - assign to me
  document
    .getElementById('create-assign-me')
    ?.addEventListener('click', () => {
      if (state.currentUser.name && !createModalAssignees.includes(state.currentUser.name)) {
        createModalAssignees.push(state.currentUser.name);
        render();
      }
    });

  // Sprint Manager listeners
  attachSprintManagerListeners();
}

function attachSprintManagerListeners(): void {
  // Close sprint manager
  document
    .getElementById('btn-close-sprint-manager')
    ?.addEventListener('click', () => {
      state.showSprintManager = false;
      render();
    });

  document
    .getElementById('sprint-manager-overlay')
    ?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'sprint-manager-overlay') {
        state.showSprintManager = false;
        render();
      }
    });

  // Update end date preview when start or duration changes
  const startInput = document.getElementById('sprint-start') as HTMLInputElement;
  const durationSelect = document.getElementById('sprint-duration') as HTMLSelectElement;

  const updateEndPreview = () => {
    const preview = document.getElementById('sprint-end-preview');
    if (preview && startInput?.value && durationSelect?.value) {
      preview.textContent = calculatePreviewEnd(
        startInput.value,
        durationSelect.value,
      );
    }
  };

  startInput?.addEventListener('change', updateEndPreview);
  durationSelect?.addEventListener('change', updateEndPreview);

  // Add sprint
  document
    .getElementById('btn-add-sprint')
    ?.addEventListener('click', () => {
      const nameInput = document.getElementById('sprint-name') as HTMLInputElement;
      const typeSelect = document.getElementById('sprint-type') as HTMLSelectElement;
      const startDateInput = document.getElementById('sprint-start') as HTMLInputElement;
      const durationSelectEl = document.getElementById('sprint-duration') as HTMLSelectElement;

      const name = nameInput?.value.trim();
      if (!name) {
        nameInput?.focus();
        return;
      }

      const sprintType = typeSelect?.value as 'sprint' | 'break';
      const startDate = startDateInput?.value;
      const duration = durationSelectEl?.value as CreateSprintInput['duration'];

      if (!startDate) {
        startDateInput?.focus();
        return;
      }

      const input: CreateSprintInput = {
        name,
        startDate,
        duration,
        type: sprintType,
      };

      // For breaks, pass explicit endDate
      if (sprintType === 'break') {
        input.endDate = calculatePreviewEnd(startDate, duration);
      }

      postMessage({ type: 'createSprint', input });

      // Clear form
      if (nameInput) nameInput.value = '';
    });

  // Delete sprint buttons
  document.querySelectorAll('.sprint-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id;
      if (id) {
        postMessage({ type: 'deleteSprint', id });
      }
    });
  });

  // Sprint pagination
  document.getElementById('sprint-page-prev')?.addEventListener('click', () => {
    if (state.sprintPage > 0) {
      state.sprintPage--;
      render();
    }
  });
  document.getElementById('sprint-page-next')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.sprints.length / SPRINTS_PER_PAGE);
    if (state.sprintPage < totalPages - 1) {
      state.sprintPage++;
      render();
    }
  });
}

// ============================================================
// Drag and drop
// ============================================================

function attachDragListeners(): void {
  const cards = document.querySelectorAll('.card');
  const columns = document.querySelectorAll('.column-body');

  cards.forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      const el = card as HTMLElement;
      state.draggedCardId = el.dataset.id || null;
      el.classList.add('dragging');
      (e as DragEvent).dataTransfer?.setData('text/plain', el.dataset.id || '');
    });

    card.addEventListener('dragend', () => {
      (card as HTMLElement).classList.remove('dragging');
      state.draggedCardId = null;
      columns.forEach((col) => col.classList.remove('drag-over'));
    });
  });

  columns.forEach((column) => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');

      const id = (e as DragEvent).dataTransfer?.getData('text/plain');
      const newStatus = (column as HTMLElement).dataset.status;

      if (id && newStatus) {
        postMessage({ type: 'moveTicket', id, newStatus });
      }
    });
  });
}

// ============================================================
// Utilities
// ============================================================

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatStatus(status: string): string {
  return status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getSprintNameById(sprintId?: string): string | null {
  if (!sprintId) return null;
  const sprint = state.sprints.find((s) => s.id === sprintId);
  return sprint ? sprint.name : null;
}

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculatePreviewEnd(startDate: string, duration: string): string {
  const weeks = parseInt(duration, 10); // '3-week' -> 3
  const days = weeks * 7 - 1;
  return addDays(startDate, days);
}

// Declare the VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

// ============================================================
// Init
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  render();
  postMessage({ type: 'ready' });
});
