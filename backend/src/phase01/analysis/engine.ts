import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { LLM, Usage } from '../ai/provider.js';
import { batchProcess } from '../ai/batch.js';
import { ApiError, log } from '../config.js';
import { projectInput, analysisInput } from '../contracts.js';
import * as schemas from './contracts.js';
import { prompts, promptVersion } from './prompts.js';
import { calculateRisk } from './risk.js';
import { requireGrounded, requireNonLeading, evidenceAwareDimensions } from './grounding.js';
import { BlindspotService } from './blindspots.service.js';

const addUsage = (a: Usage, b: Usage): Usage => ({
  promptTokens: a.promptTokens + b.promptTokens, completionTokens: a.completionTokens + b.completionTokens,
  totalTokens: a.totalTokens + b.totalTokens,
});
export class AnalysisEngine {
  constructor(private llm: LLM) {}
  async run(project: z.infer<typeof projectInput>, context: z.infer<typeof analysisInput>) {
    const stages: Array<{ name: string; durationMs: number; tokenUsage: Usage | null }> = [];
    const originalFields = [project.name, project.productDescription, project.problemStatement,
      project.targetAudience, project.proposedSolution, ...project.existingAlternatives,
      context.marketContext ?? '', context.additionalContext ?? ''];
    const originalInput = { project, ...context };
    const generate = async <T>(name: keyof typeof prompts, input: unknown, schema: z.ZodType<T>): Promise<T> => {
      const started = Date.now();
      let tokenUsage: Usage | null = null;
      try {
        const output = await this.llm.generate(prompts[name], input, schema, {
          stage: name, onUsage: usage => {
            const checked = schemas.tokenUsage.parse(usage);
            tokenUsage = tokenUsage ? addUsage(tokenUsage, checked) : checked;
          },
        });
        return schema.parse(output);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'AI_RESPONSE_FAILED', `The ${name} stage returned invalid structured output.`);
      } finally {
        stages.push({ name, durationMs: Date.now() - started, tokenUsage });
        log.info({ stage: name, durationMs: Date.now() - started }, 'Idea analysis stage finished');
      }
    };
    const decomposition = await generate('decomposition', originalInput, schemas.decompositionSchema);
    for (const finding of [decomposition.coreProblem, decomposition.primaryUser, decomposition.proposedSolution,
      decomposition.coreValueProposition, ...decomposition.mainFunctionality, ...decomposition.technicalRequirements]) {
      requireGrounded(finding, originalFields);
    }
    const extracted = await generate('extraction', { originalInput, decomposition }, schemas.extractionSchema);
    if (new Set(extracted.consideredCategories).size !== 10) {
      throw new ApiError(502, 'AI_CATEGORIES_INVALID', 'The assumption extraction stage did not consider all categories.');
    }
    const drafts = extracted.assumptions.map(assumption => {
      requireGrounded(assumption, originalFields);
      requireNonLeading(assumption.suggestedInterviewQuestion);
      return { ...assumption, id: randomUUID() as string };
    });
    if (new Set(drafts.map(row => row.title.toLowerCase())).size !== drafts.length) {
      throw new ApiError(502, 'AI_ASSUMPTIONS_DUPLICATED', 'The AI returned duplicate assumption titles.');
    }
    const risks = await generate('risk', { originalInput, decomposition, assumptions: drafts }, schemas.riskAssessmentSchema);
    const allowed = new Set(drafts.map(row => row.id));
    if (risks.assessments.length !== drafts.length || new Set(risks.assessments.map(row => row.assumptionId)).size !== drafts.length
      || risks.assessments.some(row => !allowed.has(row.assumptionId))) {
      throw new ApiError(502, 'AI_REFERENCE_INVALID', 'Risk assessments must match every supplied assumption exactly once.');
    }
    const assumptions = drafts.map(draft => {
      const risk = risks.assessments.find(row => row.assumptionId === draft.id)!;
      return schemas.scoredAssumption.parse({
        ...draft, impact: risk.impact, uncertainty: risk.uncertainty,
        ...calculateRisk(risk.impact, risk.uncertainty),
        impactRationale: risk.impactRationale, uncertaintyRationale: risk.uncertaintyRationale,
        explanation: draft.whyItMatters, status: 'UNTESTED',
      });
    }).sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
    const stageInput = { originalInput, decomposition, assumptions };
    // These two stages are independent. Use the integration's bounded batch
    // utility; retries belong to the provider so budgets are never multiplied.
    const parallel = await batchProcess(['blindspots', 'questions'] as const,
      async stage => stage === 'blindspots'
        ? { kind: stage, output: await generate(stage, stageInput, schemas.blindspotsSchema) }
        : { kind: stage, output: await generate(stage, stageInput, schemas.questionsSchema) },
      { concurrency: 2, retries: 0 });
    const blindspotOutput = parallel.find(row => row.kind === 'blindspots')!;
    const questionOutput = parallel.find(row => row.kind === 'questions')!;
    const blindspots = new BlindspotService().validate(blindspotOutput.output, assumptions, originalFields);
    const questions = schemas.questionsSchema.parse(questionOutput.output).questions.map(question => {
      if (!allowed.has(question.relatedAssumptionId)) {
        throw new ApiError(502, 'AI_REFERENCE_INVALID', 'An interview question referenced an unknown assumption.');
      }
      requireNonLeading(question.question); requireNonLeading(question.followUpQuestion);
      return { ...question, id: randomUUID() };
    });
    if (new Set(questions.map(row => row.question.toLowerCase())).size !== questions.length) {
      throw new ApiError(502, 'AI_QUESTIONS_DUPLICATED', 'Interview questions must be distinct.');
    }
    const synthesis = await generate('synthesis', { ...stageInput, blindspots, questions }, schemas.synthesisSchema);
    for (const finding of [synthesis.problemAssessment, synthesis.audienceAssessment, synthesis.solutionAssessment]) {
      requireGrounded(finding, originalFields);
    }
    const result = schemas.resultSchema.parse({
      ...synthesis, validationDimensions: evidenceAwareDimensions(synthesis.validationDimensions, synthesis),
      engineVersion: schemas.engineVersion, decomposition, consideredCategories: extracted.consideredCategories,
      problemClarity: synthesis.problemAssessment.statement ?? 'Insufficient problem information.',
      audienceClarity: synthesis.audienceAssessment.statement ?? 'Insufficient audience information.',
      assumptions, blindspots, interviewQuestions: questions,
      competition: { submittedAlternatives: project.existingAlternatives, externalResearchPerformed: false },
      evidenceBackedValidation: { assessed: false, verifiedEvidenceCount: 0,
        explanation: 'This pipeline assesses an idea description and generates hypotheses; it does not verify customer demand.' },
      assessmentType: 'AI_GENERATED_HYPOTHESES_AND_DESCRIPTION_ASSESSMENT',
      disclaimer: 'Scores are uncalibrated prioritization and description assessments, not proven probabilities, market validation or a guarantee of success.',
    });
    const observedUsage = stages.flatMap(stage => stage.tokenUsage ? [stage.tokenUsage] : []);
    const metadata = schemas.providerMetadataSchema.parse({
      provider: this.llm.metadata?.provider ?? 'unknown', model: this.llm.metadata?.model ?? 'unknown',
      promptVersion, stages,
      tokenUsage: observedUsage.length
        ? observedUsage.reduce(addUsage, { promptTokens: 0, completionTokens: 0, totalTokens: 0 }) : null,
    });
    return { result, metadata };
  }
}
