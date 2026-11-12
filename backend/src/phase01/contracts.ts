import { z } from 'zod';

export const text = (max = 2000) => z.string().trim().min(1).max(max);
export const id = z.string().uuid();
// Keep legacy values readable while supporting the complete Phase 02 taxonomy.
export const category = z.enum([
  'PROBLEM', 'CUSTOMER', 'SOLUTION', 'MONETIZATION', 'DEMAND', 'BEHAVIOUR',
  'WILLINGNESS_TO_PAY', 'TECHNICAL', 'DISTRIBUTION', 'BUSINESS_MODEL', 'COMPETITIVE', 'OPERATIONAL',
]);
export const assumptionStatus = z.enum(['UNTESTED', 'TESTING', 'SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE']);
export const resourceCategory = z.enum([
  'GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION', 'OPEN_SOURCE_TOOL', 'LEARNING_RESOURCE',
]);
export const projectInput = z.object({
  name: text(100), productDescription: text(4000),
  problemStatement: text(4000).min(20), targetAudience: text(1000).min(5),
  proposedSolution: text(4000), existingAlternatives: z.array(text(300)).max(20).default([]),
}).strict();
// Zod 4 applies nested defaults through .partial(); omit the create-only default
// so an unrelated edit cannot silently erase existing alternatives.
export const projectPatch = projectInput.omit({ existingAlternatives: true }).partial().extend({
  existingAlternatives: z.array(text(300)).max(20).optional(),
}).strict().refine(value => Object.keys(value).length > 0);
export const analysisInput = z.object({
  marketContext: text(4000).optional(), additionalContext: text(6000).optional(),
}).strict();
export const assumptionDraft = z.object({
  description: text(), category,
  impact: z.number().int().min(1).max(5), uncertainty: z.number().int().min(1).max(5),
  explanation: text(), evidenceRequired: text(), validationMethod: text(),
}).strict();
export const analysisOutput = z.object({
  problemClarity: text(), audienceClarity: text(),
  assumptions: z.array(assumptionDraft).min(3).max(15),
  nextSteps: z.array(text(500)).min(1).max(8),
}).strict();
export const interviewOutput = z.object({
  questions: z.array(z.object({
    assumptionId: id, question: text(500), listenFor: text(1000),
  }).strict()).min(1).max(20),
}).strict();
export const interviewInput = z.object({ participant: text(150) }).strict();
export const feedbackInput = z.object({
  notes: text(30000).min(10), assumptionIds: z.array(id).max(30).default([]),
}).strict();
export const feedbackOutput = z.object({
  themes: z.array(text(500)).max(15),
  evidence: z.array(z.object({
    feedbackId: id, assumptionId: id, quote: text(2000),
    sentiment: z.enum(['SUPPORTING', 'INVALIDATING', 'NEUTRAL']), reasoning: text(),
  }).strict()).max(40),
  contradictions: z.array(z.object({
    feedbackAId: id, feedbackBId: id, quoteA: text(2000), quoteB: text(2000),
    explanation: text(),
  }).strict()).max(15),
  evidenceGaps: z.array(text(1000)).max(20),
  unsupportedConclusions: z.array(text(1000)).max(20),
}).strict();
export const assumptionPatch = z.object({
  status: assumptionStatus, evidenceIds: z.array(id).max(30).default([]),
}).strict();
export const experimentInput = z.object({
  assumptionId: id, name: text(200), explanation: text(),
  method: text(), evidenceToCollect: text(), successCriteria: text(),
}).strict();
export const experimentOutput = experimentInput.omit({ assumptionId: true });
export const experimentPatch = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']),
  observedResult: text(4000).optional(),
}).strict();
export const searchInput = z.object({
  query: text(150).optional(), languages: z.array(text(40)).max(5).default([]),
  categories: z.array(resourceCategory).min(1).max(7)
    .default(['GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION']),
  explain: z.boolean().default(true),
  providers: z.array(z.enum(['github', 'huggingface', 'huggingface_models', 'huggingface_datasets',
    'kaggle', 'uci', 'apis_guru', 'technical'])).min(1).max(8).optional(),
  topics: z.array(text(40)).max(5).default([]),
  tasks: z.array(text(60)).max(5).default([]),
  includeArchived: z.boolean().default(false),
  page: z.number().int().min(1).max(10000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  minRelevance: z.number().min(0).max(100).default(0),
  sort: z.enum(['relevance', 'lastUpdated']).default('relevance'),
}).strict();
export const explanationOutput = z.object({
  recommendedUseCase: text(), explanation: text(),
  integrationDifficulty: z.enum(['EASY', 'MODERATE', 'ADVANCED', 'UNKNOWN']),
  limitations: z.array(text(500)).max(10),
  alternativeResourceIds: z.array(id).max(5),
}).strict();
export const requirementsOutput = z.object({
  keywords: z.array(text(60)).min(1).max(8),
  requirements: z.array(text(200)).min(1).max(12),
}).strict();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export const resourceQuery = pagination.extend({
  category: resourceCategory.optional(), saved: z.enum(['true', 'false']).optional(),
  provider: z.string().regex(/^[a-z_]{1,50}$/).optional(),
  minRelevance: z.coerce.number().min(0).max(100).default(0),
  sort: z.enum(['relevance', 'lastUpdated']).default('relevance'),
});
export const notificationType = z.enum([
  'ANALYSIS_COMPLETED',
  'FEEDBACK_RECEIVED',
  'CONTRADICTION_DETECTED',
  'EXPERIMENT_UPDATE',
  'RESOURCE_RECOMMENDATION',
  'PROJECT_ACTIVITY',
  'SYSTEM',
]);
export const notificationQuery = pagination.extend({
  unreadOnly: z.enum(['true', 'false']).optional(),
});
export const userPreferencesInput = z.object({
  notificationPreferences: z.object({
    email: z.object({
      analysisCompleted: z.boolean(),
      feedbackReceived: z.boolean(),
      contradictions: z.boolean(),
      experimentUpdates: z.boolean(),
      resourceAlerts: z.boolean(),
      productAnnouncements: z.boolean(),
    }).strict(),
    inApp: z.object({
      analysisCompleted: z.boolean(),
      feedbackReceived: z.boolean(),
      contradictions: z.boolean(),
      experimentUpdates: z.boolean(),
      resourceAlerts: z.boolean(),
      productAnnouncements: z.boolean(),
    }).strict(),
  }).strict(),
  appPreferences: z.object({
    theme: z.enum(['light', 'system']),
    defaultLandingPage: z.enum(['/dashboard', '/projects']),
    compactDensity: z.boolean(),
  }).strict(),
}).strict();
export const userProfilePatch = z.object({
  displayName: z.string().trim().min(1).max(100).nullable(),
}).strict().refine(value => Object.keys(value).length > 0);
export const defaultUserPreferences = {
  notificationPreferences: {
    email: {
      analysisCompleted: true,
      feedbackReceived: true,
      contradictions: true,
      experimentUpdates: false,
      resourceAlerts: false,
      productAnnouncements: false,
    },
    inApp: {
      analysisCompleted: true,
      feedbackReceived: true,
      contradictions: true,
      experimentUpdates: true,
      resourceAlerts: true,
      productAnnouncements: true,
    },
  },
  appPreferences: {
    theme: 'light' as const,
    defaultLandingPage: '/dashboard' as const,
    compactDensity: false,
  },
};
export type AnalysisOutput = z.infer<typeof analysisOutput>;
export type FeedbackOutput = z.infer<typeof feedbackOutput>;
export type NotificationType = z.infer<typeof notificationType>;
export type UserPreferencesInput = z.infer<typeof userPreferencesInput>;
