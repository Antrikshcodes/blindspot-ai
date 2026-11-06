import { z } from 'zod';
import { text, id } from '../contracts.js';

export const engineVersion = '2.0' as const;
export const taxonomy = z.enum([
  'PROBLEM', 'CUSTOMER', 'DEMAND', 'BEHAVIOUR', 'WILLINGNESS_TO_PAY',
  'TECHNICAL', 'DISTRIBUTION', 'BUSINESS_MODEL', 'COMPETITIVE', 'OPERATIONAL',
]);
export const severity = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const grounding = z.enum(['SUBMITTED', 'UNCERTAINTY', 'MISSING']);
export const finding = z.object({
  statement: text().nullable(), grounding, sourceQuote: text(2000).nullable(),
}).strict();
export const decompositionSchema = z.object({
  coreProblem: finding, primaryUser: finding, proposedSolution: finding, coreValueProposition: finding,
  mainFunctionality: z.array(finding).max(8), technicalRequirements: z.array(finding).max(8),
  businessAssumptions: z.array(text(500)).max(10),
}).strict();
export const extractedAssumption = z.object({
  title: text(200), description: text(), category: taxonomy,
  whyItMatters: text(), evidenceRequired: text(), validationMethod: text(),
  targetAudience: text(1000), suggestedInterviewQuestion: text(500),
  grounding: z.enum(['SUBMITTED', 'UNCERTAINTY']), sourceQuote: text(2000).nullable(),
}).strict();
export const extractionSchema = z.object({
  assumptions: z.array(extractedAssumption).min(3).max(15),
  consideredCategories: z.array(taxonomy).length(10),
}).strict();
export const riskAssessmentSchema = z.object({
  assessments: z.array(z.object({
    assumptionId: id, impact: z.number().int().min(1).max(5), uncertainty: z.number().int().min(1).max(5),
    impactRationale: text(), uncertaintyRationale: text(),
  }).strict()).min(3).max(15),
}).strict();
export const blindspotDraft = z.object({
  title: text(200), explanation: text(), severity, relatedAssumptionId: id,
  whyOverlooked: text(), suggestedAction: text(), evidenceRequired: text(),
  grounding: z.enum(['SUBMITTED', 'UNCERTAINTY']), sourceQuote: text(2000).nullable(),
}).strict();
export const blindspotsSchema = z.object({ blindspots: z.array(blindspotDraft).min(1).max(12) }).strict();
export const questionDraft = z.object({
  question: text(500), relatedAssumptionId: id, purpose: text(1000),
  evidenceToLookFor: text(1000), followUpQuestion: text(500),
}).strict();
export const questionsSchema = z.object({ questions: z.array(questionDraft).min(8).max(12) }).strict();
export const dimension = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  support: z.enum(['DESCRIPTION_ONLY', 'INSUFFICIENT_EVIDENCE', 'UNASSESSED']),
  rationale: text(), evidenceNeeded: text(),
}).strict();
export const dimensionsSchema = z.object({
  problemClarity: dimension, audienceSpecificity: dimension, solutionClarity: dimension,
  evidenceOfDemand: dimension, differentiation: dimension, technicalFeasibility: dimension,
  validationReadiness: dimension,
}).strict();
export const synthesisSchema = z.object({
  problemAssessment: finding, audienceAssessment: finding, solutionAssessment: finding,
  validationDimensions: dimensionsSchema,
  overallSummary: text(4000), strengths: z.array(text(500)).max(8),
  missingInformation: z.array(text(1000)).min(1).max(15),
  productRisks: z.array(text(1000)).max(10),
  marketAndDemandUncertainties: z.array(text(1000)).min(1).max(10),
  technicalFeasibilityConcerns: z.array(text(1000)).max(10),
  competitiveUncertainties: z.array(text(1000)).max(10),
  nextSteps: z.array(text(1000)).min(1).max(10),
}).strict();
export const scoredAssumption = extractedAssumption.extend({
  id, impact: z.number().int().min(1).max(5), uncertainty: z.number().int().min(1).max(5),
  riskScore: z.number().int().min(1).max(25), priorityScore: z.number().int().min(1).max(25), riskLevel: severity,
  impactRationale: text(), uncertaintyRationale: text(),
  explanation: text(), status: z.literal('UNTESTED'),
}).strict();
export const resultSchema = synthesisSchema.extend({
  engineVersion: z.literal(engineVersion), decomposition: decompositionSchema,
  problemClarity: text(), audienceClarity: text(),
  assumptions: z.array(scoredAssumption).min(3).max(15),
  blindspots: z.array(blindspotDraft.extend({ id }).strict()).min(1).max(12),
  interviewQuestions: z.array(questionDraft.extend({ id }).strict()).min(8).max(12),
  consideredCategories: z.array(taxonomy).length(10),
  competition: z.object({
    submittedAlternatives: z.array(text(300)).max(20),
    externalResearchPerformed: z.literal(false),
  }).strict(),
  evidenceBackedValidation: z.object({
    assessed: z.literal(false), verifiedEvidenceCount: z.literal(0), explanation: text(),
  }).strict(),
  assessmentType: z.literal('AI_GENERATED_HYPOTHESES_AND_DESCRIPTION_ASSESSMENT'),
  disclaimer: text(),
}).strict();
export const tokenUsage = z.object({
  promptTokens: z.number().int().nonnegative(), completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
}).strict();
export const providerMetadataSchema = z.object({
  provider: text(100), model: text(200), promptVersion: text(100),
  tokenUsage: tokenUsage.nullable(),
  stages: z.array(z.object({
    name: text(100), durationMs: z.number().nonnegative(),
    tokenUsage: tokenUsage.nullable(),
  }).strict()).length(6),
}).strict();
export type DetailedAnalysis = z.infer<typeof resultSchema>;
export type ScoredAssumption = z.infer<typeof scoredAssumption>;
export type Dimensions = z.infer<typeof dimensionsSchema>;
