#!/bin/bash
set -e
pnpm install --frozen-lockfile
# The product owns its existing Phase 01 schema. The empty starter DB library
# must not push a replacement schema into it.
npm --prefix repositories/blindspot-ai/backend ci --no-audit --no-fund
# Apply the product's reviewed, additive development migrations after merges.
# This is not a production startup or deployment hook.
(cd repositories/blindspot-ai/backend && NODE_ENV=development npm run db:migrate)
