export interface OpentixConfig {
  prefix: string;
  statuses: string[];
  defaultAssignee: string | null;
  autoSync: boolean;
  syncIntervalSeconds: number;
  pushMode: 'direct' | 'branch-pr';
  commitStrategy: 'immediate' | 'debounce';
  commitDebounceSeconds: number;
  defaultBranch?: string;
  aiContext: {
    enabled: boolean;
  };
}

export const DEFAULT_CONFIG: OpentixConfig = {
  prefix: 'OPTX',
  statuses: ['backlog', 'in-progress', 'review', 'done', 'cancelled'],
  defaultAssignee: null,
  autoSync: true,
  syncIntervalSeconds: 60,
  pushMode: 'direct',
  commitStrategy: 'immediate',
  commitDebounceSeconds: 5,
  aiContext: {
    enabled: true,
  },
};
