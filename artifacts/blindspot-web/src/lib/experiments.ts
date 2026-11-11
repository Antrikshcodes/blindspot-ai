import type { Experiment, ExperimentUpdateStatus } from '@workspace/api-client-react';

export const STATUSES: ExperimentUpdateStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'];
export const STATUS_LABEL: Record<string, string> = { PLANNED: 'Planned', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', ABANDONED: 'Abandoned' };

/** Allowed outgoing transitions. Terminal states have none. Backend is authoritative. */
export const TRANSITIONS: Record<string, ExperimentUpdateStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'ABANDONED'],
  IN_PROGRESS: ['COMPLETED', 'ABANDONED'],
  COMPLETED: [],
  ABANDONED: [],
};
export const isActive = (s: string) => s === 'PLANNED' || s === 'IN_PROGRESS';
export const canMove = (from: string, to: ExperimentUpdateStatus) => (TRANSITIONS[from] ?? []).includes(to);

export const MANUAL_FIELDS = [
  { key: 'name', label: 'Experiment name', hint: 'Short and specific.', max: 200, area: false },
  { key: 'explanation', label: 'Why this tests the assumption', hint: 'What would you believe differently if it fails?', max: 2000, area: true },
  { key: 'method', label: 'Method', hint: 'The smallest procedure that could produce a real customer signal.', max: 2000, area: true },
  { key: 'evidenceToCollect', label: 'Evidence to collect', hint: 'What you will actually observe or record.', max: 2000, area: true },
  { key: 'successCriteria', label: 'Success criteria', hint: 'A threshold decided before running it.', max: 2000, area: true },
] as const;
export type ManualKey = (typeof MANUAL_FIELDS)[number]['key'];
export type ManualFields = Record<ManualKey, string>;
export const emptyManual = (): ManualFields => ({ name: '', explanation: '', method: '', evidenceToCollect: '', successCriteria: '' });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export function manualProblems(f: ManualFields): string[] {
  return MANUAL_FIELDS.flatMap((d) => {
    const v = f[d.key].trim();
    if (!v) return [`${d.label} is required`];
    if (v.length > d.max) return [`${d.label} must be ${d.max} characters or fewer`];
    return [];
  });
}

export const OBS_MAX = 4000;
export const obsValid = (s: string) => { const t = s.trim(); return t.length > 0 && t.length <= OBS_MAX; };
export const hasSavedResult = (e: Experiment) => !!e.observedResult && e.observedResult.trim().length > 0;

export type SortKey = 'updated' | 'created' | 'name' | 'status';
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Recently updated' },
  { key: 'created', label: 'Newest created' },
  { key: 'name', label: 'Name A-Z' },
  { key: 'status', label: 'Lifecycle order' },
];

export function filterSort(items: Experiment[], o: { q: string; status: string; assumption: string; sort: SortKey }, describe: (id: string) => string | undefined) {
  const q = o.q.trim().toLowerCase();
  const out = items.filter((e) => {
    if (o.status && e.status !== o.status) return false;
    if (o.assumption && e.assumptionId !== o.assumption) return false;
    if (!q) return true;
    return [e.name, e.explanation, e.method, e.evidenceToCollect, e.successCriteria, e.observedResult ?? '', describe(e.assumptionId) ?? '']
      .some((t) => t.toLowerCase().includes(q));
  });
  const t = (s: string) => Date.parse(s) || 0;
  out.sort((a, b) => {
    switch (o.sort) {
      case 'created': return t(b.createdAt) - t(a.createdAt);
      case 'name': return a.name.localeCompare(b.name);
      case 'status': return STATUSES.indexOf(a.status as ExperimentUpdateStatus) - STATUSES.indexOf(b.status as ExperimentUpdateStatus) || t(b.updatedAt) - t(a.updatedAt);
      default: return t(b.updatedAt) - t(a.updatedAt);
    }
  });
  return out;
}
