import type { Assumption, Evidence, EvidenceSentiment } from '@workspace/api-client-react';

export type SentimentFilter = 'ALL' | EvidenceSentiment;
export type EvidenceSort = 'newest' | 'oldest';
export type EvidenceFilters = { search: string; sentiment: SentimentFilter; origin: string; assumptionId: string; sort: EvidenceSort };
export const DEFAULT_FILTERS: EvidenceFilters = { search: '', sentiment: 'ALL', origin: 'ALL', assumptionId: 'ALL', sort: 'newest' };

/** Flattens evidence from a loaded assumptions page. Only records whose
 * assumptionId exactly matches their parent are kept; duplicates collapse by id. */
export function flattenEvidence(assumptions: Assumption[]): Evidence[] {
  const seen = new Map<string, Evidence>();
  for (const a of assumptions) for (const e of a.evidenceRecords ?? []) if (e.assumptionId === a.id && !seen.has(e.id)) seen.set(e.id, e);
  return Array.from(seen.values());
}

export function originLabel(origin: string): string {
  if (origin === 'HUMAN_MAPPING') return 'Manual link';
  if (origin === 'AI_SUGGESTED_REVIEW_REQUIRED') return 'Model suggestion';
  return origin.replace(/_/g, ' ').toLowerCase();
}
export const isModelSuggestion = (origin: string) => origin === 'AI_SUGGESTED_REVIEW_REQUIRED';

export const SENTIMENT_LABEL: Record<EvidenceSentiment, string> = { SUPPORTING: 'Leans supporting', INVALIDATING: 'Leans challenging', NEUTRAL: 'Neutral' };

const time = (s: string) => { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : 0; };

export function filterEvidence(records: Evidence[], f: EvidenceFilters, assumptionText: (id: string) => string = () => ''): Evidence[] {
  const q = f.search.trim().toLowerCase();
  return records
    .filter((e) => f.sentiment === 'ALL' || e.sentiment === f.sentiment)
    .filter((e) => f.origin === 'ALL' || e.origin === f.origin)
    .filter((e) => f.assumptionId === 'ALL' || e.assumptionId === f.assumptionId)
    .filter((e) => !q || [e.quote, e.reasoning, e.feedbackId, e.id, assumptionText(e.assumptionId)].some((t) => (t ?? '').toLowerCase().includes(q)))
    .sort((a, b) => (f.sort === 'newest' ? time(b.createdAt) - time(a.createdAt) : time(a.createdAt) - time(b.createdAt)) || a.id.localeCompare(b.id));
}

export function isFiltered(f: EvidenceFilters) {
  return f.search.trim() !== '' || f.sentiment !== 'ALL' || f.origin !== 'ALL' || f.assumptionId !== 'ALL' || f.sort !== 'newest';
}

export type Tally = { supporting: number; challenging: number; neutral: number; total: number; sources: number; mixed: boolean };
export function tally(records: Evidence[]): Tally {
  const supporting = records.filter((e) => e.sentiment === 'SUPPORTING').length;
  const challenging = records.filter((e) => e.sentiment === 'INVALIDATING').length;
  return { supporting, challenging, neutral: records.length - supporting - challenging, total: records.length, sources: new Set(records.map((e) => e.feedbackId)).size, mixed: supporting > 0 && challenging > 0 };
}

export type Relationship = { assumption: Assumption; records: Evidence[]; tally: Tally };
export function buildRelationships(assumptions: Assumption[]): Relationship[] {
  return assumptions.map((a) => {
    const records = flattenEvidence([a]);
    return { assumption: a, records, tally: tally(records) };
  });
}

/** Loaded evidence records that cite the given feedback reference exactly. */
export function evidenceForFeedback(records: Evidence[], feedbackId: string | null): Evidence[] {
  return feedbackId ? records.filter((e) => e.feedbackId === feedbackId) : [];
}
