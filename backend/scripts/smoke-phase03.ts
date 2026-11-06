// Manual, limited real integration checks. Not part of npm test.
// Public provider calls plus ONE billed AI explanation batch via the running API.
import { defaultProviders } from '../src/phase01/resource-intelligence/providers.js';
import { deduplicate } from '../src/phase01/resource-intelligence/normalize.js';
import { resourceDTO } from '../src/phase01/resource-intelligence/dto.js';

async function main() {
  const queries: Record<string, string> = { github: 'fake news detection', huggingface_models: 'fake-news',
    huggingface_datasets: 'fake_news', kaggle: 'fake news', uci: 'iris', apis_guru: 'fact check', technical: 'classification' };
  const statuses = [];
  for (const provider of defaultProviders()) {
    if (process.argv.includes('--workflow-only')) break;
    if (!provider.enabled) {
      statuses.push({ provider: provider.name, status: 'DISABLED', reason: provider.disabledReason }); continue;
    }
    try {
      const values = deduplicate(await provider.search(queries[provider.name], [],
        { limit: 1, ...(provider.name === 'huggingface_models' ? { tasks: ['text-classification'] } : {}) }));
      statuses.push({ provider: provider.name, status: 'OK', count: values.length,
        sample: values[0] ? { name: values[0].name, url: values[0].url, sourceApiUrl: values[0].sourceApiUrl } : null });
    } catch (error) {
      statuses.push({ provider: provider.name, status: 'FAILED', code: (error as { code?: string }).code ?? 'INVALID_RESPONSE' });
    }
  }
  console.log(JSON.stringify({ providerChecksSkipped: process.argv.includes('--workflow-only'), liveProviderChecks: statuses }, null, 2));
  const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:80';
  async function request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(180000) });
    const payload = await response.json();
    if (!response.ok) throw new Error(`API check failed ${response.status} ${payload.error?.code}`);
    return payload.data;
  }
  let projectId: string | undefined;
  try {
    const project = await request('/projects', 'POST', {
      name: '[verification] temporary source-verification idea',
      productDescription: 'A tool that helps readers investigate news claim sources.',
      problemStatement: 'Readers need traceable sources behind news claims.',
      targetAudience: 'Readers investigating online news claims',
      proposedSolution: 'Present source metadata and claim verification tools.',
      existingAlternatives: ['Manual source searches'],
    });
    projectId = project.id;
    const search = await request(`/projects/${projectId}/resources/search`, 'POST', {
      query: 'factchecktools', providers: ['apis_guru'], categories: ['API'], explain: true, limit: 1,
    });
    if (!search.items.length) throw new Error('No actual retrieved recommendation available.');
    const history = await request(`/projects/${projectId}/resources/searches`);
    const resourceId = search.items[0].resource.id;
    await request(`/resources/${resourceId}/save`, 'POST', { projectId });
    const saved = await request(`/projects/${projectId}/resources/saved?provider=apis_guru`);
    if (!saved.items.some((row: any) => row.resource.id === resourceId)) throw new Error('Saved resource missing.');
    await request(`/resources/${resourceId}/save`, 'DELETE', { projectId });
    console.log(JSON.stringify({
      liveWorkflow: { recommendations: search.pagination.total, returned: search.items.length,
        explanationStatus: search.explanationStatus, explanationError: search.explanationError, partial: search.partial,
        providerStatuses: search.providerStatuses, persistedQueries: history.items[0].queries.length,
        savedAndRemoved: true, normalizedResource: resourceDTO(search.items[0].resource),
        explanation: search.items[0].explanation },
    }, null, 2));
  } finally {
    if (projectId) { await request(`/projects/${projectId}`, 'DELETE'); console.log('temporary_project_removed'); }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Manual check failed'); process.exitCode = 1; });
