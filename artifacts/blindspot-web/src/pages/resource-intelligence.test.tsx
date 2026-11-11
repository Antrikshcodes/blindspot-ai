import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourcesPage from './resources';
import { buildPayload, emptyDraft, safeExternal, validate } from '@/lib/resource-search';
import { safeHttps } from '@/lib/api';
import { isResourceSessionChange } from '@/hooks/use-resource-search';
import { ResourceFixture, history, makeResource, resourceId, resourceProjectId, searchItem } from '@/test/resource-fixture';

// Real generated hooks with synthetic fetch fixtures: not live auth/provider evidence.
let fixture: ResourceFixture;
let client: QueryClient;
let releaseSearch: (() => void) | undefined;
const mount = () => render(<QueryClientProvider client={client}><Router><Route path="/projects/:id/resources" component={ResourcesPage} /></Router></QueryClientProvider>);
const posts = () => fixture.calls.filter((call) => call.method === 'POST');
const setQuery = (value: string) => fireEvent.change(screen.getByTestId('input-resource-query'), { target: { value } });
const search = () => fireEvent.click(screen.getByTestId('button-search-resources'));
const openAdvanced = () => fireEvent.click(screen.getByTestId('details-advanced-search').querySelector('summary')!);
async function ready() {
  await screen.findByTestId('resource-workspace');
  await screen.findByTestId(`resource-card-${resourceId(10)}`);
}
async function settled() {
  await waitFor(() => expect(client.isMutating()).toBe(0));
}

describe('Resource Intelligence generated-client regressions', () => {
  beforeEach(() => {
    fixture = new ResourceFixture();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    releaseSearch = undefined;
    vi.stubGlobal('fetch', vi.fn(fixture.fetch));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
    vi.stubGlobal('scrollTo', vi.fn());
    window.history.replaceState({}, '', `/projects/${resourceProjectId}/resources`);
  });
  afterEach(async () => {
    releaseSearch?.();
    await settled();
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  });

  it('loads a bounded collection in backend order and preserves actual zero versus unknown metrics', async () => {
    mount(); await ready();
    expect(screen.getAllByTestId(/^resource-card-/).map((el) => el.dataset.testid)).toEqual([11, 10, 12, 13].map((n) => `resource-card-${resourceId(n)}`));
    const card = screen.getByTestId(`resource-card-${resourceId(10)}`);
    expect(card).toHaveTextContent('0 stars');
    expect(card).toHaveTextContent('License Unknown');
    expect(card).not.toHaveTextContent('0 downloads');
    expect(fixture.calls.find((call) => call.path.endsWith('/resources'))?.params.get('limit')).toBe('20');
    expect(posts()).toHaveLength(0);
  });

  it('validates and submits a strict trimmed query with the selected real provider, category and languages', async () => {
    mount(); await ready();
    setQuery('  react utilities  ');
    fireEvent.click(screen.getByTestId('toggle-category-GITHUB_REPOSITORY'));
    openAdvanced();
    fireEvent.click(screen.getByTestId('toggle-provider-github'));
    fireEvent.change(screen.getByTestId('input-languages'), { target: { value: ' TypeScript, Python ' } });
    search(); await settled();
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toEqual({ query: 'react utilities', categories: ['GITHUB_REPOSITORY'], providers: ['github'], languages: ['TypeScript', 'Python'], explain: false });
    expect(screen.getByTestId('provider-kaggle')).toHaveTextContent('KAGGLE_NOT_CONFIGURED');
    expect(screen.getByTestId('resource-run-summary')).toHaveTextContent('raw retrieval');
  });

  it.each([['AI_MODEL', 'huggingface_models'], ['DATASET', 'huggingface_datasets'], ['API', 'apis_guru']])('sends %s searches to the selected matching adapter', async (category, provider) => {
    mount(); await ready(); setQuery('technical building blocks');
    fireEvent.click(screen.getByTestId(`toggle-category-${category}`));
    openAdvanced(); fireEvent.click(screen.getByTestId(`toggle-provider-${provider}`));
    search(); await settled();
    expect(posts()[0].body).toMatchObject({ categories: [category], providers: [provider] });
  });

  it('rejects blank and oversized queries and lists before network submission', async () => {
    mount(); await ready();
    expect(screen.getByTestId('button-search-resources')).toBeDisabled();
    setQuery(' '.repeat(4)); expect(screen.getByTestId('button-search-resources')).toBeDisabled();
    setQuery('x'.repeat(151)); expect(screen.getByTestId('button-search-resources')).toBeDisabled();
    setQuery('react'); openAdvanced();
    fireEvent.change(screen.getByTestId('input-languages'), { target: { value: 'a,b,c,d,e,f' } });
    expect(screen.getByTestId('button-search-resources')).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });

  it('omits query only for explicit AI automatic mode and uses the backend core categories', async () => {
    mount(); await ready(); fireEvent.click(screen.getByTestId('search-mode-auto'));
    expect(screen.getByTestId('text-ai-usage')).toHaveTextContent(/AI/i);
    search(); await settled();
    expect(posts()[0].body).not.toHaveProperty('query');
    expect(posts()[0].body?.categories).toEqual(['GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION']);
  });

  it('blocks duplicate submissions across clicks and remounts while retaining the pending draft', async () => {
    fixture.searchGate = new Promise((resolve) => { releaseSearch = resolve; });
    const view = mount(); await ready(); setQuery('only one search');
    search(); search(); await waitFor(() => expect(posts()).toHaveLength(1));
    view.unmount(); mount();
    expect(await screen.findByTestId('input-resource-query')).toHaveValue('only one search');
    expect(screen.getByTestId('button-search-resources')).toBeDisabled();
    search(); expect(posts()).toHaveLength(1);
    releaseSearch!(); await settled();
    expect(screen.getByTestId('resource-run-summary')).toHaveTextContent('only one search');
  });

  it('shows a newly accepted search in Results even when submitted from History', async () => {
    mount(); await ready(); fireEvent.click(screen.getByTestId('resource-tab-history'));
    await screen.findByTestId(`resource-history-${resourceId(40)}`);
    setQuery('new resources'); search(); await settled();
    expect(screen.getByTestId('resource-tab-results')).toHaveAttribute('aria-selected', 'true');
    await screen.findByTestId(`resource-card-${resourceId(10)}`);
  });

  it('retains the last completed collection after provider failure and fetches the persisted failure history', async () => {
    mount(); await ready(); fixture.failSearch = true;
    fixture.statuses = [{ provider: 'github', status: 'FAILED', count: 0, error: 'PROVIDER_RATE_LIMITED' }];
    setQuery('a failed search'); search(); await settled();
    expect(screen.getByTestId('text-search-failed')).toHaveTextContent('last completed search, not this query');
    expect(screen.getByTestId('input-resource-query')).toHaveValue('a failed search');
    expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(4);
    expect(posts()).toHaveLength(1);
    fireEvent.click(screen.getByTestId('resource-tab-history'));
    const failed = await screen.findByTestId(`resource-history-${resourceId(42)}`);
    expect(failed).toHaveTextContent('FAILED');
    fireEvent.click(within(failed).getByTestId(`button-expand-history-${resourceId(42)}`));
    expect(failed).toHaveTextContent('PROVIDER_RATE_LIMITED');
  });

  it('shows a truthful empty collection after a successful zero-result run', async () => {
    mount(); await ready(); fixture.emptySearch = true;
    fixture.statuses = [{ provider: 'github', status: 'OK', count: 0 }];
    setQuery('no matching sources'); search(); await settled();
    expect(screen.queryAllByTestId(/^resource-card-/)).toHaveLength(0);
    expect(screen.getByText('Nothing in this collection view')).toBeInTheDocument();
    expect(screen.getByTestId('resource-run-summary')).toHaveTextContent('0 ranked items returned');
  });

  it('loads current resource details separately from the search-time ranking and uses the actual safe external URL', async () => {
    mount(); await ready();
    fireEvent.click(screen.getByTestId(`button-open-resource-${resourceId(10)}`));
    const detail = await screen.findByTestId('resource-detail');
    await within(detail).findByText('Current metadata for TEST ONLY resource 10. Not verified.');
    expect(detail).toHaveTextContent('Ranking at search time');
    const link = within(detail).getByTestId('link-resource-external');
    expect(link).toHaveAttribute('href', 'https://github.com/facebook/react');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(fixture.calls.some((call) => call.path === `/api/resources/${resourceId(10)}`)).toBe(true);
  });

  it.each(['javascript:alert(1)', 'https://user:password@example.com/private'])('withholds unsafe or credential-bearing external URLs: %s', async (url) => {
    fixture.resources[0].url = url;
    fixture.items = [searchItem(fixture.resources[0], 80)];
    mount(); await ready();
    expect(screen.queryByTestId(`link-resource-external-${resourceId(10)}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`button-open-resource-${resourceId(10)}`));
    const detail = await screen.findByTestId('resource-detail');
    await within(detail).findByText('Current metadata for TEST ONLY resource 10. Not verified.');
    expect(within(detail).queryByTestId('link-resource-external')).not.toBeInTheDocument();
  });

  it('reuses only history query text without starting a new search or claiming old results are reopened', async () => {
    mount(); await ready(); fireEvent.click(screen.getByTestId('resource-tab-history'));
    const row = await screen.findByTestId(`resource-history-${resourceId(39)}`);
    fireEvent.click(within(row).getByTestId(`button-expand-history-${resourceId(39)}`));
    expect(row).toHaveTextContent('COMPLETED');
    expect(row).toHaveTextContent('raw retrieval');
    expect(row).toHaveTextContent('not final result counts');
    fireEvent.click(screen.getByTestId(`button-use-query-${resourceId(39)}`));
    expect(screen.getByTestId('input-resource-query')).toHaveValue('iris datasets');
    expect(screen.getByTestId('text-search-notice')).toHaveTextContent('creates a new search');
    expect(posts()).toHaveLength(0);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('sends collection filters to the backend and never sends invalid relevance or the provider alias as an exact filter', async () => {
    mount(); await ready();
    expect(within(screen.getByTestId('resource-filter-provider')).queryByRole('option', { name: 'Hugging Face (both)' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('resource-filter-category'), { target: { value: 'AI_MODEL' } });
    await waitFor(() => expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(1));
    fireEvent.change(screen.getByTestId('resource-filter-provider'), { target: { value: 'huggingface_models' } });
    fireEvent.change(screen.getByTestId('resource-sort'), { target: { value: 'lastUpdated' } });
    fireEvent.change(screen.getByTestId('resource-min-relevance'), { target: { value: '50' } });
    fireEvent.blur(screen.getByTestId('resource-min-relevance'));
    await waitFor(() => expect(fixture.calls.some((call) => call.params.get('minRelevance') === '50' && call.params.get('sort') === 'lastUpdated' && call.params.get('provider') === 'huggingface_models')).toBe(true));
    fireEvent.change(screen.getByTestId('resource-min-relevance'), { target: { value: '101' } });
    fireEvent.blur(screen.getByTestId('resource-min-relevance'));
    expect(screen.getByText(/last valid filter still applies/)).toBeInTheDocument();
    expect(fixture.calls.some((call) => call.params.get('minRelevance') === '101')).toBe(false);
  });

  it('paginates both collection and history in bounded requests', async () => {
    fixture.items = Array.from({ length: 25 }, (_, i) => searchItem(makeResource(100 + i, 'AI_MODEL', 'huggingface_models'), 90 - i));
    fixture.histories = Array.from({ length: 25 }, (_, i) => history(200 + i, `TEST ONLY query ${i}`, []));
    mount(); await screen.findByTestId(`resource-card-${resourceId(100)}`);
    fireEvent.click(screen.getByTestId('button-page-next'));
    await screen.findByTestId(`resource-card-${resourceId(120)}`);
    expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(5);
    fireEvent.click(screen.getByTestId('resource-tab-history'));
    await screen.findByTestId(`resource-history-${resourceId(200)}`);
    fireEvent.click(screen.getByTestId('button-page-next'));
    await screen.findByTestId(`resource-history-${resourceId(220)}`);
    expect(fixture.calls.filter((call) => call.path.endsWith('/resources') || call.path.endsWith('/searches')).every((call) => call.params.get('limit') === '20')).toBe(true);
  });

  it('resets collection filters and pagination after a newly accepted search', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByTestId('resource-filter-category'), { target: { value: 'AI_MODEL' } });
    await waitFor(() => expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(1));
    setQuery('fresh results'); search(); await settled();
    expect(screen.getByTestId('resource-filter-category')).toHaveValue('');
    expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(4);
  });

  it('clears only the draft and discards private draft state with its QueryClient', async () => {
    const view = mount(); await ready(); setQuery('private draft'); search(); await settled();
    fireEvent.click(screen.getByTestId('button-clear-resource-search'));
    expect(screen.getByTestId('input-resource-query')).toHaveValue('');
    expect(screen.getAllByTestId(/^resource-card-/)).toHaveLength(4);
    expect(screen.getByTestId('resource-run-summary')).toHaveTextContent('private draft');
    setQuery('not shared with a new client'); view.unmount(); client.clear();
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    mount(); await ready();
    expect(screen.getByTestId('input-resource-query')).toHaveValue('');
    expect(screen.queryByTestId('resource-run-summary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('resource-tab-history'));
    expect(await screen.findByTestId(`resource-history-${resourceId(42)}`)).toHaveTextContent('private draft');
  });

  it('handles a failed detail lookup without pretending the snapshot is a fresh successful lookup', async () => {
    fixture.failDetail = true; mount(); await ready();
    fireEvent.click(screen.getByTestId(`button-open-resource-${resourceId(10)}`));
    const detail = await screen.findByTestId('resource-detail');
    await within(detail).findByText('Could not load current record');
    expect(within(detail).queryByTestId('link-resource-external')).not.toBeInTheDocument();
    expect(detail).toHaveTextContent('Ranking at search time');
  });

  it.each([401, 404, 503] as const)('fails closed when private project access returns %s', async (status) => {
    fixture.access = status; mount();
    if (status === 404) await screen.findByText('Project not found');
    else await screen.findByTestId('button-retry');
    expect(screen.queryByTestId('resource-workspace')).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('enforces advanced search limits and URL safety without making network calls', () => {
    expect(validate({ ...emptyDraft(), query: 'query', topics: 'x'.repeat(41) })).toHaveLength(1);
    expect(validate({ ...emptyDraft(), query: 'query', tasks: 'x'.repeat(61) })).toHaveLength(1);
    expect(buildPayload({ ...emptyDraft(), query: ' q ', topics: ' react, ui ', tasks: ' classify ' })).toMatchObject({ query: 'q', topics: ['react', 'ui'], tasks: ['classify'] });
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '/relative', 'https://user:password@example.com']) {
      expect(safeExternal(url)).toBeNull();
      expect(safeHttps(url)).toBeNull();
    }
    expect(safeExternal('https://github.com/facebook/react')).toBe('https://github.com/facebook/react');
    expect(safeExternal('http://example.com/docs')).toBe('http://example.com/docs');
    expect(posts()).toHaveLength(0);
  });

  it('notifies draft subscribers only for their own session-data changes, not render-time collection additions', () => {
    const key = ['resource-search', 'session', resourceProjectId];
    expect(isResourceSessionChange('updated', key, resourceProjectId)).toBe(true);
    expect(isResourceSessionChange('removed', key, resourceProjectId)).toBe(true);
    expect(isResourceSessionChange('added', key, resourceProjectId)).toBe(false);
    expect(isResourceSessionChange('observerAdded', key, resourceProjectId)).toBe(false);
    expect(isResourceSessionChange('updated', ['/api/projects/x/resources'], resourceProjectId)).toBe(false);
    expect(isResourceSessionChange('updated', key, resourceId(2))).toBe(false);
  });
});
