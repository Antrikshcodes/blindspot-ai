import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { Database } from '../../src/phase01/db/client.js';
import * as schema from '../../src/phase01/db/schema.js';
import type { LLM } from '../../src/phase01/ai/provider.js';
import type { Resource } from '../../src/phase01/resource-intelligence/types.js';
import { unknownSignals } from '../../src/phase01/resource-intelligence/types.js';

export const projectInput = {
  name: 'Test fixture project', productDescription: 'A test-only idea validation fixture.',
  problemStatement: 'Students struggle to validate which recurring problem deserves attention.',
  targetAudience: 'Student founders', proposedSolution: 'Structured interviews and evidence mapping.',
  existingAlternatives: ['Spreadsheets'],
};
export const analysisFixture = {
  problemClarity: 'Needs interviews.', audienceClarity: 'Needs a narrower segment.',
  assumptions: ['PROBLEM', 'CUSTOMER', 'SOLUTION'].map(category => ({
    description: `${category} fixture assumption`, category,
    impact: 5, uncertainty: 4, explanation: 'Unproven hypothesis.',
    evidenceRequired: 'Three recent concrete examples.', validationMethod: 'Non-leading interview.',
  })),
  nextSteps: ['Interview people about their most recent attempt.'],
};
export class FixtureLLM implements LLM {
  calls: Array<{ task: string; input: any }> = [];
  async generate<T>(task: string, input: unknown, outputSchema: z.ZodType<T>): Promise<T> {
    this.calls.push({ task, input });
    if (task.startsWith('Identify risky')) return outputSchema.parse(analysisFixture);
    if (task.startsWith('Generate non-leading')) {
      const data = input as { assumptions: Array<{ id: string }> };
      return outputSchema.parse({ questions: [{ assumptionId: data.assumptions[0].id,
        question: 'Tell me about the last time you tested an idea.', listenFor: 'Past actions.' }] });
    }
    if (task.startsWith('Analyze real notes')) {
      const data = input as { feedback: Array<{ id: string; notes: string }>; assumptions: Array<{ id: string }> };
      return outputSchema.parse({
        themes: ['Recurring manual work'], evidence: [{
          feedbackId: data.feedback[0].id, assumptionId: data.assumptions[0].id,
          quote: data.feedback[0].notes, sentiment: 'SUPPORTING', reasoning: 'A reported past action, not proof of a market.',
        }], contradictions: [], evidenceGaps: ['Sample is too small.'], unsupportedConclusions: ['Do not infer purchase intent.'],
      });
    }
    if (task.startsWith('Extract concise')) return outputSchema.parse({
      keywords: ['validation', 'interview'], requirements: ['Collect interview evidence'],
    });
    if (task.startsWith('Explain only')) {
      const data = input as { retrievedResources: Array<{ id: string }> };
      return outputSchema.parse({ explanations: data.retrievedResources.map(row => ({
        resourceId: row.id, recommendedUseCase: 'Prototype an interview experiment.',
        explanation: 'The retrieved metadata mentions validation.', integrationDifficulty: 'UNKNOWN',
        limitations: ['Inspect source and license yourself.'], alternativeResourceIds: [],
      })) });
    }
    return outputSchema.parse({ name: 'Small interview experiment', explanation: 'Observe real behavior.',
      method: 'Interview three people.', evidenceToCollect: 'Verbatim examples.', successCriteria: 'Three concrete examples.' });
  }
}
export async function isolatedDatabase() {
  const client = new PGlite();
  const journal = JSON.parse(readFileSync('src/phase01/db/migrations/meta/_journal.json', 'utf8'));
  for (const entry of journal.entries) {
    const sql = readFileSync(`src/phase01/db/migrations/${entry.tag}.sql`, 'utf8');
    await client.exec(sql);
  }
  // Both adapters execute the same PostgreSQL SQL/API surface. Only this test seam
  // bridges adapter types; production always uses node-postgres.
  return { client, db: drizzle(client, { schema }) as unknown as Database };
}
export const resourceFixture = (overrides: Partial<Resource> = {}): Resource => ({
  category: 'GITHUB_REPOSITORY', provider: 'github', externalId: 'test-fixture-id',
  name: 'validation-interview-fixture', description: 'Validation interview fixture; never inserted outside tests.',
  url: 'https://github.com/example/fixture', license: null, language: 'TypeScript', tags: ['validation'],
  sourceUpdatedAt: null, retrievedAt: new Date('2026-11-06T00:00:00Z'),
  qualitySignals: unknownSignals(), sourceMetadata: { fixture: true }, ...overrides,
});
