import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExperimentsPage from './experiments';
import EvidencePage from './evidence';
import { filterSort, manualProblems, obsValid, TRANSITIONS } from '@/lib/experiments';
import {
  ExperimentFixture, assumptionId, experiment, fixtureId, manualProtocol,
  originalObservation, otherAssumptionId, projectId,
} from '@/test/experiment-fixture';

// Real generated hooks with synthetic fetch fixtures; not live backend/auth testing.
let fixture: ExperimentFixture;
let client: QueryClient;
let releaseCreate: (() => void) | undefined;
function mount() {
  return render(<QueryClientProvider client={client}><Router>
    <Route path="/projects/:id/experiments" component={ExperimentsPage} />
    <Route path="/projects/:id/evidence" component={EvidencePage} />
  </Router></QueryClientProvider>);
}
async function selectRecord(n: number) {
  fireEvent.click(await screen.findByTestId(`card-experiment-${fixtureId(n)}`));
  await waitFor(() => expect(screen.getByTestId('text-experiment-name')).toHaveTextContent(`TEST ONLY experiment ${n}`));
  return screen.getByTestId('experiment-detail');
}
async function openCreate(manual = true) {
  const button = await screen.findByTestId('button-new-experiment');
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await screen.findByRole('dialog');
  if (manual) fireEvent.click(screen.getByTestId('mode-manual'));
  fireEvent.change(screen.getByTestId('select-assumption'), { target: { value: assumptionId } });
}
function fillManual() {
  for (const [key, value] of Object.entries(manualProtocol)) {
    fireEvent.change(screen.getByTestId(`input-${key}`), { target: { value: `  ${value}  ` } });
  }
}
const posts = () => fixture.calls.filter((call) => call.method === 'POST');
const patches = () => fixture.calls.filter((call) => call.method === 'PATCH');

describe('Experiment planning generated-client regressions', () => {
  beforeEach(() => {
    fixture = new ExperimentFixture();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    releaseCreate = undefined;
    vi.stubGlobal('fetch', vi.fn(fixture.fetch));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(),
      removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })));
    window.history.replaceState({}, '', `/projects/${projectId}/experiments`);
  });
  afterEach(() => {
    releaseCreate?.();
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  });

  it('loads actual returned fields and scopes status counts to a bounded page', async () => {
    mount();
    const firstCard = await screen.findByTestId(`card-experiment-${fixtureId(10)}`);
    expect(firstCard).toHaveTextContent(manualProtocol.explanation);
    expect(firstCard).toHaveTextContent(/created/i);
    expect(screen.getByTestId('experiments-scope')).toHaveTextContent('4 loaded records / not project totals');
    for (const status of ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']) {
      expect(screen.getByTestId(`count-${status}`)).toHaveTextContent('1');
    }
    expect(fixture.calls.filter((call) => call.path.endsWith('/experiments')).map((call) => call.limit)).toEqual([20]);
    const detail = await selectRecord(11);
    expect(detail).toHaveTextContent(manualProtocol.method);
    expect(detail).toHaveTextContent(manualProtocol.successCriteria);
    expect(screen.getByTestId('input-observed-result')).toHaveValue(originalObservation);
  });

  it('requires the complete manual schema and enforces its lengths before posting', async () => {
    mount();
    await openCreate();
    const form = screen.getByTestId('button-create-experiment').closest('form')!;
    fireEvent.submit(form);
    expect(posts()).toHaveLength(0);
    fillManual();
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'x'.repeat(201) } });
    fireEvent.submit(form);
    expect(posts()).toHaveLength(0);
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: manualProtocol.name } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posts()[0].body).toEqual({ assumptionId, ...manualProtocol });
    expect(await screen.findByTestId(`card-experiment-${fixtureId(50)}`)).toHaveTextContent(manualProtocol.name);
    await waitFor(() => expect(screen.getByTestId('text-experiment-name')).toHaveTextContent(manualProtocol.name));
  });

  it('keeps a rejected manual draft and retries without inventing optional fields', async () => {
    fixture.failCreate = true;
    mount();
    await openCreate();
    fillManual();
    fireEvent.click(screen.getByTestId('button-create-experiment'));
    expect(await screen.findByRole('alert')).toHaveTextContent('VALIDATION_ERROR');
    expect(screen.getByTestId('input-method')).toHaveValue(`  ${manualProtocol.method}  `);
    expect(fixture.rows).toHaveLength(4);
    fixture.failCreate = false;
    fireEvent.click(screen.getByTestId('button-create-experiment'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posts()).toHaveLength(2);
    expect(Object.keys(posts()[1].body!).sort()).toEqual(['assumptionId', ...Object.keys(manualProtocol)].sort());
  });

  it('uses the assumption-only AI workflow once and displays the saved Planned protocol for review', async () => {
    mount();
    await openCreate(false);
    expect(screen.getByTestId('ai-warning')).toHaveTextContent('saves a Planned experiment');
    expect(screen.getByTestId('ai-warning')).toHaveTextContent('no preview step');
    fireEvent.click(screen.getByTestId('button-create-experiment'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toEqual({ assumptionId });
    await waitFor(() => expect(screen.getByTestId('text-experiment-name')).toHaveTextContent('TEST ONLY generated protocol'));
    expect(screen.getByTestId('experiment-detail')).toHaveTextContent('Planned');
    expect(fixture.rows[0].observedResult).toBeNull();
    expect(patches()).toHaveLength(0);
  });

  it('does not fabricate a protocol when AI generation fails', async () => {
    fixture.failAI = true;
    mount();
    await openCreate(false);
    fireEvent.click(screen.getByTestId('button-create-experiment'));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI_UNAVAILABLE');
    expect(screen.getByTestId('select-assumption')).toHaveValue(assumptionId);
    expect(fixture.rows).toHaveLength(4);
    expect(screen.queryByTestId(`card-experiment-${fixtureId(50)}`)).not.toBeInTheDocument();
  });

  it('prevents synchronous duplicate creates and clears a successful draft even after remount', async () => {
    fixture.createGate = new Promise<void>((resolve) => { releaseCreate = resolve; });
    const view = mount();
    await openCreate();
    fillManual();
    const form = screen.getByTestId('button-create-experiment').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(posts()).toHaveLength(1));
    view.unmount();
    mount();
    const newButton = await screen.findByTestId('button-new-experiment');
    await waitFor(() => expect(newButton).toBeEnabled());
    fireEvent.click(newButton);
    expect(await screen.findByTestId('button-create-experiment')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('button-create-experiment').closest('form')!);
    expect(posts()).toHaveLength(1);
    releaseCreate!();
    await waitFor(() => expect(screen.getByTestId('mode-manual')).toBeEnabled());
    fireEvent.click(screen.getByTestId('mode-manual'));
    expect(screen.getByTestId('input-name')).toHaveValue('');
    expect(screen.getByTestId('select-assumption')).toHaveValue('');
    expect(fixture.rows.filter((row) => row.id === fixtureId(50))).toHaveLength(1);
  });

  it('blocks completion without a valid observation and retains rejected result edits', async () => {
    fixture.rows[1].observedResult = null;
    fixture.failPatch = true;
    mount();
    await selectRecord(11);
    const complete = screen.getByTestId(`button-complete-${fixtureId(11)}`);
    expect(complete).toBeDisabled();
    for (const value of ['   ', 'x'.repeat(4001)]) {
      fireEvent.change(screen.getByTestId('input-observed-result'), { target: { value } });
      expect(complete).toBeDisabled();
    }
    fireEvent.change(screen.getByTestId('input-observed-result'), { target: { value: '  Three participants demonstrated the workaround.  ' } });
    fireEvent.click(complete);
    expect(await screen.findByRole('alert')).toHaveTextContent('RESULT_REQUIRED');
    expect(fixture.rows[1].status).toBe('IN_PROGRESS');
    expect(screen.getByTestId('input-observed-result')).toHaveValue('  Three participants demonstrated the workaround.  ');
    fixture.failPatch = false;
    fireEvent.click(screen.getByTestId(`button-complete-${fixtureId(11)}`));
    expect(await screen.findByTestId('text-observed-result')).toHaveTextContent('Three participants demonstrated the workaround.');
    expect(patches()[1].body).toEqual({ status: 'COMPLETED', observedResult: 'Three participants demonstrated the workaround.' });
    expect(fixture.calls.some((call) => call.method === 'PATCH' && call.path.includes('/assumptions/'))).toBe(false);
  });

  it('completes with an existing observation without replacing its original text', async () => {
    mount();
    await selectRecord(11);
    expect(screen.getByTestId('input-observed-result')).toHaveValue(originalObservation);
    fireEvent.click(screen.getByTestId(`button-complete-${fixtureId(11)}`));
    const result = await screen.findByTestId('text-observed-result');
    expect(result.textContent).toBe(originalObservation);
    expect(patches()[0].body).toEqual({ status: 'COMPLETED' });
    expect(screen.queryByTestId('input-observed-result')).not.toBeInTheDocument();
    expect(screen.queryByTestId(`button-start-${fixtureId(11)}`)).not.toBeInTheDocument();
  });

  it('saves observations in place, preserves them through Start and requires confirmation to Abandon', async () => {
    mount();
    await selectRecord(10);
    fireEvent.change(screen.getByTestId('input-observed-result'), { target: { value: '  Two actual replies were recorded.  ' } });
    fireEvent.click(screen.getByTestId('button-save-observation'));
    await waitFor(() => expect(screen.getByTestId('input-observed-result')).toHaveValue('Two actual replies were recorded.'));
    fireEvent.click(screen.getByTestId(`button-start-${fixtureId(10)}`));
    await screen.findByTestId(`button-complete-${fixtureId(10)}`);
    fireEvent.change(screen.getByTestId('input-observed-result'), { target: { value: 'This draft is not submitted with abandonment.' } });
    expect(screen.getByText('Saving replaces the stored observation. This API provides no revision history.')).toBeVisible();
    fireEvent.click(screen.getByTestId(`button-abandon-${fixtureId(10)}`));
    const confirmation = await screen.findByRole('dialog');
    expect(confirmation).toHaveTextContent('cannot be reopened');
    expect(patches()).toHaveLength(2);
    fireEvent.click(screen.getByTestId('button-confirm-abandon'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('text-observed-result').textContent).toBe('Two actual replies were recorded.');
    expect(patches().map((call) => call.body)).toEqual([
      { status: 'PLANNED', observedResult: 'Two actual replies were recorded.' },
      { status: 'IN_PROGRESS' }, { status: 'ABANDONED' },
    ]);
  });

  it('filters and sorts actual records and navigates to the exact related hypothesis', async () => {
    mount();
    await screen.findByTestId(`card-experiment-${fixtureId(10)}`);
    fireEvent.change(screen.getByTestId('experiment-status-filter'), { target: { value: 'COMPLETED' } });
    expect(screen.getAllByTestId(/^card-experiment-/)).toHaveLength(1);
    fireEvent.change(screen.getByTestId('experiment-status-filter'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('experiment-assumption-filter'), { target: { value: otherAssumptionId } });
    expect(screen.getAllByTestId(/^card-experiment-/)).toHaveLength(1);
    fireEvent.change(screen.getByTestId('experiment-assumption-filter'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('experiment-search'), { target: { value: 'experiment 10' } });
    expect(screen.getAllByTestId(/^card-experiment-/)).toHaveLength(1);
    fireEvent.change(screen.getByTestId('experiment-sort'), { target: { value: 'created' } });
    await selectRecord(10);
    expect(screen.getByTestId('link-experiment-assumption')).toHaveAttribute('href', `/projects/${projectId}/evidence?assumptionId=${assumptionId}`);
    fireEvent.click(screen.getByTestId('link-experiment-assumption'));
    expect(await screen.findByTestId(`relationship-toggle-${assumptionId}`)).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByTestId(`relationship-evidence-${fixtureId(80)}`)).toHaveTextContent('I prepared the report last week.');
  });

  it('shows historical references as unavailable instead of substituting the latest assumption', async () => {
    fixture.rows[0].assumptionId = fixtureId(99);
    mount();
    await selectRecord(10);
    expect(screen.getByTestId('text-assumption-unavailable')).toHaveTextContent(fixtureId(99));
    expect(screen.getByTestId('text-assumption-unavailable')).toHaveTextContent('Not in the latest analysis');
  });

  it('shows empty and retryable list states without creating records', async () => {
    fixture.failList = true;
    mount();
    expect(await screen.findByText('Could not load experiments')).toBeVisible();
    fixture.failList = false;
    fixture.rows = [];
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('No experiments yet')).toBeVisible();
    expect(posts()).toHaveLength(0);
  });

  it('keeps existing experiments usable when the latest analysis fails', async () => {
    fixture.failLatest = true;
    mount();
    await screen.findByTestId(`card-experiment-${fixtureId(10)}`);
    expect(await screen.findByText(/Latest analysis unavailable: new experiments are paused/)).toBeVisible();
    expect(screen.getByTestId('button-new-experiment')).toBeDisabled();
    await selectRecord(10);
    expect(screen.getByTestId('text-assumption-unavailable')).toHaveTextContent('could not be loaded');
  });

  it.each([401, 404, 503] as const)('does not load private experiment data after project access returns %s', async (status) => {
    fixture.accessStatus = status;
    mount();
    await waitFor(() => expect(fixture.calls).toHaveLength(1));
    expect(await screen.findByText(status === 404 ? 'Project not found' : 'Could not load project')).toBeVisible();
    expect(screen.queryByTestId('experiments-workspace')).not.toBeInTheDocument();
    expect(fixture.calls[0].path).toBe(`/api/projects/${projectId}`);
  });

  it('uses only supported transitions, field limits and actual timestamp sorting', () => {
    expect(TRANSITIONS).toEqual({ PLANNED: ['IN_PROGRESS', 'ABANDONED'], IN_PROGRESS: ['COMPLETED', 'ABANDONED'], COMPLETED: [], ABANDONED: [] });
    expect(manualProblems(manualProtocol)).toEqual([]);
    expect(manualProblems({ ...manualProtocol, name: 'x'.repeat(201) })).toHaveLength(1);
    expect(obsValid('   ')).toBe(false);
    expect(obsValid('x'.repeat(4001))).toBe(false);
    const sorted = filterSort([experiment(10, 'PLANNED'), experiment(11, 'IN_PROGRESS', { createdAt: '2026-11-09T12:00:00.000Z' })],
      { q: '', status: '', assumption: '', sort: 'created' }, () => undefined);
    expect(sorted.map((row) => row.id)).toEqual([fixtureId(11), fixtureId(10)]);
  });
});
