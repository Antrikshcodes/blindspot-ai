# Known Issues & Technical Debt: Blindspot AI

## Current Phase 01 limitations

- No real authentication/ownership layer or frontend. Production fails closed.
- Literal keyword search can miss useful repositories/datasets. Ranking is an
  explainable heuristic, not a benchmarked relevance model.
- Technical API/docs/tools discovery is a small reviewed catalog, not web search.
- GitHub README presence and license compatibility/difficulty can remain unknown.
- Provider availability/rate limits change; partial searches expose failures.
- Cache/rate limits and AI concurrency are process-local, not horizontally shared.
- Model interpretations can be wrong despite schema/citation validation.
- Notes analysis has a bounded batch size and targets the latest analysis.
- Shared legacy interfaces are not yet a client contract for the new backend.
- Legacy SQLite data import and production release/authorization are separate work.
- Four moderate dev-only drizzle-kit/esbuild-chain audit findings remain; high and
  critical findings were removed with non-breaking dependency updates.

See [roadmap](ROADMAP.md#phase-01-status) and [resource limitations](RESOURCE_INTELLIGENCE.md).

## Historical issue register

**Document Version:** 1.0.0  
**Status:** Active  
**Maintained by:** Null Theory Engineering Team  

---

## 1. Issue Management Policy

All potential defects, missing dependencies, and architectural bottlenecks must be formally logged here.
* **Verified Issues:** Problems confirmed through local testing, static code analysis, or repository audits.
* **Unverified Concerns:** Theoretical risks or assumptions requiring further investigation before entering the active fix queue.

---

## 2. Verified Technical Issues

### ISSUE-001: Absence of Declared Runtime Dependencies
* **Severity:** Medium (Foundational Gap)
* **Affected Component:** Root Repository / Backend / Frontend
* **Status:** Scheduled for Day 2
* **Description:**  
  The repository contains directory scaffolding (`frontend/`, `backend/`, `shared/`, `tests/`) but has no package manager manifests (`package.json`, `pnpm-lock.yaml`, `requirements.txt`, etc.). As a result, no build or development server can currently be launched.
* **Reproduction Steps:**
  1. Clone repository locally.
  2. Attempt `npm install` or `pip install -r requirements.txt`.
  3. Command fails due to missing manifest files.
* **Proposed Solution:**  
  Initialize root workspace or individual subsystem manifests during Day 2 technical stack setup.

---

### ISSUE-002: Missing Replit Execution Configuration (`.replit` / Nix)
* **Severity:** Medium (Deployment Gap)
* **Affected Component:** Deployment / Replit Runtime
* **Status:** Scheduled for Day 2–3
* **Description:**  
  The repository is targeted for deployment on Replit for CoNSTruct 2.0 evaluation, but does not yet contain `.replit` configuration specifying the `run` command or the Nix environment dependencies.
* **Reproduction Steps:**
  1. Import repository into Replit.
  2. Click "Run".
  3. Replit prompts for manual run command configuration because `.replit` is absent.
* **Proposed Solution:**  
  Add a verified `.replit` file specifying the concurrent frontend/backend development command once the runtime stack is established.

---

### ISSUE-003: Placeholder Directories Lack Source Code
* **Severity:** Low (Expected at Day 1 Foundation Stage)
* **Affected Component:** `frontend/`, `backend/`, `shared/`, `tests/`
* **Status:** Tracked (In Progress across Sprint Roadmap)
* **Description:**  
  Each functional subsystem directory currently contains only a descriptive `README.md` file. While structurally clean, developers cannot execute tests or run client-server loops.
* **Reproduction Steps:**
  1. Inspect `ls frontend/` or `ls backend/`.
  2. Observe only `README.md`.
* **Proposed Solution:**  
  Scaffold base files according to Phase 2 (Days 3–4) and Phase 3 (Days 5–9) of the feature roadmap.

---

### ISSUE-004: Unspecified AI Provider in Environment Blueprint
* **Severity:** Low (Configuration Gap)
* **Affected Component:** Configuration / `.env.example`
* **Status:** Scheduled for Day 2
* **Description:**  
  `.env.example` specifies a generic `AI_API_KEY` placeholder without declaring provider-specific parameters (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, model names, base URLs).
* **Reproduction Steps:**
  1. Open `.env.example`.
  2. Notice ambiguity around which AI provider SDK is targeted.
* **Proposed Solution:**  
  Update `.env.example` to explicitly document the chosen provider's keys, endpoints, and default model identifiers.

---

## 3. Unverified Concerns & Architectural Risks

| Concern ID | Description | Potential Impact | Investigation Plan | Status |
|:---|:---|:---|:---|:---|
| **CONCERN-001** | Replit free/standard tier CPU/RAM constraints during full-stack compilation. | Build timeouts or slow hot-reloading on Replit. | Benchmark sample Vite + Express build on Replit during Day 2 stack validation. | Under Investigation |
| **CONCERN-002** | LLM API rate limits when multiple team members run integration tests concurrently. | Failed test runs due to HTTP 429 errors. | Implement mock AI provider adapter for local and CI testing; only use live LLM for end-to-end verification. | Under Investigation |
| **CONCERN-003** | Potential non-deterministic JSON responses from smaller LLM models. | Parsing exceptions in feedback synthesis. | Enforce strict JSON Schema mode and Zod/Pydantic validation with automatic retry loops. | Architectural Mitigation Designed |

