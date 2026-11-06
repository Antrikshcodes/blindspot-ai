import { and, desc, eq, isNull, gte, inArray, or, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ApiError, config, log } from '../config.js';
import type { Database } from '../db/client.js';
import * as t from '../db/schema.js';
import type { LLM } from '../ai/provider.js';
import { searchInput, resourceQuery, pagination } from '../contracts.js';
import type { Provider, Resource } from './types.js';
import { resourceSchema } from './types.js';
import { rankResource } from './ranking.js';
import { resourceDTO } from './dto.js';
import { ResourceQueryService } from './query.service.js';
import { ResourceRetrievalService, type RetrievalOptions } from './retrieval.service.js';
import { ResourceExplanationService } from './explanation.service.js';

export class ResourceSearchService {
  private retrieval: ResourceRetrievalService;
  private queries: ResourceQueryService;
  private explanations: ResourceExplanationService;
  constructor(private db: Database, llm: LLM, private providers: Provider[]) {
    this.retrieval = new ResourceRetrievalService(providers);
    this.queries = new ResourceQueryService(llm); this.explanations = new ResourceExplanationService(llm);
  }
  async search(project: typeof t.projects.$inferSelect, input: z.infer<typeof searchInput>) {
    const [analysis] = await this.db.select().from(t.analyses).where(eq(t.analyses.projectId, project.id))
      .orderBy(desc(t.analyses.version)).limit(1);
    const wanted = this.providers.filter(provider => provider.categories.some(category => input.categories.includes(category))
      && (!input.providers || input.providers.includes((provider.identity ?? provider.name) as any)
        || input.providers.includes(provider.name as any)));
    // Preserve the existing 503 contract while still recording failed searches below.
    const plan = wanted.length ? await this.queries.generate(project, analysis, input, wanted)
      : { requirements: input.query ? [input.query] : [], tasks: [], queries: [], analysisId: analysis?.id ?? null, promptVersion: 'phase03-query-1' };
    const options: RetrievalOptions = {
      page: 1, limit: config.PROVIDER_PAGE_SIZE, languages: [...input.languages].sort(),
      topics: [...input.topics].sort(), tasks: [...plan.tasks].sort(), includeArchived: input.includeArchived,
    };
    const retrieval = await this.retrieval.retrieve(plan.queries, options, input.categories);
    const query = input.query ?? [...new Set(plan.queries.map(row => row.query))].join(' | ').slice(0, 150);
    const candidates = retrieval.values.map(resource => ({
      resource, ...rankResource(resource, query, input.languages, undefined, Date.now(), plan.tasks),
    })).filter(row => row.relevanceScore > 0 && row.ranking.technicalCompatibility !== 'INCOMPATIBLE')
      .sort((a, b) => b.rankScore - a.rankScore || a.resource.url.localeCompare(b.resource.url))
      .slice(0, config.RESOURCE_RESULT_LIMIT).map(row => ({ candidateId: randomUUID(), ...row }));
    let explanations: Awaited<ReturnType<ResourceExplanationService['explain']>> = [];
    let explanationStatus = input.explain ? 'NO_RESOURCES' : 'NOT_REQUESTED';
    let explanationError: string | null = null;
    if (input.explain && candidates.length) {
      try { explanations = await this.explanations.explain(plan.requirements, candidates, {
        productDescription: project.productDescription, proposedSolution: project.proposedSolution,
      }); explanationStatus = 'GENERATED'; }
      catch (error) {
        explanationStatus = 'UNAVAILABLE';
        explanationError = error instanceof ApiError ? error.code : 'AI_EXPLANATION_OUTPUT_INVALID';
        log.warn({ code: explanationError }, 'Resource explanations unavailable; retrieved facts retained');
      }
    }
    const partial = retrieval.partial || (input.explain && candidates.length > 0 && explanationStatus === 'UNAVAILABLE');
    const result = await this.db.transaction(async tx => {
      // Stable lock order prevents deadlocks and serializes identity-based upserts.
      const registry = [...new Map(wanted.map(provider => [provider.identity ?? provider.name, provider])).entries()]
        .sort(([a], [b]) => a.localeCompare(b));
      for (const [id, provider] of registry) {
        const categories = [...new Set(this.providers.filter(row => (row.identity ?? row.name) === id).flatMap(row => row.categories))];
        await tx.insert(t.resourceProviders).values({ id, displayName: id, categories })
          .onConflictDoUpdate({ target: t.resourceProviders.id, set: { categories } });
      }
      if (registry.length) await tx.select().from(t.resourceProviders)
        .where(inArray(t.resourceProviders.id, registry.map(([id]) => id))).orderBy(t.resourceProviders.id).for('update');
      const [search] = await tx.insert(t.searches).values({
        projectId: project.id, query, requirements: plan.requirements, analysisId: plan.analysisId,
        queryPlan: { ...plan, explanationError }, providerStatuses: retrieval.statuses, partial,
        cached: retrieval.cached, explanationStatus, status: retrieval.available ? 'COMPLETED' : 'FAILED',
      }).returning();
      if (retrieval.diagnostics.length) await tx.insert(t.searchQueries).values(retrieval.diagnostics.map(row => ({
        searchId: search.id, providerId: row.providerId, adapterName: row.provider, query: row.query,
        parameters: row.parameters, status: row.status, count: row.count, durationMs: row.durationMs,
        cached: row.cached, error: row.error ?? null, retryAfterSeconds: row.retryAfterSeconds ?? null,
      })));
      const identities = new Map<string, string>();
      for (const candidate of candidates) {
        const resource = candidate.resource;
        const [existing] = await tx.select().from(t.resources)
          .where(or(eq(t.resources.url, resource.url),
            and(eq(t.resources.provider, resource.provider), eq(t.resources.externalId, resource.externalId))))
          .orderBy(sql`case when ${t.resources.url} = ${resource.url} then 0 else 1 end`, t.resources.id).limit(1);
        let id = existing?.id;
        if (existing) {
          if (resource.retrievedAt >= existing.retrievedAt) {
            await tx.update(t.resources).set(resource).where(eq(t.resources.id, existing.id));
          }
        } else {
          const [created] = await tx.insert(t.resources).values(resource)
            .onConflictDoUpdate({ target: t.resources.url, set: resource }).returning();
          id = created.id;
        }
        identities.set(candidate.candidateId, id!);
      }
      const items = [];
      for (const item of candidates) {
        const explanation = explanations.find(value => value.resourceId === item.candidateId);
        const cleanExplanation = explanation ? {
          ...explanation, resourceId: identities.get(item.candidateId)!,
          alternativeResourceIds: explanation.alternativeResourceIds.map(id => identities.get(id)!),
          generatedBy: 'AI', reviewRequired: true,
        } : null;
        const [recommendation] = await tx.insert(t.recommendations).values({
          searchId: search.id, resourceId: identities.get(item.candidateId)!,
          relevanceScore: item.relevanceScore, rankScore: item.rankScore,
          qualityScore: item.qualityScore, ranking: item.ranking,
          sourceSnapshot: item.resource, explanation: cleanExplanation,
        }).returning();
        items.push({ ...recommendation, resource: resourceDTO({ ...item.resource, id: recommendation.resourceId }) });
      }
      return { searchId: search.id, projectId: project.id, query, requirements: plan.requirements,
        generatedQueries: plan.queries, analysisId: plan.analysisId,
        cached: retrieval.cached, partial, providerStatuses: retrieval.statuses,
        explanationStatus, explanationError, items };
    });
    if (!retrieval.available) throw new ApiError(503, 'RESOURCE_PROVIDERS_UNAVAILABLE',
      `No enabled resource provider completed successfully. Search diagnostics are available in project search history.`);
    const filtered = result.items.filter(row => row.relevanceScore >= input.minRelevance);
    if (input.sort === 'lastUpdated') filtered.sort((a, b) =>
      (b.resource.sourceUpdatedAt?.getTime() ?? 0) - (a.resource.sourceUpdatedAt?.getTime() ?? 0)
      || a.resource.id!.localeCompare(b.resource.id!));
    return { ...result, items: filtered.slice((input.page - 1) * input.limit, input.page * input.limit),
      pagination: { page: input.page, limit: input.limit, total: filtered.length } };
  }
  async history(projectId: string, query: z.infer<typeof pagination>) {
    const items = await this.db.select().from(t.searches).where(eq(t.searches.projectId, projectId))
      .orderBy(desc(t.searches.createdAt), desc(t.searches.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    const queries = items.length ? await this.db.select().from(t.searchQueries)
      .where(inArray(t.searchQueries.searchId, items.map(row => row.id))).orderBy(t.searchQueries.adapterName, t.searchQueries.id) : [];
    return items.map(row => ({ ...row, queries: queries.filter(value => value.searchId === row.id) }));
  }
  async list(projectId: string, query: z.infer<typeof resourceQuery>) {
    const filters = [
      query.category ? eq(t.resources.category, query.category) : undefined,
      query.provider ? eq(t.resources.provider, query.provider) : undefined,
    ];
    if (query.saved === 'true') {
      const best = this.db.select({ resourceId: t.recommendations.resourceId,
        relevance: max(t.recommendations.relevanceScore).as('relevance'),
        rank: max(t.recommendations.rankScore).as('rank') }).from(t.recommendations)
        .innerJoin(t.searches, eq(t.recommendations.searchId, t.searches.id))
        .where(eq(t.searches.projectId, projectId)).groupBy(t.recommendations.resourceId).as('best');
      const rows = await this.db.select({ resource: t.resources, saved: t.saves,
        relevanceScore: best.relevance, rankScore: best.rank }).from(t.saves)
        .innerJoin(t.resources, eq(t.saves.resourceId, t.resources.id))
        .leftJoin(best, eq(best.resourceId, t.resources.id))
        .where(and(eq(t.saves.projectId, projectId), ...filters,
          query.minRelevance > 0 ? gte(best.relevance, query.minRelevance) : undefined))
        .orderBy(query.sort === 'lastUpdated' ? sql`${t.resources.sourceUpdatedAt} desc nulls last`
          : sql`${best.rank} desc nulls last`, t.resources.id)
        .limit(query.limit).offset((query.page - 1) * query.limit);
      return rows.map(row => ({ ...row, resource: resourceDTO(row.resource) }));
    }
    const [search] = await this.db.select().from(t.searches).where(and(eq(t.searches.projectId, projectId),
      eq(t.searches.status, 'COMPLETED'))).orderBy(desc(t.searches.createdAt), desc(t.searches.id)).limit(1);
    if (!search) return [];
    const rows = await this.db.select({ recommendation: t.recommendations, resource: t.resources, saved: t.saves })
      .from(t.recommendations).innerJoin(t.resources, eq(t.recommendations.resourceId, t.resources.id))
      .leftJoin(t.saves, and(eq(t.saves.resourceId, t.resources.id), eq(t.saves.projectId, projectId)))
      .where(and(eq(t.recommendations.searchId, search.id), ...filters,
        gte(t.recommendations.relevanceScore, query.minRelevance),
        query.saved === 'false' ? isNull(t.saves.id) : undefined))
      .orderBy(query.sort === 'lastUpdated' ? sql`(${t.recommendations.sourceSnapshot}->>'sourceUpdatedAt') desc nulls last`
        : desc(t.recommendations.rankScore), t.resources.id)
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return rows.map(row => {
      const source = resourceSchema.extend({ sourceUpdatedAt: z.coerce.date().nullable(),
        retrievedAt: z.coerce.date(), sourceCreatedAt: z.coerce.date().nullable().default(null) })
        .safeParse(row.recommendation.sourceSnapshot);
      if (!source.success) throw new ApiError(500, 'RESOURCE_SNAPSHOT_INVALID', 'Stored source metadata is invalid.');
      return { ...row, resource: resourceDTO({ ...source.data, id: row.resource.id }) };
    });
  }
}
