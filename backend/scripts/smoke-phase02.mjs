// Explicit manual verification: six real AI stages, billed by the configured provider.
// Not part of the automated suite. Removes its temporary project; no provider search.
const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:80';
let projectId;
async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(300000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${payload.error?.code}`);
  return payload.data;
}
try {
  const project = await request('/projects', 'POST', {
    name: '[verification] temporary campus food idea',
    productDescription: 'A service that lets students reserve surplus canteen meals near closing time.',
    problemStatement: 'Campus canteens may discard edible surplus while students seek affordable evening meals.',
    targetAudience: 'Students living on campus who buy evening meals from campus canteens',
    proposedSolution: 'Canteens list surplus portions, students reserve a portion and collect it before closing.',
    existingAlternatives: ['Buying standard canteen meals', 'Cooking in shared kitchens'],
  });
  projectId = project.id;
  const analysis = await request(`/projects/${projectId}/analyze`, 'POST', {
    additionalContext: 'This is a preliminary idea. No interviews, demand measurements or food safety review have been completed.',
  });
  const summary = await request(`/analyses/${analysis.id}/summary`);
  const blindspots = await request(`/analyses/${analysis.id}/blindspots`);
  const questions = await request(`/analyses/${analysis.id}/interview-questions`);
  const latest = await request(`/projects/${projectId}/analysis`);
  if (latest.id !== analysis.id || analysis.version !== 1
    || analysis.assumptions.some(row => row.status !== 'UNTESTED')
    || questions.items.length < 8 || questions.items.length > 12
    || summary.summary.validationDimensions.evidenceOfDemand.score !== null) {
    throw new Error('Live response violated the analysis contract.');
  }
  console.log(JSON.stringify({
    engineVersion: analysis.engineVersion, version: analysis.version,
    assumptions: analysis.assumptions.length, blindspots: blindspots.items.length,
    interviewQuestions: questions.items.length, demandScore: null,
    stages: analysis.providerMetadata.stages.map(stage => stage.name),
    tokenUsage: analysis.providerMetadata.tokenUsage,
    allAssumptionsUntested: true, analysisEndpointsVerified: true,
  }, null, 2));
} finally {
  if (projectId) {
    await request(`/projects/${projectId}`, 'DELETE');
    console.log('temporary_project_removed');
  }
}
