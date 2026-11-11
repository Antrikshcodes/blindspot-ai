import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationsPage from './recommendations';
import ResourceLibraryPage from './resource-library';
import ResourcesPage from './resources';
import { RecommendationFixture, recommendationAnalysisId, serverRanking } from '@/test/recommendation-fixture';
import { resourceId, resourceProjectId } from '@/test/resource-fixture';
import { CATEGORIES } from '@/lib/resource-search';
import { backendScore, readRanking } from '@/lib/resource-ranking';
import { matchProvenance } from '@/components/resource-recommendations/context';

// Synthetic contract/UI tests: not live AI, authentication or database evidence.
let fixture: RecommendationFixture;
let client: QueryClient;
let releaseSearch: (() => void) | undefined;
function mount(view = 'recommendations') {
  window.history.replaceState({}, '', `/projects/${resourceProjectId}/${view}`);
  return render(<QueryClientProvider client={client}><Router>
    <Route path="/projects/:id/recommendations" component={RecommendationsPage} />
    <Route path="/projects/:id/resources" component={ResourcesPage} />
    <Route path="/projects/:id/library" component={ResourceLibraryPage} />
  </Router></QueryClientProvider>);
}
const card = (n: number) => screen.getByTestId(`recommendation-card-${resourceId(n)}`);
const controls = (n: number) => within(card(n));
const writes = () => fixture.calls.filter((call) => call.method === 'POST' || call.method === 'DELETE');
const generations = () => writes().filter((call) => call.path.endsWith('/resources/search'));
const settled = () => waitFor(() => expect(client.isMutating()).toBe(0));
async function ready() {
  await screen.findByTestId(`recommendation-card-${resourceId(11)}`);
  await waitFor(() => expect(screen.getByTestId('recommendations-analysis-state')).toHaveTextContent('version 2'));
}
async function why(n: number) {
  fireEvent.click(controls(n).getByTestId(`recommendation-why-${resourceId(n)}`));
  return controls(n).findByTestId(`recommendation-reason-${resourceId(n)}`);
}

describe('Stored project recommendations and real request contracts', () => {
  beforeEach(() => {
    fixture = new RecommendationFixture();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    releaseSearch = undefined;
    vi.stubGlobal('fetch', vi.fn(fixture.fetch));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
    vi.stubGlobal('scrollTo', vi.fn());
  });
  afterEach(async () => { releaseSearch?.(); await settled(); cleanup(); client.clear(); vi.unstubAllGlobals(); });

  it('loads stored project-scoped rows and their matching analysis/search without inventing another endpoint', async () => {
    mount(); await ready();
    expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4);
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent('TEST ONLY text classification');
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent('react tooling');
    expect(screen.getByTestId('recommendations-provenance-analysis')).toHaveTextContent('matches the latest analysis loaded');
    expect(screen.getByTestId('recommendations-context')).toHaveTextContent('Experiments and hypothesis statuses are not connected');
    expect(writes()).toHaveLength(0);
    expect(fixture.calls.filter((call) => call.path.includes('/recommendations'))).toHaveLength(0);
    expect(fixture.calls.filter((call) => call.path.endsWith('/resources') || call.path.endsWith('/searches')).every((call) => call.params.get('limit') === '20')).toBe(true);
  });

  it('retains the exact server order rather than sorting by rank or popularity in the client', async () => {
    fixture.items.reverse();
    fixture.items[0].rankScore = 1;
    fixture.items[1].rankScore = 99;
    mount(); await ready();
    expect(screen.getAllByTestId(/^recommendation-card-/).map((el) => el.dataset.testid)).toEqual([13, 12, 10, 11].map((n) => `recommendation-card-${resourceId(n)}`));
    expect(controls(13).getByTestId(`recommendation-rank-${resourceId(13)}`)).toHaveTextContent('1');
    expect(card(10)).toHaveTextContent('0 stars');
  });

  it('expands actual backend factors, missing signals and review-required AI text', async () => {
    mount(); await ready(); const reason = within(await why(11));
    expect(reason.getByText(/TEST ONLY server explanation:/)).toBeInTheDocument();
    expect(reason.getByTestId('recommendation-rank-factors')).toHaveTextContent('40%');
    expect(reason.getByTestId('recommendation-rank-factors')).toHaveTextContent('Unknown');
    expect(reason.getByText('TEST ONLY server AI explanation grounded in the supplied source metadata.')).toBeInTheDocument();
    expect(reason.getByText(/AI \/ review required/)).toBeInTheDocument();
    expect(reason.getByText(/are not ranking inputs/)).toBeInTheDocument();
    expect(reason.getByText(/not a verified quality judgement/)).toBeInTheDocument();
  });

  it('does not invent explanations or meanings for legacy ranking rows', async () => {
    fixture.items[0].ranking = {};
    fixture.items[0].explanation = null;
    mount(); await ready();
    expect(controls(11).queryByTestId(`recommendation-rank-${resourceId(11)}`)).not.toBeInTheDocument();
    const reason = within(await why(11));
    expect(reason.getByText(/Returned by the project search/)).toBeInTheDocument();
    expect(reason.getByText('No AI explanation stored for this item.')).toBeInTheDocument();
    expect(reason.queryByText('Legacy source score')).not.toBeInTheDocument();
    expect(reason.queryByTestId('recommendation-rank-factors')).not.toBeInTheDocument();
  });

  it('generates with accepted options only, leaving project context and analysis selection to the server', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByTestId('recommendations-generate-languages'), { target: { value: 'TypeScript, Python' } });
    fireEvent.click(screen.getByTestId('recommendations-generate-provider-github'));
    fireEvent.click(screen.getByTestId('recommendations-generate-explain'));
    fireEvent.click(screen.getByTestId('recommendations-generate')); await settled();
    expect(generations()).toHaveLength(1);
    expect(generations()[0].body).toEqual({ categories: CATEGORIES, explain: true, languages: ['TypeScript', 'Python'], providers: ['github'] });
    expect(generations()[0].path).toBe(`/api/projects/${resourceProjectId}/resources/search`);
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent(resourceId(42));
    expect(fixture.calls.filter((call) => call.path.endsWith('/analysis'))).toHaveLength(2);
  });

  it('validates category and language inputs without sending invented or invalid options', async () => {
    mount(); await ready();
    for (const category of CATEGORIES) fireEvent.click(screen.getByTestId(`recommendations-generate-category-${category}`));
    expect(screen.getByTestId('recommendations-generate')).toBeDisabled();
    fireEvent.click(screen.getByTestId('recommendations-generate'));
    expect(generations()).toHaveLength(0);
    fireEvent.click(screen.getByTestId('recommendations-generate-category-AI_MODEL'));
    fireEvent.change(screen.getByTestId('recommendations-generate-languages'), { target: { value: 'a,b,c,d,e,f' } });
    expect(screen.getByTestId('recommendations-generate')).toBeDisabled();
    fireEvent.change(screen.getByTestId('recommendations-generate-languages'), { target: { value: 'x'.repeat(41) } });
    expect(screen.getByTestId('recommendations-generate')).toBeDisabled();
    expect(generations()).toHaveLength(0);
  });

  it('blocks duplicate generation through remounts and applies accepted results after navigation', async () => {
    fixture.searchGate = new Promise((resolve) => { releaseSearch = resolve; });
    const view = mount(); await ready();
    fireEvent.click(screen.getByTestId('recommendations-generate'));
    await waitFor(() => expect(generations()).toHaveLength(1));
    expect(screen.getByTestId('recommendations-generate')).toBeDisabled();
    view.unmount(); mount(); await ready();
    expect(screen.getByTestId('recommendations-generate')).toBeDisabled();
    fireEvent.click(screen.getByTestId('recommendations-generate'));
    expect(generations()).toHaveLength(1);
    releaseSearch!(); await settled();
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent(resourceId(42));
  });

  it.each([false, true])('does not restore private search data after cache clearing when rejected=%s', async (rejected) => {
    fixture.searchGate = new Promise((resolve) => { releaseSearch = resolve; });
    fixture.failSearch = rejected;
    const view = mount(); await ready();
    fireEvent.click(screen.getByTestId('recommendations-generate'));
    await waitFor(() => expect(generations()).toHaveLength(1));
    const pending = client.getMutationCache().getAll().find((mutation) => mutation.state.status === 'pending')!;
    view.unmount(); client.clear(); releaseSearch!();
    await waitFor(() => expect(pending.state.status).toBe(rejected ? 'error' : 'success'));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('reconciles a committed search whose response was lost through actual collection/history reads', async () => {
    fixture.loseSearchResponse = true;
    mount(); await ready();
    fireEvent.click(screen.getByTestId('recommendations-generate')); await settled();
    expect(generations()).toHaveLength(1);
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent(resourceId(42));
    expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4);
    expect(screen.getByTestId('recommendations-generate-error')).toBeInTheDocument();
  });

  it('uses the matching search, never an unrelated newest failed history row', async () => {
    fixture.histories.unshift({ ...fixture.histories[0], id: resourceId(88), status: 'FAILED', requirements: ['UNRELATED FAILED SEARCH CONTEXT'], providerStatuses: [{ provider: 'uci', status: 'DISABLED', count: 0 }] });
    fixture.histories[1].analysisId = resourceId(29);
    mount(); await ready();
    const prov = screen.getByTestId('recommendations-provenance');
    expect(prov).toHaveTextContent('TEST ONLY text classification');
    expect(prov).not.toHaveTextContent('UNRELATED FAILED SEARCH CONTEXT');
    expect(screen.getByTestId('recommendations-provenance-analysis')).toHaveTextContent('different from the latest analysis loaded');
    expect(prov).not.toHaveTextContent(resourceId(88));
  });

  it('retains real collection rows if bounded history lookup fails and does not guess the context', async () => {
    fixture.historyError = true; mount(); await ready();
    expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4);
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent('Search history could not be loaded');
    expect(screen.queryByTestId('recommendations-provenance-analysis')).not.toBeInTheDocument();
  });

  it('does not scan further history pages when a stored search is outside the loaded history', async () => {
    fixture.histories = [];
    mount(); await ready();
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent('not in the 20 most recent history entries');
    expect(fixture.calls.filter((call) => call.path.endsWith('/searches'))).toHaveLength(1);
  });

  it('distinguishes explicitly missing analysis from an unavailable analysis service', async () => {
    fixture.noAnalysis = true;
    const view = mount();
    await screen.findByTestId('link-recommendation-analyze');
    expect(screen.getByTestId('recommendations-analysis-state')).toHaveTextContent('no analysis yet');
    expect(generations()).toHaveLength(0);
    view.unmount(); client.clear(); fixture.noAnalysis = false; fixture.analysisError = 503;
    mount();
    await waitFor(() => expect(screen.getByTestId('recommendations-analysis-state')).toHaveTextContent('Could not check'));
    expect(screen.queryByTestId('link-recommendation-analyze')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4);
  });

  it.each(['planning', 'providers'] as const)('shows %s failure without replacing earlier completed recommendations with fallback data', async (failure) => {
    fixture.planningError = failure === 'planning'; fixture.failSearch = failure === 'providers';
    mount(); await ready(); fireEvent.click(screen.getByTestId('recommendations-generate')); await settled();
    expect(screen.getByTestId('recommendations-generate-error')).toHaveTextContent(/not confirmed/i);
    expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4);
    expect(screen.getByTestId('recommendations-provenance')).toHaveTextContent(resourceId(40));
    expect(generations()).toHaveLength(1);
  });

  it('uses server category/provider/order/min-relevance filters and does not send invalid score bounds', async () => {
    mount(); await ready();
    fireEvent.change(screen.getByTestId('recommendations-category'), { target: { value: 'AI_MODEL' } });
    await waitFor(() => expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(1));
    fireEvent.change(screen.getByTestId('recommendations-provider'), { target: { value: 'huggingface_models' } });
    fireEvent.change(screen.getByTestId('recommendations-sort'), { target: { value: 'lastUpdated' } });
    fireEvent.change(screen.getByTestId('recommendations-min-relevance'), { target: { value: '101' } });
    fireEvent.blur(screen.getByTestId('recommendations-min-relevance'));
    expect(fixture.calls.filter((call) => call.path.endsWith('/resources')).some((call) => call.params.has('minRelevance'))).toBe(false);
    fireEvent.change(screen.getByTestId('recommendations-min-relevance'), { target: { value: '60' } });
    fireEvent.blur(screen.getByTestId('recommendations-min-relevance'));
    await waitFor(() => expect(fixture.calls.some((call) => call.params.get('minRelevance') === '60' && call.params.get('sort') === 'lastUpdated')).toBe(true));
    fireEvent.click(screen.getByTestId('recommendations-clear-filters'));
    await waitFor(() => expect(screen.getAllByTestId(/^recommendation-card-/)).toHaveLength(4));
  });

  it('fetches current resource detail while retaining actual search-time reasons and source snapshot', async () => {
    mount(); await ready();
    fireEvent.click(controls(11).getByTestId(`recommendation-open-${resourceId(11)}`));
    const detail = await screen.findByTestId('resource-detail');
    await within(detail).findByText('Current metadata for TEST ONLY resource 11. Not verified.');
    expect(within(detail).getByTestId('link-resource-external')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(detail).getByTestId(`recommendation-reason-detail-${resourceId(11)}`)).toHaveTextContent('TEST ONLY server explanation');
    expect(detail).toHaveTextContent('Snapshot from search');
    expect(fixture.calls.filter((call) => call.path === `/api/resources/${resourceId(11)}`)).toHaveLength(1);
  });

  it('saves the actual resource ID once and synchronizes the project Library and discovery collection', async () => {
    mount(); await ready();
    fireEvent.click(controls(11).getByTestId(`save-resource-${resourceId(11)}`)); await settled();
    expect(controls(11).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument();
    expect(writes()[0]).toMatchObject({ path: `/api/resources/${resourceId(11)}/save`, body: { projectId: resourceProjectId } });
    expect(controls(11).queryByTestId(`save-resource-${resourceId(11)}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('link-recommendation-library'));
    await screen.findByTestId(`library-card-${resourceId(11)}`);
    fireEvent.click(screen.getByTestId('link-resource-intelligence'));
    await screen.findByTestId(`resource-card-${resourceId(11)}`);
    expect(within(screen.getByTestId(`resource-card-${resourceId(11)}`)).getByTestId(`saved-state-${resourceId(11)}`)).toBeInTheDocument();
    expect(writes()).toHaveLength(1); expect(fixture.resources).toHaveLength(4);
  });

  it('withholds unsafe external links instead of inventing a replacement URL', async () => {
    fixture.items[0].resource.url = 'javascript:alert(1)';
    mount(); await ready();
    expect(controls(11).queryByTestId(`link-recommendation-external-${resourceId(11)}`)).not.toBeInTheDocument();
    expect(card(11)).toHaveTextContent('Link withheld');
  });

  it('renders empty and collection-error states without sample recommendations', async () => {
    fixture.items = []; const view = mount();
    await screen.findByTestId('recommendations-workspace');
    await waitFor(() => expect(fixture.calls.some((call) => call.path.endsWith('/resources'))).toBe(true));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.queryAllByTestId(/^recommendation-card-/)).toHaveLength(0);
    view.unmount(); client.clear(); fixture.failList = true; mount();
    await screen.findByTestId('button-retry');
    expect(screen.queryAllByTestId(/^recommendation-card-/)).toHaveLength(0);
    expect(generations()).toHaveLength(0);
  });

  it.each([401, 404, 503] as const)('respects the existing project guard for %s', async (status) => {
    fixture.access = status; mount();
    if (status === 404) await screen.findByText('Project not found');
    else await screen.findByTestId('button-retry');
    expect(screen.queryByTestId('recommendations-workspace')).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it('does not infer absent analysis provenance, weights or score values', () => {
    const session = { searchId: resourceId(40), requirements: [], providerStatuses: [], explanationStatus: 'NOT_REQUESTED', cached: false };
    const p = matchProvenance(session.searchId, [], session, false, null);
    expect(p.kind === 'matched' && p.analysisId).toBeUndefined();
    const unknown = readRanking({ components: { relevance: '99', maintenance: null }, weights: { relevance: '0.4', maintenance: Number.NaN } });
    expect(unknown.documentedRank).toBe(false);
    expect(unknown.factors.every((factor) => factor.value === null && factor.weight === null)).toBe(true);
    expect(backendScore(0)).toBe(0); expect(backendScore(101)).toBeNull();
    expect(readRanking(serverRanking()).factors.some((factor) => factor.key === 'stars')).toBe(false);
    expect(recommendationAnalysisId).toBe(resourceId(30));
  });
});
