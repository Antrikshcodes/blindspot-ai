import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../db/client.js';
import type { LLM } from '../ai/provider.js';
import * as t from '../db/schema.js';
import * as c from '../contracts.js';
import { ApiError, config } from '../config.js';

export class ValidationService {
  constructor(private db: Database, private llm: LLM) {}
  async project(id: string) {
    const [project] = await this.db.select().from(t.projects).where(eq(t.projects.id, id));
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    return project;
  }
  async analysis(id: string) {
    const [analysis] = await this.db.select().from(t.analyses).where(eq(t.analyses.id, id));
    if (!analysis) throw new ApiError(404, 'NOT_FOUND', 'Analysis not found.');
    const assumptions = await this.db.select().from(t.assumptions).where(eq(t.assumptions.analysisId, id))
      .orderBy(desc(t.assumptions.riskScore), t.assumptions.id);
    return { ...analysis, assumptions };
  }
  async latest(projectId: string) {
    await this.project(projectId);
    const [analysis] = await this.db.select().from(t.analyses).where(eq(t.analyses.projectId, projectId))
      .orderBy(desc(t.analyses.createdAt), desc(t.analyses.id)).limit(1);
    if (!analysis) throw new ApiError(404, 'ANALYSIS_NOT_FOUND', 'Analyze the project first.');
    return this.analysis(analysis.id);
  }
  async analyze(projectId: string, input: z.infer<typeof c.analysisInput>) {
    const project = await this.project(projectId);
    const output = c.analysisOutput.parse(await this.llm.generate(
      'Identify risky assumptions, not conclusions. Assess problem and audience clarity. Cover problem, customer, solution and monetization risks. Score impact and uncertainty independently 1-5. Specify measurable evidence required and a non-leading validation method.',
      { project, marketContext: input.marketContext ?? null }, c.analysisOutput,
    ));
    const analysisId = await this.db.transaction(async tx => {
      const [analysis] = await tx.insert(t.analyses).values({
        projectId, projectSnapshot: project, marketContext: input.marketContext ?? null,
        result: output, model: `${config.AI_PROVIDER}:${config.AI_MODEL}`,
      }).returning();
      await tx.insert(t.assumptions).values(output.assumptions.map(assumption => {
        const riskScore = assumption.impact * assumption.uncertainty;
        return { ...assumption, analysisId: analysis.id, riskScore,
          riskLevel: riskScore >= 16 ? 'HIGH' : riskScore >= 8 ? 'MEDIUM' : 'LOW',
          status: 'UNTESTED' as const };
      }));
      return analysis.id;
    });
    return this.analysis(analysisId);
  }
  async assumption(id: string) {
    const [row] = await this.db.select({ assumption: t.assumptions, projectId: t.analyses.projectId })
      .from(t.assumptions).innerJoin(t.analyses, eq(t.assumptions.analysisId, t.analyses.id))
      .where(eq(t.assumptions.id, id));
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Assumption not found.');
    return row;
  }
  async requireProjectAssumptions(projectId: string, ids: string[]) {
    for (const id of new Set(ids)) {
      if ((await this.assumption(id)).projectId !== projectId) {
        throw new ApiError(400, 'CROSS_PROJECT_REFERENCE', 'Assumption does not belong to this project.');
      }
    }
  }
  async updateAssumption(id: string, input: z.infer<typeof c.assumptionPatch>) {
    await this.assumption(id);
    return this.db.transaction(async tx => {
      // Lock the row so evidence review and the state change are atomic.
      const [current] = await tx.select().from(t.assumptions).where(eq(t.assumptions.id, id)).for('update');
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Assumption not found.');
      const terminal = ['SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'].includes(input.status);
      if (current.status !== input.status) {
        const allowed: Record<string, string[]> = {
          UNTESTED: ['TESTING'], TESTING: ['SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE'],
          SUPPORTED: ['TESTING'], INVALIDATED: ['TESTING'], INCONCLUSIVE: ['TESTING'],
        };
        if (!allowed[current.status].includes(input.status)) {
          throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Start or reopen testing before recording an evidence-based outcome.');
        }
      }
      if (terminal) {
        if (!input.evidenceIds.length) throw new ApiError(400, 'EVIDENCE_REQUIRED', 'Cite reviewed evidence for an outcome.');
        const records = await tx.select().from(t.evidence).where(
          and(inArray(t.evidence.id, [...new Set(input.evidenceIds)]), eq(t.evidence.assumptionId, id)),
        );
        if (records.length !== new Set(input.evidenceIds).size) {
          throw new ApiError(400, 'INVALID_EVIDENCE', 'Evidence must be linked to this assumption.');
        }
        const requiredSentiment = input.status === 'SUPPORTED' ? 'SUPPORTING'
          : input.status === 'INVALIDATED' ? 'INVALIDATING' : null;
        if (requiredSentiment && !records.some(record => record.sentiment === requiredSentiment)) {
          throw new ApiError(400, 'EVIDENCE_MISMATCH', 'The cited evidence does not support this outcome.');
        }
        await tx.insert(t.assumptionEvidence).values(records.map(record => ({
          assumptionId: id, evidenceId: record.id, reviewedStatus: input.status,
        })));
      }
      const [updated] = await tx.update(t.assumptions).set({ status: input.status, updatedAt: new Date() })
        .where(eq(t.assumptions.id, id)).returning();
      return updated;
    });
  }
  async createInterview(projectId: string, input: z.infer<typeof c.interviewInput>) {
    const latest = await this.latest(projectId);
    const output = c.interviewOutput.parse(await this.llm.generate(
      'Generate non-leading interview questions about past behavior and existing workarounds; map every question to a supplied assumption ID.',
      { project: await this.project(projectId), assumptions: latest.assumptions }, c.interviewOutput,
    ));
    const allowed = new Set(latest.assumptions.map(row => row.id));
    if (output.questions.some(question => !allowed.has(question.assumptionId))) {
      throw new ApiError(502, 'AI_REFERENCE_INVALID', 'AI referenced an unknown assumption.');
    }
    const [interview] = await this.db.insert(t.interviews).values({ projectId, ...input, questions: output.questions }).returning();
    return interview;
  }
  async addFeedback(interviewId: string, input: z.infer<typeof c.feedbackInput>) {
    const [interview] = await this.db.select().from(t.interviews).where(eq(t.interviews.id, interviewId));
    if (!interview) throw new ApiError(404, 'NOT_FOUND', 'Interview not found.');
    await this.requireProjectAssumptions(interview.projectId, input.assumptionIds);
    return this.db.transaction(async tx => {
      const [record] = await tx.insert(t.feedback).values({ interviewId, notes: input.notes }).returning();
      if (input.assumptionIds.length) await tx.insert(t.evidence).values([...new Set(input.assumptionIds)].map(assumptionId => ({
        feedbackId: record.id, assumptionId, quote: input.notes, sentiment: 'NEUTRAL' as const,
        reasoning: 'Manually associated feedback; no support/invalidation inferred.', origin: 'HUMAN_MAPPING',
      })));
      return record;
    });
  }
  async analyzeFeedback(projectId: string) {
    const project = await this.project(projectId);
    const feedback = await this.db.select({ id: t.feedback.id, notes: t.feedback.notes }).from(t.feedback)
      .innerJoin(t.interviews, eq(t.feedback.interviewId, t.interviews.id))
      .where(eq(t.interviews.projectId, projectId)).orderBy(desc(t.feedback.createdAt)).limit(51);
    if (!feedback.length) throw new ApiError(400, 'NO_FEEDBACK', 'Add real interview feedback first.');
    if (feedback.length > 50 || feedback.reduce((sum, row) => sum + row.notes.length, 0) > 100000) {
      throw new ApiError(413, 'FEEDBACK_ANALYSIS_LIMIT', 'This phase supports up to 50 notes and 100,000 characters per project analysis.');
    }
    const assumptions = (await this.latest(projectId)).assumptions;
    const output = c.feedbackOutput.parse(await this.llm.generate(
      'Analyze real notes. Link verbatim quotes to supplied assumptions, identify themes, contradictions and evidence gaps. Flag unsupported conclusions. All findings remain suggestions requiring human review.',
      { project, assumptions, feedback }, c.feedbackOutput,
    ));
    const notes = new Map(feedback.map(row => [row.id, row.notes]));
    const assumptionIds = new Set(assumptions.map(row => row.id));
    const quoteValid = (id: string, quote: string) => notes.get(id)?.includes(quote) === true;
    if (output.evidence.some(row => !assumptionIds.has(row.assumptionId) || !quoteValid(row.feedbackId, row.quote))
      || output.contradictions.some(row => row.feedbackAId === row.feedbackBId
        || !quoteValid(row.feedbackAId, row.quoteA) || !quoteValid(row.feedbackBId, row.quoteB))) {
      throw new ApiError(502, 'AI_EVIDENCE_INVALID', 'AI cited missing feedback, invented quotes or unknown assumptions; nothing saved.');
    }
    return this.db.transaction(async tx => {
      if (output.evidence.length) await tx.insert(t.evidence).values(output.evidence.map(row => ({
        ...row, origin: 'AI_SUGGESTED_REVIEW_REQUIRED',
      }))).onConflictDoNothing();
      const [summary] = await tx.insert(t.feedbackAnalyses).values({ projectId, result: output }).returning();
      const records = await tx.select().from(t.evidence).where(inArray(t.evidence.assumptionId, [...assumptionIds]));
      return { ...summary, evidenceRecords: records, reviewRequired: true, statusesAutomaticallyChanged: false };
    });
  }
  async createExperiment(projectId: string, input: z.infer<typeof c.experimentInput> | { assumptionId: string }) {
    await this.project(projectId);
    await this.requireProjectAssumptions(projectId, [input.assumptionId]);
    let content: z.infer<typeof c.experimentOutput>;
    if ('name' in input) content = c.experimentOutput.parse({
      name: input.name, explanation: input.explanation, method: input.method,
      evidenceToCollect: input.evidenceToCollect, successCriteria: input.successCriteria,
    });
    else content = c.experimentOutput.parse(await this.llm.generate(
      'Suggest one small measurable experiment, explain the rationale, evidence to collect and explicit success criteria. Do not invent results.',
      await this.assumption(input.assumptionId), c.experimentOutput,
    ));
    const [experiment] = await this.db.insert(t.experiments).values({
      projectId, assumptionId: input.assumptionId, ...content,
    }).returning();
    return experiment;
  }
  async updateExperiment(id: string, input: z.infer<typeof c.experimentPatch>) {
    return this.db.transaction(async tx => {
      const [current] = await tx.select().from(t.experiments).where(eq(t.experiments.id, id)).for('update');
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Experiment not found.');
      const allowed: Record<string, string[]> = {
        PLANNED: ['IN_PROGRESS', 'ABANDONED'], IN_PROGRESS: ['COMPLETED', 'ABANDONED'],
        COMPLETED: [], ABANDONED: [],
      };
      if (current.status !== input.status && !allowed[current.status].includes(input.status)) {
        throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Experiment status transition is not allowed.');
      }
      if (input.status === 'COMPLETED' && !input.observedResult && !current.observedResult) {
        throw new ApiError(400, 'RESULT_REQUIRED', 'Record an observed result before completing an experiment.');
      }
      const [experiment] = await tx.update(t.experiments).set({ ...input, updatedAt: new Date() })
        .where(eq(t.experiments.id, id)).returning();
      return experiment;
    });
  }
}
