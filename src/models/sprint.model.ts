export interface Sprint {
  id: string;            // Immutable, auto-generated: SPR-NNNN
  name: string;          // Display label, freely editable
  startDate: string;     // Calendar date YYYY-MM-DD
  endDate: string;       // Calendar date YYYY-MM-DD
  type: 'sprint' | 'break';
}

export interface SprintConfig {
  version: number;
  nextId: number;
  sprints: Sprint[];     // Always persisted sorted by startDate
}

export interface CreateSprintInput {
  name: string;
  startDate: string;
  duration: '1-week' | '2-week' | '3-week' | '4-week' | '5-week' | '6-week';
  type: 'sprint' | 'break';
  endDate?: string;      // Required for breaks, auto-calculated for sprints
}
