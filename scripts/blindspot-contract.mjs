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
  AnalysisInput: obj({
    marketContext: { type: 'string', minLength: 1, maxLength: 4000 },
    additionalContext: { type: 'string', minLength: 1, maxLength: 6000 },
  }, []),
  AssumptionStatus: enumeration('UNTESTED TESTING SUPPORTED INVALIDATED INCONCLUSIVE'),
  Evidence: obj({
    ...strings('id feedbackId assumptionId quote reasoning origin createdAt'),
    sentiment: enumeration('SUPPORTING INVALIDATING NEUTRAL'),
  }),
  Assumption: obj({
    ...strings('id analysisId description explanation evidenceRequired validationMethod'),
    category: enumeration('PROBLEM CUSTOMER SOLUTION MONETIZATION DEMAND BEHAVIOUR WILLINGNESS_TO_PAY TECHNICAL DISTRIBUTION BUSINESS_MODEL COMPETITIVE OPERATIONAL'),
    riskLevel: enumeration('CRITICAL HIGH MEDIUM LOW'),
    title: { anyOf: [str, { type: 'null' }] },
    targetAudience: { anyOf: [str, { type: 'null' }] },
    suggestedInterviewQuestion: { anyOf: [str, { type: 'null' }] },
    scoreExplanation: { anyOf: [ref('ScoreExplanation'), { type: 'null' }] },
    priorityScore: num, impact: { type: 'integer', minimum: 1, maximum: 5 },
    uncertainty: { type: 'integer', minimum: 1, maximum: 5 },
    riskScore: { type: 'integer', minimum: 1, maximum: 25 },
    status: ref('AssumptionStatus'), createdAt: str, updatedAt: str,
    evidenceRecords: arr('Evidence'),
  }, ['id', 'analysisId', 'description', 'category', 'explanation', 'evidenceRequired', 'validationMethod', 'riskLevel', 'impact', 'uncertainty', 'riskScore', 'status']),
  ScoreExplanation: obj({
    ...strings('impactRationale uncertaintyRationale formula'),
    probability: { type: 'boolean' },
  }),
  AnalysisResult: obj({ problemClarity: str, audienceClarity: str, nextSteps: arr(str), assumptions: arr(free) }),
  Analysis: obj({ ...strings('id projectId model createdAt'), version: { type: 'integer', minimum: 1 }, marketContext: nullable, projectSnapshot: free, result: ref('AnalysisResult'), assumptions: arr('Assumption') }),
  AnalysisHistoryItem: obj({ ...strings('id projectId model createdAt'), version: { type: 'integer', minimum: 1 } }),
  Blindspot: obj({
    ...strings('id title explanation relatedAssumptionId whyOverlooked suggestedAction evidenceRequired'),
    severity: enumeration('CRITICAL HIGH MEDIUM LOW'),
    grounding: enumeration('SUBMITTED UNCERTAINTY'),
    sourceQuote: nullable,
  }),
  InterviewQuestion: obj({
    ...strings('id question relatedAssumptionId purpose evidenceToLookFor followUpQuestion'),
  }),
  AnalysisFinding: obj({ statement: nullable, grounding: enumeration('SUBMITTED UNCERTAINTY MISSING'), sourceQuote: nullable }),
  ValidationDimension: obj({
    score: { anyOf: [{ type: 'integer', minimum: 0, maximum: 100 }, { type: 'null' }] },
    support: enumeration('DESCRIPTION_ONLY INSUFFICIENT_EVIDENCE UNASSESSED'),
    rationale: str, evidenceNeeded: str,
  }),
  ValidationDimensions: obj({
    problemClarity: ref('ValidationDimension'), audienceSpecificity: ref('ValidationDimension'),
    solutionClarity: ref('ValidationDimension'), evidenceOfDemand: ref('ValidationDimension'),
    differentiation: ref('ValidationDimension'), technicalFeasibility: ref('ValidationDimension'),
    validationReadiness: ref('ValidationDimension'),
  }),
  AnalysisSummary: obj({
    problemClarity: str, audienceClarity: str, overallSummary: nullable,
    problemAssessment: ref('AnalysisFinding'), audienceAssessment: ref('AnalysisFinding'),
    solutionAssessment: ref('AnalysisFinding'),
    validationDimensions: { anyOf: [ref('ValidationDimensions'), { type: 'null' }] },
    strengths: arr(str), missingInformation: arr(str), productRisks: arr(str),
    marketAndDemandUncertainties: arr(str), technicalFeasibilityConcerns: arr(str),
    competitiveUncertainties: arr(str), nextSteps: arr(str),
    competition: obj({ submittedAlternatives: arr(str), externalResearchPerformed: { type: 'boolean', enum: [false] } }),
    evidenceBackedValidation: obj({
      assessed: { type: 'boolean', enum: [false] },
      verifiedEvidenceCount: { type: 'integer', enum: [0] },
      explanation: str,
    }),
    assessmentType: enumeration('AI_GENERATED_HYPOTHESES_AND_DESCRIPTION_ASSESSMENT'), disclaimer: str,
  }, []),
  AnalysisBlindspots: obj({
    analysisId: str, projectId: str, version: { type: 'integer', minimum: 1 }, engineVersion: str,
    available: { type: 'boolean' }, items: arr('Blindspot'), reason: str,
  }, ['analysisId', 'projectId', 'version', 'engineVersion', 'available', 'items']),
  AnalysisInterviewQuestions: obj({
    analysisId: str, projectId: str, version: { type: 'integer', minimum: 1 }, engineVersion: str,
    available: { type: 'boolean' }, items: arr('InterviewQuestion'), reason: str,
  }, ['analysisId', 'projectId', 'version', 'engineVersion', 'available', 'items']),
  AnalysisTokenUsage: obj({
    promptTokens: { type: 'integer', minimum: 0 },
    completionTokens: { type: 'integer', minimum: 0 },
    totalTokens: { type: 'integer', minimum: 0 },
  }),
  AnalysisStageMetadata: obj({
    name: str, durationMs: { type: 'number', minimum: 0 },
    tokenUsage: { anyOf: [ref('AnalysisTokenUsage'), { type: 'null' }] },
  }),
  AnalysisProviderMetadata: obj({
    ...strings('provider model promptVersion'),
    tokenUsage: { anyOf: [ref('AnalysisTokenUsage'), { type: 'null' }] },
    stages: { type: 'array', minItems: 6, maxItems: 6, items: ref('AnalysisStageMetadata') },
  }),
  AnalysisSummaryResponse: obj({
    analysisId: str, projectId: str, version: { type: 'integer', minimum: 1 }, engineVersion: str,
    available: { type: 'boolean' }, summary: ref('AnalysisSummary'), providerMetadata: ref('AnalysisProviderMetadata'), reason: str,
  }, ['analysisId', 'projectId', 'version', 'engineVersion', 'available', 'summary']),
  AssumptionUpdate: obj({ status: ref('AssumptionStatus'), evidenceIds: arr(str) }, ['status']),
  InterviewInput: obj({ participant: str }),
  Question: obj(strings('assumptionId question listenFor')),
  Interview: obj({ ...strings('id projectId participant createdAt'), sourceAnalysisVersion: { type: ['integer', 'null'], minimum: 1 }, questions: arr('Question') }),
  FeedbackInput: obj({ notes: str, assumptionIds: arr(str) }, ['notes']),
  Feedback: obj(strings('id interviewId notes createdAt')),
  FeedbackSummaryResult: obj({ themes: arr(str), evidence: arr(free), contradictions: arr(free), evidenceGaps: arr(str), unsupportedConclusions: arr(str) }),
  FeedbackSummary: obj({ ...strings('id projectId createdAt'), result: ref('FeedbackSummaryResult'), evidenceRecords: arr('Evidence'), reviewRequired: { type: 'boolean' }, statusesAutomaticallyChanged: { type: 'boolean' } }, ['id', 'projectId', 'createdAt', 'result']),
  EmptyInput: obj({}),
  ExperimentInput: obj(strings('assumptionId name explanation method evidenceToCollect successCriteria'), ['assumptionId']),
  ExperimentUpdate: obj({ status: enumeration('PLANNED IN_PROGRESS COMPLETED ABANDONED'), observedResult: str }, ['status']),
  Experiment: obj({ ...strings('id projectId assumptionId name explanation method evidenceToCollect successCriteria status createdAt updatedAt'), observedResult: nullable }),
  ResourceCategory: enumeration('GITHUB_REPOSITORY DATASET AI_MODEL API DOCUMENTATION OPEN_SOURCE_TOOL LEARNING_RESOURCE'),
  ResourceProvider: enumeration('github huggingface huggingface_models huggingface_datasets kaggle uci apis_guru technical'),
  ResourceSearchInput: obj({
    query: { type: 'string', minLength: 1, maxLength: 150 },
    languages: { ...arr({ type: 'string', minLength: 1, maxLength: 40 }), maxItems: 5 },
    categories: { ...arr('ResourceCategory'), minItems: 1, maxItems: 7 },
    providers: { ...arr('ResourceProvider'), minItems: 1, maxItems: 8 },
    topics: { ...arr({ type: 'string', minLength: 1, maxLength: 40 }), maxItems: 5 },
    tasks: { ...arr({ type: 'string', minLength: 1, maxLength: 60 }), maxItems: 5 },
    includeArchived: { type: 'boolean' }, explain: { type: 'boolean' },
    page: { type: 'integer', minimum: 1, maximum: 10000 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    minRelevance: { type: 'number', minimum: 0, maximum: 100 },
    sort: enumeration('relevance lastUpdated'),
  }, []),
  Resource: obj({
    ...strings('id provider externalId url name description retrievedAt'), category: ref('ResourceCategory'),
    license: nullable, language: nullable, sourceUpdatedAt: nullable, tags: arr(str), qualitySignals: free, sourceMetadata: free,
    sourceApiUrl: nullable, sourceCreatedAt: nullable, technical_metadata: free, popularity_metrics: free, maintenance_signals: free,
  }, ['id', 'provider', 'externalId', 'url', 'name', 'description', 'retrievedAt', 'category', 'license', 'language', 'sourceUpdatedAt', 'tags', 'qualitySignals', 'sourceMetadata']),
  Explanation: obj({ ...strings('recommendedUseCase explanation integrationDifficulty'), limitations: arr(str), alternativeResourceIds: arr(str), reviewRequired: { type: 'boolean' }, aiGenerated: { type: 'boolean' } }, ['recommendedUseCase', 'explanation', 'integrationDifficulty', 'limitations', 'alternativeResourceIds']),
  Recommendation: obj({ ...strings('id searchId resourceId'), relevanceScore: num, qualityScore: num, rankScore: num, ranking: free, sourceSnapshot: free, explanation: { anyOf: [ref('Explanation'), { type: 'null' }] } }),
  SavedResource: obj({ ...strings('id projectId resourceId status createdAt updatedAt') }),
  SavedResourceListItem: obj({ resource: ref('Resource'), saved: ref('SavedResource'),
    relevanceScore: { type: ['number', 'null'] }, rankScore: { type: ['number', 'null'] } }),
  ResourceRemoval: obj({ removedFromSaved: { type: 'boolean' } }),
  ResourceListItem: obj({ resource: ref('Resource'), recommendation: ref('Recommendation'), saved: { anyOf: [ref('SavedResource'), { type: 'null' }] } }, ['resource', 'saved']),
  SearchItem: obj({ resource: ref('Resource'), ...strings('id searchId resourceId'), relevanceScore: num, qualityScore: num, rankScore: num, ranking: free, sourceSnapshot: free, explanation: { anyOf: [ref('Explanation'), { type: 'null' }] } }),
  ProviderStatus: obj({ provider: str, status: str, count: num, error: str, queries: num }, ['provider', 'status', 'count']),
  ResourceSearch: obj({
    ...strings('searchId projectId query explanationStatus'), requirements: arr(str), cached: { type: 'boolean' },
    providerStatuses: arr('ProviderStatus'), items: arr('SearchItem'), pagination: ref('Pagination'),
    partial: { type: 'boolean' }, generatedQueries: arr(free), analysisId: nullable, explanationError: nullable,
  }, ['searchId', 'projectId', 'query', 'explanationStatus', 'requirements', 'cached', 'providerStatuses', 'items']),
  ResourceQueryDiagnostic: obj({
    ...strings('id searchId providerId adapterName query status'), parameters: free,
    count: num, durationMs: num, cached: { type: 'boolean' },
    error: nullable, retryAfterSeconds: { type: ['number', 'null'] },
  }),
  ResourceSearchHistory: obj({
    ...strings('id projectId query createdAt status explanationStatus'),
    requirements: arr(str), providerStatuses: arr('ProviderStatus'), analysisId: nullable,
    queryPlan: { anyOf: [free, { type: 'null' }] },
    partial: { type: 'boolean' }, cached: { type: 'boolean' }, queries: arr('ResourceQueryDiagnostic'),
  }),
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
endpoint('post', '/projects/{id}/analyze', 'analyzeProject', { type: 'string', format: 'uuid' }, 'AnalysisInput');
endpoint('get', '/projects/{id}/analysis', 'getLatestAnalysis', 'Analysis');
endpoint('get', '/projects/{id}/analyses', 'listAnalysisHistory', 'AnalysisHistoryItem', null, true);
paths['/projects/{id}/analyses'].get.parameters.filter(p => p.in === 'query').forEach(p => {
  p.schema = { type: 'integer', minimum: 1, ...(p.name === 'limit' ? { maximum: 100, default: 20 } : { maximum: 10000, default: 1 }) };
});
endpoint('get', '/analyses/{id}', 'getAnalysis', 'Analysis');
endpoint('get', '/analyses/{id}/assumptions', 'listAssumptions', 'Assumption', null, true);
endpoint('get', '/analyses/{id}/blindspots', 'getAnalysisBlindspots', 'AnalysisBlindspots');
endpoint('get', '/analyses/{id}/interview-questions', 'getAnalysisInterviewQuestions', 'AnalysisInterviewQuestions');
endpoint('get', '/analyses/{id}/summary', 'getAnalysisSummary', 'AnalysisSummaryResponse');
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
  { name: 'provider', in: 'query', schema: { type: 'string', pattern: '^[a-z_]{1,50}$' } },
  { name: 'minRelevance', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
  { name: 'sort', in: 'query', schema: enumeration('relevance lastUpdated') },
]);
endpoint('get', '/projects/{id}/resources/searches', 'listResourceSearches', 'ResourceSearchHistory', null, true);
endpoint('get', '/projects/{id}/resources/saved', 'listSavedResources', 'SavedResourceListItem', null, true, [
  { name: 'category', in: 'query', schema: ref('ResourceCategory') },
  { name: 'provider', in: 'query', schema: { type: 'string', pattern: '^[a-z_]{1,50}$' } },
  { name: 'minRelevance', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
  { name: 'sort', in: 'query', schema: enumeration('relevance lastUpdated') },
]);
endpoint('get', '/resources/{id}', 'getResource', 'Resource');
endpoint('post', '/resources/{id}/save', 'saveResource', 'SavedResource', 'ResourceSaveInput');
endpoint('delete', '/projects/{id}/resources/{resourceId}/save', 'removeSavedResource', 'ResourceRemoval');
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
