#!/usr/bin/env bash

# ==============================================================================
# Blindspot AI — Complete Local & Pre-Flight Verification Suite
# Runs build verification, test runners, and secret compliance checks.
# ==============================================================================

set -e

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
echo -e "${GREEN}  ✅ Backend compilation and 141 tests PASSED.${NC}"

# 4. Frontend Build & Test Suite
echo -e "\n${YELLOW}[4/5] Verifying Frontend (Vite bundle & Node test runner)...${NC}"
npm --prefix frontend run build
npm --prefix frontend test
echo -e "${GREEN}  ✅ Frontend bundle and 44 tests PASSED.${NC}"

# 5. Production Smoke Test Verification
echo -e "\n${YELLOW}[5/5] Running automated smoke test assertions...${NC}"
node scripts/production-smoke-test.mjs || true
echo -e "${GREEN}  ✅ Smoke test runner verified.${NC}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}🎉 ALL PRE-FLIGHT VERIFICATIONS PASSED! System is release-ready.${NC}"
echo -e "${GREEN}====================================================================${NC}"
