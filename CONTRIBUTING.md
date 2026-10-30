# Contributing to Blindspot AI

Welcome to **Blindspot AI**! 👋 We're thrilled that you're interested in contributing to this project, built as part of **CoNSTruct 2.0 (Replit × Newton School of Technology)**. Every contribution — whether it's fixing a typo, reporting a bug, or proposing a new feature — makes a difference.

Please take a moment to read through this guide before submitting your contribution.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Git Branching Strategy](#git-branching-strategy)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Code Style Guidelines](#code-style-guidelines)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Communication Guidelines](#communication-guidelines)

---

## How to Contribute

### Fork & Clone

1. **Fork** the repository on GitHub: [`Antrikshcodes/blindspot-ai`](https://github.com/Antrikshcodes/blindspot-ai)
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/blindspot-ai.git
   cd blindspot-ai
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/Antrikshcodes/blindspot-ai.git
   ```
4. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes**, commit them, and push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** against the `develop` branch of the upstream repository.

---

## Development Setup

1. **Prerequisites**
   - Git (v2.30+)
   - Node.js (v18+) / Python (v3.10+) — depending on the component
   - A code editor (VS Code recommended)

2. **Clone & Install**
   ```bash
   git clone https://github.com/<your-username>/blindspot-ai.git
   cd blindspot-ai
   ```

3. **Install Dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   pip install -r requirements.txt   # or npm install, depending on stack
   ```

4. **Environment Variables**
   - Copy `.env.example` to `.env` and fill in the required values.
   - **Never commit `.env` files.** They are listed in `.gitignore`.

5. **Run the Application**
   ```bash
   # Follow instructions in the README for running frontend and backend
   ```

---

## Git Branching Strategy

We follow a structured branching model to keep the codebase clean and release-ready.

```
main (production-ready)
 └── develop (integration branch)
      ├── feature/auth-system
      ├── feature/dashboard-ui
      ├── fix/login-bug
      └── docs/update-readme
```

### Branch Descriptions

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Only receives merges from `develop` after thorough testing. |
| `develop` | Integration branch. All feature and fix branches merge here first. |
| `feature/*` | New features. Branch off `develop`, merge back into `develop`. |
| `fix/*` | Bug fixes. Branch off `develop`, merge back into `develop`. |
| `docs/*` | Documentation updates. Branch off `develop`, merge back into `develop`. |
| `hotfix/*` | Critical production fixes. Branch off `main`, merge into both `main` and `develop`. |

### Branching Flow Diagram

```
main ───────────●────────────────────────●──────────
                │                        ▲
                ▼                        │
develop ────●───●───●────●────●────●─────●──────────
            │       ▲    │         ▲
            ▼       │    ▼         │
feature/a ──●───●───●    │         │
                     fix/b ──●─────●
```

### Rules

- **Never push directly to `main` or `develop`.**
- Always create a branch for your work.
- Keep branches short-lived — merge early and often.
- Delete branches after they are merged.

---

## Commit Message Conventions

We use **[Conventional Commits](https://www.conventionalcommits.org/)** to maintain a clear and automated changelog.

### Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation changes only |
| `style:` | Code style changes (formatting, semicolons, etc. — no logic change) |
| `refactor:` | Code refactoring (neither fixes a bug nor adds a feature) |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance tasks (build scripts, dependencies, configs) |

### Examples

```bash
feat(auth): add Google OAuth login flow
fix(api): handle null response from detection endpoint
docs: update contributing guide with branching strategy
style: fix indentation in dashboard component
refactor(models): extract base model class
test(auth): add unit tests for token validation
chore: update dependencies to latest versions
```

### Rules

- Use the **imperative mood** in the description: "add feature" not "added feature".
- Keep the subject line under **72 characters**.
- Reference issue numbers in the footer: `Closes #42`.

---

## Pull Request Process

1. **Ensure your branch is up-to-date** with `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout your-branch
   git rebase develop
   ```

2. **Fill out the PR template** completely — description, type of change, and checklist.

3. **Link related issues** using keywords: `Closes #123`, `Fixes #456`.

4. **Request a review** from at least one team member.

5. **Address review feedback** promptly. Push new commits rather than force-pushing during review.

6. **Squash and merge** once approved (the maintainer will handle this).

### PR Checklist

- [ ] Code compiles/runs without errors
- [ ] Tests pass locally
- [ ] Documentation is updated (if applicable)
- [ ] No `.env` or secret files are included
- [ ] PR title follows conventional commit format

---

## Code Review Guidelines

### For Reviewers

- Be **constructive and kind** — critique the code, not the person.
- Focus on **correctness, readability, and maintainability**.
- Suggest improvements with explanations — don't just say "change this."
- Approve promptly once concerns are addressed.
- Use GitHub's suggestion feature for small fixes.

### For Authors

- Keep PRs **small and focused** — one concern per PR.
- Write a clear description of **what** and **why**.
- Respond to all comments, even if just to acknowledge.
- Don't take feedback personally — we're all learning and improving.

---

## Code Style Guidelines

- **Consistency is key.** Follow the patterns already established in the codebase.
- Use **meaningful variable and function names** — code should be self-documenting.
- Write **comments for "why"**, not "what" — the code should explain the what.
- Keep functions **small and focused** — single responsibility principle.
- Remove **dead code, console logs, and debugging artifacts** before committing.
- Follow language-specific conventions:
  - **JavaScript/TypeScript:** Use ESLint + Prettier configurations provided in the repo.
  - **Python:** Follow PEP 8. Use type hints where possible.
- Run the linter before committing:
  ```bash
  npm run lint        # for JS/TS
  flake8 .            # for Python
  ```

---

## Issue Reporting Guidelines

### Before Opening an Issue

- **Search existing issues** to avoid duplicates.
- Check if the problem exists on the latest `develop` branch.

### Bug Reports

Use the [🐛 Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template. Include:

- Clear, descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or logs (if applicable)
- Your environment (OS, browser, Node/Python version)

### Feature Requests

Use the [✨ Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template. Include:

- Clear description of the feature
- The problem it solves
- Proposed solution
- Alternatives considered

---

## Communication Guidelines

- **Be respectful and inclusive.** Follow our [Code of Conduct](CODE_OF_CONDUCT.md).
- **Use GitHub Issues and PRs** as the primary communication channels for technical discussions.
- **Be patient.** Maintainers and contributors are often working on this alongside other responsibilities.
- **Ask questions!** There's no such thing as a silly question. Open a GitHub Discussion or comment on a relevant issue.
- **Give credit** where it's due — acknowledge others' contributions.

---

## Thank You! 🙏

Your contributions make Blindspot AI better for everyone. Whether you're writing code, reporting bugs, improving documentation, or reviewing PRs — **you matter**. Let's build something great together.
