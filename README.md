# AI Threat Modeler

Upload a codebase (ZIP or GitHub) and get a **STRIDE threat model** back: data-flow diagram, ranked threats, risk registry, and—when the agent can ground them—**links to specific source files and line numbers**.

Built for AppSec teams who want AI-assisted threat modeling without losing traceability to real code.

## 📹 Demo

![Demo video](https://github.com/user-attachments/assets/0b263eb0-945c-43d8-b540-2a7340c7c8d2)

Or [watch on the file page](https://github.com/yangsec888/ai-threat-modeler/blob/main/demo.mp4).

## What you get

After a job completes, open the report to see:

| Tab | Contents |
|-----|----------|
| **Data Flow Diagram** | Interactive diagram with trust boundaries; click a node to see related threats and backing source files |
| **Threat Model** | STRIDE threats with severity, mitigation, and **Location** (file:line, code snippet, GitHub link when imported from GitHub) |
| **Risk Registry** | Risks cross-linked to threats, with locations resolved from related threats when needed |

Export to **PDF**, **CSV** (Excel-compatible), or **JSON**.

## Prerequisites

- **Docker** and Docker Compose (recommended path below)
- An **Anthropic API key** (default provider) — or an **OpenAI** key if you switch provider in Settings
- *(Optional)* A **GitHub Personal Access Token** only if you need **private** repositories

## Quick start (Docker)

```bash
# 1. Create .env with a JWT secret (required in production)
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# 2. Build and start
docker-compose up -d --build
```

Open **http://localhost:3000**, log in with `admin` / `admin`, then complete the steps in [Your first threat model](#your-first-threat-model) below.

> **Production:** the backend refuses to start in `NODE_ENV=production` without `JWT_SECRET`. Use `openssl rand -hex 32` and set it in `.env` or your secret manager.

## Your first threat model

This is the happy path most new users follow.

### 1. Configure the API key (one time)

1. Go to **Settings**
2. Under **LLM Provider**, paste your **Anthropic API key** (default) or switch to OpenAI and add that key instead
3. Click **Save Configuration**
4. Change the default `admin` password when prompted

### 2. Submit a repository

Choose either tab on the **Threat Modeling** page:

- **Upload directory** — ZIP your project folder and upload it
- **Import from GitHub** — paste `https://github.com/owner/repo`, click **Look up**, confirm the branch, then continue

For **private** GitHub repos, add a PAT first under **Settings → GitHub** (`repo` scope). Tokens are encrypted at rest and never returned by the API.

### 3. Analyze → review context → run

Every job uses a short **stage → run** flow so the agent gets deployment context instead of guessing from code alone:

1. **Analyze repository** — auto-fills six editable fields (project summary, security context, deployment context, developer guidance, suggested exclusions, plus free-form additional notes). You can edit or leave any blank.
2. **Run threat model** — the agent produces the full STRIDE report. Jobs show live status on the dashboard.

If context extraction fails, a yellow banner appears but **Run** stays enabled—you can fill fields manually or run without context.

### 4. Open the report

When status is **completed**, click **Preview** (or open from the jobs list). Use the three tabs and export buttons as needed.

**GitHub imports:** threat **Location** cells can include a **View on GitHub** link to the exact file and line.

**Large repos:** under **Settings**, **Threat Modeler Max Turns** (default 100) controls how much Read/Grep the agent can do to anchor locations. **Adversarial second pass** (default on) runs a second filter pass to drop ungrounded threats; turn it off to save roughly half the agent cost.

## Import from GitHub (details)

Public repos work without a token. The backend downloads the zipball, stages context, runs analysis, and removes source from disk when finished.

**Branch selection:** GitHub's API may not list every branch on large repos. After **Look up**, the UI shows the default branch and lets you type any branch name (tags and commit SHAs also work).

**Limits:** archive size cap (default 50 MB, configurable under **Settings → GitHub Import Limits**); `gitRef` values are validated before download.

## Settings at a glance

| Setting | Default | When to change |
|---------|---------|----------------|
| LLM Provider | Claude | Switch to OpenAI if you prefer Codex-backed models |
| Claude / OpenAI API key | — | Required before any agent job |
| Claude Code Max Output Tokens | 32,000 | Raise if responses hit token limits |
| Threat Modeler Max Turns | 100 | Raise for large repos needing more code grounding |
| Adversarial second pass | On | Off for faster/cheaper single-pass runs |
| GitHub PAT | — | Only for private repo import |

All credentials are stored encrypted in the local SQLite database—no API keys in environment variables for normal operation.

## Troubleshooting

Symptoms are grouped by where you see them. **Backend logs** are the first place to look:

```bash
docker-compose logs -f backend
```

Job-specific detail also lands under `./backend/logs/` and in each job's `error_message` on the dashboard.

### App won't start or login fails

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| Backend container exits immediately | Missing `JWT_SECRET` in production | Add `JWT_SECRET=$(openssl rand -hex 32)` to `.env`, then `docker-compose up -d --build` |
| Browser shows connection error / blank page | Containers not running or wrong port | Run `docker-compose ps`; confirm frontend on **3000** and backend on **3001** |
| Login returns network error | Frontend can't reach API | If you changed ports, update `NEXT_PUBLIC_API_URL` in `docker-compose.yml` and rebuild the frontend image |

### Settings and API keys

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| "Agent provider not configured" on job start | No API key saved | **Settings → LLM Provider** → paste key → **Save Configuration** |
| Key validation fails on save | Wrong key, base URL, or provider mismatch | Confirm you're on the right provider (Claude vs OpenAI); check base URL; try **Validate** after saving |
| OpenAI selected but jobs fail | Codex provider not available in the image | Use Claude (default), or ensure the backend image includes the `codex` CLI (see `backend/Dockerfile`) |

### Staging and context extraction

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| Yellow **"Couldn't auto-generate context"** banner | Context extractor timed out, hit size limits, or upstream API error | **Normal to continue** — edit the six fields manually or leave them blank and click **Run threat model** |
| **Analyze repository** never finishes | Staging expired (30 min) or extractor error | Cancel, start again; check backend logs for the specific extractor message |
| Staging disappeared | 30-minute GC or **Cancel** | Re-upload or re-import and run **Analyze** again |

### Threat modeling jobs

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| Job status **failed** with token / max-turns message | Repo too large for current turn budget | **Settings → Threat Modeler Max Turns** — try 150–200 (max 500); consider **Suggested exclusions** to skip vendor/test trees |
| Job status **failed** with output token error | Response too large for model | Raise **Claude Code Max Output Tokens** in Settings (e.g. 64k) |
| Job stuck in **processing** for a long time | Large repo or slow API; agent still running | Wait; watchdog may recover partial output. If truly stuck, cancel the job and retry with fewer turns or a smaller scope |
| Job **completed** but fewer threats than expected | **Adversarial second pass** dropped ungrounded threats (default on) | Expected behavior — review remaining threats with **Location** evidence; disable adversary pass in Settings for a single unfiltered pass |
| **Location** column shows **—** for most threats | Agent couldn't anchor code with Read/Grep | Increase max turns; use GitHub import for deep links; locations are best-effort, not guaranteed on every threat |

### GitHub import

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| **Look up** fails on a public repo | Transient GitHub error or bad URL | Use `https://github.com/owner/repo` format; retry. Public repos do **not** require a PAT |
| **Look up** fails on a private repo | Missing or invalid PAT | **Settings → GitHub** — PAT with `repo` scope, then **Validate** |
| Download / import fails with size error | Archive over limit | Raise **GitHub Import Limits** in Settings or analyze a smaller branch |
| Default branch missing from dropdown | GitHub lists at most 100 branch names | Type the branch name manually in **Branch name** (see [Import from GitHub](#import-from-github-details)) |

### Reports and exports

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| **Preview** / report page empty or "not ready" | Job still running or failed | Wait for **completed** status; open the job row and read `error_message` |
| **View on GitHub** link missing | Job was a ZIP upload, not GitHub import | Deep links only for GitHub-sourced jobs; ZIP jobs still show file:line text and snippets |
| CSV **source_locations** empty for a risk | Risk has no locations and no grounded related threats | Expected when related threats also lack locations; check Threat Model tab for threat-level locations |

### Still stuck?

1. Reproduce once with `docker-compose logs -f backend` running in another terminal.
2. Note the **job id**, status, and any `error_message` on the dashboard.
3. Check [SETUP.md](./SETUP.md) for non-Docker dev setup issues, or [CHANGELOG.md](./CHANGELOG.md) if you recently upgraded.

## 🐳 Docker Compose (operators)

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:3001 |

**Persisted volumes:** `./backend/data` (database), `./backend/threat-modeling-reports`, `./backend/uploads`, `./backend/work_dir`, `./backend/logs`.

```bash
docker-compose logs -f backend    # tail logs
docker-compose up -d --build backend   # rebuild one service
docker-compose down               # stop
docker-compose down -v            # stop and remove volumes
```

The backend image bundles **`appsec-agent@3.1.0`** (Claude Agent SDK + native `claude` binaries). Custom ports or API URL: edit `docker-compose.yml` (`ports`, `NEXT_PUBLIC_API_URL` build arg).

## ✨ Feature reference

<details>
<summary>Full feature list (click to expand)</summary>

### Threat modeling pipeline
- ZIP upload or GitHub import (public or private with PAT)
- Two-step **stage → run** with `context_extractor` (Haiku) drafting deployment context
- `threat_modeler` agent with structured JSON schema (`appsec-agent` 3.x)
- Optional **`threat_adversary`** second pass filters threats without code evidence
- **`source_locations`** on threats, risks, and DFD nodes (file, lines, symbol, snippet)
- Interactive DFD (React Flow): search, severity filters, trust boundaries, node context panel

### Web dashboard
- Job list with status, cost, and duration
- Report page: DFD + Threat Model + Risk Registry tabs
- PDF / CSV / JSON export
- Chat interface with persistent sessions (`/end` to reset)

### Security & access
- JWT auth, bcrypt passwords, role-based access (Admin / Auditor / User)
- Admin-only Settings; encrypted API keys and GitHub tokens

### Data
- SQLite with automatic schema migration
- Staging rows expire after 30 minutes; stuck-job watchdog

</details>

## 📁 Project structure

```
ai-threat-modeler/
├── backend/     # Express API, SQLite, agent orchestration
├── frontend/    # Next.js dashboard
├── SETUP.md     # Non-Docker / dev setup
└── CHANGELOG.md # Release history
```

## 📖 Documentation

| Doc | Purpose |
|-----|---------|
| [SETUP.md](./SETUP.md) | Local dev setup without Docker |
| [API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md) | REST API guide |
| [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) | Production / AWS deployment |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| http://localhost:3001/api-docs | Interactive OpenAPI (when backend is running) |

## 🧪 Testing (developers)

```bash
npm test                    # backend + frontend unit tests
cd backend && npm test
cd frontend && npm test
cd frontend && npm run e2e:install && npm run e2e   # Playwright
```

See [SETUP.md](./SETUP.md) for more detail.
