import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assumption, Evidence, Feedback, FeedbackSummary, Interview } from '@workspace/api-client-react';
import { SourceBrowser } from '@/components/evidence/source-browser';
import { readSourceContext } from '@/lib/source-link';
import InterviewsPage from './interviews';
import EvidencePage from './evidence';
import { buildRelationships, DEFAULT_FILTERS, evidenceForFeedback, filterEvidence, flattenEvidence, tally } from '@/lib/evidence';

// Fixture-backed generated-client tests, not live persistence/auth verification.
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const projectId = id(1);
const analysisId = id(2);
const assumptionId = id(3);
const secondAssumptionId = id(4);
const sourceFeedbackId = id(20);
const firstInterviewId = id(30);
const secondInterviewId = id(31);
const createdAt = '2026-11-01T12:00:00.000Z';
const originalQuote = 'I used a spreadsheet last week.';
const sourceNote = `${originalQuote}\nIt took two hours to finish the report.`;
const evidence = (n: number, sentiment: Evidence['sentiment'], overrides: Partial<Evidence> = {}): Evidence => ({
  id: id(n), feedbackId: sourceFeedbackId, assumptionId,
  quote: originalQuote, reasoning: 'A recorded observation, not market proof.',
  origin: 'AI_SUGGESTED_REVIEW_REQUIRED', createdAt, sentiment, ...overrides,
});
const hypothesis = (n: number, description: string, records: Evidence[], status: Assumption['status'] = 'TESTING'): Assumption => ({
  id: id(n), analysisId, description, explanation: 'An assumption to test.',
  evidenceRequired: 'Recorded past behavior.', validationMethod: 'Customer interviews.',
  category: 'PROBLEM', riskLevel: 'HIGH', impact: 4, uncertainty: 4,
  riskScore: 16, status, evidenceRecords: records, createdAt, updatedAt: createdAt,
});
const interview = (interviewId: string, participant: string): Interview => ({
  id: interviewId, projectId, participant, createdAt, sourceAnalysisVersion: 2,
  questions: [{ assumptionId, question: 'What happened last time?', listenFor: 'Existing behavior' }],
});
let assumptions: Assumption[];
let interviews: Interview[];
let notes: Record<string, Feedback[]>;
let failPatch: boolean;
let failAccess: boolean;
let failAssumptions: boolean;
let summary: FeedbackSummary | null;
let requests: { method: string; path: string; body?: Record<string, unknown>; page: number; limit: number }[];
let client: QueryClient;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(status < 400 ? { success: true, data } : data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function fixtureFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input), 'https://fixture.invalid');
  const path = url.pathname;
  const method = init?.method ?? 'GET';
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
  requests.push({ path, method, body, page, limit });
  if (failAccess) return json({ error: { code: 'AUTH_NOT_READY', message: 'Authenticated access is not configured.' } }, 503);
  if (path === `/api/projects/${projectId}`) return json({ id: projectId, name: 'Evidence test project', createdAt });
  if (path === `/api/projects/${projectId}/analysis`) return json({
    id: analysisId, projectId, version: 2, createdAt,
    assumptions: assumptions.map(({ evidenceRecords: _records, ...row }) => row),
  });
  if (path === `/api/analyses/${analysisId}/assumptions`) {
    if (failAssumptions) return json({ error: { code: 'UNAVAILABLE', message: 'Could not retrieve linked records.' } }, 503);
    return json({ items: assumptions.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: assumptions.length } });
  }
  if (path === `/api/projects/${projectId}/feedback/summary`) return json(summary);
  if (path === `/api/projects/${projectId}/feedback/analyze` && method === 'POST') return json(summary, 201);
  if (path.startsWith('/api/assumptions/') && method === 'PATCH') {
    if (failPatch) return json({ error: { code: 'EVIDENCE_MISMATCH', message: 'The cited evidence does not support this outcome.' } }, 400);
    const target = path.split('/').at(-1);
    assumptions = assumptions.map((row) => row.id === target ? { ...row, status: body!.status as Assumption['status'] } : row);
    const { evidenceRecords: _records, ...saved } = assumptions.find((row) => row.id === target)!;
    return json(saved);
  }
  if (path === `/api/projects/${projectId}/interviews`) return json({
    items: interviews.slice((page - 1) * limit, page * limit), pagination: { page, limit },
  });
  const feedbackPath = path.match(/^\/api\/interviews\/([^/]+)\/feedback$/);
  if (feedbackPath) return json({
    items: (notes[feedbackPath[1]] ?? []).slice((page - 1) * limit, page * limit),
    pagination: { page, limit },
  });
  throw new Error(`Unexpected fixture request: ${method} ${path}`);
}

function mount(element: React.ReactNode) {
  client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: 0 }, mutations: { retry: false },
  } });
  return render(<QueryClientProvider client={client}><Router>{element}</Router></QueryClientProvider>);
}

function openWorkspace() {
  window.history.replaceState({}, '', `/projects/${projectId}/evidence`);
  return mount(<Route path="/projects/:id/evidence" component={EvidencePage} />);
}

describe('Evidence Intelligence generated-client regressions', () => {
  beforeEach(() => {
    assumptions = [
      hypothesis(3, 'Teams need a faster reporting workflow', [
        evidence(10, 'SUPPORTING'),
        evidence(11, 'INVALIDATING', { feedbackId: id(21), quote: 'Reports only took ten minutes.' }),
      ]),
      hypothesis(4, 'Teams will pay for a different workflow', [
        evidence(12, 'NEUTRAL', { assumptionId: secondAssumptionId, feedbackId: id(22), origin: 'HUMAN_MAPPING' }),
      ], 'UNTESTED'),
      hypothesis(5, 'Teams can switch tools easily', [], 'UNTESTED'),
    ];
    interviews = [interview(firstInterviewId, 'TEST ONLY unrelated session'), interview(secondInterviewId, 'TEST ONLY original source')];
    notes = {
      [firstInterviewId]: [{ id: id(21), interviewId: firstInterviewId, notes: sourceNote, createdAt }],
      [secondInterviewId]: [{ id: sourceFeedbackId, interviewId: secondInterviewId, notes: sourceNote, createdAt }],
    };
    summary = {
      id: id(40), projectId, createdAt,
      result: {
        themes: ['Reporting workflows differ'],
        evidence: [{ feedbackId: sourceFeedbackId, assumptionId, quote: originalQuote, sentiment: 'SUPPORTING', reasoning: 'An existing workaround.' }],
        contradictions: [{ feedbackAId: sourceFeedbackId, feedbackBId: id(21), quoteA: originalQuote, quoteB: 'Reports only took ten minutes.', explanation: 'Different time costs were reported.' }],
        evidenceGaps: ['Observe the complete reporting workflow.'],
        unsupportedConclusions: ['This is not proof of demand.'],
      },
    };
    requests = [];
    failPatch = false;
    failAccess = false;
    failAssumptions = false;
    vi.stubGlobal('fetch', vi.fn(fixtureFetch));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    client?.clear();
    vi.unstubAllGlobals();
  });

  it('loads linked records and shows unknown verification rather than inventing a verified state', async () => {
    openWorkspace();
    const record = await screen.findByTestId(`evidence-card-${id(10)}`);
    expect(screen.getByTestId('evidence-scope')).toHaveTextContent('Latest analysis v2');
    expect(screen.getByTestId('evidence-scope')).toHaveTextContent('3 records loaded');
    expect(screen.getByTestId('evidence-scope')).toHaveTextContent('2 of 3 loaded hypotheses have evidence');
    fireEvent.click(record);
    const detail = await screen.findByTestId('evidence-detail');
    expect(detail).toHaveTextContent(originalQuote);
    expect(detail).toHaveTextContent(sourceFeedbackId);
    expect(detail).toHaveTextContent('Teams need a faster reporting workflow');
    expect(screen.getByTestId('evidence-verification-unknown')).toHaveTextContent('neither as verified nor unverified');
    expect(screen.queryByRole('button', { name: /^verify/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /verification/i })).not.toBeInTheDocument();
    expect(requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
    expect(requests.filter((r) => r.path.endsWith('/assumptions')).map((r) => r.limit)).toEqual([20]);
  });

  it('filters loaded records by text, sentiment, origin and hypothesis', async () => {
    openWorkspace();
    await screen.findByTestId(`evidence-card-${id(10)}`);
    fireEvent.change(screen.getByTestId('evidence-search'), { target: { value: 'TEN MINUTES' } });
    expect(screen.getByTestId(`evidence-card-${id(11)}`)).toBeVisible();
    expect(screen.queryByTestId(`evidence-card-${id(10)}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('evidence-reset-filters'));
    fireEvent.change(screen.getByTestId('evidence-sentiment-filter'), { target: { value: 'NEUTRAL' } });
    expect(screen.getAllByTestId(/^evidence-card-/)).toHaveLength(1);
    expect(screen.getByTestId(`evidence-card-${id(12)}`)).toBeVisible();
    fireEvent.click(screen.getByTestId('evidence-reset-filters'));
    fireEvent.change(screen.getByTestId('evidence-origin-filter'), { target: { value: 'HUMAN_MAPPING' } });
    expect(screen.getAllByTestId(/^evidence-card-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId('evidence-reset-filters'));
    fireEvent.change(screen.getByTestId('evidence-assumption-filter'), { target: { value: assumptionId } });
    expect(screen.getAllByTestId(/^evidence-card-/)).toHaveLength(2);
    fireEvent.change(screen.getByTestId('evidence-search'), { target: { value: 'does-not-exist' } });
    expect(screen.getByText('Nothing matches')).toBeVisible();
    expect(screen.queryByTestId(/^evidence-card-/)).not.toBeInTheDocument();
  });

  it('shows coverage and mixed sentiment without calling it a proven contradiction', async () => {
    openWorkspace();
    await screen.findByTestId(`evidence-card-${id(12)}`);
    fireEvent.change(screen.getByTestId('evidence-sentiment-filter'), { target: { value: 'NEUTRAL' } });
    fireEvent.click(screen.getByTestId('evidence-tab-relationships'));
    expect(await screen.findByTestId('evidence-relationships')).toHaveTextContent('Mixed sentiment is not a proven contradiction');
    expect(screen.getByTestId(`relationship-${assumptionId}`)).toHaveTextContent('2 linked');
    expect(screen.getByTestId(`relationship-${id(5)}`)).toHaveTextContent('0 linked');
    fireEvent.click(screen.getByTestId(`relationship-toggle-${assumptionId}`));
    fireEvent.click(await screen.findByTestId(`relationship-evidence-${id(11)}`));
    expect(await screen.findByTestId('evidence-detail')).toHaveTextContent('Reports only took ten minutes.');
    expect(screen.getByTestId('evidence-sentiment-filter')).toHaveValue('ALL');
    expect(screen.getByTestId(`evidence-card-${id(11)}`)).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the exact hypothesis relationships requested from an experiment', async () => {
    window.history.replaceState({}, '', `/projects/${projectId}/evidence?assumptionId=${assumptionId}`);
    mount(<Route path="/projects/:id/evidence" component={EvidencePage} />);
    const toggle = await screen.findByTestId(`relationship-toggle-${assumptionId}`);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByTestId(`relationship-evidence-${id(10)}`)).toHaveTextContent(originalQuote);
    expect(screen.getByTestId('evidence-tab-relationships')).toHaveAttribute('aria-selected', 'true');
    expect(window.location.search).toBe('');
  });

  it('reports an unresolved experiment hypothesis rather than assigning another relationship', async () => {
    window.history.replaceState({}, '', `/projects/${projectId}/evidence?assumptionId=${id(99)}`);
    mount(<Route path="/projects/:id/evidence" component={EvidencePage} />);
    expect(await screen.findByTestId('evidence-assumption-request')).toHaveTextContent('not in the latest analysis');
    expect(screen.getByTestId('evidence-assumption-request')).toHaveTextContent(id(99));
    expect(screen.queryByTestId('evidence-relationships')).not.toBeInTheDocument();
  });

  it('retains the current outcome after server rejection and refreshes it only after an accepted citation', async () => {
    failPatch = true;
    openWorkspace();
    fireEvent.click(await screen.findByTestId(`evidence-card-${id(10)}`));
    fireEvent.click(await screen.findByTestId(`button-record-outcome-${assumptionId}`));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('button-submit-outcome')).toBeDisabled();
    expect(within(dialog).queryByTestId(`checkbox-evidence-${id(11)}`)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId(`checkbox-evidence-${id(10)}`));
    fireEvent.click(within(dialog).getByTestId('button-submit-outcome'));
    expect(await screen.findByRole('alert')).toHaveTextContent('EVIDENCE_MISMATCH');
    expect(screen.getByTestId('evidence-detail')).toHaveTextContent('TESTING');
    expect(requests.find((r) => r.method === 'PATCH')?.body).toEqual({ status: 'SUPPORTED', evidenceIds: [id(10)] });
    failPatch = false;
    fireEvent.click(within(dialog).getByTestId('button-submit-outcome'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('evidence-detail')).toHaveTextContent('SUPPORTED'));
    expect(screen.getByTestId(`button-reopen-${assumptionId}`)).toBeVisible();
  });

  it('does not qualify a neutral manual link for Supported but permits a cited Inconclusive outcome', async () => {
    openWorkspace();
    fireEvent.click(await screen.findByTestId(`evidence-card-${id(12)}`));
    fireEvent.click(screen.getByTestId(`button-start-testing-${secondAssumptionId}`));
    fireEvent.click(await screen.findByTestId(`button-record-outcome-${secondAssumptionId}`));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('button-submit-outcome')).toBeDisabled();
    expect(within(dialog).queryByTestId(`checkbox-evidence-${id(12)}`)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('radio-outcome-INCONCLUSIVE'));
    fireEvent.click(within(dialog).getByTestId(`checkbox-evidence-${id(12)}`));
    fireEvent.click(within(dialog).getByTestId('button-submit-outcome'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('evidence-detail')).toHaveTextContent('INCONCLUSIVE'));
    expect(requests.filter((r) => r.method === 'PATCH').map((r) => r.body)).toEqual([
      { status: 'TESTING' }, { status: 'INCONCLUSIVE', evidenceIds: [id(12)] },
    ]);
  });

  it('shows AI-detected conflicts once and locates their exact source references', async () => {
    openWorkspace();
    await screen.findByTestId(`evidence-card-${id(10)}`);
    fireEvent.click(screen.getByTestId('evidence-tab-insights'));
    const conflict = await screen.findByTestId('contradiction-0');
    expect(conflict).toHaveTextContent(originalQuote);
    expect(conflict).toHaveTextContent('Reports only took ten minutes.');
    expect(screen.getAllByText('Different time costs were reported.')).toHaveLength(1);
    expect(screen.getByTestId('evidence-contradictions')).toHaveTextContent(/not a proven contradiction/i);
    expect(screen.queryByRole('button', { name: /^verify/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contradiction-open-source-0-A'));
    expect(await screen.findByTestId('source-browser')).toHaveTextContent(sourceFeedbackId);
  });

  it('reports empty evidence and retryable errors without fabricated records', async () => {
    failAssumptions = true;
    openWorkspace();
    expect(await screen.findByText('Could not load hypotheses and evidence')).toBeVisible();
    failAssumptions = false;
    assumptions = assumptions.map((row) => ({ ...row, evidenceRecords: [] }));
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('No evidence on this page')).toBeVisible();
    expect(screen.queryByTestId(/^evidence-card-/)).not.toBeInTheDocument();
  });

  it('does not expose private evidence when project authentication is unavailable', async () => {
    failAccess = true;
    openWorkspace();
    expect(await screen.findByText('Could not load project')).toBeVisible();
    expect(screen.queryByTestId('evidence-workspace')).not.toBeInTheDocument();
    expect(requests.filter((r) => r.path.includes('/assumptions'))).toHaveLength(0);
  });

  it('shows a missing-or-inaccessible project without loading its evidence', async () => {
    const denied = vi.fn(async () => json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } }, 404));
    vi.stubGlobal('fetch', denied);
    openWorkspace();
    expect(await screen.findByText('Project not found')).toBeVisible();
    expect(screen.queryByTestId('evidence-workspace')).not.toBeInTheDocument();
    expect(denied).toHaveBeenCalledTimes(1);
  });

  it('does not fabricate AI conflicts when the saved summary has none', async () => {
    summary!.result.contradictions = [];
    openWorkspace();
    await screen.findByTestId(`evidence-card-${id(10)}`);
    fireEvent.click(screen.getByTestId('evidence-tab-insights'));
    const panel = await screen.findByTestId('evidence-contradictions');
    await waitFor(() => expect(within(panel).queryByTestId('contradiction-0')).not.toBeInTheDocument());
    expect(panel).not.toHaveTextContent('Different time costs were reported.');
    expect(within(panel).queryByRole('button', { name: /locate source/i })).not.toBeInTheDocument();
  });

  it('loads only requested source pages and resolves the exact feedback ID, not a similar quote', async () => {
    mount(<SourceBrowser projectId={projectId} feedbackId={sourceFeedbackId} onClose={vi.fn()} />);
    await screen.findByTestId(`source-interview-${firstInterviewId}`);
    expect(requests.filter((r) => /\/interviews\/[^/]+\/feedback/.test(r.path))).toHaveLength(0);
    fireEvent.click(screen.getByTestId(`source-interview-${firstInterviewId}`));
    expect(await screen.findByText(/requested feedback reference is not on this page/i)).toBeVisible();
    expect(screen.queryByTestId('link-open-source-interview')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`source-interview-${secondInterviewId}`));
    expect(await screen.findByTestId('source-feedback-match')).toHaveTextContent(sourceNote.replace('\n', ' '));
    const link = screen.getByTestId('link-open-source-interview');
    expect(link).toHaveAttribute('href', expect.stringContaining(`interviewId=${secondInterviewId}`));
    expect(link).toHaveAttribute('href', expect.stringContaining(`feedbackId=${sourceFeedbackId}`));
    expect(requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  });

  it('opens the resolved interview and feedback page in Customer Discovery', async () => {
    interviews = Array.from({ length: 21 }, (_, n) => interview(n === 20 ? secondInterviewId : id(100 + n), `TEST ONLY session ${n}`));
    notes[secondInterviewId] = Array.from({ length: 21 }, (_, n) => ({
      id: n === 20 ? sourceFeedbackId : id(200 + n), interviewId: secondInterviewId,
      notes: n === 20 ? sourceNote : `Other note number ${n}.`, createdAt,
    }));
    window.history.replaceState({}, '', `/projects/${projectId}/interviews?interviewId=${secondInterviewId}&interviewPage=2&feedbackId=${sourceFeedbackId}&feedbackPage=2`);
    mount(<Route path="/projects/:id/interviews" component={InterviewsPage} />);
    expect(await screen.findByTestId(`card-interview-${secondInterviewId}`)).toHaveTextContent('TEST ONLY session 20');
    expect(await screen.findByTestId(`note-${sourceFeedbackId}`)).toHaveTextContent('Requested source feedback');
    expect(requests.some((r) => r.path === `/api/interviews/${secondInterviewId}/feedback` && r.page === 2)).toBe(true);
  });

  it('deduplicates IDs, rejects mismatched relationships and sorts only by actual timestamps', () => {
    const supporting = evidence(10, 'SUPPORTING');
    const challenging = evidence(11, 'INVALIDATING', { createdAt: '2026-11-03T12:00:00.000Z' });
    const wrong = evidence(13, 'NEUTRAL', { assumptionId: id(99) });
    const row = hypothesis(3, 'Loaded hypothesis', [supporting, supporting, challenging, wrong]);
    const records = flattenEvidence([row]);
    expect(records.map((record) => record.id)).toEqual([id(10), id(11)]);
    expect(buildRelationships([row])[0].records).toHaveLength(2);
    expect(filterEvidence(records, DEFAULT_FILTERS).map((record) => record.id)).toEqual([id(11), id(10)]);
    expect(filterEvidence(records, { ...DEFAULT_FILTERS, sort: 'oldest' }).map((record) => record.id)).toEqual([id(10), id(11)]);
    expect(tally(records)).toEqual({ supporting: 1, challenging: 1, neutral: 0, total: 2, sources: 1, mixed: true });
    expect(evidenceForFeedback(records, sourceFeedbackId)).toHaveLength(2);
    expect(evidenceForFeedback(records, id(99))).toHaveLength(0);
  });
});

describe('source navigation context', () => {
  it('accepts complete, bounded navigation context', () => {
    expect(readSourceContext(new URLSearchParams({
      interviewId: firstInterviewId, feedbackId: sourceFeedbackId, interviewPage: '2', feedbackPage: '3',
    }))).toEqual({ interviewId: firstInterviewId, feedbackId: sourceFeedbackId, interviewPage: 2, feedbackPage: 3 });
  });
  it('rejects incomplete or out-of-contract page values', () => {
    expect(readSourceContext(new URLSearchParams({ interviewId: firstInterviewId }))).toBeNull();
    for (const page of ['0', '-1', '1.5', '10001', 'NaN']) {
      expect(readSourceContext(new URLSearchParams({ interviewId: firstInterviewId, feedbackId: sourceFeedbackId, feedbackPage: page }))).toBeNull();
    }
  });
});
