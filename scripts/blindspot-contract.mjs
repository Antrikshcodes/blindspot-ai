// Generate the browser contract from the implemented Phase 01 API, not legacy /v1.
import { writeFileSync } from 'node:fs';
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const str = { type: 'string' };
const nullable = { type: ['string', 'null'] };
const num = { type: 'number' };
const arr = item => ({ type: 'array', items: typeof item === 'string' ? ref(item) : item });
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const strings = names => Object.fromEntries(names.split(' ').map(name => [name, str]));
const enumeration = values => ({ type: 'string', enum: values.split(' ') });
const free = { type: 'object', additionalProperties: true };
const schemas = {
  HealthStatus: obj({ status: str }),
  Pagination: obj({ page: num, limit: num, total: num }, ['page', 'limit']),
  ProjectInput: obj({ ...strings('name productDescription problemStatement targetAudience proposedSolution'), existingAlternatives: arr(str) }),
  ProjectUpdate: obj({ ...strings('name productDescription problemStatement targetAudience proposedSolution'), existingAlternatives: arr(str) }, []),
  Project: obj({ ...strings('id ownerId name productDescription problemStatement targetAudience proposedSolution createdAt updatedAt'), existingAlternatives: arr(str) }),
  AnalysisInput: obj({ marketContext: str }, []),
  AssumptionStatus: enumeration('UNTESTED TESTING SUPPORTED INVALIDATED INCONCLUSIVE'),
  Evidence: obj({ ...strings('id feedbackId assumptionId quote sentiment reasoning origin createdAt') }),
  Assumption: obj({ ...strings('id analysisId description category explanation evidenceRequired validationMethod riskLevel'), impact: num, uncertainty: num, riskScore: num, status: ref('AssumptionStatus'), evidenceRecords: arr('Evidence') }, ['id', 'analysisId', 'description', 'category', 'explanation', 'evidenceRequired', 'validationMethod', 'riskLevel', 'impact', 'uncertainty', 'riskScore', 'status']),
  AnalysisResult: obj({ problemClarity: str, audienceClarity: str, nextSteps: arr(str), assumptions: arr(free) }),
  Analysis: obj({ ...strings('id projectId model createdAt'), version: { type: 'integer', minimum: 1 }, marketContext: nullable, projectSnapshot: free, result: ref('AnalysisResult'), assumptions: arr('Assumption') }),
  AnalysisHistoryItem: obj({ ...strings('id projectId model createdAt'), version: { type: 'integer', minimum: 1 } }),
  AssumptionUpdate: obj({ status: ref('AssumptionStatus'), evidenceIds: arr(str) }, ['status']),
  InterviewInput: obj({ participant: str }),
  Question: obj(strings('assumptionId question listenFor')),
  Interview: obj({ ...strings('id projectId participant createdAt'), questions: arr('Question') }),
  FeedbackInput: obj({ notes: str, assumptionIds: arr(str) }, ['notes']),
  Feedback: obj(strings('id interviewId notes createdAt')),
  FeedbackSummaryResult: obj({ themes: arr(str), evidence: arr(free), contradictions: arr(free), evidenceGaps: arr(str), unsupportedConclusions: arr(str) }),
  FeedbackSummary: obj({ ...strings('id projectId createdAt'), result: ref('FeedbackSummaryResult'), evidenceRecords: arr('Evidence'), reviewRequired: { type: 'boolean' }, statusesAutomaticallyChanged: { type: 'boolean' } }, ['id', 'projectId', 'createdAt', 'result']),
  EmptyInput: obj({}),
  ExperimentInput: obj(strings('assumptionId name explanation method evidenceToCollect successCriteria'), ['assumptionId']),
  ExperimentUpdate: obj({ status: enumeration('PLANNED IN_PROGRESS COMPLETED ABANDONED'), observedResult: str }, ['status']),
  Experiment: obj({ ...strings('id projectId assumptionId name explanation method evidenceToCollect successCriteria status createdAt updatedAt'), observedResult: nullable }),
  ResourceCategory: enumeration('GITHUB_REPOSITORY DATASET AI_MODEL API DOCUMENTATION OPEN_SOURCE_TOOL LEARNING_RESOURCE'),
  ResourceSearchInput: obj({ query: str, languages: arr(str), categories: arr('ResourceCategory'), explain: { type: 'boolean' } }, []),
  Resource: obj({ ...strings('id provider externalId url name description retrievedAt'), category: ref('ResourceCategory'), license: nullable, language: nullable, sourceUpdatedAt: nullable, tags: arr(str), qualitySignals: free, sourceMetadata: free }),
  Explanation: obj({ ...strings('recommendedUseCase explanation integrationDifficulty'), limitations: arr(str), alternativeResourceIds: arr(str), reviewRequired: { type: 'boolean' }, aiGenerated: { type: 'boolean' } }, ['recommendedUseCase', 'explanation', 'integrationDifficulty', 'limitations', 'alternativeResourceIds']),
  Recommendation: obj({ ...strings('id searchId resourceId'), relevanceScore: num, qualityScore: num, rankScore: num, ranking: free, sourceSnapshot: free, explanation: { anyOf: [ref('Explanation'), { type: 'null' }] } }),
  SavedResource: obj({ ...strings('id projectId resourceId status createdAt updatedAt') }),
  ResourceListItem: obj({ resource: ref('Resource'), recommendation: ref('Recommendation'), saved: { anyOf: [ref('SavedResource'), { type: 'null' }] } }, ['resource', 'saved']),
  SearchItem: obj({ resource: ref('Resource'), ...strings('id searchId resourceId'), relevanceScore: num, qualityScore: num, rankScore: num, ranking: free, sourceSnapshot: free, explanation: { anyOf: [ref('Explanation'), { type: 'null' }] } }),
  ProviderStatus: obj({ provider: str, status: str, count: num, error: str }, ['provider', 'status', 'count']),
  ResourceSearch: obj({ ...strings('searchId projectId query explanationStatus'), requirements: arr(str), cached: { type: 'boolean' }, providerStatuses: arr('ProviderStatus'), items: arr('SearchItem') }),
  ResourceSaveInput: obj({ projectId: str, status: enumeration('CONSIDERING TRYING INTEGRATED') }, ['projectId']),
};
const paths = {};
function endpoint(method, path, operationId, output, body, list = false, extra = []) {
  const responseSchema = list ? obj({ items: arr(output), pagination: ref('Pagination') }) : typeof output === 'string' ? ref(output) : output;
  const parameters = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }));
  if (list) parameters.push(...['page', 'limit'].map(name => ({ name, in: 'query', schema: { type: 'integer' } })));
  parameters.push(...extra);
  (paths[path] ??= {})[method] = {
    operationId, parameters,
    ...(path === '/healthz' ? { security: [] } : {}),
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: ref(body) } } } } : {}),
    responses: { [method === 'post' ? '201' : '200']: { description: 'Success envelope', content: { 'application/json': { schema: obj({ success: { type: 'boolean' }, data: responseSchema }) } } } },
  };
}
endpoint('get', '/healthz', 'healthCheck', 'HealthStatus');
endpoint('get', '/projects', 'listProjects', 'Project', null, true);
endpoint('post', '/projects', 'createProject', 'Project', 'ProjectInput');
endpoint('get', '/projects/{id}', 'getProject', 'Project');
endpoint('patch', '/projects/{id}', 'updateProject', 'Project', 'ProjectUpdate');
endpoint('delete', '/projects/{id}', 'deleteProject', free);
endpoint('post', '/projects/{id}/analyze', 'analyzeProject', 'Analysis', 'AnalysisInput');
endpoint('get', '/projects/{id}/analysis', 'getLatestAnalysis', 'Analysis');
endpoint('get', '/projects/{id}/analyses', 'listAnalysisHistory', 'AnalysisHistoryItem', null, true);
paths['/projects/{id}/analyses'].get.parameters.filter(p => p.in === 'query').forEach(p => {
  p.schema = { type: 'integer', minimum: 1, ...(p.name === 'limit' ? { maximum: 100, default: 20 } : { maximum: 10000, default: 1 }) };
});
endpoint('get', '/analyses/{id}', 'getAnalysis', 'Analysis');
endpoint('get', '/analyses/{id}/assumptions', 'listAssumptions', 'Assumption', null, true);
endpoint('patch', '/assumptions/{id}', 'updateAssumption', 'Assumption', 'AssumptionUpdate');
endpoint('post', '/projects/{id}/interviews', 'createInterview', 'Interview', 'InterviewInput');
endpoint('get', '/projects/{id}/interviews', 'listInterviews', 'Interview', null, true);
endpoint('post', '/interviews/{id}/feedback', 'addFeedback', 'Feedback', 'FeedbackInput');
endpoint('get', '/interviews/{id}/feedback', 'listFeedback', 'Feedback', null, true);
endpoint('post', '/projects/{id}/feedback/analyze', 'analyzeFeedback', 'FeedbackSummary', 'EmptyInput');
endpoint('get', '/projects/{id}/feedback/summary', 'getFeedbackSummary', { anyOf: [ref('FeedbackSummary'), { type: 'null' }] });
endpoint('post', '/projects/{id}/experiments', 'createExperiment', 'Experiment', 'ExperimentInput');
endpoint('get', '/projects/{id}/experiments', 'listExperiments', 'Experiment', null, true);
endpoint('patch', '/experiments/{id}', 'updateExperiment', 'Experiment', 'ExperimentUpdate');
endpoint('post', '/projects/{id}/resources/search', 'searchResources', 'ResourceSearch', 'ResourceSearchInput');
endpoint('get', '/projects/{id}/resources', 'listResources', 'ResourceListItem', null, true, [
  { name: 'saved', in: 'query', schema: enumeration('true false') },
  { name: 'category', in: 'query', schema: ref('ResourceCategory') },
]);
endpoint('get', '/resources/{id}', 'getResource', 'Resource');
endpoint('post', '/resources/{id}/save', 'saveResource', 'SavedResource', 'ResourceSaveInput');
endpoint('delete', '/projects/{id}/resources/{resourceId}/save', 'removeSavedResource', free);
writeFileSync(new URL('../lib/api-spec/openapi.yaml', import.meta.url), JSON.stringify({
  openapi: '3.1.0', info: { title: 'Api', version: '0.2.0', description: 'Blindspot Phase 01 browser contract. Success responses retain the backend envelope.' },
  servers: [{ url: '/api' }], paths,
  security: [{ ClerkSession: [] }, { ClerkBearer: [] }],
  components: {
    schemas,
    securitySchemes: {
      ClerkSession: { type: 'apiKey', in: 'cookie', name: '__session',
        description: 'Verified Clerk browser session. Cookie writes require same-origin Origin.' },
      ClerkBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
        description: 'Verified Clerk session JWT for non-browser clients. Browser clients use session cookies.' },
    },
  },
}, null, 2));
