import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedbackSummary } from '@workspace/api-client-react';
import InterviewsPage from './interviews';

// Test-only API fixtures exercise the real generated client and query caches.
// These are not live integration tests and never change development data.
const projectId = '00000000-0000-4000-8000-000000000001';
const interviewId = '00000000-0000-4000-8000-000000000002';
const assumptionId = '00000000-0000-4000-8000-000000000003';
const createdAt = '2026-11-01T12:00:00.000Z';
const session = {
  id: interviewId, projectId, participant: 'Research participant A',
  createdAt, sourceAnalysisVersion: 2,
  questions: [{ assumptionId, question: 'What happened last time?', listenFor: 'Recent behavior' }],
};
const assumption = {
  id: assumptionId, analysisId: 'analysis-2', description: 'Teams face a recurring problem',
  category: 'PROBLEM', status: 'UNTESTED', impact: 4, uncertainty: 4,
  riskScore: 16, riskLevel: 'HIGH', explanation: 'An unverified hypothesis',
  evidenceRequired: 'Observed behavior', validationMethod: 'Interview customers',
};
let sessions: typeof session[];
let notes: { id: string; interviewId: string; notes: string; createdAt: string }[];
let failCreate: boolean;
let failSave: boolean;
let failAccess: boolean;
let failAnalyze: boolean;
let summary: FeedbackSummary | null;
let releaseCreate: (() => void) | undefined;
let createWait: Promise<void> | undefined;
let releaseSave: (() => void) | undefined;
let saveWait: Promise<void> | undefined;
let releaseAnalysis: (() => void) | undefined;
let analysisWait: Promise<void> | undefined;
let writes: { path: string; body: Record<string, unknown> }[];
let client: QueryClient;
const persistedSummary: FeedbackSummary = {
  id: 'summary-1', projectId, createdAt: '2026-11-02T12:00:00.000Z',
  result: {
    themes: ['Manual reporting takes time'],
    evidence: [{ feedbackId: 'feedback-new', assumptionId, quote: 'We used a spreadsheet last week.', sentiment: 'SUPPORTING', reasoning: 'Describes an existing workaround.' }],
    contradictions: [{ feedbackAId: 'feedback-new', feedbackBId: 'feedback-b', quoteA: 'It took two hours.', quoteB: 'It took ten minutes.', explanation: 'Different experiences were reported.' }],
    evidenceGaps: ['Observe the workflow directly.'],
    unsupportedConclusions: ['Not proof of market demand.'],
  },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(status < 400 ? { success: true, data } : data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

async function fixtureFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input), 'https://fixture.invalid');
  const path = url.pathname;
  const method = init?.method ?? 'GET';
  if (failAccess) return json({ success: false, error: { code: 'AUTH_NOT_READY', message: 'Authenticated access is not configured.' } }, 503);
  if (method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    writes.push({ path, body });
    if (path.endsWith('/interviews')) {
      if (createWait) await createWait;
      if (failCreate) return json({ error: { code: 'UNAVAILABLE', message: 'Please retry later.' } }, 503);
      const created = { ...session, participant: String(body.participant) };
      sessions = [created, ...sessions];
      return json(created, 201);
    }
    if (path.endsWith('/feedback')) {
      if (saveWait) await saveWait;
      if (failSave) return json({ error: { code: 'UNAVAILABLE', message: 'Please retry later.' } }, 503);
      const record = { id: 'feedback-new', interviewId, notes: String(body.notes).trim(), createdAt };
      notes = [record, ...notes];
      return json(record, 201);
    }
    if (path.endsWith('/feedback/analyze')) {
      if (analysisWait) await analysisWait;
      if (failAnalyze) return json({ error: { code: 'AI_UNAVAILABLE', message: 'Feedback analysis unavailable.' } }, 503);
      summary = persistedSummary;
      return json({
        ...summary,
        evidenceRecords: [{ id: 'older-evidence', feedbackId: 'older-note', assumptionId, quote: 'UNRELATED_TRANSIENT_QUOTE', sentiment: 'NEUTRAL', origin: 'HUMAN_MAPPING', reasoning: '', createdAt }],
      }, 201);
    }
  }
  if (path === `/api/projects/${projectId}`) return json({ id: projectId, name: 'Discovery test project', createdAt });
  if (path === `/api/projects/${projectId}/analysis`) return json({ id: 'analysis-2', projectId, version: 2, createdAt, assumptions: [assumption] });
  if (path.endsWith('/assumptions')) return json({ items: [assumption], pagination: { page: 1, limit: 100 } });
  if (path.endsWith('/feedback/summary')) return json(summary);
  const page = Number(url.searchParams.get('page') ?? 1);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const values = path.endsWith('/interviews') ? sessions : path.endsWith('/feedback') ? notes : null;
  if (values) return json({ items: values.slice((page - 1) * limit, page * limit), pagination: { page, limit } });
  throw new Error(`Unexpected test request: ${method} ${url.pathname}`);
}

function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  window.history.replaceState({}, '', `/projects/${projectId}/interviews`);
  return render(
    <QueryClientProvider client={client}>
      <Router><Route path="/projects/:id/interviews" component={InterviewsPage} /></Router>
    </QueryClientProvider>,
  );
}

async function openInterview() {
  const toggle = await screen.findByTestId(`button-toggle-interview-${interviewId}`);
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
  return screen.findByTestId('input-notes');
}

describe('Customer Discovery generated-client regressions', () => {
  beforeEach(() => {
    sessions = [];
    notes = [];
    writes = [];
    failCreate = false;
    failSave = false;
    failAccess = false;
    failAnalyze = false;
    summary = null;
    createWait = undefined;
    releaseCreate = undefined;
    saveWait = undefined;
    releaseSave = undefined;
    analysisWait = undefined;
    releaseAnalysis = undefined;
    vi.stubGlobal('fetch', vi.fn(fixtureFetch));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    releaseCreate?.();
    releaseSave?.();
    releaseAnalysis?.();
    cleanup();
    client?.clear();
    vi.unstubAllGlobals();
  });

  it('retains a failed participant alias and retries with the participant-only contract', async () => {
    failCreate = true;
    mount();
    fireEvent.click(await screen.findByTestId('button-new-interview'));
    const input = await screen.findByTestId('input-participant');
    fireEvent.change(input, { target: { value: '  Operations lead A  ' } });
    fireEvent.click(screen.getByTestId('button-create-interview'));
    await waitFor(() => expect(writes).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('button-create-interview')).not.toBeDisabled());
    expect(input).toHaveValue('  Operations lead A  ');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(writes[0].body).toEqual({ participant: 'Operations lead A' });
    failCreate = false;
    fireEvent.click(screen.getByTestId('button-create-interview'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId(`card-interview-${interviewId}`)).toHaveTextContent('Operations lead A');
    expect(writes).toHaveLength(2);
  });

  it('prevents repeat interview submissions while the first request is pending', async () => {
    createWait = new Promise<void>((resolve) => { releaseCreate = resolve; });
    mount();
    fireEvent.click(await screen.findByTestId('button-new-interview'));
    fireEvent.change(await screen.findByTestId('input-participant'), { target: { value: 'Participant B' } });
    const button = screen.getByTestId('button-create-interview');
    const form = button.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(button).toBeDisabled();
    releaseCreate?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps failed feedback editable and saves the original wording on retry', async () => {
    sessions = [session];
    failSave = true;
    mount();
    const input = await openInterview();
    const original = 'We used a spreadsheet last week.\nIt took two hours to finish.';
    fireEvent.change(input, { target: { value: original } });
    fireEvent.click(screen.getByTestId(`checkbox-link-${assumptionId}`));
    fireEvent.click(screen.getByTestId('button-save-notes'));
    await waitFor(() => expect(writes).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('button-save-notes')).not.toBeDisabled());
    expect(input).toHaveValue(original);
    failSave = false;
    fireEvent.click(screen.getByTestId('button-save-notes'));
    expect(await screen.findByTestId('note-feedback-new')).toHaveTextContent('We used a spreadsheet last week.');
    expect(writes[1].body.notes).toBe(original);
    expect(writes[1].body.assumptionIds).toEqual([assumptionId]);
    expect(Object.keys(writes[1].body).every((key) => ['notes', 'assumptionIds'].includes(key))).toBe(true);
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('counts all interview pages instead of presenting the current page as a total', async () => {
    sessions = Array.from({ length: 101 }, (_, i) => ({ ...session, id: `session-${i}`, participant: `Participant ${i}` }));
    mount();
    await waitFor(() => expect(screen.getByTestId('stat-interview-total')).toHaveTextContent(/^101$/));
    expect(screen.getAllByTestId(/^button-toggle-interview-/).length).toBeLessThan(101);
  });

  it('retains drafts across tabs and completes pending note saves after the form unmounts', async () => {
    sessions = [session];
    saveWait = new Promise<void>((resolve) => { releaseSave = resolve; });
    mount();
    const input = await openInterview();
    fireEvent.change(input, { target: { value: 'A pending customer statement must not be lost.' } });
    fireEvent.click(screen.getByTestId('button-save-notes'));
    await waitFor(() => expect(writes).toHaveLength(1));
    fireEvent.click(screen.getByTestId('tab-discovery-insights'));
    await screen.findByTestId('button-analyze-feedback');
    fireEvent.click(screen.getByTestId('tab-discovery-interviews'));
    await screen.findByTestId('input-notes');
    expect(screen.getByTestId('button-save-notes')).toBeDisabled();
    releaseSave?.();
    expect(await screen.findByTestId('note-feedback-new')).toHaveTextContent('A pending customer statement');
    await waitFor(() => expect(screen.getByTestId('input-notes')).toHaveValue(''));
    expect(writes).toHaveLength(1);
  });

  it('shows persisted summary fields after analysis and a fresh page mount', async () => {
    sessions = [session];
    failAnalyze = true;
    const view = mount();
    fireEvent.click(await screen.findByTestId('tab-discovery-insights'));
    fireEvent.click(await screen.findByTestId('button-analyze-feedback'));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI_UNAVAILABLE');
    failAnalyze = false;
    fireEvent.click(screen.getByTestId('button-analyze-feedback'));
    expect(await screen.findByText('Manual reporting takes time')).toBeVisible();
    expect(screen.queryByText(/UNRELATED_TRANSIENT_QUOTE/)).not.toBeInTheDocument();
    expect(screen.getByText(/We used a spreadsheet last week/)).toBeVisible();
    const contradictions = screen.getByTestId('button-toggle-fold-contradictions');
    if (contradictions.getAttribute('aria-expanded') !== 'true') fireEvent.click(contradictions);
    expect(await screen.findByText('Different experiences were reported.')).toBeVisible();
    expect(writes.map((write) => write.body)).toEqual([{}, {}]);
    view.unmount();
    client.clear();
    mount();
    fireEvent.click(await screen.findByTestId('tab-discovery-insights'));
    expect(await screen.findByText('Manual reporting takes time')).toBeVisible();
    expect(screen.getByText(/We used a spreadsheet last week/)).toBeVisible();
    expect(screen.getByText(/Human review required/)).toBeVisible();
  });

  it('blocks another analysis while the first continues across tab changes', async () => {
    sessions = [session];
    analysisWait = new Promise<void>((resolve) => { releaseAnalysis = resolve; });
    mount();
    fireEvent.click(await screen.findByTestId('tab-discovery-insights'));
    fireEvent.click(await screen.findByTestId('button-analyze-feedback'));
    await waitFor(() => expect(writes).toHaveLength(1));
    fireEvent.click(screen.getByTestId('tab-discovery-interviews'));
    await screen.findByTestId('input-notes');
    fireEvent.click(screen.getByTestId('tab-discovery-insights'));
    expect(await screen.findByTestId('button-analyze-feedback')).toBeDisabled();
    releaseAnalysis?.();
    expect(await screen.findByText('Manual reporting takes time')).toBeVisible();
    expect(writes).toHaveLength(1);
  });

  it('expands long feedback without changing its original wording', async () => {
    sessions = [session];
    const original = 'Customer wording stays intact. '.repeat(40);
    notes = [{ id: 'feedback-long', interviewId, notes: original, createdAt }];
    mount();
    await openInterview();
    const toggle = await screen.findByTestId('button-expand-note-feedback-long');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('note-feedback-long').querySelector('p')).toHaveTextContent(original.trim());
  });

  it('does not expose interview controls when the private API fails closed', async () => {
    failAccess = true;
    mount();
    expect(await screen.findByText('Could not load project')).toBeVisible();
    expect(screen.queryByTestId('button-new-interview')).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});
