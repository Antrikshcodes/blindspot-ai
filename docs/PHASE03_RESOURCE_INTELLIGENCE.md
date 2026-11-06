# Phase 03 — Real-world Resource Intelligence

Implemented by extending the Phase 01 module and consuming existing Phase 02
analysis outputs. Backend only; no frontend or replacement analysis engine.

## Workflow

1. Load the project and latest analysis by version.
2. Extract technical requirements, assumptions and blindspots from available analysis.
3. Generate provider-specific queries, or honor an explicit query without requiring AI.
4. Deduplicate normalized queries; retain at most two per provider.
5. Execute providers independently with shared, bounded concurrency and retrieval caching.
6. Validate/normalize source metadata and deduplicate by canonical URL/provider identity.
7. Rank candidates transparently; discard known incompatible tasks/languages.
8. Generate source-cited explanations from retrieved candidates only.
9. Atomically persist search/query diagnostics, resource identities, source snapshots
   and recommendations. Failed retrievals also retain diagnostic history.
10. Return paginated results, provider statuses and explicit partial/explanation status.

No provider failure creates replacement resources. All-disabled/all-failed searches
retain HTTP 503 and are inspectable through search history. A successful provider
returning zero matches is distinct from a failed provider.

## Integrations

| Adapter | Official interface | Returned evidence / constraints |
| --- | --- | --- |
| github | GitHub REST `/search/repositories`, `/repos/{owner}/{repo}` | Name/owner, description, public URL, stars/forks, language/topics, license, created/pushed/updated dates, archive flag, open issues. Page/limit/topic/language options; private results excluded. |
| huggingface_models | Hub `/api/models` and bounded README retrieval | ID, task, library, likes/downloads, modification/creation date, card license/metadata, gated status when returned. Known task mismatches are excluded even when names match. |
| huggingface_datasets | Hub `/api/datasets` and bounded README retrieval | Public dataset identity, tags, card metadata, license and available activity/download signals. |
| kaggle | Authenticated `/api/v1/datasets/list` | Owner, dataset URL, available license/date/size/download/file-list fields. Requires opt-in and both credentials. Missing/rejected credentials disable it; restrictions are never bypassed. |
| uci | Official `/api/datasets/list?search=...` and `/api/dataset?id=...` | Dataset identity, abstract, tasks, subject, feature types/variables, row/feature counts and available date/license. Absent licenses remain null. |
| apis_guru | Official `https://api.apis.guru/v2/list.json` | API title/provider/categories, specification and documentation URLs, directory dates. Service pricing/license remain unknown; specification license is stored separately. |
| technical | Extensible reviewed official-destination catalog + live HEAD retrieval | Official documentation, API docs, open-source tool and learning URLs. Availability-checked catalog metadata is labeled separately from AI suggestions. |

GitHub excludes archived repositories by default at both query and result levels.
`includeArchived:true` permits them with an archive warning and ranking penalty.
Popularity is returned as metadata, never treated as audited quality.

Hugging Face fetches at most two card excerpts per query. Missing cards are unknown,
not fabricated. Gated model access and license terms still require manual review.
UCI search uses its keyword listing and enriches available subject/task/feature
metadata; it does not fabricate an unsupported advanced search endpoint.
Kaggle file manifests are retained if the search response supplies them; this phase
does not download datasets or promise a separate complete file manifest.

Documentation discovery is intentionally a small, extensible official catalog, not
an unrestricted web crawler. New destinations require trusted catalog/domain changes.
APIs.guru documentation links are directory-reported; arbitrary linked hosts are
never fetched by this server.

## Normalized resources and source trust

Existing camelCase fields remain. Additive snake_case aliases provide:

```text
id, external_id, name, description, category, provider, resource_url,
source_api_url, tags, language, license, last_updated, created_at,
popularity_metrics, maintenance_signals, technical_metadata, retrieved_at
```

The database ID is assigned/reused on persistence, not supplied by AI.
Unknown fields are null or explicitly UNKNOWN. An empty legacy description stays
an empty string for compatibility, with metadataAvailability.description=UNKNOWN.
Source timestamps describe the provider record: for example, APIs.guru's added
timestamp is directory-entry creation, not the API service's launch date.
Its updated timestamp does not prove that the API service is maintained.

### Actual normalized live resource excerpt

Retrieved during the manual check, not a seeded or invented recommendation.
Fields below are selected from the stored result; provider reports may change.

```json
{
  "id": "d8c3fadf-a8f4-404a-aeb5-172c35e8d580",
  "external_id": "googleapis.com:factchecktools",
  "name": "Fact Check Tools API",
  "description": "",
  "category": "API",
  "provider": "apis_guru",
  "resource_url": "https://developers.google.com/fact-check/tools/api",
  "source_api_url": "https://api.apis.guru/v2/list.json",
  "tags": ["analytics", "media"],
  "language": null,
  "license": null,
  "last_updated": "2023-04-21T23:09:23.065Z",
  "created_at": "2020-01-07T11:38:39.000Z",
  "popularity_metrics": {"stars": null, "forks": null, "downloads": null, "likes": null},
  "maintenance_signals": {"archived": null, "last_updated": "2023-04-21T23:09:23.065Z", "open_issues": null},
  "retrieved_at": "2026-11-06T19:20:06.228Z"
}
```

Because the directory supplied no functional description, the live AI response
said **“Not established from retrieved metadata”**, set relevanceEstablished=false,
returned null supportedFunctionality/integrationApproach and UNKNOWN complexity.
It cited the actual title/tags instead of inventing API operations.
The temporary project was removed after search/save/remove checks; global real
resource records are deliberately reusable and not deleted with a project.

## Ranking

Relevance is separate from metadata quality:

```text
lexical = full-word query-term coverage × 100
semantic = matching curated concepts / requested curated concepts × 100
           (lexical coverage when no curated concept applies)
relevanceScore = round(0.6 × lexical + 0.4 × semantic)
rankScore = weighted sum of known components / total configured weight
            × 0.5 if archived
```

Curated concepts include misinformation/fake-news, text classification,
embeddings/semantic similarity, speech recognition, image classification and
fact checking. This is transparent concept expansion, **not trained embeddings
or calibrated semantic similarity**. Full-word matching avoids matching “fact”
inside “artifact”. APIs.guru also prioritizes title/identity/category matches and
exact phrases over incidental mentions in long descriptions.

Default weights:

| Component | Weight | Missing data |
| --- | ---: | --- |
| Relevance | 0.40 | No matching terms/concepts = 0 |
| Technical compatibility | 0.15 | UNKNOWN, contributes 0 |
| Functional match | 0.20 | Declared model task where available; otherwise metadata relevance proxy |
| Documentation | 0.10 | UNKNOWN, contributes 0 |
| Maintenance timestamp | 0.08 | UNKNOWN, contributes 0 |
| License availability | 0.02 | UNKNOWN, contributes 0 |
| Integration ease | 0.05 | UNKNOWN unless supported metadata establishes it; currently not inferred |
| Legacy maturity | 0 | Popularity is not scored |

Known task/language conflicts are excluded from recommendations. License presence
does not establish compatibility with a founder's intended use. Integration
difficulty from the AI is a separate review-required estimate, not a fact used
to improve the source ranking.

Return fields include explanation, matched terms, component scores/weights,
technical compatibility, maintenance/license/documentation status, integration
uncertainty and HIGH/MEDIUM/LOW/UNKNOWN confidence. Confidence is a rule-based
metadata heuristic, not a probability of safety or integration success.
The retained `qualityScore` is labeled as a legacy metadata-signal score, not a
measured quality rating. Stars/downloads/likes never increase it.

## AI explanations

ResourceExplanationService receives the idea context, technical requirements and
retrieved metadata. Candidates have server-created UUIDs. The LLM cannot introduce
new resources, source URLs, credentials or alternative IDs outside its candidate batch.

The response retains recommendedUseCase/explanation/integrationDifficulty/
limitations/alternativeResourceIds and adds whatItDoes, supportedFunctionality,
integrationApproach, relevanceEstablished and exact metadataCitations.
Established factual descriptions must be exact excerpts of supplied description,
task or card metadata. Unsupported relevance requires abstention and null
functionality/integration. Alternative IDs are remapped to real persisted IDs.

Retrieved facts live in resource/sourceSnapshot; suggestions are explicitly
generatedBy=AI and reviewRequired=true. Failed schema/reference/quote/fact checks
retain real retrievals with explanationStatus=UNAVAILABLE, a safe explanationError,
partial=true and null explanations. No fake text fills the gap.
Exact quotes do not formally prove semantic interpretations or eliminate prompt injection.

## API and examples

All routes use the existing success/error envelopes.

| Method | Route |
| --- | --- |
| POST | `/api/projects/:id/resources/search` |
| GET | `/api/projects/:id/resources` |
| GET | `/api/projects/:id/resources/searches` |
| GET | `/api/resources/:id` |
| POST | `/api/resources/:id/save` |
| DELETE | `/api/resources/:id/save` |
| GET | `/api/projects/:id/resources/saved` |

The older DELETE `/api/projects/:id/resources/:resourceId/save` remains.
The new DELETE body is `{ "projectId": "<actual-project-UUID>" }`;
save still accepts optional CONSIDERING/TRYING/INTEGRATED status.
Saving requires a recommendation previously retrieved for that project.

Example POST search body (use an existing project UUID in the route):

```json
{
  "query": "fake news classification",
  "categories": ["GITHUB_REPOSITORY", "AI_MODEL", "DATASET", "API"],
  "providers": ["github", "huggingface", "apis_guru"],
  "languages": ["Python"],
  "tasks": ["text-classification"],
  "includeArchived": false,
  "explain": true,
  "page": 1,
  "limit": 10,
  "minRelevance": 20,
  "sort": "relevance"
}
```

Omit query for AI provider-specific planning. Query generation is cached by
project snapshot/analysis/provider state. Explicit query + explain=false requires no AI.
`huggingface` selects both adapters; individual model/dataset adapter names are
also accepted. Other names: github, uci, kaggle, apis_guru, technical.

Abbreviated actual successful workflow response:

```json
{
  "success": true,
  "data": {
    "query": "factchecktools",
    "partial": false,
    "explanationStatus": "GENERATED",
    "explanationError": null,
    "providerStatuses": [{"provider": "apis_guru", "status": "OK", "count": 1, "queries": 1}],
    "pagination": {"page": 1, "limit": 1, "total": 1}
  }
}
```

IDs, source metadata, rankings and the items array are omitted from this excerpt,
not omitted from the actual response.

GET filter example:

```text
/api/projects/<UUID>/resources?provider=github&category=GITHUB_REPOSITORY&minRelevance=40&sort=lastUpdated&page=1&limit=10
```

GET latest recommendations reads their immutable source snapshots; later searches
in another project cannot silently replace the facts behind an older explanation.
GET resource details/saved resources show the latest global metadata. Saved-resource
scores are the best observed scores from that project's searches, never another project's.
Failed searches remain in history but do not replace the latest completed recommendation list.

POST pagination pages the bounded discovered pool, not an unbounded upstream
search. Default pool cap is 24, configurable up to 40. GitHub adapters also expose
explicit upstream page/limit options. History is paginated and includes each
query's adapter/provider, parameters, status, count, duration, cache flag and safe error.

## Persistence

Existing resources/resource_searches/resource_recommendations/saved_resources are
extended, not duplicated. Added resource_providers and resource_search_queries.
Indexes cover canonical URL, provider/external identity, update date, search and
provider query history. The additive migration is `0003_safe_squirrel_girl.sql`.

Provider rows are locked in stable order for identity-aware global upserts.
Canonical URL uniqueness remains database-enforced. Existing records are preserved;
no destructive historical deduplication or SQLite conversion is performed.
Each search stores the linked analysis version ID, generated query plan, diagnostics,
partial/cache/explanation status and per-recommendation source snapshot.
No provider credentials are stored.

## Caching, limits and security

- Provider cache keys include adapter, normalized query, languages, topics, tasks,
  archive setting and page size. In-flight identical requests share work.
- Query planning is separately cached against project/analysis/provider state.
- Retrieval/plan TTL: CACHE_TTL seconds; bounded caches evict old entries.
- APIs.guru's large aggregate directory has its own bounded 15-minute cache.
- Failures are not cached as successful empty results. Rate limits set a bounded
  cooldown and report safe codes/Retry-After where available.
- Two HTTP attempts at most, with bounded backoff. Long Retry-After is reported,
  not ignored or slept through indefinitely.
- Shared provider budget defaults to 3 operations across simultaneous searches.
- Per-attempt timeout includes response-body reading; ordinary responses are capped
  at 2 MB, only the official APIs.guru directory is allowed up to 16 MB.
- Outbound fetch hosts are explicitly allowed, HTTPS-only, and redirects rejected.
  URLs never contain caller-supplied credentials or arbitrary destination hosts.
- APIs.guru external links reject credentials, ports, IP literals/local/internal
  addresses and non-HTTPS schemes. Those external destinations are returned, never fetched.
- No repository code executes, no package installs automatically, and no security
  audit or license compatibility is claimed.

Only retrieval/plans are cached; each search still records its own history and
may generate fresh explanations. No durable/distributed cache or job queue is claimed.
Automatic query sanitization is prompted, not a formal PII-removal guarantee;
use an explicit public query when disclosure sensitivity matters.

## Environment

Required for the running backend: DATABASE_URL and the service's PORT.
On Replit those are supplied through the existing setup.
AI_PROVIDER/AI_MODEL and the existing managed AI variables are needed only for
automatic query generation/explanations. No extra AI integration is required.

| Variable | Default / use |
| --- | --- |
| GITHUB_TOKEN | Optional; anonymous GitHub search otherwise |
| HUGGINGFACE_TOKEN | Optional; public Hub otherwise |
| KAGGLE_ENABLED | false; explicit opt-in |
| KAGGLE_USERNAME / KAGGLE_KEY | Both required to enable Kaggle |
| CACHE_TTL | 900 seconds |
| EXTERNAL_TIMEOUT_MS | 8000 per attempt |
| PROVIDER_CONCURRENCY | 3, allowed 1–4 |
| PROVIDER_PAGE_SIZE | 5, allowed 1–10 |
| RESOURCE_RESULT_LIMIT | 24, allowed 1–40 |
| RANK_WEIGHTS | Optional positive-total JSON matching documented components |
| API_RATE_LIMIT / AI_RATE_LIMIT | Existing route limits, defaults 120 / 10 per minute |
| AI_TIMEOUT_MS / AI_MAX_ATTEMPTS | Existing Phase 02 defaults 45000 / 2 |

Store actual credentials in workspace Secrets, never source or examples.
Connecting GitHub for repository pushes does not populate the application's
optional GITHUB_TOKEN automatically.

## Verification and remaining limits

- Active and legacy TypeScript builds passed.
- **121 current backend tests + 28 retained legacy tests passed**.
- 32 new checks cover provider metadata/auth/task matching, normalization, safe
  URLs, query planning, concept scoring, cache/single-flight/shared concurrency,
  timeouts/rate limits, citations, history, snapshots, persistence, filters and saves.
- Development migration applied successfully.
- Live GitHub: retrieved KaiDMML/FakeNewsNet.
- Live Hugging Face: retrieved a fake-news text-classification model and a public
  fake/real-news dataset. This proves retrieval, not fitness or data quality.
- Live UCI: retrieved Iris metadata as an endpoint smoke check; Iris was **not**
  presented as a fake-news recommendation.
- Live APIs.guru and official technical destinations succeeded.
- Kaggle: **disabled, no credentials configured**; authentication behavior is
  mocked/tested, not claimed live.
- A broad directory search initially returned unrelated incidental matches and
  rejected explanations. Matching now prioritizes names/categories/phrases and
  enforces whole-word terms. The refined single-source workflow passed search,
  explanation abstention, persisted query history, save and remove.

Provider coverage is not exhaustive; upstream APIs, quotas, metadata or official
documentation can change. Rate limits depend on token/account/provider policy,
not a promised fixed allocation. Check official provider docs for current limits.
Directory-reported links/licenses and timestamps require review before use.
Full semantic factual correctness remains unproven; a strict batch can lose AI
explanations when any source-citation check fails, while keeping retrievals.
No new frontend/authentication or public production release is part of this phase.

Normal tests use mocked external responses and isolated storage; no live
availability or real credentials are needed:

```sh
cd backend
npm run build
npm run build:legacy
npm test
npm run test:legacy
npm run db:migrate
# Manual only: actual HTTP calls and a billed AI explanation request
npx tsx scripts/smoke-phase03.ts
```

## Updated module tree

The existing backend layout/entry points remain. New and extended files:

```text
backend/
├── src/phase01/
│   ├── app.ts
│   ├── config.ts
│   ├── contracts.ts
│   ├── analysis/                         # Phase 02 unchanged
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations/
│   │       ├── 0003_safe_squirrel_girl.sql
│   │       └── meta/{0003_snapshot,_journal}.json
│   └── resource-intelligence/
│       ├── types.ts
│       ├── http.ts
│       ├── providers.ts
│       ├── apis-guru.provider.ts
│       ├── query.service.ts
│       ├── retrieval.service.ts
│       ├── normalize.ts
│       ├── ranking.ts
│       ├── explanation.service.ts
│       ├── dto.ts
│       ├── cache.ts
│       └── search.service.ts
├── scripts/smoke-phase03.ts
└── tests/phase01/
    ├── resource-engine.test.ts
    ├── resources.test.ts
    └── fixtures.ts
```
