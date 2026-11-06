import { taxonomy } from '../../src/phase01/analysis/contracts.js';

/** Test data only. Never imported by the server. */
export function stageFixture(task: string, data: any): unknown {
  const project = data.originalInput?.project ?? data.project;
  const found = (statement: string) => ({ statement, grounding: 'SUBMITTED', sourceQuote: statement });
  if (task.includes('TASK: IDEA_DECOMPOSITION')) {
    return {
      coreProblem: found(project.problemStatement), primaryUser: found(project.targetAudience),
      proposedSolution: found(project.proposedSolution),
      coreValueProposition: { statement: 'Test fixture value proposition', grounding: 'UNCERTAINTY', sourceQuote: null },
      mainFunctionality: [found(project.proposedSolution)],
      technicalRequirements: [{ statement: null, grounding: 'MISSING', sourceQuote: null }],
      businessAssumptions: ['Interview participants will provide specific examples.'],
    };
  }
  if (task.includes('TASK: ASSUMPTION_EXTRACTION')) return {
    consideredCategories: [...taxonomy.options],
    assumptions: ['PROBLEM', 'CUSTOMER', 'TECHNICAL'].map(category => ({
      title: `${category} fixture assumption`, description: `${category} must be tested for this fixture idea.`,
      category, whyItMatters: 'Failure changes the proposed experiment.',
      evidenceRequired: 'Three recent concrete examples.', validationMethod: 'Non-leading interview.',
      targetAudience: project.targetAudience, suggestedInterviewQuestion: 'Tell me about your most recent attempt.',
      grounding: 'UNCERTAINTY', sourceQuote: null,
    })),
  };
  if (task.includes('TASK: RISK_ASSESSMENT')) return { assessments: data.assumptions.map((row: any) => ({
    assumptionId: row.id, impact: 5, uncertainty: 4,
    impactRationale: 'Failure undermines this proposed workflow.', uncertaintyRationale: 'No observed customer evidence was supplied.',
  })) };
  if (task.includes('TASK: BLINDSPOT_DETECTION')) return { blindspots: [{
    title: 'Unproven replacement of the submitted workaround',
    explanation: `The proposed workflow for ${project.targetAudience} has not been tested against the existing workaround.`,
    severity: 'HIGH', relatedAssumptionId: data.assumptions[0].id,
    whyOverlooked: 'The submitted description focuses on the solution.',
    suggestedAction: 'Observe a recent attempt using the current workaround.',
    evidenceRequired: 'A concrete past example and its cost.',
    grounding: 'UNCERTAINTY', sourceQuote: null,
  }] };
  if (task.includes('TASK: INTERVIEW_QUESTIONS')) return {
    questions: Array.from({ length: 8 }, (_, index) => ({
      question: `Describe the most recent ${['problem incident', 'workaround', 'purchase', 'tool switch',
        'failed attempt', 'time-consuming task', 'alternative evaluation', 'interview'][index]} in this workflow.`,
      relatedAssumptionId: data.assumptions[index % data.assumptions.length].id,
      purpose: 'Investigate real past behavior.', evidenceToLookFor: 'Concrete actions, costs and artifacts.',
      followUpQuestion: 'What happened next?',
    })),
  };
  if (task.includes('TASK: OVERALL_SYNTHESIS')) {
    const dimension = { score: 70, support: 'DESCRIPTION_ONLY',
      rationale: 'Description-only assessment.', evidenceNeeded: 'Concrete examples and a validation experiment.' };
    return {
      problemAssessment: found(project.problemStatement), audienceAssessment: found(project.targetAudience),
      solutionAssessment: found(project.proposedSolution),
      validationDimensions: {
        problemClarity: dimension, audienceSpecificity: dimension, solutionClarity: dimension,
        evidenceOfDemand: { ...dimension, score: 99 }, differentiation: dimension,
        technicalFeasibility: { ...dimension, score: null, support: 'UNASSESSED' }, validationReadiness: dimension,
      },
      overallSummary: 'This test fixture is a set of hypotheses, not validated demand.',
      strengths: ['A specific workaround is described.'], missingInformation: ['Actual costs and observed behavior.'],
      productRisks: ['The workflow may not replace current behavior.'],
      marketAndDemandUncertainties: ['No verified demand evidence.'],
      technicalFeasibilityConcerns: ['No measured implementation prototype.'],
      competitiveUncertainties: ['Submitted alternatives have not been externally researched.'],
      nextSteps: ['Interview people about their most recent attempt.'],
    };
  }
  throw new Error('Unknown test stage');
}
