import { sql } from 'drizzle-orm';
import { pgSchema, uuid, text, timestamp, jsonb, integer, boolean, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import type { AnalysisOutput, FeedbackOutput } from '../contracts.js';

export const platform = pgSchema('blindspot_phase01');
const key = () => uuid('id').primaryKey().defaultRandom();
const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
export const statusEnum = platform.enum('assumption_status', ['UNTESTED', 'TESTING', 'SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE']);
export const categoryEnum = platform.enum('assumption_category', ['PROBLEM', 'CUSTOMER', 'SOLUTION', 'MONETIZATION']);
export const resourceEnum = platform.enum('resource_category', [
  'GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION', 'OPEN_SOURCE_TOOL', 'LEARNING_RESOURCE',
]);
export const sentimentEnum = platform.enum('evidence_sentiment', ['SUPPORTING', 'INVALIDATING', 'NEUTRAL']);
export const experimentStatusEnum = platform.enum('experiment_status', ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']);
export const savedStatusEnum = platform.enum('saved_status', ['CONSIDERING', 'TRYING', 'INTEGRATED']);
export const projects = platform.table('projects', {
  id: key(), name: text('name').notNull(), productDescription: text('product_description').notNull(),
  problemStatement: text('problem_statement').notNull(), targetAudience: text('target_audience').notNull(),
  proposedSolution: text('proposed_solution').notNull(),
  existingAlternatives: text('existing_alternatives').array().notNull().default(sql`'{}'::text[]`),
  createdAt: created(), updatedAt: updated(),
}, t => [index('project_created_idx').on(t.createdAt)]);
export const analyses = platform.table('analyses', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  projectSnapshot: jsonb('project_snapshot').notNull(), marketContext: text('market_context'),
  result: jsonb('result').$type<AnalysisOutput>().notNull(), model: text('model').notNull(), createdAt: created(),
}, t => [index('analysis_project_idx').on(t.projectId, t.createdAt)]);
export const assumptions = platform.table('assumptions', {
  id: key(), analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  description: text('description').notNull(), category: categoryEnum('category').notNull(),
  impact: integer('impact').notNull(), uncertainty: integer('uncertainty').notNull(),
  riskScore: integer('risk_score').notNull(), riskLevel: text('risk_level').notNull(),
  explanation: text('explanation').notNull(), evidenceRequired: text('evidence_required').notNull(),
  validationMethod: text('validation_method').notNull(), status: statusEnum('status').notNull().default('UNTESTED'),
  createdAt: created(), updatedAt: updated(),
}, t => [
  index('assumption_analysis_idx').on(t.analysisId),
  check('assumption_scores_valid', sql`${t.impact} between 1 and 5 AND ${t.uncertainty} between 1 and 5 AND ${t.riskScore} = ${t.impact} * ${t.uncertainty}`),
]);
export const interviews = platform.table('interview_sessions', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  participant: text('participant').notNull(),
  questions: jsonb('questions').$type<Array<{ assumptionId: string; question: string; listenFor: string }>>().notNull(),
  createdAt: created(),
}, t => [index('interview_project_idx').on(t.projectId)]);
export const feedback = platform.table('interview_feedback', {
  id: key(), interviewId: uuid('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  notes: text('notes').notNull(), createdAt: created(),
}, t => [index('feedback_interview_idx').on(t.interviewId)]);
export const evidence = platform.table('evidence_records', {
  id: key(), feedbackId: uuid('feedback_id').notNull().references(() => feedback.id, { onDelete: 'cascade' }),
  assumptionId: uuid('assumption_id').notNull().references(() => assumptions.id, { onDelete: 'cascade' }),
  quote: text('quote').notNull(), sentiment: sentimentEnum('sentiment').notNull(),
  reasoning: text('reasoning').notNull(), origin: text('origin').notNull(), createdAt: created(),
}, t => [index('evidence_assumption_idx').on(t.assumptionId), index('evidence_feedback_idx').on(t.feedbackId),
  // Index a fixed-size digest: indexing a whole long/multibyte interview quote
  // exceeds PostgreSQL btree entry limits. This digest is deduplication, not security.
  uniqueIndex('evidence_quote_unique').on(t.feedbackId, t.assumptionId, sql`md5(${t.quote})`, t.sentiment)]);
export const assumptionEvidence = platform.table('assumption_evidence', {
  id: key(), assumptionId: uuid('assumption_id').notNull().references(() => assumptions.id, { onDelete: 'cascade' }),
  evidenceId: uuid('evidence_id').notNull().references(() => evidence.id, { onDelete: 'cascade' }),
  reviewedStatus: statusEnum('reviewed_status').notNull(), createdAt: created(),
}, t => [index('review_assumption_idx').on(t.assumptionId)]);
export const feedbackAnalyses = platform.table('feedback_analyses', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  result: jsonb('result').$type<FeedbackOutput>().notNull(), createdAt: created(),
}, t => [index('feedback_analysis_project_idx').on(t.projectId, t.createdAt)]);
export const experiments = platform.table('experiments', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assumptionId: uuid('assumption_id').notNull().references(() => assumptions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), explanation: text('explanation').notNull(), method: text('method').notNull(),
  evidenceToCollect: text('evidence_to_collect').notNull(), successCriteria: text('success_criteria').notNull(),
  status: experimentStatusEnum('status').notNull().default('PLANNED'), observedResult: text('observed_result'),
  createdAt: created(), updatedAt: updated(),
}, t => [index('experiment_project_idx').on(t.projectId)]);
export const searches = platform.table('resource_searches', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  query: text('query').notNull(), requirements: text('requirements').array().notNull(),
  providerStatuses: jsonb('provider_statuses').notNull(), createdAt: created(),
}, t => [index('resource_search_project_idx').on(t.projectId, t.createdAt)]);
export const resources = platform.table('resources', {
  id: key(), category: resourceEnum('category').notNull(), provider: text('provider').notNull(),
  externalId: text('external_id').notNull(), url: text('url').notNull(), name: text('name').notNull(),
  description: text('description').notNull(), license: text('license'), language: text('language'),
  tags: text('tags').array().notNull(), sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
  qualitySignals: jsonb('quality_signals').notNull(), sourceMetadata: jsonb('source_metadata').notNull(),
}, t => [uniqueIndex('resource_url_unique').on(t.url), index('resource_category_idx').on(t.category)]);
export const recommendations = platform.table('resource_recommendations', {
  id: key(), searchId: uuid('search_id').notNull().references(() => searches.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  relevanceScore: integer('relevance_score').notNull(), rankScore: integer('rank_score').notNull(),
  qualityScore: integer('quality_score').notNull(), ranking: jsonb('ranking').notNull(),
  explanation: jsonb('explanation'), sourceSnapshot: jsonb('source_snapshot').notNull(),
}, t => [uniqueIndex('recommendation_search_unique').on(t.searchId, t.resourceId),
  check('relevance_bounds', sql`${t.relevanceScore} between 0 and 100`)]);
export const saves = platform.table('saved_resources', {
  id: key(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  status: savedStatusEnum('status').notNull().default('CONSIDERING'), createdAt: created(), updatedAt: updated(),
}, t => [uniqueIndex('saved_project_resource_unique').on(t.projectId, t.resourceId)]);
