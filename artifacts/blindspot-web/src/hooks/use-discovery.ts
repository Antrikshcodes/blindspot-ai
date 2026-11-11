import { useCallback, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listInterviews,
  getListInterviewsQueryKey,
  getListFeedbackQueryKey,
  getListAssumptionsQueryKey,
  getGetLatestAnalysisQueryKey,
  type Interview,
} from '@workspace/api-client-react';

const TOTAL_PAGE = 100;
const MAX_PAGES = 100;

export const interviewTotalKey = (projectId: string) => ['discovery', 'interview-total', projectId] as const;

/**
 * Honest project-wide interview count. The list contract has no `total`, so we walk
 * pages of 100 until a partial page. Returns all interviews so the UI can show
 * the newest session date without inventing anything.
 */
export function useInterviewTotal(projectId: string) {
  return useQuery({
    queryKey: interviewTotalKey(projectId),
    enabled: !!projectId,
    queryFn: async ({ signal }) => {
      const all: Interview[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await listInterviews(projectId, { page, limit: TOTAL_PAGE }, { signal });
        all.push(...res.data.items);
        if (res.data.items.length < TOTAL_PAGE) return { total: all.length, items: all, complete: true };
      }
      return { total: all.length, items: all, complete: false };
    },
  });
}

/* Drafts use the same in-memory client boundary as private fetched records.
 * Clearing that client on an auth change also removes these drafts. */
export type NoteDraft = { notes: string; links: string[] };
type DraftState = { notes: Record<string, NoteDraft>; alias: string; newestNoteAt: string | null };
const draftKey = (projectId: string) => ['discovery', 'drafts', projectId] as const;
const emptyDraftState = (): DraftState => ({ notes: {}, alias: '', newestNoteAt: null });
const emptySnapshot = emptyDraftState();
function useDraftState(projectId: string) {
  const qc = useQueryClient();
  useQuery({
    queryKey: draftKey(projectId),
    queryFn: emptyDraftState,
    initialData: emptyDraftState,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  // Form controls need synchronous snapshots. Query observers normally schedule
  // notifications, which can briefly restore an older controlled-input value.
  const subscribe = useCallback((listener: () => void) => qc.getQueryCache().subscribe(listener), [qc]);
  const snapshot = useCallback(() => qc.getQueryData<DraftState>(draftKey(projectId)) ?? emptySnapshot, [qc, projectId]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const update = useCallback((change: (state: DraftState) => DraftState) => {
    qc.setQueryData<DraftState>(draftKey(projectId), (old) => change(old ?? emptyDraftState()));
  }, [qc, projectId]);
  return { state, update };
}

export function useDrafts(projectId: string) {
  const { state, update } = useDraftState(projectId);
  const get = useCallback((interviewId: string): NoteDraft => state.notes[interviewId] ?? { notes: '', links: [] }, [state.notes]);
  const set = useCallback(
    (interviewId: string, d: NoteDraft) => {
      update((old) => {
        const notes = { ...old.notes };
        if (!d.notes && d.links.length === 0) delete notes[interviewId];
        else notes[interviewId] = d;
        return { ...old, notes };
      });
    },
    [update],
  );
  const dirty = (interviewId: string) => {
    const d = state.notes[interviewId];
    return !!d && (d.notes.length > 0 || d.links.length > 0);
  };
  const dirtyCount = Object.values(state.notes).filter((d) => d.notes.length > 0 || d.links.length > 0).length;
  return { get, set, dirty, dirtyCount };
}

export function useAliasDraft(projectId: string) {
  const { state, update } = useDraftState(projectId);
  const setAlias = useCallback((alias: string) => update((old) => ({ ...old, alias })), [update]);
  return [state.alias, setAlias] as const;
}

export function useNewestNote(projectId: string) {
  const { state, update } = useDraftState(projectId);
  const mark = useCallback((createdAt: string) => update((old) =>
    !old.newestNoteAt || new Date(createdAt) > new Date(old.newestNoteAt)
      ? { ...old, newestNoteAt: createdAt } : old), [update]);
  return { newestNoteAt: state.newestNoteAt, markNote: mark };
}

export function useDiscoveryCache(projectId: string) {
  const qc = useQueryClient();
  const afterInterviewCreated = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListInterviewsQueryKey(projectId) });
    qc.invalidateQueries({ queryKey: interviewTotalKey(projectId) });
  }, [qc, projectId]);
  const afterFeedbackAdded = useCallback(
    (interviewId: string, analysisIds: string[]) => {
      qc.invalidateQueries({ queryKey: getListFeedbackQueryKey(interviewId) });
      for (const a of new Set(analysisIds)) qc.invalidateQueries({ queryKey: getListAssumptionsQueryKey(a) });
      qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) });
    },
    [qc, projectId],
  );
  return { afterInterviewCreated, afterFeedbackAdded };
}
