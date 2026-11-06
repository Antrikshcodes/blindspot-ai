import { ApiError } from '../config.js';
import type { z } from 'zod';
import { dimensionsSchema, finding } from './contracts.js';

export function requireGrounded(
  value: { sourceQuote: string | null; grounding: string }, originalFields: string[],
) {
  if (value.grounding === 'SUBMITTED' && !value.sourceQuote) {
    throw new ApiError(502, 'AI_GROUNDING_INVALID', 'A submitted-input finding was missing its source quote.');
  }
  if (value.sourceQuote && !originalFields.some(field => field.includes(value.sourceQuote!))) {
    throw new ApiError(502, 'AI_GROUNDING_INVALID', 'AI cited text that was not in the submitted idea.');
  }
  if (value.grounding === 'MISSING' && value.sourceQuote) {
    throw new ApiError(502, 'AI_GROUNDING_INVALID', 'Missing information cannot have a fabricated source quote.');
  }
}
export function requireNonLeading(question: string) {
  if (/\b(do you like|would you (?:buy|pay|use)|how much would you pay|don'?t you think|wouldn'?t you agree|isn'?t it)\b/i.test(question)) {
    throw new ApiError(502, 'AI_QUESTION_LEADING', 'AI generated a leading or hypothetical endorsement question.');
  }
}
export function evidenceAwareDimensions(
  dimensions: z.infer<typeof dimensionsSchema>,
  assessments: { problemAssessment: z.infer<typeof finding>; audienceAssessment: z.infer<typeof finding>;
    solutionAssessment: z.infer<typeof finding> },
) {
  const result = structuredClone(dimensions);
  // Never let persuasive wording or self-reported claims become a demand score.
  result.evidenceOfDemand = {
    score: null, support: 'INSUFFICIENT_EVIDENCE',
    rationale: 'Only an idea description was supplied; no independently verified demand evidence was assessed.',
    evidenceNeeded: 'Real customer behavior, credible spending/workaround evidence and explicit validation experiments.',
  };
  for (const key of Object.keys(result) as Array<keyof typeof result>) {
    if (result[key].support !== 'DESCRIPTION_ONLY') result[key].score = null;
    if (result[key].score === null && result[key].support === 'DESCRIPTION_ONLY') {
      result[key].support = 'UNASSESSED';
    }
  }
  for (const [key, assessment] of [
    ['problemClarity', assessments.problemAssessment],
    ['audienceSpecificity', assessments.audienceAssessment],
    ['solutionClarity', assessments.solutionAssessment],
  ] as const) {
    if (assessment.grounding === 'MISSING' || assessment.statement === null) {
      result[key].score = null; result[key].support = 'UNASSESSED';
    }
  }
  return dimensionsSchema.parse(result);
}
