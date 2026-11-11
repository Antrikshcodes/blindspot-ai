import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { getListResourcesQueryKey, getListSavedResourcesQueryKey, type ListResources200 } from '@workspace/api-client-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceLibraryPage from './resource-library';
import ResourcesPage from './resources';
import { LibraryFixture, associationKey, libraryDate, savedResource, secondLibraryProject } from '@/test/library-fixture';
import { makeResource, resourceId, resourceProjectId } from '@/test/resource-fixture';
import { isAssociationEvent, readResourceAssociation } from '@/hooks/use-resource-saving';
import { emptyClient, filterLoaded, groupItems } from '@/lib/resource-library';

// Contract/UI fixtures only, not live auth, ownership or database persistence evidence.
let fixture: LibraryFixture;
let client: QueryClient;
let releaseSave: (() => void) | undefined;
let releaseRemove: (() => void) | undefined;
let releaseRead: (() => void) | undefined;
function mount(view = 'library', projectId = resourceProjectId) {
  window.history.replaceState({}, '', `/projects/${projectId}/${view}`);
  return render(<QueryClientProvider client={client}><Router>
    <Route path="/projects/:id/resources" component={ResourcesPage} />
    <Route path="/projects/:id/library" component={ResourceLibraryPage} />
  </Router></QueryClientProvider>);
}
const writes = () => fixture.calls.filter((call) => call.method === 'POST' || call.method === 'DELETE');
const settled = () => waitFor(() => expect(client.isMutating()).toBe(0));
const card = (n: number, source = false) => screen.getByTestId(`${source ? 'resource' : 'library'}-card-${resourceId(n)}`);
const controls = (n: number, source = false) => within(card(n, source));
async function ready(source = false) {
  await screen.findByTestId(source ? 'resource-workspace' : 'resource-library');
  await screen.findByTestId(`${source ? 'resource' : 'library'}-card-${resourceId(10)}`);
}
async function confirmRemove(n = 10, scope = controls(n)) {
  fireEvent.click(scope.getByTestId(`remove-resource-${resourceId(n)}`));
  return screen.findByTestId('remove-resource-dialog');
}

describe('Project Resource Library generated-client regressions', () => {
  beforeEach(() => {
    fixture = new LibraryFixture();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    releaseSave = releaseRemove = releaseRead = undefined;
    vi.stubGlobal('fetch', vi.fn(fixture.fetch));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
    vi.stubGlobal('scrollTo', vi.fn());
  });
  afterEach(async () => {
    releaseSave?.(); releaseRemove?.(); releaseRead?.();
    await settled(); cleanup(); client.clear(); vi.unstubAllGlobals();
  });

  it('reads the dedicated saved endpoint with bounded pagination and actual source/save metadata', async () => {
    mount(); await ready();
    expect(screen.getAllByTestId(/^library-card-/)).toHaveLength(2);
    expect(card(10)).toHaveTextContent('0 stars');
    expect(card(10)).not.toHaveTextContent('0 downloads');
    expect(card(10)).toHaveTextContent('Unknown');
    expect(screen.getByTestId('library-scope')).toHaveTextContent(/page/i);
    const call = fixture.calls.find((call) => call.path.endsWith('/resources/saved'));
    expect(call?.params.get('limit')).toBe('20');
    expect(writes()).toHaveLength(0);
  });

  it('saves an existing discovered ID and shows the server association in both discovery and library', async () => {
    mount('resources'); await ready(true);
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`));
    await settled();
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `/api/resources/${resourceId(11)}/save`, body: { projectId: resourceProjectId } });
    expect(controls(11, true).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('link-open-resource-library'));
    expect(await screen.findByTestId(`library-card-${resourceId(11)}`)).toBeInTheDocument();
    expect(fixture.resources).toHaveLength(4);
  });

  it('does not resubmit already-saved records or unchanged statuses', async () => {
    mount('resources'); await ready(true);
    expect(controls(10, true).queryByTestId(`save-resource-${resourceId(10)}`)).not.toBeInTheDocument();
    fireEvent.click(controls(10, true).getByTestId(`saved-state-${resourceId(10)}`));
    fireEvent.change(controls(10, true).getByTestId(`resource-status-${resourceId(10)}`), { target: { value: 'CONSIDERING' } });
    expect(writes()).toHaveLength(0);
  });

  it('persists a supported status through the existing upsert without replacing the saved date', async () => {
    mount(); await ready();
    const before = fixture.associations.get(associationKey(resourceProjectId, resourceId(10)))!;
    fireEvent.change(controls(10).getByTestId(`resource-status-${resourceId(10)}`), { target: { value: 'INTEGRATED' } });
    await settled();
    expect(writes()[0].body).toEqual({ projectId: resourceProjectId, status: 'INTEGRATED' });
    const saved = fixture.associations.get(associationKey(resourceProjectId, resourceId(10)))!;
    expect(saved.id).toBe(before.id); expect(saved.createdAt).toBe(libraryDate);
    expect(controls(10).getByTestId(`resource-status-${resourceId(10)}`)).toHaveValue('INTEGRATED');
    expect(card(10)).toHaveTextContent('association updated');
    expect(card(10)).not.toHaveTextContent('status changed');
  });

  it('confirms project-only removal, supports cancel and keeps shared data and another project association', async () => {
    fixture.associations.set(associationKey(secondLibraryProject, resourceId(10)), savedResource(10, secondLibraryProject, 'INTEGRATED'));
    mount(); await ready();
    const dialog = await confirmRemove();
    expect(dialog).toHaveTextContent(/shared resource/i);
    fireEvent.click(within(dialog).getByTestId('cancel-remove-resource'));
    expect(writes()).toHaveLength(0);
    const again = await confirmRemove();
    fireEvent.click(within(again).getByTestId('confirm-remove-resource')); await settled();
    expect(screen.queryByTestId(`library-card-${resourceId(10)}`)).not.toBeInTheDocument();
    expect(writes()[0]).toMatchObject({ method: 'DELETE', path: `/api/projects/${resourceProjectId}/resources/${resourceId(10)}/save` });
    expect(writes()[0].body).toBeUndefined();
    expect(fixture.associations.has(associationKey(secondLibraryProject, resourceId(10)))).toBe(true);
    expect(fixture.resources).toHaveLength(4);
    fireEvent.click(screen.getByTestId('link-resource-intelligence'));
    await screen.findByTestId(`resource-card-${resourceId(10)}`);
    expect(controls(10, true).getByTestId(`save-resource-${resourceId(10)}`)).toBeInTheDocument();
  });

  it('keeps failed removal visible and saved until an explicit successful retry', async () => {
    fixture.failRemove = true; mount(); await ready();
    const dialog = await confirmRemove();
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource')); await settled();
    expect(screen.getByTestId('remove-resource-dialog')).toBeInTheDocument();
    expect(card(10)).toBeInTheDocument();
    expect(within(dialog).getByTestId('confirm-remove-resource')).toHaveTextContent(/retry/i);
    fixture.failRemove = false;
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource')); await settled();
    expect(screen.queryByTestId(`library-card-${resourceId(10)}`)).not.toBeInTheDocument();
    expect(writes()).toHaveLength(2);
  });

  it('does not treat an unconfirmed removal response as deletion', async () => {
    fixture.falseRemoval = true; mount(); await ready();
    const dialog = await confirmRemove();
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource')); await settled();
    expect(card(10)).toBeInTheDocument();
    expect(screen.getByTestId('remove-resource-dialog')).toBeInTheDocument();
    expect(fixture.associations.has(associationKey(resourceProjectId, resourceId(10)))).toBe(true);
  });

  it('blocks repeated saves across remounts and never shows an optimistic fabricated saved row', async () => {
    fixture.saveGate = new Promise((resolve) => { releaseSave = resolve; });
    const view = mount('resources'); await ready(true);
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(controls(11, true).queryByTestId(`saved-state-${resourceId(11)}`)).not.toBeInTheDocument();
    expect(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`)).toBeDisabled();
    view.unmount(); mount('resources'); await ready(true);
    expect(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`)).toBeDisabled();
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`));
    expect(writes()).toHaveLength(1);
    releaseSave!(); await settled();
    expect(controls(11, true).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument();
  });

  it('blocks repeated removal while the confirmation request is pending', async () => {
    fixture.removeGate = new Promise((resolve) => { releaseRemove = resolve; });
    mount(); await ready(); const dialog = await confirmRemove();
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource'));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(within(dialog).getByTestId('confirm-remove-resource')).toBeDisabled();
    expect(card(10)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource'));
    expect(writes()).toHaveLength(1);
    releaseRemove!(); await settled();
    expect(screen.queryByTestId(`library-card-${resourceId(10)}`)).not.toBeInTheDocument();
  });

  it('does not restore private associations when a delayed write finishes after cache clearing', async () => {
    fixture.saveGate = new Promise((resolve) => { releaseSave = resolve; });
    const view = mount('resources'); await ready(true);
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const pending = client.getMutationCache().getAll()[0];
    view.unmount(); client.clear();
    releaseSave!();
    await waitFor(() => expect(pending.state.status).toBe('success'));
    expect(fixture.associations.has(associationKey(resourceProjectId, resourceId(11)))).toBe(true);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(fixture.calls.filter((call) => call.path.endsWith('/resources'))).toHaveLength(1);
  });

  it('handles rejected saves without false membership and reconciles a committed save whose response was lost', async () => {
    mount('resources'); await ready(true); fixture.failSave = true;
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`)); await settled();
    expect(controls(11, true).queryByTestId(`saved-state-${resourceId(11)}`)).not.toBeInTheDocument();
    expect(fixture.associations.has(associationKey(resourceProjectId, resourceId(11)))).toBe(false);
    fixture.failSave = false; fixture.loseSaveResponse = true;
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`)); await settled();
    expect(controls(11, true).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument();
    expect(writes()).toHaveLength(2); // Two explicit attempts, never an automatic retry.
    expect([...fixture.associations.values()].filter((row) => row.resourceId === resourceId(11))).toHaveLength(1);
  });

  it('removes from an open detail and permits re-saving the same underlying resource', async () => {
    mount(); await ready(); fireEvent.click(screen.getByTestId(`library-open-${resourceId(10)}`));
    const detail = await screen.findByTestId('resource-detail');
    await within(detail).findByText('Current metadata for TEST ONLY resource 10. Not verified.');
    const link = within(detail).getByTestId('link-resource-external');
    expect(link).toHaveAttribute('href', 'https://github.com/facebook/react');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const dialog = await confirmRemove(10, within(detail));
    fireEvent.click(within(dialog).getByTestId('confirm-remove-resource')); await settled();
    expect(within(detail).queryByTestId(`saved-state-${resourceId(10)}`)).not.toBeInTheDocument();
    fireEvent.click(within(detail).getByTestId(`save-resource-${resourceId(10)}`)); await settled();
    expect(within(detail).getByTestId(`saved-state-${resourceId(10)}`)).toBeInTheDocument();
    expect(fixture.resources).toHaveLength(4);
    expect(writes()).toHaveLength(2);
  });

  it('loads saved state from the backend again after a fresh private client, not browser bookmarks', async () => {
    const view = mount('resources'); await ready(true);
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`)); await settled();
    view.unmount(); client.clear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    mount(); await screen.findByTestId(`library-card-${resourceId(11)}`);
    expect(writes()).toHaveLength(1);
  });

  it('uses server category/provider/order filters and labels text/language/status/date refinements as page-only', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByTestId('library-category'), { target: { value: 'DATASET' } });
    await waitFor(() => expect(screen.getAllByTestId(/^library-card-/)).toHaveLength(1));
    fireEvent.change(screen.getByTestId('library-provider'), { target: { value: 'huggingface_datasets' } });
    fireEvent.change(screen.getByTestId('library-sort'), { target: { value: 'lastUpdated' } });
    await waitFor(() => expect(fixture.calls.some((call) => call.params.get('provider') === 'huggingface_datasets' && call.params.get('sort') === 'lastUpdated')).toBe(true));
    const calls = fixture.calls.length;
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: 'not on this page' } });
    expect(screen.queryAllByTestId(/^library-card-/)).toHaveLength(0);
    expect(screen.getByTestId('library-scope')).toHaveTextContent(/page/i);
    expect(fixture.calls).toHaveLength(calls);
    fireEvent.click(screen.getByTestId('library-clear-filters'));
    await screen.findByTestId(`library-card-${resourceId(10)}`);
    expect(screen.getByTestId('library-search')).toHaveValue('');
  });

  it('keeps pagination based on raw loaded rows even when local filters show no matches', async () => {
    fixture.resources = Array.from({ length: 25 }, (_, i) => makeResource(100 + i, 'AI_MODEL', 'huggingface_models'));
    fixture.associations = new Map(fixture.resources.map((r, i) => [associationKey(resourceProjectId, r.id), { ...savedResource(100 + i), resourceId: r.id }]));
    mount(); await screen.findByTestId(`library-card-${resourceId(100)}`);
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: 'no matching name' } });
    expect(screen.queryAllByTestId(/^library-card-/)).toHaveLength(0);
    expect(screen.getByTestId('button-page-next')).toBeEnabled();
    fireEvent.click(screen.getByTestId('button-page-next'));
    await waitFor(() => expect(fixture.calls.some((call) => call.params.get('page') === '2')).toBe(true));
    fireEvent.change(screen.getByTestId('library-search'), { target: { value: '' } });
    await screen.findByTestId(`library-card-${resourceId(120)}`);
    expect(screen.getAllByTestId(/^library-card-/)).toHaveLength(5);
    expect(fixture.calls.filter((call) => call.path.endsWith('/saved')).every((call) => call.params.get('limit') === '20')).toBe(true);
  });

  it('renders honest empty and saved-list error states without fabricated records', async () => {
    fixture.associations.clear(); const view = mount();
    await screen.findByTestId('resource-library');
    await waitFor(() => expect(fixture.calls.some((call) => call.path.endsWith('/saved'))).toBe(true));
    expect(screen.queryAllByTestId(/^library-card-/)).toHaveLength(0);
    expect(screen.getByTestId('link-resource-intelligence')).toBeInTheDocument();
    view.unmount(); client.clear(); fixture.failSavedRead = true;
    mount(); await screen.findByTestId('button-retry');
    expect(screen.queryAllByTestId(/^library-card-/)).toHaveLength(0);
    expect(writes()).toHaveLength(0);
  });

  it('keeps membership isolated when viewing another owned project', async () => {
    fixture.ownedProjects.add(secondLibraryProject);
    fixture.associations.set(associationKey(secondLibraryProject, resourceId(11)), savedResource(11, secondLibraryProject));
    mount('library', secondLibraryProject);
    await screen.findByTestId(`library-card-${resourceId(11)}`);
    expect(screen.queryByTestId(`library-card-${resourceId(10)}`)).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it('redirects the previous saved-collection bookmark to the dedicated library', async () => {
    mount('resources?collection=saved'); await ready();
    expect(window.location.pathname).toBe(`/projects/${resourceProjectId}/library`);
    expect(window.location.search).toBe('');
  });

  it.each([401, 404, 503] as const)('blocks library access when project ownership/auth lookup returns %s', async (status) => {
    fixture.access = status; mount();
    if (status === 404) await screen.findByText('Project not found');
    else await screen.findByTestId('button-retry');
    expect(screen.queryByTestId('resource-library')).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it('does not make an unrelated stale membership fresh when patching another resource', async () => {
    mount('resources'); await ready(true);
    fixture.associations.delete(associationKey(resourceProjectId, resourceId(10)));
    const sourceKey = getListResourcesQueryKey(resourceProjectId, { page: 1, limit: 20, sort: 'relevance' });
    const old = client.getQueryData<ListResources200>(sourceKey)!;
    client.setQueryDefaults(getListSavedResourcesQueryKey(resourceProjectId), { gcTime: Infinity });
    act(() => {
      client.setQueryData(sourceKey, { ...old, data: { ...old.data, items: old.data.items.map((row) => ({ ...row, saved: null })) } }, { updatedAt: 300 });
      client.setQueryData(getListSavedResourcesQueryKey(resourceProjectId, { page: 1, limit: 20 }), {
        success: true, data: { items: [10, 11].map((n) => ({ resource: fixture.resources.find((r) => r.id === resourceId(n)), saved: savedResource(n) })), pagination: { page: 1, limit: 20 } },
      }, { updatedAt: 250 });
    });
    fixture.collectionReadGate = new Promise((resolve) => { releaseRead = resolve; });
    fireEvent.click(controls(11, true).getByTestId(`save-resource-${resourceId(11)}`));
    await waitFor(() => expect(controls(11, true).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument());
    expect(readResourceAssociation(client, resourceProjectId, resourceId(10), null)).toBeNull();
    expect(client.getQueryState(getListSavedResourcesQueryKey(resourceProjectId, { page: 1, limit: 20 }))?.dataUpdatedAt).toBe(250);
    releaseRead!(); await settled();
  });

  it('filters only actual loaded fields and scopes cache subscriptions to the association project', () => {
    const item = { resource: fixture.resources[0], saved: savedResource(10), rankScore: null, relevanceScore: null };
    expect(filterLoaded([item], { ...emptyClient(), language: 'javascript', from: '2026-11-10', through: '2026-11-10' })).toHaveLength(1);
    expect(filterLoaded([item], { ...emptyClient(), status: 'TRYING' })).toHaveLength(0);
    expect(groupItems([item], 'category').map((group) => group.key)).toEqual(['GITHUB_REPOSITORY']);
    expect(isAssociationEvent('added', getListResourcesQueryKey(resourceProjectId), resourceProjectId, resourceId(10))).toBe(false);
    expect(isAssociationEvent('updated', getListResourcesQueryKey(secondLibraryProject), resourceProjectId, resourceId(10))).toBe(false);
    expect(isAssociationEvent('updated', getListSavedResourcesQueryKey(resourceProjectId), resourceProjectId, resourceId(10))).toBe(true);
  });
});
