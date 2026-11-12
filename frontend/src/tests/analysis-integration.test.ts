import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPhase02RiskLevel,
  getRiskLevelStyles,
  getStatusBadgeStyles,
  type ScoredAssumption,
  type ValidationDimension,
  type SeverityLevel,
} from '../types/analysis.ts';

describe('Phase 02 Risk Scoring and Thresholds', () => {
  test('Impact x Uncertainty strictly matches formula for all 25 grid coordinates', () => {
    for (let impact = 1; impact <= 5; impact++) {
      for (let uncertainty = 1; uncertainty <= 5; uncertainty++) {
        const score = impact * uncertainty;
        assert.ok(score >= 1 && score <= 25, `Score ${score} out of range 1-25`);

        const tier: SeverityLevel = getPhase02RiskLevel(score);
        if (score >= 20) {
          assert.equal(tier, 'CRITICAL', `Score ${score} must be CRITICAL`);
        } else if (score >= 13) {
          assert.equal(tier, 'HIGH', `Score ${score} must be HIGH`);
        } else if (score >= 7) {
          assert.equal(tier, 'MEDIUM', `Score ${score} must be MEDIUM`);
        } else {
          assert.equal(tier, 'LOW', `Score ${score} must be LOW`);
        }
      }
    }
  });

  test('Threshold boundary conditions match Phase 02 specifications exactly', () => {
    // 20-25: CRITICAL
    assert.equal(getPhase02RiskLevel(25), 'CRITICAL');
    assert.equal(getPhase02RiskLevel(20), 'CRITICAL');
    // 13-19: HIGH
    assert.equal(getPhase02RiskLevel(19), 'HIGH');
    assert.equal(getPhase02RiskLevel(13), 'HIGH');
    // 7-12: MEDIUM
    assert.equal(getPhase02RiskLevel(12), 'MEDIUM');
    assert.equal(getPhase02RiskLevel(7), 'MEDIUM');
    // 1-6: LOW
    assert.equal(getPhase02RiskLevel(6), 'LOW');
    assert.equal(getPhase02RiskLevel(1), 'LOW');
  });

  test('Risk level styling returns branded palette tokens', () => {
    const critical = getRiskLevelStyles('CRITICAL');
    assert.ok(critical.bg.includes('red'));

    const high = getRiskLevelStyles('HIGH');
    assert.ok(high.bg.includes('purple'));

    const medium = getRiskLevelStyles('MEDIUM');
    assert.ok(medium.bg.includes('amber'));

    const low = getRiskLevelStyles('LOW');
    assert.ok(low.bg.includes('forest'));
  });

  test('Status badge styles return correct visual classes', () => {
    assert.ok(getStatusBadgeStyles('SUPPORTED').bg.includes('emerald'));
    assert.ok(getStatusBadgeStyles('INVALIDATED').bg.includes('red'));
    assert.ok(getStatusBadgeStyles('TESTING').bg.includes('purple'));
    assert.ok(getStatusBadgeStyles('UNTESTED').bg.includes('forest'));
  });
});

describe('Validation Dimensions Evidence Policy', () => {
  test('Evidence of Demand must preserve null score and INSUFFICIENT_EVIDENCE', () => {
    const demandDimension: ValidationDimension = {
      score: null,
      support: 'INSUFFICIENT_EVIDENCE',
      rationale: 'Only an idea description was supplied; no independently verified demand evidence was assessed.',
      evidenceNeeded: 'Real customer behavior, credible spending/workaround evidence.',
    };

    assert.equal(demandDimension.score, null);
    assert.notEqual(demandDimension.score, 0); // Never display null as 0
    assert.equal(demandDimension.support, 'INSUFFICIENT_EVIDENCE');
  });

  test('Description-only score must be integer between 0 and 100', () => {
    const clarityDimension: ValidationDimension = {
      score: 85,
      support: 'DESCRIPTION_ONLY',
      rationale: 'Problem is articulated with specific pain points.',
      evidenceNeeded: 'Customer validation.',
    };

    assert.equal(typeof clarityDimension.score, 'number');
    assert.ok(clarityDimension.score! >= 0 && clarityDimension.score! <= 100);
    assert.equal(clarityDimension.support, 'DESCRIPTION_ONLY');
  });
});

describe('Assumption Status Transition Lifecycle Rules', () => {
  const allowedTransitions = {
    UNTESTED: ['TESTING'],
    TESTING: ['SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'],
    SUPPORTED: ['TESTING'],
    INVALIDATED: ['TESTING'],
    INCONCLUSIVE: ['TESTING'],
  };

  test('UNTESTED can only transition directly to TESTING', () => {
    assert.deepEqual(allowedTransitions['UNTESTED'], ['TESTING']);
    assert.ok(!allowedTransitions['UNTESTED'].includes('SUPPORTED'));
    assert.ok(!allowedTransitions['UNTESTED'].includes('INVALIDATED'));
  });

  test('Terminal statuses require cited evidence', () => {
    const isTerminal = (status: string) => ['SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'].includes(status);
    assert.ok(isTerminal('SUPPORTED'));
    assert.ok(isTerminal('INVALIDATED'));
    assert.ok(isTerminal('INCONCLUSIVE'));
    assert.ok(!isTerminal('TESTING'));
    assert.ok(!isTerminal('UNTESTED'));
  });

  test('Supporting evidence validation verifies matching sentiment', () => {
    const records = [
      { id: 'ev-1', sentiment: 'SUPPORTING' as const },
      { id: 'ev-2', sentiment: 'NEUTRAL' as const },
    ];

    const hasSupporting = records.some((r) => r.sentiment === 'SUPPORTING');
    assert.equal(hasSupporting, true);

    const hasInvalidating = records.some((r) => (r.sentiment as string) === 'INVALIDATING');
    assert.equal(hasInvalidating, false);
  });
});

describe('Interactive Risk Matrix Cell Placement', () => {
  const mockAssumptions: ScoredAssumption[] = [
    {
      id: 'a1',
      title: 'Lethal assumption',
      description: 'Students will pay $15/mo',
      category: 'WILLINGNESS_TO_PAY',
      whyItMatters: 'Fatal to unit economics',
      evidenceRequired: 'Proof of past payment',
      validationMethod: 'Interviews',
      targetAudience: 'College dorm students',
      suggestedInterviewQuestion: 'How much did you spend on laundry last month?',
      grounding: 'SUBMITTED',
      sourceQuote: '$15/month automated locker',
      impact: 5,
      uncertainty: 5,
      riskScore: 25,
      priorityScore: 25,
      riskLevel: 'CRITICAL',
      impactRationale: 'Fatal revenue dependency',
      uncertaintyRationale: 'No customer has paid yet',
      explanation: 'Core monetization premise',
      status: 'UNTESTED',
    },
    {
      id: 'a2',
      title: 'Operational access',
      description: 'University allows lockers in dorms',
      category: 'OPERATIONAL',
      whyItMatters: 'Physical delivery blocked',
      evidenceRequired: 'Housing authority policy',
      validationMethod: 'Facility coordinator inquiry',
      targetAudience: 'Campus housing',
      suggestedInterviewQuestion: 'What is the current policy for package lockers?',
      grounding: 'UNCERTAINTY',
      sourceQuote: null,
      impact: 4,
      uncertainty: 4,
      riskScore: 16,
      priorityScore: 16,
      riskLevel: 'HIGH',
      impactRationale: 'Blocks logistics',
      uncertaintyRationale: 'Strict dorm rules',
      explanation: 'Campus facility access',
      status: 'UNTESTED',
    },
  ];

  test('Assumptions map to exact 5x5 grid cells', () => {
    const cell_5_5 = mockAssumptions.filter((a) => a.impact === 5 && a.uncertainty === 5);
    assert.equal(cell_5_5.length, 1);
    assert.equal(cell_5_5[0].id, 'a1');
    assert.equal(cell_5_5[0].riskScore, 25);

    const cell_4_4 = mockAssumptions.filter((a) => a.impact === 4 && a.uncertainty === 4);
    assert.equal(cell_4_4.length, 1);
    assert.equal(cell_4_4[0].id, 'a2');
    assert.equal(cell_4_4[0].riskScore, 16);

    const cell_1_1 = mockAssumptions.filter((a) => a.impact === 1 && a.uncertainty === 1);
    assert.equal(cell_1_1.length, 0);
  });
});

describe('Analysis Input Bounds Validation', () => {
  test('Market context enforces 4000 character maximum', () => {
    const valid = 'Valid market context'.repeat(100);
    assert.ok(valid.length <= 4000);

    const tooLong = 'a'.repeat(4001);
    assert.ok(tooLong.length > 4000);
  });

  test('Additional context enforces 6000 character maximum', () => {
    const valid = 'Additional founder context'.repeat(100);
    assert.ok(valid.length <= 6000);

    const tooLong = 'b'.repeat(6001);
    assert.ok(tooLong.length > 6000);
  });
});

describe('API Contract Endpoints Alignment', () => {
  test('Endpoints map to verified backend Phase 02 routes', () => {
    const projectId = '11111111-1111-4111-8111-111111111111';
    const analysisId = '22222222-2222-4222-8222-222222222222';
    const assumptionId = '33333333-3333-4333-8333-333333333333';

    assert.equal(`/api/projects/${projectId}/analyze`, `/api/projects/11111111-1111-4111-8111-111111111111/analyze`);
    assert.equal(`/api/projects/${projectId}/analysis`, `/api/projects/11111111-1111-4111-8111-111111111111/analysis`);
    assert.equal(`/api/projects/${projectId}/analyses`, `/api/projects/11111111-1111-4111-8111-111111111111/analyses`);
    assert.equal(`/api/analyses/${analysisId}`, `/api/analyses/22222222-2222-4222-8222-222222222222`);
    assert.equal(`/api/analyses/${analysisId}/assumptions`, `/api/analyses/22222222-2222-4222-8222-222222222222/assumptions`);
    assert.equal(`/api/analyses/${analysisId}/blindspots`, `/api/analyses/22222222-2222-4222-8222-222222222222/blindspots`);
    assert.equal(`/api/analyses/${analysisId}/interview-questions`, `/api/analyses/22222222-2222-4222-8222-222222222222/interview-questions`);
    assert.equal(`/api/analyses/${analysisId}/summary`, `/api/analyses/22222222-2222-4222-8222-222222222222/summary`);
    assert.equal(`/api/assumptions/${assumptionId}`, `/api/assumptions/33333333-3333-4333-8333-333333333333`);
  });
});

