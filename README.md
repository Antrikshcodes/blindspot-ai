# Blindspot AI

**An AI-Powered Product Validation Platform for Student Founders & Early-Stage Teams**

Built for **CoNSTruct 2.0 (Replit × Newton School of Technology)** by **Team Null Theory**.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Core Product Workflow](#core-product-workflow)
- [Key Features](#key-features)
- [Repository Status & Tech Stack](#repository-status--tech-stack)
- [System Architecture](#system-architecture)
- [Project Directory Layout](#project-directory-layout)
- [Installation & Getting Started](#installation--getting-started)
- [Environment Configuration](#environment-configuration)
- [Testing & Quality Verification](#testing--quality-verification)
- [Deployment on Replit](#deployment-on-replit)
- [Team Information](#team-information)
- [Contribution Guidelines](#contribution-guidelines)
- [License](#license)

---

## Overview

**Blindspot AI** is an intelligent product validation engine engineered to challenge startup assumptions before founders commit weeks of engineering effort. Designed specifically for student builders, hackathon participants, and early-stage entrepreneurs, Blindspot AI deconstructs product ideas into testable hypotheses, prioritizes lethal risks, generates non-leading customer interview scripts, synthesizes qualitative feedback, highlights contradictory evidence, and recommends practical falsification experiments.

### Core Operating Principle
> **Blindspot AI does not cheerlead ideas.** It acts as an analytical counterweight and intellectual adversary. The system never presents AI-generated hypotheses as verified facts; every conclusion must be proven through customer evidence.

---

## The Problem

1. **Premature Coding:** Founders frequently start writing code before validating whether their assumptions about users, problems, and market demand are accurate.
2. **Hidden and Conflated Assumptions:** Teams fail to distinguish between facts and unverified beliefs across problem, customer, solution, and monetization dimensions.
3. **Leading Customer Discovery:** Inexperienced interviewers ask biased, hypothetical questions (*"Would you buy an app that does X?"*) that elicit polite encouragement rather than honest behavioral data.
4. **Confirmation Bias in Feedback:** When reviewing customer notes, founders selectively focus on positive comments while ignoring red flags and contradictory feedback.
5. **Lack of Actionable Next Steps:** Teams struggle to formulate low-fidelity, falsifiable experiments to de-risk their concepts quickly.

---

## The Solution

Blindspot AI transforms an unverified product idea into a structured, evidence-based validation pipeline:

```
[Idea Submission] ──> [Assumption Extraction] ──> [Risk Prioritisation] ──> [Interview Generation]
                                                                                   │
[Experiment Recommendations] ◄── [Contradiction Detection] ◄── [Feedback Analysis] ◄┘
```

1. **Challenges Assumptions:** Identifies unstated premises and exposes cognitive blind spots.
2. **Applies The Mom Test:** Enforces past-behavior-focused, non-leading customer discovery questions.
3. **Surfaces Contradictions:** Flags conflicting statements across interview transcripts to expose fragmented user needs.
4. **Prescribes Falsification Experiments:** Generates practical experiments with defined failure thresholds.

---

## Core Product Workflow

### 1. Idea Submission
The founder enters the product concept, target audience profile, and the core problem being addressed.

### 2. Assumption Extraction
The engine parses the submission and extracts underlying assumptions, categorizing them across four fundamental domains:
* **Problem Risk:** Does the stated problem actually exist and cause measurable pain?
* **Customer Risk:** Can this audience be identified, reached, and persuaded to change habits?
* **Solution Risk:** Does the proposed implementation address the root cause?
* **Viability / Monetization Risk:** Are users willing and able to pay sustainable unit economics?

### 3. Risk Prioritisation
Assumptions are evaluated across two dimensions: **Impact on Venture Survival** (1–5) and **Current Uncertainty** (1–5). The system calculates a deterministic composite score ($Impact \times Uncertainty$) and isolates "Lethal Assumptions" that must be resolved first.

### 4. Interview Generation
The system generates targeted interview guides strictly following *The Mom Test* methodology. Questions probe past behaviors and current workarounds rather than speculative future intent.

### 5. Feedback Analysis
Founders paste qualitative interview transcripts and call notes. The engine parses the unstructured text, connects specific quotes to registered assumptions, and tags evidence as Supporting, Invalidating, or Neutral.

### 6. Contradiction Detection
The engine cross-analyzes multiple interview notes to identify direct contradictions between respondents, highlighting unsupported founder conclusions and gaps in evidence.

### 7. Experiment Recommendations
For unresolved or high-risk assumptions, the system prescribes concrete, rapid validation experiments (e.g., landing page tests, concierge MVP, smoke tests) complete with specific metrics, falsification thresholds, and execution timelines.

---

## Key Features

| Capability | Module | Description | Status |
|:---|:---|:---|:---:|
| Idea Deconstruction | Submission Engine | Structured intake with context-depth validation | Phase 3 (Planned) |
| Assumption Isolation | AI Analysis Engine | Extracts unstated premises across 4 risk domains | Phase 3 (Planned) |
| 2D Risk Scoring Matrix | Scoring Service | Deterministic $Impact \times Uncertainty$ prioritization | Phase 3 (Planned) |
| Mom Test Script Generator | Discovery Service | Generates non-leading, behavioral interview scripts | Phase 4 (Planned) |
| Qualitative Note Ingestion | Feedback Service | Extracts quotes and maps evidence to assumptions | Phase 4 (Planned) |
| Contradiction & Bias Flagging | Contradiction Engine | Exposes conflicting user signals and unsupported claims | Phase 4 (Planned) |
| Experiment Planner | Experiment Service | Prescribes falsification tests with concrete thresholds | Phase 4 (Planned) |

---

## Repository Status & Tech Stack

### Current Implementation Baseline (Day 1 Audit)
* **Codebase State:** Foundational architecture, documentation, and CI workflows established.
* **Source Code:** Application modules (`frontend/`, `backend/`, `shared/`, `tests/`) are initialized with documentation; runtime source code implementation begins in Phase 2/3.
* **Security & Hygiene:** Zero committed secrets; baseline GitHub Actions CI pipeline enforces environment variable protection.

### Target Technology Stack (Sprint Architecture)

| Layer | Technology | Architectural Role |
|:---|:---|:---|
| **Language** | TypeScript | End-to-end type safety between frontend views and backend services |
| **Frontend** | React + Vite + Tailwind CSS | Fast compilation, modern component hierarchy, responsive UI |
| **Backend** | Node.js + Express | Concurrent asynchronous handling for AI engine calls and REST APIs |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Zero-configuration local development; production-grade hosted SQL |
| **ORM** | Prisma / Drizzle | Type-safe migrations and relational query models |
| **AI Integration** | OpenAI / Anthropic API | Structured JSON schema outputs with deterministic validation |
| **Deployment** | Replit Cloud | Native compliance with CoNSTruct 2.0 hackathon hosting guidelines |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│       React SPA (Submission Wizard, Risk Matrix, Scripts,       │
│             Contradiction Viewer, Experiment Board)             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / REST (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                             │
│     API Gateway ──> Validation Service ──> AI Adapter (LLM)     │
│           │                                      │              │
│           ▼                                      ▼              │
│   Auth / Project Core                     Schema Validation     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ SQL Queries / Migrations
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                           │
│        Relational Database (Projects, Assumptions, Notes,       │
│                 Contradictions, Experiments)                    │
└─────────────────────────────────────────────────────────────────┘
```

For complete architectural specifications, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Project Directory Layout

```text
blindspot-ai/
├── .github/
│   ├── ISSUE_TEMPLATE/        # Standardized bug and feature issue templates
│   ├── PULL_REQUEST_TEMPLATE.md# Pre-merge validation checklist
│   └── workflows/
│       └── ci.yml             # Baseline CI pipeline (leak scan & docs verification)
├── docs/
│   ├── PROJECT_CONTEXT.md     # Detailed product vision, personas, and requirements
│   ├── ARCHITECTURE.md        # Technical architecture and subsystem specifications
│   ├── FEATURE_ROADMAP.md     # 20-day milestone-driven development roadmap
│   ├── DAILY_PROGRESS.md      # Daily development tracker and blockers log
│   ├── KNOWN_ISSUES.md        # Technical debt and defect ledger
│   └── DEVELOPMENT_SETUP.md   # Step-by-step developer onboarding manual
├── frontend/                  # Client-side user interface
├── backend/                   # Server-side API and AI engine logic
├── shared/                    # Shared TypeScript interfaces and Zod schemas
├── tests/                     # Unit, integration, and end-to-end test suites
├── assets/                    # Branding, diagrams, and visual resources
├── .env.example               # Environment variable blueprint
├── .gitignore                 # Multi-runtime ignore rules
├── CONTRIBUTING.md            # Team branch and PR conventions
└── LICENSE                    # MIT License
```

---

## Installation & Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Antrikshcodes/blindspot-ai.git
cd blindspot-ai
```

### 2. Switch to the Active Integration Branch
```bash
git checkout develop
git pull origin develop
```

### 3. Initialize Environment Variables
```bash
cp .env.example .env
```
Configure your local parameters inside `.env` (see below).

---

## Environment Configuration

Configure the following parameters in your local `.env` file:

```dotenv
PORT=3000
NODE_ENV=development
DATABASE_URL=file:./dev.db
AI_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

> **Warning:** Never commit `.env` to Git. The repository’s CI pipeline will reject commits containing secrets.

---

## Testing & Quality Verification

Run baseline repository validation checks:

```bash
# Verify no .env files are exposed in the working tree
find . -name ".env" -not -path "./.git/*"

# Check required documentation files
test -f README.md && test -f CONTRIBUTING.md && test -f LICENSE && echo "Repository baseline verified."
```

Automated unit and integration test suites will be introduced in Phase 3.

---

## Deployment on Replit

Blindspot AI is engineered for one-click deployment on Replit:

1. Import this repository into [Replit](https://replit.com).
2. Configure your secrets (`AI_API_KEY`, `JWT_SECRET`, `SESSION_SECRET`, `DATABASE_URL`) in Replit's **Secrets** tab.
3. Click **Run** to launch the environment.

Refer to [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) for full deployment instructions.

---

## Team Information

**Team Name:** Null Theory  
**Event:** CoNSTruct 2.0 (Replit × Newton School of Technology)  

| Name | Role | Assigned Branch | GitHub |
|:---|:---|:---:|:---|
| **Antriksh** | Project Lead | `develop` / `main` | [@Antrikshcodes](https://github.com/Antrikshcodes) |
| **Poorvi** | Frontend and Research | `poorvi` | [@poorvig222](https://github.com/poorvig222) |
| **Pavitr Makhija** | Backend and API integration | `pavitr` | [@pavitrmakhija](https://github.com/pavitrmakhija) |
| **Saureet** | Full Stack | `saureet` | [@saureetc007](https://github.com/saureetc007) |
| **Jagrit** | Testing & Frontend | `jagrit` | [@codesjagrit](https://github.com/codesjagrit) |

---

## Contribution Guidelines

All contributions must follow our team branching strategy:
* New work branches off `develop` using `feature/<name>` or `bugfix/<name>`.
* Code must be reviewed and tested before merging.
* Pull requests require an approved review from at least one Null Theory team member.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the complete workflow and commit message conventions.

---

## License

This project is licensed under the [MIT License](LICENSE) &copy; 2026 Blindspot AI Contributors (Team Null Theory).
