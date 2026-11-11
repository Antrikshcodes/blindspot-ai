import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useSearchResources,
  getListResourcesQueryKey,
  getListResourceSearchesQueryKey,
  getGetLatestAnalysisQueryKey,
  type ResourceSearch,
} from '@workspace/api-client-react';
import { emptyDraft, type Draft } from '@/lib/resource-search';

/* Session-only state in the private QueryClient: no module globals, no localStorage. */
export type RunState = { last: ResourceSearch | null; lastAt: string | null; failedAt: string | null; failedQuery: string | null };
type Store = { draft: Draft; run: RunState; notice: string | null };
const key = (projectId: string) => ['resource-search', 'session', projectId] as const;
const emptyRun = (): RunState => ({ last: null, lastAt: null, failedAt: null, failedQuery: null });
const emptyStore = (): Store => ({ draft: emptyDraft(), run: emptyRun(), notice: null });
const fallback = emptyStore();
export const searchMutationKey = (projectId: string) => ['resource-search', 'run', projectId] as const;

export const isResourceSessionChange = (type: string, queryKey: readonly unknown[], projectId: string) =>
  (type === 'updated' || type === 'removed') && queryKey.length === 3 &&
  queryKey[0] === 'resource-search' && queryKey[1] === 'session' && queryKey[2] === projectId;

export function useResourceSession(projectId: string) {
  const qc = useQueryClient();
  useQuery({ queryKey: key(projectId), queryFn: emptyStore, initialData: emptyStore, staleTime: Infinity, gcTime: Infinity });
  const subscribe = useCallback((l: () => void) => qc.getQueryCache().subscribe((event) => {
    // Other queries can be added during render. They must not synchronously
    // notify draft subscribers in another component.
    if (isResourceSessionChange(event.type, event.query.queryKey, projectId)) l();
  }), [qc, projectId]);
  const snap = useCallback(() => qc.getQueryData<Store>(key(projectId)) ?? fallback, [qc, projectId]);
  const state = useSyncExternalStore(subscribe, snap, snap);
  const update = useCallback((fn: (s: Store) => Store) => qc.setQueryData<Store>(key(projectId), (o) => fn(o ?? emptyStore())), [qc, projectId]);
  const setDraft = useCallback((p: Partial<Draft>) => update((s) => ({ ...s, draft: { ...s.draft, ...p } })), [update]);
  const clearDraft = useCallback(() => update((s) => ({ ...s, draft: emptyDraft(), notice: null })), [update]);
  const setNotice = useCallback((notice: string | null) => update((s) => ({ ...s, notice })), [update]);
  return { draft: state.draft, run: state.run, notice: state.notice, setDraft, clearDraft, setNotice };
}

export function useRunResourceSearch(projectId: string) {
  const qc = useQueryClient();
  const inflight = useRef(false);
  const writeScope = useRef<unknown>(null);
  const mk = searchMutationKey(projectId);
  const scopeIsCurrent = () => !!writeScope.current && writeScope.current === qc.getQueryCache().find({
    queryKey: key(projectId), exact: true,
  });
  const m = useSearchResources({
    mutation: {
      mutationKey: mk,
      retry: false,
      onSuccess: (res) => {
        if (!scopeIsCurrent()) return;
        qc.setQueryData<Store>(key(projectId), (o) => ({
          ...(o ?? emptyStore()),
          notice: null,
          run: { last: res.data, lastAt: new Date().toISOString(), failedAt: null, failedQuery: null },
        }));
      },
      onError: (_e, vars) => {
        if (!scopeIsCurrent()) return;
        qc.setQueryData<Store>(key(projectId), (o) => {
          const s = o ?? emptyStore();
          return { ...s, run: { ...s.run, failedAt: new Date().toISOString(), failedQuery: vars.data.query ?? null } };
        });
      },
      onSettled: () => {
        inflight.current = false;
        if (!scopeIsCurrent()) return;
        // A failed/lost response may still have committed a completed search.
        return Promise.all([
          qc.invalidateQueries({ queryKey: getListResourcesQueryKey(projectId) }),
          qc.invalidateQueries({ queryKey: getListResourceSearchesQueryKey(projectId) }),
          qc.invalidateQueries({ queryKey: getGetLatestAnalysisQueryKey(projectId) }),
        ]);
      },
    },
  });
  const busy = useIsMutating({ mutationKey: mk }) > 0 || m.isPending;
  const tryLock = () => {
    if (inflight.current || qc.isMutating({ mutationKey: mk }) > 0) return false;
    const scope = qc.getQueryCache().find({ queryKey: key(projectId), exact: true });
    if (!scope) return false;
    writeScope.current = scope;
    inflight.current = true;
    return true;
  };
  return { m, busy, tryLock };
}
