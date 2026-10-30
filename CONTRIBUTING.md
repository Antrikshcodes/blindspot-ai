# Contributing to Blindspot AI

Welcome to **Blindspot AI**! This project is being engineered for **CoNSTruct 2.0 (Replit × Newton School of Technology)** by team **Null Theory**.

This guide outlines our team standards, Git branching model, commit conventions, code review protocols, and quality requirements.

---

## 1. Team Roster & Branch Ownership (Null Theory)

| Team Member | Official Role | Assigned Branch | Primary Engineering Scope | GitHub Profile |
|:---|:---|:---:|:---|:---|
| **Antriksh** | Project Lead & Full-Stack Architect | `develop` / `main` | System architecture, sprint management, integration oversight, Replit deployment | [@Antrikshcodes](https://github.com/Antrikshcodes) |
| **Poorvi** | Frontend and Research | `poorvi` | User research synthesis, Mom Test script design, UI wireframes, Idea Intake form, Assumption Matrix views | [@poorvig222](https://github.com/poorvig222) |
| **Pavitr Makhija** | Backend and API Integration | `pavitr` | Server setup, REST API routes, database persistence (SQLite/PostgreSQL), schema validation, endpoint integration | [@pavitrmakhija](https://github.com/pavitrmakhija) |
| **Saureet** | Full Stack | `saureet` | AI orchestration, prompt engineering templates, structured JSON parsing, deterministic 2D risk scoring engine | [@saureetc007](https://github.com/saureetc007) |
| **Jagrit** | Testing & Frontend | `jagrit` | Automated test suites (unit/integration/E2E), edge-case validation, CI pipeline test automation, frontend component testing | [@codesjagrit](https://github.com/codesjagrit) |

---

## 2. Git Branching Strategy

Our repository operates with dedicated team-member development branches alongside feature branches:

```
main (Production / Stable Releases only)
│
└── develop (Active Integration Branch)
    │
    ├── poorvi                 (Poorvi: Frontend & Research workspace)
    ├── pavitr                 (Pavitr: Backend & API Integration workspace)
    ├── saureet                (Saureet: Full Stack & AI Engine workspace)
    └── jagrit                 (Jagrit: Testing & Frontend QA workspace)
    │
    ├── feature/idea-submission          (Step 1: Intake form & validation)
    ├── feature/assumption-engine        (Step 2: AI assumption extraction)
    ├── feature/risk-scoring             (Step 3: Deterministic risk matrix)
    ├── feature/interview-generator      (Step 4: Mom Test question generator)
    ├── feature/feedback-analysis        (Step 5: Customer note parser)
    ├── feature/contradiction-detection  (Step 6: Evidence conflict detection)
    └── feature/experiment-engine        (Step 7: Falsification experiment board)
```

### 2.1 Branch Rules
* **`main`**: Protected branch. Represents verified, production-ready releases deployed to Replit. **Direct pushes are strictly prohibited.**
* **`develop`**: Central integration branch. All feature branches originate from and merge back into `develop` via approved Pull Requests.
* **`feature/*`**: Individual feature branches created from `develop`.
* **`bugfix/*`**: Branches dedicated to fixing identified defects from `docs/KNOWN_ISSUES.md`.
* **`docs/*`**: Branches reserved for documentation and architecture updates (e.g., `docs/repository-foundation`).

### 2.2 Branch Naming Conventions
* `feature/<feature-name>` (e.g., `feature/idea-submission`)
* `bugfix/<issue-id>-<short-description>` (e.g., `bugfix/issue-001-package-manifest`)
* `docs/<topic>` (e.g., `docs/api-specs`)
* `test/<component>` (e.g., `test/scoring-engine`)

---

## 3. Commit Message Conventions (Conventional Commits)

Commit messages must be descriptive and follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short imperative description>

[optional body explaining motivation and changes]

[optional footer referencing issue ID]
```

### Allowed Types
* `feat`: A new user-facing capability or service feature.
* `fix`: A bug fix or defect resolution.
* `docs`: Documentation updates, architecture notes, or markdown fixes.
* `style`: Code style/formatting changes that do not alter logic (white-space, formatting).
* `refactor`: Code changes that neither fix a bug nor add a feature.
* `test`: Adding missing tests or correcting existing tests.
* `chore`: Build tooling, dependency management, or CI configuration updates.

### Examples
* `feat(assumptions): implement 2D risk matrix calculation`
* `fix(parser): handle empty interview feedback transcripts gracefully`
* `docs(architecture): document database schema models`
* `test(scoring): add unit tests for lethal risk flag logic`

---

## 4. Development & Pull Request Workflow

### Step 1: Branch from `develop`
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Step 2: Implement Changes Locally
* Write clean, modular, documented code.
* Add or update unit tests covering newly added business logic.
* Ensure no secrets, `.env` files, or temporary artifacts are present.

### Step 3: Run Pre-Commit Checks
```bash
# Verify no .env files are staged
git status

# Run automated tests once test suite is active
# npm test
```

### Step 4: Commit and Push
```bash
git add .
git commit -m "feat(module): describe changes concisely"
git push -u origin feature/your-feature-name
```

### Step 5: Open a Pull Request
1. Open a PR on GitHub targeting the **`develop`** branch (never target `main` directly for feature work).
2. Complete all sections of the auto-populated [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md):
   * Summary of changes.
   * Type of change checkbox.
   * Testing verification checklist.
   * Linked issue IDs.
3. Request reviews from at least one fellow teammate from Null Theory.

---

## 5. Code Review & Quality Standards

Every Pull Request must satisfy the following checklist before merge approval:

1. **Architecture Alignment:** Changes must conform to patterns defined in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
2. **Deterministic Outputs:** AI-related logic must parse and validate outputs against strict schemas (Zod/Pydantic). No unverified hypotheses presented as facts.
3. **Zero Leaked Credentials:** PR diff must contain zero API keys, tokens, or credentials.
4. **Clean Git History:** Rebase or Squash and Merge into `develop` to maintain a readable linear commit log.
5. **No Broken Builds:** GitHub Actions CI must pass cleanly.

---

## 6. Engineering Standards

1. **No Phantom Code:** Never write mock API responses and describe them as completed live integrations.
2. **Minimalist SaaS Design:** Avoid generic AI aesthetics, excessive gradients, and gratuitous animations. Prioritize clarity and usability.
3. **Maintain Backward Compatibility:** Strive to prevent breaking changes to shared schemas in `shared/`.
4. **Document Decisions:** Record substantial architectural trade-offs in `docs/ARCHITECTURE.md`.
