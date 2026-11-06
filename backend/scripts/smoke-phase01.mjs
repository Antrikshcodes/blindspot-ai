// Explicit development verification only. This does not run in CI or at startup.
// Uses real providers and, with --ai, real billed AI. Removes its temporary project.
const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:80';
let projectId;
async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(180000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${payload.error?.code}`);
  return payload.data;
}
try {
  const health = await request('/health');
  console.log('health:', health.status);
  const project = await request('/projects', 'POST', {
    name: '[verification] temporary public research workflow',
    productDescription: 'Temporary verification of an idea about checking public news claims.',
    problemStatement: 'Students struggle to distinguish misleading claims from evidence-backed reporting.',
    targetAudience: 'Student news readers',
    proposedSolution: 'Show evidence sources and explain limits of automated text classification.',
    existingAlternatives: ['Manual source verification'],
  });
  projectId = project.id;
  const resources = await request(`/projects/${projectId}/resources/search`, 'POST', {
    query: 'fake-news', categories: ['GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL'], explain: false,
  });
  console.log('providers:', JSON.stringify(resources.providerStatuses));
  console.log('retrieved_resources:', resources.items.length);
  if (process.argv.includes('--ai')) {
    const analysis = await request(`/projects/${projectId}/analyze`, 'POST', {});
    if (!analysis.assumptions.length || analysis.assumptions.some(row => row.status !== 'UNTESTED')) {
      throw new Error('Unexpected live analysis output');
    }
    console.log('live_ai_analysis:', analysis.assumptions.length, 'untested assumptions');
  }
} finally {
  if (projectId) {
    await request(`/projects/${projectId}`, 'DELETE');
    console.log('temporary_project_removed');
  }
}
