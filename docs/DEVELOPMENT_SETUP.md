# Development Setup Guide: Blindspot AI

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
