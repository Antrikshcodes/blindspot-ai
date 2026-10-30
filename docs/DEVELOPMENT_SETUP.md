# 💻 Development Setup — Blindspot AI

> Everything you need to get Blindspot AI running locally or on Replit.

---

## Prerequisites

| Tool | Version | Required |
|---|---|---|
| **Git** | 2.30+ | ✅ Yes |
| **Node.js** / **Python** | TBD | ✅ Yes (stack TBD) |
| **npm** / **pip** | Latest | ✅ Yes |
| **Replit Account** | — | Recommended |

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Antrikshcodes/blindspot-ai.git
cd blindspot-ai
```

### 2. Install Dependencies

```bash
# Instructions will be updated once the tech stack is finalized

# If Node.js:
# npm install

# If Python:
# pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

### 4. Run the Application

```bash
# Instructions will be updated once the tech stack is finalized

# Development server:
# npm run dev       (Node.js)
# python app.py     (Python)
```

---

## Replit Development Setup

### 1. Import from GitHub

1. Go to [replit.com](https://replit.com) and log in.
2. Click **"Create Repl"** → **"Import from GitHub"**.
3. Paste the repository URL: `https://github.com/Antrikshcodes/blindspot-ai`.
4. Click **"Import from GitHub"**.

### 2. Configure Secrets

1. Open the **Secrets** tab (🔒) in the Replit sidebar.
2. Add the required environment variables listed below.

### 3. Run

1. Click the **"Run"** button at the top of the Replit workspace.
2. The application will start and be accessible via the Replit preview URL.

---

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` / `ENVIRONMENT` | Runtime environment | No | `development` |
| `DATABASE_URL` | Database connection string | Yes | — |
| `API_KEY` | AI service API key | Yes | — |
| `JWT_SECRET` | Secret for JWT token signing | Yes | — |

> [!CAUTION]
> Never commit `.env` files or API keys to version control. Use `.env.example` as a template with placeholder values only.

---

## Running Tests

```bash
# Testing framework and commands TBD

# npm test          (Node.js)
# pytest            (Python)
```

> [!NOTE]
> Testing setup will be configured during Week 2–3 of development.

---

## Common Issues & Troubleshooting

### Port already in use

```bash
# Find and kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Dependencies not installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json   # Node.js
npm install

# Or for Python:
# pip install --force-reinstall -r requirements.txt
```

### Environment variables not loading

- Ensure `.env` file is in the project root.
- Restart the development server after changes.
- On Replit, use the **Secrets** tab instead of `.env` files.

---

## IDE Recommendations

| IDE | Notes |
|---|---|
| **Replit** | Recommended for collaborative development and deployment |
| **VS Code** | Excellent local development experience with extensions |
| **WebStorm / PyCharm** | Full-featured IDE for JavaScript / Python |
| **Cursor** | AI-powered coding assistant |

### Recommended VS Code Extensions

- ESLint / Pylint (linting)
- Prettier (code formatting)
- GitLens (Git insights)
- Thunder Client (API testing)
- Markdown Preview Enhanced

---

*This guide will be updated as the tech stack and project structure are finalized.*
