import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assumption } from '@workspace/api-client-react';
import { Report } from './analysis-report';
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
  mutate: vi.fn(),
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetAnalysisQueryKey: vi.fn(() => ['analysis']),
  getGetLatestAnalysisQueryKey: vi.fn(() => ['latest']),
  getGetAnalysisSummaryQueryKey: vi.fn(() => ['summary']),
  getGetAnalysisBlindspotsQueryKey: vi.fn(() => ['blindspots']),
  getGetAnalysisInterviewQuestionsQueryKey: vi.fn(() => ['questions']),
  getListAssumptionsQueryKey: vi.fn(() => ['assumptions']),
  getListAnalysisHistoryQueryKey: vi.fn(() => ['history']),
  useGetAnalysis: mocks.getAnalysis,
  useGetLatestAnalysis: mocks.latestAnalysis,
  useGetAnalysisSummary: mocks.summary,
  useGetAnalysisBlindspots: mocks.blindspots,
  useGetAnalysisInterviewQuestions: mocks.questions,
  useListAssumptions: mocks.assumptions,
  useListAnalysisHistory: mocks.history,
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

function setupReport(items: Assumption[], latestId = 'analysis-current') {
  mocks.getAnalysis.mockReturnValue(query({
    id: 'analysis-current',
    version: 2,
    model: 'fixture-model',
    createdAt: '2025-01-01T00:00:00.000Z',
    result: { problemClarity: 'Clear', audienceClarity: 'Known', nextSteps: [] },
  }));
  mocks.latestAnalysis.mockReturnValue(query({ id: latestId, version: 3, model: 'fixture-model', createdAt: '2025-01-02T00:00:00.000Z' }));
  mocks.summary.mockReturnValue(query({ available: false, reason: 'No structured summary' }));
  mocks.blindspots.mockReturnValue(query({ available: false, reason: 'No blindspots' }));
  mocks.questions.mockReturnValue(query({ available: false, reason: 'No questions' }));
  mocks.assumptions.mockReturnValue(query({ items }));
  mocks.history.mockReturnValue(query({ items: [] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Report projectId="project-1" analysisId="analysis-current" projectName="Example project" />
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
    mocks.updateAssumption.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
      error: null,
      reset: vi.fn(),
    });
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
});

describe('hypothesis outcome evidence gating', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.updateAssumption.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
      error: null,
      reset: vi.fn(),
    });
  });

  afterEach(cleanup);

  function openOutcomeDialog() {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HypothesisRow
          a={assumption({
            status: 'TESTING',
            evidenceRecords: [
              evidence('linked-support', 'a1', 'SUPPORTING'),
              evidence('linked-invalid', 'a1', 'INVALIDATING'),
              evidence('linked-neutral', 'a1', 'NEUTRAL'),
              evidence('unlinked-support', 'other-assumption', 'SUPPORTING'),
            ],
          })}
          rank={1}
          projectId="project-1"
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByTestId('button-record-outcome-a1'));
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
});
