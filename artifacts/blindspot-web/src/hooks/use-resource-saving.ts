import { useCallback, useRef, useSyncExternalStore } from 'react';
import { skipToken, useIsMutating, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getListResourcesQueryKey, getListSavedResourcesQueryKey,
  useSaveResource, useRemoveSavedResource,
  type SavedResource, type ResourceSaveInputStatus, type ResourceListItem,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export const RESOURCE_STATUSES: ResourceSaveInputStatus[] = ['CONSIDERING', 'TRYING', 'INTEGRATED'];
export const resourceWriteKey = (projectId: string, resourceId: string) => ['resource-library', 'write', projectId, resourceId] as const;
const receiptKey = (projectId: string, resourceId: string) => ['resource-library', 'association', projectId, resourceId] as const;
type Receipt = { saved: SavedResource | null };
type Page = { success: boolean; data: { items: ResourceListItem[]; pagination: { page: number; limit: number } } };
const listKeys = (projectId: string) => [getListResourcesQueryKey(projectId), getListSavedResourcesQueryKey(projectId)];

/** Prefer the newest actual read or accepted write; never invent a saved row. */
export function readResourceAssociation(qc: QueryClient, projectId: string, resourceId: string, fallback: SavedResource | null) {
  let saved = fallback;
  let newest = -1;
  for (const key of listKeys(projectId)) {
    for (const query of qc.getQueryCache().findAll({ queryKey: key })) {
      const row = (query.state.data as Page | undefined)?.data.items.find((item) => item.resource.id === resourceId);
      if (row && query.state.dataUpdatedAt >= newest) {
        newest = query.state.dataUpdatedAt;
        saved = row.saved;
      }
    }
  }
  const receipt = qc.getQueryCache().find({ queryKey: receiptKey(projectId, resourceId), exact: true });
  if (receipt?.state.data && receipt.state.dataUpdatedAt >= newest) saved = (receipt.state.data as Receipt).saved;
  return saved;
}

export function isAssociationEvent(type: string, key: readonly unknown[], projectId: string, resourceId: string) {
  if (type !== 'updated' && type !== 'removed') return false;
  return listKeys(projectId).some((list) => key[0] === list[0]) ||
    (key[0] === 'resource-library' && key[1] === 'association' && key[2] === projectId && key[3] === resourceId);
}

export function useResourceSaving(projectId: string, resourceId: string, knownSaved: SavedResource | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inflight = useRef(false);
  const writeScope = useRef<unknown>(null);
  const mk = resourceWriteKey(projectId, resourceId);
  // Observe accepted receipts without fetching a nonexistent membership endpoint.
  // This also prevents a removed row's receipt expiring while its detail is open.
  useQuery<Receipt>({ queryKey: receiptKey(projectId, resourceId), queryFn: skipToken, gcTime: Infinity });
  const subscribe = useCallback((listener: () => void) => qc.getQueryCache().subscribe((event) => {
    if (isAssociationEvent(event.type, event.query.queryKey, projectId, resourceId)) listener();
  }), [qc, projectId, resourceId]);
  const snapshot = useCallback(() => readResourceAssociation(qc, projectId, resourceId, knownSaved), [qc, projectId, resourceId, knownSaved]);
  const saved = useSyncExternalStore(subscribe, snapshot, snapshot);
  const scopeIsCurrent = () => !!writeScope.current && writeScope.current === qc.getQueryCache().find({
    queryKey: receiptKey(projectId, resourceId), exact: true,
  });
  const refresh = () => Promise.all(listKeys(projectId).map((queryKey) => qc.invalidateQueries({ queryKey })));
  const accepted = async (value: SavedResource | null) => {
    if (!scopeIsCurrent()) return false;
    // Cancel pre-write reads before installing acknowledged state.
    await Promise.all(listKeys(projectId).map((queryKey) => qc.cancelQueries({ queryKey })));
    // A logout/cache clear can happen while cancelled reads are settling.
    // Route unmounts retain this receipt; a private-cache clear destroys it.
    if (!scopeIsCurrent()) return false;
    qc.setQueryData<Receipt>(receiptKey(projectId, resourceId), { saved: value });
    for (const [index, queryKey] of listKeys(projectId).entries()) {
      for (const query of qc.getQueryCache().findAll({ queryKey })) {
        const old = query.state.data as Page | undefined;
        if (!old?.data.items.some((item) => item.resource.id === resourceId)) continue;
        const items = index === 1 && value === null
          ? old.data.items.filter((item) => item.resource.id !== resourceId)
          : old.data.items.map((item) => item.resource.id === resourceId ? { ...item, saved: value } : item);
        // An association patch is not a new server read of every other row.
        // Keep that read's timestamp so unrelated stale memberships cannot win.
        qc.setQueryData<Page>(query.queryKey, { ...old, data: { ...old.data, items } }, { updatedAt: query.state.dataUpdatedAt });
      }
    }
    return true;
  };
  const settled = async () => {
    try { if (scopeIsCurrent()) await refresh(); } finally { inflight.current = false; }
  };
  const saveMutation = useSaveResource({ mutation: {
    mutationKey: mk, retry: false, onSuccess: async (res) => {
      if (await accepted(res.data)) toast({ title: 'Resource saved', description: 'The project association is stored by the backend.' });
    }, onSettled: settled,
  } });
  const removeMutation = useRemoveSavedResource({ mutation: {
    mutationKey: mk, retry: false, onSuccess: async (res) => {
      if (!res.data.removedFromSaved) throw new Error('The server did not confirm removal.');
      if (await accepted(null)) toast({ title: 'Removed from this library', description: 'The shared resource and other projects’ saves were not deleted.' });
    }, onSettled: settled,
  } });
  const busy = useIsMutating({ mutationKey: mk }) > 0 || saveMutation.isPending || removeMutation.isPending;
  const lock = () => {
    if (inflight.current || qc.isMutating({ mutationKey: mk }) > 0) return false;
    const scope = qc.getQueryCache().find({ queryKey: receiptKey(projectId, resourceId), exact: true });
    if (!scope) return false;
    writeScope.current = scope;
    inflight.current = true;
    saveMutation.reset(); removeMutation.reset();
    return true;
  };
  const save = () => {
    if (snapshot() || !lock()) return;
    saveMutation.mutate({ id: resourceId, data: { projectId } });
  };
  const changeStatus = (status: ResourceSaveInputStatus) => {
    const current = snapshot();
    if (!current || current.status === status || !RESOURCE_STATUSES.includes(status) || !lock()) return;
    saveMutation.mutate({ id: resourceId, data: { projectId, status } });
  };
  const remove = (onSuccess?: () => void) => {
    if (!snapshot()) { onSuccess?.(); return; }
    if (!lock()) return;
    removeMutation.mutate({ id: projectId, resourceId }, { onSuccess });
  };
  return { saved, busy, error: saveMutation.error ?? removeMutation.error, save, changeStatus, remove };
}
