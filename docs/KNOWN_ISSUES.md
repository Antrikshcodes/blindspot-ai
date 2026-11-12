# Known Issues and Release Gaps

This file reflects the current repository audit. Historical issue records below
are retained only as history; they are not a statement of current status.

## Verified limitations

- The main backend acceptance checklist remains incomplete. Profile/role APIs,
  project archive/filtering, richer interview response lifecycle, evidence
  listing, experiment result synthesis, and project analytics are still listed
  as unfinished in [FINAL_BACKEND_CHECKLIST.md](FINAL_BACKEND_CHECKLIST.md).
- Clerk ownership code and tests exist, but complete live sign-in, invalid and
  expired session, cross-user isolation, and all nested-resource authorization
  journeys have not been verified against a configured Clerk application.
- Production hosting, TLS database connectivity, secrets, backups, restore,
  DNS, and post-deployment health have not been verified. Production deployment
  is manual and gated; no deployment was performed in this audit.
- AI interpretations can be wrong even when responses pass schema and quote
  validation. Provider availability and rate limits vary.
- Resource search is based on a bounded set of providers and heuristic ranking;
  it is not comprehensive web search or a benchmarked relevance model.
- Cache, rate limiting, and AI concurrency controls are process-local.
- Live provider credentials and live Kaggle access are not configured or tested.
- Docker image builds are delegated to GitHub Actions; Docker is not available
  in this local environment.

## Resolved historical entries

The old issue register below records the repository's early scaffolding phase.
Its claims that the repository lacks manifests, source code, or a frontend are
stale and must not be used as a current status report.

