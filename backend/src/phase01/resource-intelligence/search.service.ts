import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../config.js';
import type { Database } from '../db/client.js';
import * as tables from '../db/schema.js';
import type { LLM } from '../ai/provider.js';
import { explanationOutput, requirementsOutput, searchInput } from '../contracts.js';
import type { Provider, Resource } from './types.js';
import { deduplicate } from './normalize.js';
import { rankResource } from './ranking.js';
import { ResourceCache } from './cache.js';

type ProviderStatus = { provider: string; status: 'OK' | 'FAILED' | 'DISABLED'; count: number; error?: string };
type Retrieval = { values: Resource[]; statuses: ProviderStatus[] };

export class ResourceSearchService {
  private cache = new ResourceCache<Retrieval>();
  constructor(private db: Database, private llm: LLM, private providers: Provider[]) {}

  async search(project: typeof tables.projects.$inferSelect, input: z.infer<typeof searchInput>) {
    let query = input.query;
    let requirements = query ? [query] : [];
    if (!query) {
      const [analysis] = await this.db.select().from(tables.analyses)
        .where(eq(tables.analyses.projectId, project.id)).orderBy(desc(tables.analyses.createdAt)).limit(1);
      const extracted = requirementsOutput.parse(await this.llm.generate(
        'Extract concise technical requirements and 2-4 public search keywords. Do not include confidential names, customer quotes or full idea text in search keywords.',
        { project, analysis: analysis?.result ?? null }, requirementsOutput,
      ));
      query = extracted.keywords.slice(0, 3).join(' ').slice(0, 150);
      requirements = extracted.requirements;
    }
    const wanted = this.providers.filter(provider => provider.categories.some(category => input.categories.includes(category)));
    const key = JSON.stringify([query.toLowerCase(), [...input.categories].sort(), [...input.languages].sort(),
      wanted.map(provider => [provider.name, provider.enabled])]);
    const cached = this.cache.get(key);
    let retrieval = cached;
    if (!retrieval) {
      const results = await Promise.all(wanted.map(async provider => {
        if (!provider.enabled) return { values: [] as Resource[], status: { provider: provider.name, status: 'DISABLED' as const, count: 0 } };
        try {
          const values = deduplicate(await provider.search(query!, input.languages))
            .filter(resource => input.categories.includes(resource.category));
          return { values, status: { provider: provider.name, status: 'OK' as const, count: values.length } };
        } catch {
          return { values: [] as Resource[], status: { provider: provider.name, status: 'FAILED' as const, count: 0,
            error: 'Provider unavailable or response invalid; no fallback resources were invented.' } };
        }
      }));
      retrieval = { values: deduplicate(results.flatMap(result => result.values)), statuses: results.map(result => result.status) };
      // Do not hide provider failures behind a long-lived "successful empty" cache.
      if (!retrieval.statuses.some(status => status.status === 'FAILED')) this.cache.set(key, retrieval);
    }
    if (!retrieval.statuses.some(status => status.status === 'OK')) {
      throw new ApiError(503, 'RESOURCE_PROVIDERS_UNAVAILABLE', 'No enabled resource provider completed successfully.');
    }
    const ranked = retrieval.values.map(resource => ({
      resource, ...rankResource(resource, query!, input.languages),
    })).filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.rankScore - a.rankScore || a.resource.url.localeCompare(b.resource.url)).slice(0, 8);
    // Candidate IDs are server-created. AI cannot return URLs, source metadata or new resources.
    const candidates = ranked.map(item => ({ candidateId: randomUUID(), ...item }));
    const explanationSchema = z.object({
      explanations: z.array(explanationOutput.extend({ resourceId: z.string().uuid() }).strict()).max(8),
    }).strict();
    let explanations: Array<z.infer<typeof explanationOutput> & { resourceId: string }> = [];
    let explanationStatus = input.explain ? 'NO_RESOURCES' : 'NOT_REQUESTED';
    if (input.explain && candidates.length) {
      try {
        const output = explanationSchema.parse(await this.llm.generate(
          'Explain only supplied candidate IDs using retrieved metadata. Return exactly one explanation per candidate. Do not invent capabilities or make security/license compatibility assurances. alternativeResourceIds must reference other supplied candidates.',
          { project, requirements, retrievedResources: candidates.map(item => ({
            id: item.candidateId, metadata: item.resource,
          })) }, explanationSchema,
        ));
        const allowed = new Set<string>(candidates.map(item => item.candidateId));
        if (output.explanations.length !== candidates.length
          || new Set(output.explanations.map(item => item.resourceId)).size !== candidates.length
          || output.explanations.some(item => !allowed.has(item.resourceId)
            || item.alternativeResourceIds.some(id => !allowed.has(id)))
          || /https?:\/\/|www\./i.test(JSON.stringify(output))) {
          throw new Error('Unretrieved resource reference');
        }
        explanations = output.explanations;
        explanationStatus = 'GENERATED';
      } catch { explanationStatus = 'UNAVAILABLE'; }
    }
    return this.db.transaction(async tx => {
      const [search] = await tx.insert(tables.searches).values({
        projectId: project.id, query: query!, requirements, providerStatuses: retrieval!.statuses,
      }).returning();
      const resourceIds = new Map<string, string>();
      for (const item of candidates) {
        const [resource] = await tx.insert(tables.resources).values(item.resource)
          .onConflictDoUpdate({ target: tables.resources.url, set: {
            ...item.resource,
          } }).returning();
        resourceIds.set(item.candidateId, resource.id);
      }
      const items = [];
      for (const item of candidates) {
        const explanation = explanations.find(value => value.resourceId === item.candidateId);
        const cleanExplanation = explanation ? {
          ...explanation,
          resourceId: resourceIds.get(item.candidateId)!,
          alternativeResourceIds: explanation.alternativeResourceIds.map(id => resourceIds.get(id)!),
          generatedBy: 'AI', reviewRequired: true,
        } : null;
        const [recommendation] = await tx.insert(tables.recommendations).values({
          searchId: search.id, resourceId: resourceIds.get(item.candidateId)!,
          relevanceScore: item.relevanceScore, rankScore: item.rankScore,
          qualityScore: item.qualityScore, ranking: item.ranking,
          sourceSnapshot: item.resource, explanation: cleanExplanation,
        }).returning();
        items.push({ ...recommendation, resource: { id: recommendation.resourceId, ...item.resource } });
      }
      return { searchId: search.id, projectId: project.id, query, requirements,
        cached: Boolean(cached), providerStatuses: retrieval!.statuses, explanationStatus, items };
    });
  }
  async list(projectId: string, query: { page: number; limit: number; category?: string; saved?: string }) {
    // Latest search is scoped by project; saved resources remain accessible separately.
    if (query.saved === 'true') {
      return this.db.select({ resource: tables.resources, saved: tables.saves }).from(tables.saves)
        .innerJoin(tables.resources, eq(tables.saves.resourceId, tables.resources.id))
        .where(and(eq(tables.saves.projectId, projectId),
          query.category ? eq(tables.resources.category, query.category as Resource['category']) : undefined))
        .orderBy(desc(tables.saves.createdAt), desc(tables.saves.id))
        .limit(query.limit).offset((query.page - 1) * query.limit);
    }
    const [search] = await this.db.select().from(tables.searches).where(eq(tables.searches.projectId, projectId))
      .orderBy(desc(tables.searches.createdAt), desc(tables.searches.id)).limit(1);
    if (!search) return [];
    return this.db.select({ recommendation: tables.recommendations, resource: tables.resources, saved: tables.saves })
      .from(tables.recommendations)
      .innerJoin(tables.resources, eq(tables.recommendations.resourceId, tables.resources.id))
      .leftJoin(tables.saves, and(eq(tables.saves.resourceId, tables.resources.id), eq(tables.saves.projectId, projectId)))
      .where(and(eq(tables.recommendations.searchId, search.id),
        query.category ? eq(tables.resources.category, query.category as Resource['category']) : undefined,
        query.saved === 'false' ? isNull(tables.saves.id) : undefined))
      .orderBy(desc(tables.recommendations.rankScore), tables.resources.id)
      .limit(query.limit).offset((query.page - 1) * query.limit);
  }
}
