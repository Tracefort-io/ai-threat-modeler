# Getting Started

New to AI Threat Modeler? This guide walks you from an empty machine to your first threat model report. It should take about 10 minutes, most of which is the agent thinking.

## What you'll need

- **Docker** and Docker Compose — the easiest way to run everything. ([No Docker? Use the dev setup.](../SETUP.md))
- An **Anthropic (Claude) API key** — the default AI provider. You can switch to **OpenAI** later in Settings.
- *(Optional)* A **GitHub Personal Access Token** — only if you want to scan **private** repositories.

> You do **not** need to be a security expert. The app extracts context, draws the diagram, and writes the report for you.

## Step 1 — Start the app

```bash
# Create your environment file and a random login/JWT secret
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# Build and start the containers
docker-compose up -d --build
```

Then open **http://localhost:3000** and log in with:

- Username: `admin`
- Password: `admin`

You'll be asked to change this password on first login — do it.

> **Production note:** the backend refuses to start with `NODE_ENV=production` unless `JWT_SECRET` is set. Generate one with `openssl rand -hex 32`.

## Step 2 — Add your AI provider key (one time)

1. Go to **Settings**.
2. Under **LLM Provider**, keep **Claude** selected (default) and paste your **Anthropic API key**. To use OpenAI instead, switch the provider and paste an **OpenAI key**.
3. Click **Test** next to the key to confirm it works.
4. Click **Save Configuration**.

Keys are stored **encrypted** in a local database — never in plain environment variables and never returned by the API.

## Step 3 — Submit a codebase

Open the **Threat Modeling** page and pick a tab:

- **Upload directory** — ZIP your project folder and upload the ZIP.
- **Import from GitHub** — paste `https://github.com/owner/repo`, click **Look up**, confirm the branch, and continue. Public repos need no token. ([GitHub import details.](./github-import.md))

**Not sure what to try first?** A small, well-known app like [`OWASP/NodeGoat`](https://github.com/OWASP/NodeGoat) is a great smoke test — it's small, public, and full of realistic issues.

## Step 4 — Analyze, review, run

Every job uses a short **stage → run** flow so the agent understands your deployment, not just your code:

1. **Analyze repository** — the app auto-fills six editable fields: project summary, security context, deployment context, developer guidance, suggested exclusions, and free-form notes. Edit them or leave any blank.
2. **Run threat model** — the agent produces the full STRIDE report. Progress shows live on the dashboard.

> If context extraction fails, a yellow banner appears but **Run** stays enabled. You can fill the fields in yourself or run without context.

## Step 5 — Read the report

When the job status is **completed**, click **Preview** (or open it from the jobs list). The report has three tabs:

| Tab | What's in it |
|-----|--------------|
| **Data Flow Diagram** | Interactive diagram with trust boundaries. Click a node to see related threats and source files. |
| **Threat Model** | STRIDE threats with severity, mitigation, and a **Location** (file:line, snippet, and a GitHub link when imported from GitHub). |
| **Risk Registry** | Risks cross-linked to threats, with remediation plans. |

Export to **PDF**, **CSV** (Excel-friendly), or **JSON** with the buttons at the top.

## Next steps

- Tuning runs for big repos or cost → [Settings reference](./settings.md)
- Something went wrong → [Troubleshooting](./troubleshooting.md)
- Full capability list → [Features](./features.md)
