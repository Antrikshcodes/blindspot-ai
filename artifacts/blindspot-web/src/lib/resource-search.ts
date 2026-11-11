import { ResourceCategory, ResourceProvider, type ResourceSearchInput } from '@workspace/api-client-react';

export type Mode = 'query' | 'auto';
export type Draft = {
  mode: Mode;
  query: string;
  languages: string;
  topics: string;
  tasks: string;
  categories: ResourceCategory[];
  providers: ResourceProvider[];
  explain: boolean;
  includeArchived: boolean;
};

export const emptyDraft = (): Draft => ({
  mode: 'query', query: '', languages: '', topics: '', tasks: '',
  categories: [], providers: [], explain: false, includeArchived: false,
});

export const CATEGORIES = Object.values(ResourceCategory) as ResourceCategory[];
export const CORE_CATEGORIES: ResourceCategory[] = ['GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION'];
export const PROVIDERS = Object.values(ResourceProvider) as ResourceProvider[];

export const CATEGORY_META: Record<ResourceCategory, { label: string; desc: string }> = {
  GITHUB_REPOSITORY: { label: 'Repositories', desc: 'Source code on GitHub' },
  DATASET: { label: 'Datasets', desc: 'Hugging Face, UCI, Kaggle (opt-in)' },
  AI_MODEL: { label: 'Models', desc: 'Hugging Face model hub' },
  API: { label: 'APIs', desc: 'APIs.guru directory, technical catalog' },
  DOCUMENTATION: { label: 'Docs', desc: 'Reviewed technical catalog' },
  OPEN_SOURCE_TOOL: { label: 'Tools', desc: 'GitHub, technical catalog' },
  LEARNING_RESOURCE: { label: 'Learning', desc: 'Technical catalog only' },
};

export const PROVIDER_META: Record<ResourceProvider, { label: string; covers: string; optIn?: boolean }> = {
  github: { label: 'GitHub', covers: 'Repositories, tools' },
  huggingface: { label: 'Hugging Face (both)', covers: 'Models and datasets' },
  huggingface_models: { label: 'HF models', covers: 'Models' },
  huggingface_datasets: { label: 'HF datasets', covers: 'Datasets' },
  kaggle: { label: 'Kaggle', covers: 'Datasets', optIn: true },
  uci: { label: 'UCI ML Repository', covers: 'Datasets' },
  apis_guru: { label: 'APIs.guru', covers: 'APIs' },
  technical: { label: 'Technical catalog', covers: 'APIs, docs, tools, learning' },
};

export const EXAMPLES = [
  'appointment no-show prediction',
  'invoice OCR extraction',
  'speech to text for clinics',
  'postal address autocomplete',
];

export const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function validate(d: Draft): string[] {
  const errs: string[] = [];
  const q = d.query.trim();
  if (d.mode === 'query' && (q.length < 1 || q.length > 150)) errs.push('Query must be 1 to 150 characters.');
  const check = (name: string, list: string[], max: number) => {
    if (list.length > 5) errs.push(`Use at most five ${name}.`);
    if (list.some((x) => x.length > max)) errs.push(`Each ${name.replace(/s$/, '')} must be at most ${max} characters.`);
  };
  check('languages', splitList(d.languages), 40);
  check('topics', splitList(d.topics), 40);
  check('tasks', splitList(d.tasks), 60);
  return errs;
}

export function buildPayload(d: Draft): ResourceSearchInput {
  const languages = splitList(d.languages);
  const topics = splitList(d.topics);
  const tasks = splitList(d.tasks);
  return {
    ...(d.mode === 'query' ? { query: d.query.trim() } : {}),
    categories: d.categories.length ? d.categories : CORE_CATEGORIES,
    ...(d.providers.length ? { providers: d.providers } : {}),
    ...(languages.length ? { languages } : {}),
    ...(topics.length ? { topics } : {}),
    ...(tasks.length ? { tasks } : {}),
    ...(d.includeArchived ? { includeArchived: true } : {}),
    explain: d.explain,
  };
}

/** http/https only, no embedded credentials. */
export function safeExternal(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export const fmtWhen = (s?: string | null) => {
  if (!s) return 'Unknown';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleString();
};
