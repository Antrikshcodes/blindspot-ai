# Final backend implementation checklist

## Scope and authentication decision

Complete the backend against the final implementation brief without building or
modifying frontend components. Preserve the existing website, working APIs,
PostgreSQL/Drizzle history, Phase 02 engine and Phase 03 resource providers.

The user explicitly chose to **keep Clerk**. Authentication implementation is
being merged separately. Reuse its verified identity/ownership boundary; do not
introduce a parallel password database or home-grown JWT/refresh-token system.
Registration, login, password security, recovery and session lifecycle must be
documented as Clerk-managed rather than falsely represented as local bcrypt/Argon2.

This is an audit/checklist, **not a completion or production-readiness claim**.
The final acceptance pass must run against the merged, integrated backend.

## Existing foundation to preserve

- [x] Express/TypeScript, PostgreSQL/Drizzle and explicit development migrations.
- [x] Project CRUD and input validation.
- [x] Six-stage versioned idea analysis, ten assumption categories and blindspots.
- [x] Deterministic priority scoring and explicit evidence-aware dimensions.
- [x] Assumption status changes gated by reviewed, linked evidence.
- [x] Generation of 8–12 targeted questions and interview session creation/listing.
- [x] Original interview notes, assumption mappings and quoted feedback analysis.
- [x] Basic experiment creation, lifecycle and observed-result storage.
- [x] Real-provider discovery, normalization, ranking, provenance and source snapshots.
- [x] Resource search history, filtering, saved resources and provider diagnostics.
- [x] Provider-independent structured AI, bounded retries/timeouts and safe logging.
- [x] Mocked external-service tests plus separately labeled limited live checks.

These checks reflect the preceding verified deliveries, not a fresh post-auth
verification. The latest baseline was 121 active and 28 retained legacy tests.

## Remaining integration/implementation

### Identity, authorization and user profile

- [x] Clerk identity/ownership baseline merged; further extensions must reuse it.
- [x] Offline automated tests reject anonymous, expired, forged, malformed, future and wrong-origin identities and verify two-user isolation; live Clerk flows remain unverified.
- [x] Offline automated tests cover ownership across project children, history, evidence, resources, search history and saves; live identity integration remains unverified.
- [ ] Add/verify GET/PATCH user profile and server-controlled USER/ADMIN roles.
- [ ] Document exact provider-backed auth flows and any non-equivalent REST routes.
- [x] Offline tests cover allowed frontend-origin cookie writes, cross-site/originless write rejection, and fail-closed auth; live browser verification remains open.

### Projects and historical reads

- [ ] Add industry/category, user-declared technical requirements and project status.
- [ ] Add archive/restore, filtering and sorting without deleting project history.
- [ ] Add analysis history and project-wide assumption read endpoints.
- [ ] Preserve existing latest-analysis and interview-question routes; add requested aliases.

### Interviews

- [ ] Add session detail/update and lifecycle/completion tracking.
- [ ] Add participant context without replacing original participant labels/notes.
- [ ] Store individual responses with question/assumption/source associations.
- [ ] Track answered/unanswered questions and reject cross-project references.
- [ ] Preserve existing raw-feedback endpoint and long-note behavior.

### Feedback and evidence

- [ ] Extend feedback synthesis with source-backed, categorized finding records:
  themes, pain points, contradictions, insights, workarounds, buying signals,
  weak evidence, gaps and unsupported assumptions.
- [ ] Preserve verbatim notes and enforce exact evidence references/quotes.
- [ ] Add feedback listing and project evidence create/list/detail APIs.
- [ ] Keep AI-generated interpretations explicitly distinct from verified facts.
- [ ] Never automatically mark generated assumptions SUPPORTED.

### Experiments and next-step recommendations

- [ ] Add objectives, hypotheses, methodology, audience, resources, duration,
  failure criteria and multiple tested assumptions.
- [ ] Add detail and result-submission APIs with immutable observed result records.
- [ ] Support CANCELLED while preserving older ABANDONED records/contracts.
- [ ] Ground experiment planning in priorities, real feedback, evidence gaps and
  previous results; separate predictions from observations.
- [ ] Add result synthesis and next-experiment recommendations with source references.

### Resources and analytics

- [ ] Add maintenance-status filtering to the existing resource query paths.
- [ ] Add project analytics/activity based on stored records, not invented metrics.
- [ ] Re-verify global resource reuse without exposing another project's private history.
- [ ] Keep Kaggle explicitly unavailable until configured; do not claim live auth verification.

### Handoff and acceptance

- [ ] Update current API documentation and full endpoint catalogue.
- [ ] Add AUTHENTICATION.md and BACKEND_INTEGRATION_GUIDE.md.
- [ ] Document schemas, errors, pagination, types and complete client workflow.
- [ ] Update architecture/schema/setup/roadmap/environment templates.
- [ ] Provide safe development-only deterministic fixtures/seed instructions.
- [ ] Verify migrations, TypeScript, complete mocked tests and critical identity flow.
- [ ] Verify managed Run/health and record deployment requirements without publishing.
- [ ] Report remaining limits and unmet checks honestly.

## Integration baseline

The Clerk ownership and cross-device analysis-history implementations have now
merged. The GitHub workspace sync passes type checks, backend compilation and
133 current backend tests. The broader final-backend implementation checklist
above remains open; do not treat this repository sync as its acceptance pass.
