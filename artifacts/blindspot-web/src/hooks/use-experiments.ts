import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useIsMutating, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  useCreateExperiment,
  useUpdateExperiment,
  getListExperimentsQueryKey,
  type Experiment,
  type ListExperiments200,
} from '@workspace/api-client-react';
import { emptyManual, type ManualFields } from '@/lib/experiments';

/* Private drafts live only in the session QueryClient (cleared with it on auth change). */
export type CreateDraft = { mode: 'ai' | 'manual'; assumptionId: string; fields: ManualFields };
type DraftState = { create: CreateDraft; obs: Record<string, string> };
const draftKey = (projectId: string) => ['experiments', 'drafts', projectId] as const;
const emptyCreate = (): CreateDraft => ({ mode: 'ai', assumptionId: '', fields: emptyManual() });
const emptyState = (): DraftState => ({ create: emptyCreate(), obs: {} });
const emptySnapshot = emptyState();

export function useExperimentDrafts(projectId: string) {
  const qc = useQueryClient();
  useQuery({ queryKey: draftKey(projectId), queryFn: emptyState, initialData: emptyState, staleTime: Infinity, gcTime: Infinity });
  const subscribe = useCallback((l: () => void) => qc.getQueryCache().subscribe(l), [qc]);
  const snap = useCallback(() => qc.getQueryData<DraftState>(draftKey(projectId)) ?? emptySnapshot, [qc, projectId]);
  const state = useSyncExternalStore(subscribe, snap, snap);
  const update = useCallback((fn: (s: DraftState) => DraftState) => qc.setQueryData<DraftState>(draftKey(projectId), (o) => fn(o ?? emptyState())), [qc, projectId]);
  const setCreate = useCallback((c: Partial<CreateDraft>) => update((s) => ({ ...s, create: { ...s.create, ...c } })), [update]);
  const resetCreate = useCallback(() => update((s) => ({ ...s, create: emptyCreate() })), [update]);
  /** undefined = untouched (the saved record value is shown exactly). */
  const getObs = useCallback((id: string): string | undefined => state.obs[id], [state.obs]);
  const setObs = useCallback((id: string, v: string | undefined) => update((s) => {
    const obs = { ...s.obs };
    if (v === undefined) delete obs[id]; else obs[id] = v;
    return { ...s, obs };
  }), [update]);
  return { create: state.create, setCreate, resetCreate, getObs, setObs };
}

export const createKey = (projectId: string) => ['experiments', 'create', projectId] as const;
export const updateKey = (experimentId: string) => ['experiments', 'update', experimentId] as const;

function patchLists(qc: QueryClient, projectId: string, rec: Experiment) {
  qc.setQueriesData<ListExperiments200>({ queryKey: getListExperimentsQueryKey(projectId) }, (old) => {
    if (!old?.data?.items) return old;
    if (!old.data.items.some((e) => e.id === rec.id)) return old;
    return { ...old, data: { ...old.data, items: old.data.items.map((e) => (e.id === rec.id ? rec : e)) } };
  });
}

/** Create with a cross-remount lock. Cache work lives in hook-level onSuccess so it survives unmount. */
export function useCreateExp(projectId: string) {
  const qc = useQueryClient();
  const inflight = useRef(false);
  const m = useCreateExperiment({
    mutation: {
      mutationKey: createKey(projectId),
      onSuccess: () => {
        qc.setQueryData<DraftState>(draftKey(projectId), (old) => ({ ...(old ?? emptyState()), create: emptyCreate() }));
        return qc.invalidateQueries({ queryKey: getListExperimentsQueryKey(projectId) });
      },
      onSettled: () => { inflight.current = false; },
    },
  });
  const busy = useIsMutating({ mutationKey: createKey(projectId) }) > 0 || m.isPending;
  const tryLock = () => {
    if (inflight.current || qc.isMutating({ mutationKey: createKey(projectId) }) > 0) return false;
    inflight.current = true;
    return true;
  };
  return { m, busy, tryLock };
}

export function useUpdateExp(projectId: string, experimentId: string) {
  const qc = useQueryClient();
  const inflight = useRef(false);
  const m = useUpdateExperiment({
    mutation: {
      mutationKey: updateKey(experimentId),
      onSuccess: (res, variables) => {
        patchLists(qc, projectId, res.data);
        qc.setQueryData<DraftState>(draftKey(projectId), (old) => {
          if (!old) return old;
          const draft = old.obs[experimentId];
          const submitted = variables.data.observedResult;
          if (res.data.status !== 'COMPLETED' && res.data.status !== 'ABANDONED' &&
            (submitted === undefined || draft?.trim() !== submitted.trim())) return old;
          const obs = { ...old.obs };
          delete obs[experimentId];
          return { ...old, obs };
        });
        return qc.invalidateQueries({ queryKey: getListExperimentsQueryKey(projectId) });
      },
      onSettled: () => { inflight.current = false; },
    },
  });
  const busy = useIsMutating({ mutationKey: updateKey(experimentId) }) > 0 || m.isPending;
  const tryLock = () => {
    if (inflight.current || qc.isMutating({ mutationKey: updateKey(experimentId) }) > 0) return false;
    inflight.current = true;
    return true;
  };
  return { m, busy, tryLock };
}
