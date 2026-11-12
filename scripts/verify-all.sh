#!/usr/bin/env bash

# ==============================================================================
# Blindspot AI — Complete Local & Pre-Flight Verification Suite
# Runs build verification, test runners, and secret compliance checks.
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}🚀 Blindspot AI — Complete Pre-Flight Verification Suite${NC}"
echo -e "${BLUE}====================================================================${NC}\n"

# 1. Environment & Node Version
echo -e "${YELLOW}[1/5] Checking Node.js runtime environment...${NC}"
NODE_VERSION=$(node -v)
echo -e "  Node Version: ${NODE_VERSION}"

# 2. Secret Scan
echo -e "\n${YELLOW}[2/5] Scanning repository for unsafe secrets and .env files...${NC}"
if find . -maxdepth 3 -name ".env*" -not -name "*.example" -not -path "./.git/*" | grep -q "."; then
  echo -e "${RED}  ❌ Sensitive .env file detected in working tree!${NC}"
  find . -maxdepth 3 -name ".env*" -not -name "*.example" -not -path "./.git/*"
  exit 1
else
  echo -e "${GREEN}  ✅ No sensitive .env files found.${NC}"
fi

# 3. Backend Build & Test Suite
echo -e "\n${YELLOW}[3/5] Verifying Backend (TypeScript compilation & Vitest suite)...${NC}"
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run prisma:generate
npm --prefix backend run build:legacy
echo -e "${GREEN}  ✅ Backend build, tests, Prisma client generation, and legacy type check PASSED.${NC}"

# 4. Frontend Build & Test Suite
echo -e "\n${YELLOW}[4/5] Verifying Frontend (Vite bundle & Node test runner)...${NC}"
pnpm install --frozen-lockfile
pnpm --filter blindspot-ai-frontend build
pnpm --filter blindspot-ai-frontend test
pnpm run typecheck
echo -e "${GREEN}  ✅ Frontend bundle, tests, and workspace type checks PASSED.${NC}"

# 5. Production Smoke Test Verification
echo -e "\n${YELLOW}[5/5] Running automated smoke test assertions...${NC}"
if [[ -n "${PROD_URL:-}" ]]; then
  node scripts/production-smoke-test.mjs "$PROD_URL"
  echo -e "${GREEN}  ✅ Configured production smoke checks PASSED.${NC}"
else
  echo -e "${YELLOW}  ⏭️  Skipped live smoke checks: set PROD_URL to an explicit target.${NC}"
fi

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}🎉 Requested local build and test checks passed.${NC}"
if [[ -z "${PROD_URL:-}" ]]; then
  echo -e "${YELLOW}Live production behavior remains unverified.${NC}"
fi
echo -e "${GREEN}====================================================================${NC}"
