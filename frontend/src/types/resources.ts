export const ResourceCategory = {
  GITHUB_REPOSITORY: 'GITHUB_REPOSITORY',
  AI_MODEL: 'AI_MODEL',
  DATASET: 'DATASET',
  API: 'API',
  DOCUMENTATION: 'DOCUMENTATION',
  OPEN_SOURCE_TOOL: 'OPEN_SOURCE_TOOL',
  LEARNING_RESOURCE: 'LEARNING_RESOURCE',
} as const;
export type ResourceCategory = typeof ResourceCategory[keyof typeof ResourceCategory];

export const ResourceSaveInputStatus = {
  CONSIDERING: 'CONSIDERING',
  TRYING: 'TRYING',
  INTEGRATED: 'INTEGRATED',
} as const;
export type ResourceSaveInputStatus = typeof ResourceSaveInputStatus[keyof typeof ResourceSaveInputStatus];

import type {
  Resource,
  Recommendation,
  SavedResource,
  ResourceListItem,
  SearchItem,
  ResourceSearch,
  ProviderStatus,
  Explanation,
} from '@workspace/api-client-react';

export type {
  Resource,
  Recommendation,
  SavedResource,
  ResourceListItem,
  SearchItem,
  ResourceSearch,
  ProviderStatus,
  Explanation,
};

export interface ResourceSearchHistoryEntry {
  id: string;
  projectId: string;
  query: string;
  requirements: string[];
  status: 'COMPLETED' | 'FAILED';
  cached: boolean;
  partial: boolean;
  explanationStatus: string;
  createdAt: string;
  providerStatuses?: Record<string, { status: string; count?: number; error?: string; durationMs?: number }>;
  queries?: Array<{
    id: string;
    searchId: string;
    providerId: string;
    adapterName: string;
    query: string;
    parameters: Record<string, unknown>;
    status: string;
    count: number;
    durationMs: number;
    cached: boolean;
    error?: string | null;
  }>;
}

export function formatCategoryLabel(category: ResourceCategory | string): string {
  switch (category) {
    case 'GITHUB_REPOSITORY':
      return 'GitHub Repo';
    case 'AI_MODEL':
      return 'AI Model';
    case 'DATASET':
      return 'Dataset';
    case 'API':
      return 'REST API';
    case 'DOCUMENTATION':
      return 'Official Docs';
    case 'OPEN_SOURCE_TOOL':
      return 'Open-Source Tool';
    case 'LEARNING_RESOURCE':
      return 'Learning Guide';
    default:
      return category?.replace(/_/g, ' ') || 'Resource';
  }
}

export function getProviderBadgeStyles(provider: string): { bg: string; text: string; border: string } {
  const p = provider.toLowerCase();
  if (p.includes('github')) {
    return { bg: 'bg-forest/10', text: 'text-forest', border: 'border-forest/25' };
  }
  if (p.includes('huggingface')) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-800', border: 'border-amber-500/30' };
  }
  if (p.includes('apis_guru') || p.includes('api')) {
    return { bg: 'bg-purple/15', text: 'text-purple', border: 'border-purple/30' };
  }
  if (p.includes('uci') || p.includes('kaggle')) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-800', border: 'border-blue-500/30' };
  }
  return { bg: 'bg-sand border-forest/15', text: 'text-forest/80', border: 'border-forest/20' };
}

export function getSaveStatusBadgeStyles(status: ResourceSaveInputStatus | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'INTEGRATED':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-800 font-bold', border: 'border-emerald-500/30' };
    case 'TRYING':
      return { bg: 'bg-purple/15', text: 'text-purple font-bold', border: 'border-purple/30' };
    case 'CONSIDERING':
    default:
      return { bg: 'bg-amber-500/15', text: 'text-amber-800 font-bold', border: 'border-amber-500/30' };
  }
}
