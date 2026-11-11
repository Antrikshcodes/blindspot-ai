import { LibraryFixture } from './library-fixture';
import { resourceId, resourceProjectId } from './resource-fixture';
import type { ResourceSearchHistory } from '@workspace/api-client-react';

// Synthetic server-shaped data for tests only; never imported by production UI.
const json = (data: unknown, status = 200) => new Response(JSON.stringify(status < 400
  ? { success: true, data } : { success: false, error: data }), { status, headers: { 'Content-Type': 'application/json' } });
export const recommendationAnalysisId = resourceId(30);
export const recommendationProject = {
  id: resourceProjectId, ownerId: resourceId(700), name: 'TEST ONLY recommendation project',
  productDescription: 'TEST ONLY text classification tool', problemStatement: 'TEST ONLY classify short text',
  targetAudience: 'TEST ONLY founders', proposedSolution: 'TEST ONLY NLP service',
  existingAlternatives: [], createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z',
};
export const serverRanking = (relevance = 90) => ({
  components: { relevance, compatibility: null, documentation: 100, maintenance: 100, licenseAvailability: 100, maturity: null, functional: relevance, integrationEase: null },
  weights: { relevance: 0.4, compatibility: 0.15, documentation: 0.1, maintenance: 0.08, licenseAvailability: 0.02, maturity: 0, functional: 0.2, integrationEase: 0.05 },
  matchedTerms: ['text', 'classification'], lexicalScore: relevance, semanticScore: relevance,
  explanation: 'TEST ONLY server explanation: query terms match retrieved metadata. Missing signals contribute zero; popularity is not scored.',
  semanticMethod: 'Transparent curated concept overlap plus lexical coverage; not embeddings or calibrated similarity.',
  qualityScoreMeaning: 'Legacy metadata-signal score, not a security audit or measured software quality.',
  technicalCompatibility: 'UNKNOWN', maintenanceStatus: 'RECENT_METADATA', licenseStatus: 'KNOWN_UNREVIEWED',
  documentationStatus: 'PRESENT', confidence: 'MEDIUM', licenseCompatibility: 'UNKNOWN',
  integrationDifficulty: 'UNKNOWN', unknownSignals: ['compatibility', 'maturity', 'integrationEase'], archivedPenalty: false,
  disclaimer: 'Relevance and metadata signals do not establish security, quality, reliability or license compatibility.',
});
const aiExplanation = {
  recommendedUseCase: 'TEST ONLY apply retrieved text classification metadata',
  explanation: 'TEST ONLY server AI explanation grounded in the supplied source metadata.',
  integrationDifficulty: 'UNKNOWN', limitations: ['TEST ONLY verify input compatibility with source documentation.'],
  alternativeResourceIds: [], reviewRequired: true, aiGenerated: true,
};

export class RecommendationFixture extends LibraryFixture {
  private priorFetch: LibraryFixture['fetch'];
  noAnalysis = false;
  analysisError: number | null = null;
  historyError = false;
  planningError = false;
  loseSearchResponse = false;
  analysis = {
    id: recommendationAnalysisId, projectId: resourceProjectId, version: 2, model: 'TEST ONLY model',
    createdAt: '2026-11-02T12:00:00.000Z', marketContext: null, projectSnapshot: recommendationProject,
    result: {
      decomposition: { technicalRequirements: [{ id: 'test-req-1', statement: 'TEST ONLY text classification' }] },
      assumptions: [], blindspots: [],
    },
    assumptions: [],
  };
  constructor() {
    super();
    this.priorFetch = this.fetch;
    this.fetch = this.recFetch;
    this.items = this.items.map((item) => ({
      ...item, rankScore: 74, qualityScore: 100,
      ranking: serverRanking(item.relevanceScore),
      explanation: item.resourceId === resourceId(11) ? aiExplanation : null,
    }));
    this.histories[0] = this.contextHistory(this.histories[0]);
  }
  private contextHistory(history: ResourceSearchHistory): ResourceSearchHistory {
    return { ...history, analysisId: this.noAnalysis ? null : this.analysis.id,
      requirements: ['TEST ONLY text classification'], explanationStatus: 'GENERATED',
      queryPlan: { promptVersion: 'phase03-query-1', requirements: ['TEST ONLY text classification'] } };
  }
  private recFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://fixture.invalid');
    const path = url.pathname;
    const method = init?.method ?? 'GET';
    if (this.access) return this.priorFetch(input, init);
    if (path === `/api/projects/${resourceProjectId}` || path === `/api/projects/${resourceProjectId}/analysis`) {
      this.calls.push({ method, path, params: url.searchParams });
      if (path.endsWith('/analysis')) {
        if (this.analysisError) return json({ code: 'UNAVAILABLE', message: 'TEST ONLY analysis could not be read.' }, this.analysisError);
        if (this.noAnalysis) return json({ code: 'ANALYSIS_NOT_FOUND', message: 'Analyze the project first.' }, 404);
        return json(this.analysis);
      }
      return json(recommendationProject);
    }
    if (path.endsWith('/resources/searches') && this.historyError) {
      this.calls.push({ method, path, params: url.searchParams });
      return json({ code: 'UNAVAILABLE', message: 'TEST ONLY search history unavailable.' }, 503);
    }
    if (path === `/api/projects/${resourceProjectId}/resources/search` && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      const allowed = ['query', 'categories', 'languages', 'providers', 'explain', 'topics', 'tasks', 'includeArchived', 'page', 'limit', 'sort', 'minRelevance'];
      if (Object.keys(body).some((key) => !allowed.includes(key))) throw new Error('Invented recommendation context in request.');
      if (this.planningError) {
        this.calls.push({ method, path, body, params: url.searchParams });
        return json({ code: 'AI_NOT_CONFIGURED', message: 'TEST ONLY query planning unavailable.' }, 503);
      }
      const res = await this.priorFetch(input, init);
      if (res.status >= 400) return res;
      this.histories[0] = this.contextHistory(this.histories[0]);
      const payload = await res.json();
      if (this.loseSearchResponse) throw new TypeError('TEST ONLY response lost after a completed search committed.');
      return json({ ...payload.data, analysisId: this.noAnalysis ? null : this.analysis.id,
        requirements: this.histories[0].requirements }, res.status);
    }
    return this.priorFetch(input, init);
  };
}
