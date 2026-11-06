# Founder website

The website is the workspace package `artifacts/blindspot-web` at preview `/`.
It uses the existing `artifacts/api-server: API Server` service at `/api`.
It does not create a second backend or use the historical `/api/v1` API.

## Workflows

- `artifacts/blindspot-web: web` — Vite frontend
- `artifacts/api-server: API Server` — existing Phase 01 backend

## Founder workflows

- Create, view, edit or permanently delete a project and its owned records.
- Run analysis with optional market context; review risk-ranked hypotheses,
  required evidence and proposed validation methods.
- Generate interview questions for an alias, save original feedback with neutral
  hypothesis associations, and reload persisted notes.
- Analyze actual notes for themes, exact-quote evidence, contradictions, gaps
  and unsupported conclusions. AI interpretations require human review.
- Begin testing, explicitly cite linked evidence for an outcome, and reopen an
  outcome. Supported is not conclusive market validation.
- Create a manual or AI-drafted experiment, start/abandon it, and record an
  observed result before completion. Completion does not update hypotheses.
- Search actual providers with query/language/category filters or automatic
  requirement extraction; inspect current source metadata, immutable search
  snapshots, heuristic rank components and separate AI explanations.
- Save resources, change Considering/Trying/Integrated status, and remove a
  project save without deleting the global source. Saved resources remain
  accessible after later searches.

Lists paginate without assuming a total count. Provider failures, unavailable AI
explanations, missing metadata and zero results are not replaced with mock data.
Explicit-query searches with explanations off need no AI generation; automatic
requirement extraction still uses AI even when explanations are off.

## Contracts and verification

The browser specification is `lib/api-spec/openapi.yaml`. Its reproducible
builder is `scripts/blindspot-contract.mjs`. Regenerate client hooks and schemas
with `pnpm --filter @workspace/api-spec run codegen`. Do not edit generated
outputs by hand. Backend validation remains authoritative.

- Workspace checks: `pnpm run typecheck`
- Backend: `cd repositories/blindspot-ai/backend && npm test && npm run build`
- The additional `GET /api/interviews/:id/feedback` endpoint provides paginated
  persisted original notes and is covered in the backend integration suite.

## Current boundaries

This is a development preview, **not a private multi-user workspace**. Do not
publish until the separately planned identity and project authorization work is
implemented and checked on every project-owned endpoint, including feedback
reads. The existing production `AUTH_NOT_READY` gate has not been bypassed.

Analysis version navigation lists only versions this browser has encountered.
It is clearly labeled and does not claim to be a full server-side history.
Search provider statuses and explanation availability are displayed for the
search response; the persisted collection retains recommendations and source
snapshots, but does not expose a full search-history screen.

Do not claim security, pricing, quota or license suitability from source metadata
or AI explanations. No source content is installed or executed by the website.
