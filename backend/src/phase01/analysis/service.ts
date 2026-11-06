import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { Database } from '../db/client.js';
import type { LLM } from '../ai/provider.js';
import * as t from '../db/schema.js';
import { ApiError, log } from '../config.js';
import { projectInput, type analysisInput } from '../contracts.js';
import { resultSchema, providerMetadataSchema } from './contracts.js';
import { AnalysisEngine } from './engine.js';

export class IdeaAnalysisService {
  constructor(private db: Database, private llm: LLM) {}
  async analyze(projectId: string, context: z.infer<typeof analysisInput>) {
    const [project] = await this.db.select().from(t.projects).where(eq(t.projects.id, projectId));
    if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    const input = projectInput.parse({
      name: project.name, productDescription: project.productDescription, problemStatement: project.problemStatement,
      targetAudience: project.targetAudience, proposedSolution: project.proposedSolution,
      existingAlternatives: project.existingAlternatives,
    });
    const { result, metadata } = await new AnalysisEngine(this.llm).run(input, context);
    const id = randomUUID();
    // Do expensive AI work before taking a short DB lock. Failed stages save no
    // partial "successful analysis". The project lock serializes version allocation.
    await this.db.transaction(async tx => {
      const [existing] = await tx.select({ id: t.projects.id }).from(t.projects).where(eq(t.projects.id, projectId)).for('update');
      if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Project was removed during analysis.');
      const [previous] = await tx.select({ version: t.analyses.version }).from(t.analyses)
        .where(eq(t.analyses.projectId, projectId)).orderBy(desc(t.analyses.version)).limit(1);
      await tx.insert(t.analyses).values({
        id, projectId, projectSnapshot: project,
        marketContext: context.marketContext ?? null, additionalContext: context.additionalContext ?? null,
        result, version: (previous?.version ?? 0) + 1, engineVersion: result.engineVersion,
        model: `${metadata.provider}:${metadata.model}`, providerMetadata: metadata,
      });
      await tx.insert(t.assumptions).values(result.assumptions.map(row => ({
        id: row.id, analysisId: id, title: row.title, description: row.description,
        category: row.category, impact: row.impact, uncertainty: row.uncertainty, riskScore: row.riskScore,
        riskLevel: row.riskLevel, explanation: row.whyItMatters, evidenceRequired: row.evidenceRequired,
        validationMethod: row.validationMethod, targetAudience: row.targetAudience,
        suggestedInterviewQuestion: row.suggestedInterviewQuestion, status: 'UNTESTED' as const,
        scoreExplanation: { impactRationale: row.impactRationale, uncertaintyRationale: row.uncertaintyRationale,
          formula: 'impact * uncertainty', probability: false },
      })));
    });
    log.info({ analysisId: id, projectId, engineVersion: result.engineVersion,
      totalTokens: metadata.tokenUsage?.totalTokens ?? null }, 'Idea analysis saved');
    return id;
  }
  async artifact(analysisId: string, kind: 'blindspots' | 'interviewQuestions' | 'summary') {
    const [analysis] = await this.db.select().from(t.analyses).where(eq(t.analyses.id, analysisId));
    if (!analysis) throw new ApiError(404, 'NOT_FOUND', 'Analysis not found.');
    const common = { analysisId, projectId: analysis.projectId, version: analysis.version, engineVersion: analysis.engineVersion };
    if (analysis.engineVersion !== '2.0') {
      return { ...common, available: false, ...(kind === 'summary'
        ? { summary: { problemClarity: analysis.result.problemClarity,
          audienceClarity: analysis.result.audienceClarity, nextSteps: analysis.result.nextSteps,
          overallSummary: null, validationDimensions: null } }
        : { items: [] }), reason: 'This historical analysis predates the Phase 02 engine.' };
    }
    const checked = resultSchema.safeParse(analysis.result);
    const metadata = providerMetadataSchema.safeParse(analysis.providerMetadata);
    if (!checked.success || !metadata.success) {
      throw new ApiError(500, 'ANALYSIS_DATA_INVALID', 'Stored analysis failed response validation.');
    }
    if (kind !== 'summary') return { ...common, available: true, items: checked.data[kind] };
    const result = checked.data;
    return { ...common, available: true, summary: {
      overallSummary: result.overallSummary, problemAssessment: result.problemAssessment,
      audienceAssessment: result.audienceAssessment, solutionAssessment: result.solutionAssessment,
      validationDimensions: result.validationDimensions, strengths: result.strengths,
      missingInformation: result.missingInformation, productRisks: result.productRisks,
      marketAndDemandUncertainties: result.marketAndDemandUncertainties,
      technicalFeasibilityConcerns: result.technicalFeasibilityConcerns,
      competitiveUncertainties: result.competitiveUncertainties,
      competition: result.competition, nextSteps: result.nextSteps,
      evidenceBackedValidation: result.evidenceBackedValidation, assessmentType: result.assessmentType,
      disclaimer: result.disclaimer,
    }, providerMetadata: metadata.data };
  }
}
