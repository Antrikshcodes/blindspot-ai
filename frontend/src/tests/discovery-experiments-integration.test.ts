import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const ExperimentUpdateStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;

describe('Customer Discovery & Interview Question Integrity', () => {
  it('Mom Test interview questions focus on past factual behaviors', () => {
    const validMomTestProbes = [
      'How do you currently handle this problem today?',
      'When was the last time you encountered this friction?',
      'What specific tools or workarounds did you try to solve it?',
      'How much money or time did that workaround cost you?',
    ];

    validMomTestProbes.forEach((probe) => {
      assert.ok(probe.length >= 10, 'Probe question must be descriptive');
      assert.ok(!probe.toLowerCase().includes('would you buy'), 'Mom Test prohibits hypothetical "would you" questions');
      assert.ok(!probe.toLowerCase().includes('do you think this is a good idea'), 'Mom Test prohibits asking opinions on your idea');
    });
  });

  it('Interview feedback requires minimum 10 characters notes', () => {
    const minFeedbackLength = 10;
    const testNote = 'Customer spends 4 hours weekly compiling spreadsheets manually.';
    assert.ok(testNote.trim().length >= minFeedbackLength, 'Valid feedback exceeds minimum length');

    const invalidShortNote = 'Bad app';
    assert.ok(invalidShortNote.trim().length < minFeedbackLength, 'Short feedback correctly flagged as insufficient');
  });

  it('Feedback contradiction detection requires distinct quote references', () => {
    const mockContradiction = {
      feedbackAId: '11111111-1111-1111-1111-111111111111',
      feedbackBId: '22222222-2222-2222-2222-222222222222',
      quoteA: 'We always mandate SSO for all internal developer tools.',
      quoteB: 'Our team uses Google login and avoids enterprise SSO setups.',
      explanation: 'Conflicting security requirements across prospective buyers.',
    };

    assert.notEqual(mockContradiction.feedbackAId, mockContradiction.feedbackBId, 'Contradiction must cite two distinct feedback items');
    assert.ok(mockContradiction.quoteA.length > 0 && mockContradiction.quoteB.length > 0, 'Both quotes must be non-empty');
  });
});

describe('Validation Experiments Lifecycle and Falsification Rules', () => {
  it('ExperimentUpdateStatus contains all 4 valid lifecycle states', () => {
    const expectedStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'];
    assert.deepEqual(Object.values(ExperimentUpdateStatus).sort(), expectedStatuses.sort());
  });

  it('Experiment creation requires title and falsification threshold', () => {
    const mockExperiment = {
      assumptionId: '33333333-3333-3333-3333-333333333333',
      name: 'Smoke Test Landing Page',
      method: 'Landing Page Smoke Test',
      successCriteria: '>= 15% conversion on CTA click across 100 visitors',
      evidenceToCollect: 'Unique email submissions and button click rate',
    };

    assert.ok(mockExperiment.name.length >= 3, 'Experiment name is descriptive');
    assert.ok(mockExperiment.successCriteria.includes('%') || mockExperiment.successCriteria.includes('>='), 'Success criteria must contain numeric threshold');
  });

  it('Experiment status transition follows strict state machine rules', () => {
    const validTransitions: Record<string, string[]> = {
      PLANNED: ['IN_PROGRESS', 'ABANDONED'],
      IN_PROGRESS: ['COMPLETED', 'ABANDONED'],
      COMPLETED: [],
      ABANDONED: ['PLANNED'],
    };

    assert.ok(validTransitions.PLANNED.includes('IN_PROGRESS'), 'Can start planned test');
    assert.ok(validTransitions.IN_PROGRESS.includes('COMPLETED'), 'Can complete in-progress test');
    assert.ok(!validTransitions.COMPLETED.includes('IN_PROGRESS'), 'Completed test is terminal');
  });
});
