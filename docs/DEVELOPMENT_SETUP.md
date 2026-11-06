# Development Setup Guide: Blindspot AI

## Phase 02 setup note

Run the normal `npm ci` and explicit development `npm run db:migrate` to install
the additive analysis migration. Existing projects and historical analyses remain.
AI_TIMEOUT_MS defaults to 45000; AI_MAX_ATTEMPTS defaults to 2. Existing AI
provider/model/credential settings remain valid.

`npm test` includes the staged analysis, provider retry/timeout and migration
regression tests with no live services. Optional
`node scripts/smoke-phase02.mjs` makes six REAL billed AI stage calls and removes
its temporary project; it is not part of automated tests.
[Phase 02 report](PHASE02_AI_ENGINE.md).

## Phase 01 setup

Use **Node.js 24**, npm, and a development PostgreSQL database. Active code lives
under `backend/src/phase01`; the older setup below is archived planning context.

```sh
cd backend
npm ci
# Outside Replit only: copy backend/.env.example to backend/.env
# and configure a real development DATABASE_URL. Do not commit .env.
npm run db:migrate
npm run dev
```

On Replit the managed environment supplies PostgreSQL and configured AI access.
Use the workspace Secrets controls rather than writing credentials into source.
The existing managed API workflow starts this backend on its assigned PORT;
don't start a second server on the same port.

Default outside Replit: `GET http://localhost:3000/api/health`.
Replit preview: `/api/health`. No frontend is part of Phase 01.

### Configuration

See `backend/.env.example` for every setting. Required: a PostgreSQL DATABASE_URL.
PORT/NODE_ENV have development defaults.
Optional provider credentials: GITHUB_TOKEN, HUGGINGFACE_TOKEN,
KAGGLE_USERNAME/KAGGLE_KEY. Kaggle is disabled unless KAGGLE_ENABLED=true.

- Replit AI: AI_PROVIDER=replit; managed AI variables are provisioned automatically.
- External OpenAI/compatible: AI_PROVIDER=openai, AI_API_KEY and optional
  AI_BASE_URL; use an available model supporting structured JSON-schema output.
- No AI: AI_PROVIDER=disabled. Project CRUD and explicit-query resource searches
  with explain=false work; AI-only endpoints return 503 rather than fake output.
- Blank optional credential placeholders are accepted as omitted.

### Verification and migrations

```sh
npm run build          # active TypeScript build
npm test               # isolated Phase 01 PostgreSQL-compatible tests; mocked providers/AI
npm run test:legacy    # isolated original SQLite tests; safe temporary database
npm run build:legacy  # checks retained legacy source as well
```

`npm test` does not need a database URL or provider credentials and never calls
live external APIs. It applies checked-in migration SQL to a private PGlite
instance, not the developer's configured database.

`npm run db:generate` creates a migration after intentional schema changes.
`npm run db:migrate` explicitly applies migrations to development PostgreSQL and
refuses production mode. No schema pushes/startup migrations are used.
There is no implicit SQLite-to-PostgreSQL data conversion.

Optional real-service verification from the Replit workspace:

```sh
node scripts/smoke-phase01.mjs       # real public provider queries
node scripts/smoke-phase01.mjs --ai  # additionally makes one real, billed AI analysis
```

Outside Replit set SMOKE_BASE_URL to the server origin first. The script removes
its temporary project in a finally block. Globally cached real source records
may remain; it never inserts invented recommendations.

### Current release boundary

This is not ready for public production use: authentication/owner authorization
is deferred and non-health production routes deliberately return 503.
Do not bypass that protection by publishing with NODE_ENV=development.
The process-local rate limiter/cache will need shared infrastructure when scaled.

Package audit after safe non-breaking updates has **no high/critical findings**;
four moderate development-only findings remain in drizzle-kit's transitive
esbuild loader chain. The vulnerable esbuild serve feature is not used here.
Do not blindly apply npm's suggested breaking downgrade of drizzle-kit.
This dependency audit is not a security audit of the application or recommended repos.

## Historical setup guide — superseded for the active backend

**Document Version:** 1.1.0  
**Status:** Active Engineering Guide  
**Project:** Blindspot AI (CoNSTruct 2.0 — Replit × Newton School of Technology)  
**Maintained by:** Null Theory Engineering Team  

---

## 1. Prerequisites

Before setting up Blindspot AI locally, ensure you have the following runtime dependencies installed:

| Tool | Minimum Version | Recommended Version | Verification Command |
|:---|:---|:---|:---|
| **Git** | `2.30.0` | Latest (`2.40+`) | `git --version` |
| **Node.js** | `18.0.0` LTS | `20.x` LTS | `node --version` |
| **npm** | `9.0.0` | Latest (`10.x`) | `npm --version` |
| **Replit Account** | — | Active Account | Visit [replit.com](https://replit.com) |

---

## 2. Local Repository Initialization

### Step 2.1: Clone the Repository
Clone the repository and inspect branches:

```bash
git clone https://github.com/Antrikshcodes/blindspot-ai.git
cd blindspot-ai
```

### Step 2.2: Switch to the Integration Branch
All ongoing development branches out from and integrates back into `develop`:

```bash
git checkout develop
git pull origin develop
```

### Step 2.3: Configure Environment Variables
Create your local `.env` configuration file from the blueprint:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure the necessary variables.

---

## 3. Environment Variable Configuration

Below is the verified environment specification based on `.env.example`:

| Variable | Description | Required | Example / Default |
|:---|:---|:---:|:---|
| `PORT` | Local backend HTTP server port | Yes | `3000` |
| `NODE_ENV` | Application runtime environment | Yes | `development` (or `production`) |
| `DATABASE_URL` | Database connection string | Yes | `file:./dev.db` (SQLite) or Postgres URI |
| `AI_API_KEY` | Secret API key for the AI LLM provider | Yes | `sk-...` |
| `JWT_SECRET` | Secret key used for signing session tokens | Yes | Strong random 32-char string |
| `SESSION_SECRET` | Secret key used for cookie/session hashing | Yes | Strong random 32-char string |

> **Security Warning:**  
> Never commit `.env` to Git. The repository’s CI pipeline (`.github/workflows/ci.yml`) will fail the build immediately if any `.env` file is pushed to remote branches.

---

## 4. Current Repository State & Subsystem Structure

At the current Day 1 baseline, the repository contains the following architecture layout:

```text
blindspot-ai/
├── frontend/        # Frontend UI layer (README.md; framework scaffold scheduled Day 2–3)
├── backend/         # Backend REST API and AI engine (README.md; server scaffold Day 2–3)
├── shared/          # Shared TypeScript interfaces and schemas
├── tests/           # Unit, integration, and end-to-end test suites
├── docs/            # Engineering specifications, architecture, and roadmaps
└── assets/          # Static branding, diagrams, and screenshots
```

### Subsystem Startup (Roadmap Phase 2 Onward)

Once dependencies are initialized in Phase 2, the following commands will govern local execution:

```bash
# 1. Install all dependencies across the workspace
npm install

# 2. Run backend API server in development mode
cd backend && npm run dev

# 3. Run frontend interface in development mode (separate terminal)
cd frontend && npm run dev
```

---

## 5. Database Setup (Local & Production)

* **Local Development (Default):**  
  Zero-configuration SQLite database stored locally in `backend/data/dev.db`. Requires no external database daemon installation.
* **Production (Replit Deployments):**  
  Configured to connect to PostgreSQL (e.g., Replit PostgreSQL or Neon) via the `DATABASE_URL` environment variable.
* **Migrations Command (Target):**
  ```bash
  npm run db:migrate
  ```

---

## 6. Replit Cloud Setup & Deployment

Blindspot AI is engineered to run seamlessly on the Replit runtime for CoNSTruct 2.0 evaluation:

1. **Importing into Replit:**
   * Visit [replit.com](https://replit.com).
   * Select **Create Repl** → **Import from GitHub**.
   * Enter: `https://github.com/Antrikshcodes/blindspot-ai`.
2. **Configuring Replit Secrets:**
   * Navigate to the **Secrets** tool (padlock icon) in the Replit sidebar.
   * Add each required key from `.env.example`:
     * `AI_API_KEY`
     * `JWT_SECRET`
     * `SESSION_SECRET`
     * `DATABASE_URL`
3. **Running the Application:**
   * Click the **Run** button at the top of the workspace.
   * Replit executes the build script and surfaces the web interface in the built-in browser pane.

---

## 7. Testing & Quality Verification

### Run Automated Quality & Security Scans
```bash
# Scan working directory for leaked environment files
find . -name ".env" -not -path "./.git/*"

# Verify repository documentation integrity
test -f README.md && test -f CONTRIBUTING.md && test -f LICENSE && echo "Docs OK"
```

### Test Execution (Target Suite)
```bash
# Run all automated test suites
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

---

## 8. Troubleshooting & Common Pitfalls

### Issue: Port Already in Use (`EADDRINUSE: 3000`)
```bash
# Locate and terminate the process occupying port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: GitHub Push Fails with Remote Scope Warning
* Ensure your personal access token has the `repo` scope.
* For pushing changes modifying `.github/workflows/`, ensure your token includes the `workflow` scope.

### Issue: Git Working Tree Divergence
```bash
# Rebase your feature branch against the latest develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git rebase develop
```
