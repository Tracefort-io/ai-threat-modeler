# Features

A full list of what AI Threat Modeler can do.

## Threat modeling pipeline

- ZIP upload or GitHub import (public, or private with a PAT)
- Two-step **stage → run** flow with a `context_extractor` agent (Haiku) drafting deployment context
- `threat_modeler` agent producing a structured JSON report (`appsec-agent` 3.x)
- Optional **`threat_adversary`** second pass that filters out threats without code evidence
- **`source_locations`** on threats, risks, and DFD nodes (file, line range, symbol, snippet)
- Interactive **Data Flow Diagram** (React Flow): search, severity filters, trust boundaries, and a node context panel

## Web dashboard

- Job list with status, cost, and duration
- Report page with **Data Flow Diagram**, **Threat Model**, and **Risk Registry** tabs
- Export to **PDF**, **CSV** (Excel-friendly), and **JSON**
- Chat interface with persistent sessions (`/end` to reset)

## Security and access

- JWT authentication, bcrypt password hashing
- Role-based access: **Admin / Auditor / User**
- Admin-only Settings; encrypted API keys and GitHub tokens

## Data handling

- SQLite with automatic schema migration
- Staging rows expire after 30 minutes
- Stuck-job watchdog to recover partial output

## Project structure

```
ai-threat-modeler/
├── backend/     # Express API, SQLite, agent orchestration
├── frontend/    # Next.js dashboard
├── docs/        # This documentation
├── SETUP.md     # Non-Docker / dev setup
└── CHANGELOG.md # Release history
```
