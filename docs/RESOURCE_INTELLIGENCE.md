# Resource intelligence — implemented Phase 01

This is a backend discovery engine, not a directory of AI-invented links.
No curated examples are seeded as recommendations. External content is untrusted.

## Pipeline and boundaries

1. Load the project and latest analysis. For automatic search, the LLM extracts
   concise technical requirements and up to three search phrases.
2. Or accept an explicit query (maximum 150 characters), languages and categories.
3. Query eligible enabled provider adapters in parallel.
4. Parse provider responses, normalize HTTPS destinations, remove tracking
   parameters and reject unsupported provider/host/path combinations.
5. Deduplicate by canonical URL, then compute transparent scores.
6. Keep at most eight relevant candidates. Optionally request one structured AI
   explanation batch for those candidates only.
7. Validate that each explanation references a supplied server-created ID and that
   all alternatives are among those candidates. Reject extra metadata/URL fields,
   invented IDs, duplicate candidate IDs and embedded HTTP URLs.
8. Persist the search, reusable source records, immutable source snapshots and
   project/search-specific recommendations in one transaction.

AI does **not** create resources, licenses, source metadata or destination URLs.
If explanation generation fails, genuine source results remain usable with
`explanationStatus=UNAVAILABLE` and null explanations. A schema-valid explanation
can still be wrong: the response marks it as AI-generated and review-required.
Instructions embedded in a model card or repository description are data, not
commands. Nothing fetched from a repository is installed or executed.

## Implemented provider adapters

| Adapter | API / source | Behavior and limits |
| --- | --- | --- |
| GitHub | `GET https://api.github.com/search/repositories` | Public repositories only; 5 candidates; optional first-language filter. Collects owner/name/description/URL/stars/forks/language/topics/pushed timestamp/license/archived flag. README presence is unknown, not guessed. |
| HF models | `GET https://huggingface.co/api/models` | 4 candidates, full/card metadata where returned, task/downloads/likes/tags/license. Attempts bounded README/model-card retrieval; failed reads remain unknown. |
| HF datasets | `GET https://huggingface.co/api/datasets` | 4 candidates with the same provenance rules. |
| UCI | `GET https://archive.ics.uci.edu/api/datasets/list?search=...`, then `/api/dataset?id=...` | Up to 3 details; collects task and size dimensions where returned. License is unknown when the API omits it. Public endpoint availability is external and may change. |
| Kaggle | `GET https://www.kaggle.com/api/v1/datasets/list` | Optional, disabled by default; up to 4 public metadata results. Optional configured credentials; no downloads, restricted data or license acceptance. |
| Technical resources | Reviewed fixed catalog of official Hugging Face, GitHub, MDN, scikit-learn and PyTorch destinations | Matches keywords and checks destination availability with HTTP HEAD before returning. Covers API, documentation, open-source tools and learning resources. Not a general web-search service. |

An empty provider result is a real empty result, not proof there is no suitable
resource. Search terms are literal provider queries; domain synonyms and
multi-query expansion remain future retrieval-quality work.
GitHub popularity sorting is not used as the final ranking criterion.
Private repositories and private datasets are not returned.

All seven categories are supported in contracts/storage:
`GITHUB_REPOSITORY`, `DATASET`, `AI_MODEL`, `API`, `DOCUMENTATION`,
`OPEN_SOURCE_TOOL`, `LEARNING_RESOURCE`.

## Ranking

Separate outputs:

- **relevanceScore**: 0–100 lexical coverage of query terms in name, description
  and tags. It is a transparent heuristic, not a probability or an AI confidence score.
- **qualitySignals**: raw observed metrics or null; null means unknown.
- **qualityScore**: a conservative metadata indicator, independent of relevance.
  Unknown components contribute no positive points.
- **rankScore**: weighted combination used for ordering, not an endorsement.

Default weights:

| Component | Weight | Meaning |
| --- | ---: | --- |
| Relevance | 0.65 | Query-term coverage |
| Compatibility | 0.10 | Requested language matches returned language; otherwise unknown/mismatch |
| Documentation | 0.08 | Observed card/docs presence; otherwise unknown |
| Maintenance | 0.08 | Last source update: ≤180 days=100, ≤730 days=50, older=0 |
| License availability | 0.04 | License metadata exists, **not** legal compatibility |
| Maturity | 0.05 | Log-scaled stars or downloads; bounded and not primary |

Weights can be supplied as a complete validated `RANK_WEIGHTS` JSON object.
Archived repositories get a 50% rank penalty and retain their explicit archived flag.
Integration difficulty and license compatibility stay UNKNOWN in deterministic
ranking: this phase has insufficient verified information to score them honestly.
The AI may estimate difficulty in a separately labeled explanation; it does not
feed that estimate back into source metadata or the rank.

## Result contract

`POST /api/projects/:id/resources/search`:

```json
{
  "query": "text classification",
  "categories": ["GITHUB_REPOSITORY", "DATASET", "AI_MODEL"],
  "languages": ["Python"],
  "explain": false
}
```

With no query, automatic requirements extraction uses the configured LLM.
With an explicit query and `explain=false`, no AI call is needed.

Response data contains `searchId`, `projectId`, `query`, `requirements`, `cached`,
`providerStatuses`, `explanationStatus`, and `items`.
Each item contains:

- `resource`: ID/category/name/description/provider/externalId/URL/license/language/
  tags/sourceUpdatedAt/retrievedAt/qualitySignals/sourceMetadata.
- `relevanceScore`, `qualityScore`, `rankScore`, and `ranking` with components,
  weights, matched terms, unknown signals and disclaimers.
- `explanation`: null or AI-generated recommendedUseCase/explanation/
  integrationDifficulty/limitations/alternativeResourceIds/reviewRequired.
- Immutable `sourceSnapshot`, `searchId`, `resourceId` and recommendation ID.

`sourceUpdatedAt` is an externally reported date, **not** the retrieval time.
API pricing, quota, security and license suitability are not established.
The source detail endpoint returns current source metadata, while recommendation
snapshots preserve what was available when that search ran.

## Cache, limits and failure reporting

- Process-local TTL cache, default 900 seconds, at most 100 retrieval result sets.
- Key includes query, categories, languages and enabled provider configuration.
- Explanations are not cached; repeated explained searches can incur AI charges.
- Cache does not contain full ideas, interview notes or credentials.
- HTTP timeout default 8 seconds per attempt, at most 2 attempts; no redirects;
  response body maximum 2 MB. Provider sequences may take multiple attempts.
- Provider statuses: OK, FAILED, DISABLED. Partial results expose failures.
- All failed/disabled providers: 503; no substitute resources are fabricated.
- Failed partial searches are not stored in the long-lived retrieval cache.
- A provider with valid zero results still counts as a successful response.

## Extension points and remaining limits

Implement `Provider` for additional real public sources, explicitly register
destination hosts, and add transport-mocked tests. Never let an AI choose fetch
destinations. Review any new host/catalog entry for SSRF and redirect behavior.

No general crawler, embeddings/reranking service, distributed cache, background
refresh, code execution, repository audit, legal license review, comprehensive API
catalog, dataset download or production authentication is included.
