import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assumption } from '@workspace/api-client-react';
import { Route, Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { Report } from './analysis-report';
import InterviewsPage from './interviews';
import { HypothesisRow } from '@/components/hypothesis';

const mocks = vi.hoisted(() => ({
  getAnalysis: vi.fn(),
  latestAnalysis: vi.fn(),
  summary: vi.fn(),
  blindspots: vi.fn(),
  questions: vi.fn(),
  assumptions: vi.fn(),
  history: vi.fn(),
  updateAssumption: vi.fn(),
  createInterview: vi.fn(),
  createInterviewMutate: vi.fn(),
  createInterviewOptions: null as unknown,
  listInterviews: vi.fn(),
  interviewItems: [] as Array<Record<string, unknown>>,
  mutate: vi.fn(),
  mutationError: null as Error | null,
  mutationPending: false,
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetAnalysisQueryKey: vi.fn(() => ['analysis']),
  getGetLatestAnalysisQueryKey: vi.fn(() => ['latest']),
  getGetAnalysisSummaryQueryKey: vi.fn(() => ['summary']),
  getGetAnalysisBlindspotsQueryKey: vi.fn(() => ['blindspots']),
  getGetAnalysisInterviewQuestionsQueryKey: vi.fn(() => ['questions']),
  getListAssumptionsQueryKey: vi.fn(() => ['assumptions']),
  getListAnalysisHistoryQueryKey: vi.fn(() => ['history']),
  getListInterviewsQueryKey: vi.fn(() => ['interviews']),
  getListFeedbackQueryKey: vi.fn(() => ['feedback']),
  getGetFeedbackSummaryQueryKey: vi.fn(() => ['feedback-summary']),
  getGetProjectQueryKey: vi.fn(() => ['project']),
  useGetAnalysis: mocks.getAnalysis,
  useGetLatestAnalysis: mocks.latestAnalysis,
  useGetAnalysisSummary: mocks.summary,
  useGetAnalysisBlindspots: mocks.blindspots,
  useGetAnalysisInterviewQuestions: mocks.questions,
  useListAssumptions: mocks.assumptions,
  useListAnalysisHistory: mocks.history,
  useGetProject: vi.fn(() => query({ id: 'project-1', name: 'Example project' })),
  useListInterviews: mocks.listInterviews,
  useListFeedback: vi.fn(() => query({ items: [] })),
  useGetFeedbackSummary: vi.fn(() => ({ data: { data: { createdAt: null } }, isLoading: false, isError: false })),
  useAddFeedback: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
  useCreateInterview: mocks.createInterview,
  useUpdateAssumption: mocks.updateAssumption,
}));

function query<T>(data: T) {
  return { data: { data }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
}

function assumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    id: 'a1',
    analysisId: 'analysis-current',
    description: 'Customers have this problem',
    explanation: 'A meaningful assumption',
    evidenceRequired: 'Observed behavior',
    validationMethod: 'Interview customers',
    category: 'PROBLEM',
    riskLevel: 'HIGH',
    impact: 4,
    uncertainty: 5,
    riskScore: 17,
    status: 'UNTESTED',
    ...overrides,
  };
}

function evidence(id: string, assumptionId: string, sentiment: 'SUPPORTING' | 'INVALIDATING' | 'NEUTRAL') {
  return {
    id,
    assumptionId,
    feedbackId: `feedback-${id}`,
    quote: `Quote ${id}`,
    reasoning: `Reason ${id}`,
    origin: 'Interview',
    createdAt: '2025-01-02T00:00:00.000Z',
    sentiment,
  };
}

function setupReport(items: Assumption[], latestId = 'analysis-current', questionsAvailable = false, renderUI = true) {
  mocks.getAnalysis.mockReturnValue(query({
    id: 'analysis-current',
    version: 2,
    model: 'fixture-model',
    createdAt: '2025-01-01T00:00:00.000Z',
    result: { problemClarity: 'Clear', audienceClarity: 'Known', nextSteps: [] },
  }));
  mocks.latestAnalysis.mockReturnValue(query({ id: latestId, version: latestId === 'analysis-current' ? 2 : 3, model: 'fixture-model', createdAt: '2025-01-02T00:00:00.000Z' }));
  mocks.summary.mockReturnValue(query({ available: false, reason: 'No structured summary' }));
  mocks.blindspots.mockReturnValue(query({ available: false, reason: 'No blindspots' }));
  mocks.questions.mockReturnValue(query({
    available: questionsAvailable,
    items: questionsAvailable ? [{
      id: 'question-1',
      question: 'Tell me about the last time you faced this problem.',
      purpose: 'Understand recent behavior',
      evidenceToLookFor: 'Existing workarounds',
      followUpQuestion: 'What happened next?',
    }] : [],
    reason: 'No questions',
  }));
  mocks.assumptions.mockReturnValue(query({ items }));
  mocks.history.mockReturnValue(query({ items: [] }));
  mocks.interviewItems = [];
  mocks.listInterviews.mockImplementation(() => query({ items: mocks.interviewItems }));
  if (!renderUI) return;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Report projectId="project-1" analysisId="analysis-current" projectName="Example project" />
    </QueryClientProvider>,
  );
}

function renderReportInterviewHandoff() {
  setupReport([assumption()], 'analysis-newer', true, false);
  mocks.interviewItems = [];
  mocks.listInterviews.mockImplementation((_projectId, _params, options) => useQuery({
    queryKey: options.query.queryKey,
    queryFn: async () => ({ data: { items: [...mocks.interviewItems] } }),
  }));
  mocks.createInterview.mockImplementation((options) => {
    mocks.createInterviewOptions = options;
    return {
    mutate: mocks.createInterviewMutate,
    isPending: false,
    error: null,
    reset: vi.fn(),
    };
  });
  mocks.createInterviewMutate.mockImplementation((variables) => {
    mocks.interviewItems = [{
      id: 'interview-created',
      projectId: 'project-1',
      participant: variables.data.participant,
      createdAt: '2025-01-03T00:00:00.000Z',
      sourceAnalysisVersion: 3,
      questions: [{
        assumptionId: 'a1',
        question: 'What happened the last time?',
      }],
    }];
    (mocks.createInterviewOptions as { mutation: { onSuccess: (result: { data: unknown }) => void } })
      .mutation.onSuccess({
      data: {
        ...mocks.interviewItems[0],
        questions: [{ assumptionId: 'a1', question: 'What happened the last time?' }],
      },
    });
  });

  const { hook } = memoryLocation({ path: '/projects/project-1/analysis/analysis-current' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Router hook={hook}>
        <Route path="/projects/:id/analysis/:analysisId" component={() => (
          <Report projectId="project-1" analysisId="analysis-current" projectName="Example project" />
        )} />
        <Route path="/projects/:id/interviews" component={InterviewsPage} />
      </Router>
    </QueryClientProvider>,
  );
}

function getRenderedAssumptionIds() {
  const list = document.querySelector('#assumptions ol');
  return list ? Array.from(list.children).map((row) => row.getAttribute('data-testid')) : [];
}

describe('analysis report risk regressions', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.mutationError = null;
    mocks.mutationPending = false;
    mocks.updateAssumption.mockImplementation(() => ({
      mutate: mocks.mutate,
      isPending: mocks.mutationPending,
      error: mocks.mutationError,
      reset: vi.fn(),
    }));
  });

  afterEach(cleanup);

  it('renders all 25 matrix cells and uses returned risk scores and levels', () => {
    const items = Array.from({ length: 25 }, (_, index) => {
      const impact = Math.floor(index / 5) + 1;
      const uncertainty = (index % 5) + 1;
      return assumption({
        id: `a-${impact}-${uncertainty}`,
        description: `Risk ${impact}-${uncertainty}`,
        impact,
        uncertainty,
        riskScore: index === 24 ? 17 : (index % 16) + 1,
        riskLevel: index === 24 ? 'HIGH' : 'LOW',
      });
    });
    setupReport(items);

    const cells = screen.getAllByTestId(/^matrix-cell-/);
    expect(cells).toHaveLength(25);
    for (let impact = 1; impact <= 5; impact += 1) {
      for (let uncertainty = 1; uncertainty <= 5; uncertainty += 1) {
        expect(screen.getByTestId(`matrix-cell-${impact}-${uncertainty}`)).toHaveAccessibleName(
          `Impact ${impact}, uncertainty ${uncertainty}; 1 assumptions`,
        );
      }
    }
    expect(screen.getByTestId('matrix-cell-5-5')).toHaveTextContent('17');
    expect(screen.getByTestId('row-hypothesis-a-5-5')).toHaveTextContent('17');
    expect(screen.getByTestId('row-hypothesis-a-5-5')).toHaveTextContent('HIGH risk');
  });

  it('filters assumptions by category and status', () => {
    setupReport([
      assumption({ id: 'problem-untested', category: 'PROBLEM', status: 'UNTESTED', description: 'Problem alpha' }),
      assumption({ id: 'solution-testing', category: 'SOLUTION', status: 'TESTING', description: 'Solution beta' }),
      assumption({ id: 'problem-invalid', category: 'PROBLEM', status: 'INVALIDATED', description: 'Problem gamma' }),
    ]);

    fireEvent.change(screen.getByTestId('select-assumption-category'), { target: { value: 'SOLUTION' } });
    expect(getRenderedAssumptionIds()).toEqual(['row-hypothesis-solution-testing']);

    fireEvent.change(screen.getByTestId('select-assumption-category'), { target: { value: 'ALL' } });
    fireEvent.change(screen.getByTestId('select-assumption-status'), { target: { value: 'INVALIDATED' } });
    expect(getRenderedAssumptionIds()).toEqual(['row-hypothesis-problem-invalid']);
  });

  it('searches assumption descriptions without adding unreturned data', () => {
    setupReport([
      assumption({ id: 'a-match', description: 'Interview evidence shows repeated work' }),
      assumption({ id: 'a-other', description: 'Pricing may be too high' }),
    ]);

    fireEvent.change(screen.getByTestId('input-assumption-search'), { target: { value: 'REPEATED' } });
    expect(getRenderedAssumptionIds()).toEqual(['row-hypothesis-a-match']);
    expect(screen.queryByTestId('row-hypothesis-a-other')).not.toBeInTheDocument();
  });

  it('sorts by saved risk score and by description', () => {
    setupReport([
      assumption({ id: 'a-low', description: 'Beta', riskScore: 4 }),
      assumption({ id: 'a-high', description: 'Zulu', riskScore: 23, riskLevel: 'CRITICAL' }),
      assumption({ id: 'a-middle', description: 'Alpha', riskScore: 12, riskLevel: 'MEDIUM' }),
    ]);

    expect(getRenderedAssumptionIds()).toEqual([
      'row-hypothesis-a-high',
      'row-hypothesis-a-middle',
      'row-hypothesis-a-low',
    ]);
    fireEvent.change(screen.getByTestId('select-assumption-sort'), { target: { value: 'description' } });
    expect(getRenderedAssumptionIds()).toEqual([
      'row-hypothesis-a-middle',
      'row-hypothesis-a-low',
      'row-hypothesis-a-high',
    ]);
  });

  it('hides every review action for an older report snapshot', () => {
    setupReport([
      assumption({ id: 'untested', status: 'UNTESTED' }),
      assumption({ id: 'testing', status: 'TESTING' }),
      assumption({ id: 'supported', status: 'SUPPORTED' }),
    ], 'analysis-newer');

    expect(screen.queryByTestId('button-start-testing-untested')).not.toBeInTheDocument();
    expect(screen.queryByTestId('button-record-outcome-testing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('button-reopen-supported')).not.toBeInTheDocument();
    expect(screen.getByText('This is a preserved historical snapshot. Review controls are disabled.')).toBeInTheDocument();
  });

  it('offers an interview action from historical reports and states that only latest questions are used', () => {
    setupReport([assumption()], 'analysis-newer', true);

    expect(screen.getByTestId('button-start-interview-from-report')).toHaveAttribute(
      'href',
      '/projects/project-1/interviews?create=1&reportAnalysisId=analysis-current&reportVersion=2',
    );
    expect(screen.getByText(/This is an older report\. Interview sessions use the project’s latest analysis/)).toBeInTheDocument();
    expect(screen.getByText(/questions from this snapshot are not sent to session creation/)).toBeInTheDocument();
  });

  it('opens a snapshot-aware interview dialog and shows the created session', async () => {
    renderReportInterviewHandoff();

    fireEvent.click(screen.getByTestId('button-start-interview-from-report'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('report-session-context')).toHaveTextContent(
      'This is report v2; sessions use the latest analysis (v3). Questions from this older snapshot are not sent to session creation.',
    );

    fireEvent.change(screen.getByTestId('input-participant'), { target: { value: 'Clinic ops lead, Leeds' } });
    fireEvent.click(screen.getByTestId('button-create-interview'));

    await waitFor(() => {
      expect(mocks.createInterviewMutate).toHaveBeenCalledWith(
        { id: 'project-1', data: { participant: 'Clinic ops lead, Leeds' } },
      );
    });
    expect(mocks.createInterviewMutate.mock.calls[0][0].data).toEqual({
      participant: 'Clinic ops lead, Leeds',
    });
    expect(await screen.findByTestId('card-interview-interview-created')).toHaveTextContent('Clinic ops lead, Leeds');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('hypothesis outcome evidence gating', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.mutationError = null;
    mocks.mutationPending = false;
    mocks.updateAssumption.mockImplementation(() => ({
      mutate: mocks.mutate,
      isPending: mocks.mutationPending,
      error: mocks.mutationError,
      reset: vi.fn(),
    }));
  });

  afterEach(cleanup);

  function openOutcomeDialog() {
    const a = assumption({
      status: 'TESTING',
      evidenceRecords: [
        evidence('linked-support', 'a1', 'SUPPORTING'),
        evidence('linked-invalid', 'a1', 'INVALIDATING'),
        evidence('linked-neutral', 'a1', 'NEUTRAL'),
        evidence('unlinked-support', 'other-assumption', 'SUPPORTING'),
      ],
    });
    const client = new QueryClient();
    const renderRow = () => (
      <QueryClientProvider client={client}>
        <HypothesisRow a={a} rank={1} projectId="project-1" />
      </QueryClientProvider>
    );
    const view = render(renderRow());
    fireEvent.click(screen.getByTestId('button-record-outcome-a1'));
    return { rerender: () => view.rerender(renderRow()) };
  }

  it('submits only linked supporting evidence for a supported outcome', () => {
    openOutcomeDialog();

    expect(screen.getByTestId('checkbox-evidence-linked-support')).toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-invalid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-neutral')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-unlinked-support')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-support'));
    fireEvent.click(screen.getByTestId('button-submit-outcome'));
    expect(mocks.mutate).toHaveBeenCalledWith(
      { id: 'a1', data: { status: 'SUPPORTED', evidenceIds: ['linked-support'] } },
      expect.any(Object),
    );
  });

  it('submits only linked invalidating evidence for an invalidated outcome', () => {
    openOutcomeDialog();
    fireEvent.click(screen.getByTestId('radio-outcome-INVALIDATED'));

    expect(screen.getByTestId('checkbox-evidence-linked-invalid')).toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-support')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-neutral')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-unlinked-support')).not.toBeInTheDocument();

    const submit = screen.getByTestId('button-submit-outcome');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-invalid'));
    fireEvent.click(submit);
    expect(mocks.mutate).toHaveBeenCalledWith(
      { id: 'a1', data: { status: 'INVALIDATED', evidenceIds: ['linked-invalid'] } },
      expect.any(Object),
    );
  });

  it('refreshes linked citations and clears prior selections as outcomes change', () => {
    openOutcomeDialog();

    expect(screen.getByTestId('checkbox-evidence-linked-support')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-support'));

    fireEvent.click(screen.getByTestId('radio-outcome-INVALIDATED'));
    expect(screen.getByTestId('checkbox-evidence-linked-invalid')).toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-support')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-linked-neutral')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-unlinked-support')).not.toBeInTheDocument();
    expect(screen.getByText('Cite evidence linked to this hypothesis (0 selected)')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-invalid'));

    fireEvent.click(screen.getByTestId('radio-outcome-INCONCLUSIVE'));
    expect(screen.getByTestId('checkbox-evidence-linked-support')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-evidence-linked-invalid')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-evidence-linked-neutral')).toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-evidence-unlinked-support')).not.toBeInTheDocument();
    expect(screen.getByText('Cite evidence linked to this hypothesis (0 selected)')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-neutral'));
    fireEvent.click(screen.getByTestId('button-submit-outcome'));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { id: 'a1', data: { status: 'INCONCLUSIVE', evidenceIds: ['linked-neutral'] } },
      expect.any(Object),
    );
  });

  it('keeps the dialog and selected citation available after a rejected save', () => {
    const { rerender } = openOutcomeDialog();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-support'));
    fireEvent.click(screen.getByTestId('button-submit-outcome'));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      { id: 'a1', data: { status: 'SUPPORTED', evidenceIds: ['linked-support'] } },
      expect.any(Object),
    );

    mocks.mutationError = new Error('Unable to save outcome');
    rerender();

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save outcome');
    expect(screen.getByText('Record an outcome')).toBeInTheDocument();
    expect(screen.getByText('Cite evidence linked to this hypothesis (1 selected)')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-evidence-linked-support')).toBeChecked();

    fireEvent.click(screen.getByTestId('button-submit-outcome'));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate).toHaveBeenLastCalledWith(
      { id: 'a1', data: { status: 'SUPPORTED', evidenceIds: ['linked-support'] } },
      expect.any(Object),
    );
  });

  it('prevents a second submission while an outcome save is pending', () => {
    const { rerender } = openOutcomeDialog();
    fireEvent.click(screen.getByTestId('checkbox-evidence-linked-support'));
    fireEvent.click(screen.getByTestId('button-submit-outcome'));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);

    mocks.mutationPending = true;
    rerender();

    const submit = screen.getByTestId('button-submit-outcome');
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});
