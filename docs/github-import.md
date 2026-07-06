# Importing from GitHub

You can point AI Threat Modeler at a GitHub repository instead of uploading a ZIP. The backend downloads the repo archive, stages context, runs the analysis, and removes the source from disk when it finishes.

## Public repositories

Public repos work **without any token**. Just:

1. Open **Threat Modeling → Import from GitHub**.
2. Paste the repo URL: `https://github.com/owner/repo`.
3. Click **Look up**.
4. Confirm the branch and continue.

## Private repositories

Private repos need a **GitHub Personal Access Token (PAT)**:

1. Create a PAT with the **`repo`** scope (or `public_repo` for public-only access).
2. In the app, go to **Settings → GitHub** and paste the token.
3. Click **Test** to validate it, then **Save Configuration**.

Tokens are **encrypted at rest** and are never returned by the API.

## Choosing a branch, tag, or commit

After **Look up**, the UI shows the repository's default branch and lets you type any reference:

- a **branch** name
- a **tag**
- a **commit SHA**

> **Why type it manually?** GitHub's API lists at most 100 branches on large repos, so your branch may not appear in the dropdown. Typing the exact name always works.

## Limits and safety

- **Archive size cap** — default **50 MB**, configurable under **Settings → GitHub Import Limits**. Raise it or analyze a smaller branch if you hit the limit.
- **Reference validation** — `gitRef` values are validated before any download.
- **Deep links** — threats from GitHub imports include a **View on GitHub** link to the exact file and line. (ZIP uploads still show `file:line` text and code snippets, just without the link.)

## Troubleshooting GitHub import

See the [GitHub import section of the troubleshooting guide](./troubleshooting.md#github-import).
