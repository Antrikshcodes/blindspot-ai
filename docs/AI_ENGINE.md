# AI engine — implemented Phase 01

## Phase 02 update

Idea analysis now uses six dedicated version-controlled prompts with schema,
grounding and ID validation. Risk scoring is separate provider-independent code.
See [Phase 02 engine](PHASE02_AI_ENGINE.md) for the active pipeline, schemas,
evidence policy, versioned storage, interview question reuse and tests.

The provider interface now supports optional token usage reporting. Timeout is
configurable via AI_TIMEOUT_MS (45000 default); AI_MAX_ATTEMPTS defaults to 2,
maximum 3. SDK transport retries are disabled so retries do not multiply.
This supersedes the older timeout/retry description below.

## Replaceable interface

`LLM.generate(task, input, ZodSchema)` separates orchestration from the provider.
Runtime adapters:

- `AI_PROVIDER=replit`: OpenAI SDK through Replit AI Integrations, using managed
  `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.
  No user API key is needed; usage is billed to Replit credits.
- `AI_PROVIDER=openai`: OpenAI SDK with configured `AI_API_KEY`, optional compatible
  `AI_BASE_URL`, and model setting. Compatible endpoints must support JSON schemas.
- `AI_PROVIDER=disabled`: explicit 503 for AI-only operations; no canned output.

Default model: `gpt-5.4-mini`; maximum completion tokens 8192. No temperature
parameter is supplied for this reasoning model. Model/provider settings are
environment configuration, not scattered API calls.

## Structured workflows

| Workflow | Input | Output / grounding |
| --- | --- | --- |
| Idea analysis | Current project snapshot and optional market context | Clarity, 3–15 hypotheses, independent impact/uncertainty, required evidence and validation method, next steps |
| Interview generation | Current project + latest analysis assumptions | Questions/listen-for hints tied to supplied assumption IDs |
| Feedback analysis | Original notes with feedback IDs + latest assumptions | Themes, quote-linked evidence, contradiction pairs, evidence gaps and unsupported conclusions |
| Experiment suggestion | A real assumption and its project | Rationale, method, evidence to collect and explicit success criteria; never fabricated results |
| Requirement extraction | Project + latest analysis, if present | Technical requirements and concise provider-search keywords |
| Resource explanation | Only retrieved candidates with server-issued IDs | Use case, explanation, estimated difficulty, caveats and alternatives among those candidates |

Schemas are strict. The SDK requests JSON-schema output; Zod validates it before
it is returned. Structured-output failures are retried once; transport retry is
bounded by SDK configuration. Provider failures return explicit errors.

## Safety and evidence rules

- New assumptions always receive server-owned `UNTESTED` status.
- Impact × uncertainty is computed by code, not accepted as an AI risk score.
- User text and all retrieved metadata are explicitly untrusted data in prompts.
- Raw interview notes are stored unchanged. Every generated evidence quote must
  be an exact substring of a supplied note with a valid ID.
- Every assumption/feedback reference is checked within its project.
- Contradictions require two distinct real feedback records and exact quotes.
- Feedback analysis stores **suggestions requiring review** and does not change
  assumption status. An API caller must explicitly cite appropriate evidence
  to record a supported/invalidated/inconclusive outcome.
- Experiment completion never marks an assumption validated.
- Resource output schemas cannot add source metadata or URL fields; candidate IDs
  and alternatives are checked, and generated HTTP URLs invalidate explanations.
- Unknown capabilities, legal license suitability and security remain unverified.

These controls reduce hallucination and prompt-injection risk; they do not prove
that a model followed every instruction or that a generated interpretation is true.
No fetched content is executed.

## Operational bounds

- Per-process maximum 2 concurrent AI operations; excess receives 429.
- AI route limit default 10 requests/minute per client IP.
- SDK timeout 45 seconds per request; at most one transport retry.
- At most two structured-output attempts. Combined retries can take longer than
  a single request timeout; callers must handle busy/timeout errors.
- Notes analysis: up to 50 notes and 100,000 total characters per project batch.
- No live AI calls in the normal test suite; test doubles never populate production.
- Optional manual `node scripts/smoke-phase01.mjs --ai` is real and billed,
  and cleans up its temporary project.

## Remaining work

No claim of calibrated model confidence, benchmarked hallucination rate, semantic
evidence verification, full prompt-injection prevention or automatic market
validation. Human review, a larger provider-independent evaluation corpus and
production authorization remain necessary.
