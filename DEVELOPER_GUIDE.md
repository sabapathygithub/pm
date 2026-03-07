# Developer Guide

This guide is for engineers working on the PM MVP codebase.

## Purpose

The app is a local-first Project Management MVP:
- FastAPI backend serves API and static frontend
- Next.js frontend provides Kanban UI and AI sidebar
- SQLite stores board and AI conversation state
- OpenRouter powers AI operations

## Project Structure

- `frontend/`: Next.js app (UI, unit tests, e2e tests)
- `backend/`: FastAPI app, DB layer, AI integration, backend tests
- `scripts/`: cross-platform start/stop scripts
- `docs/PLAN.md`: implementation checklist and phase tracking

## Runtime Model

- Backend serves static frontend output from `frontend/out` at `/`
- Backend API namespace is `/api/*`
- Default local DB file is `backend/data/pm.db`
- Root `.env` is loaded at backend startup

## Prerequisites

- Node.js 22+
- Python 3.12+
- `uv`
- Optional: Docker

Set environment in root `.env`:

```env
OPENROUTER_API_KEY=your_key_here
```

## Local Development

1. Install and build frontend:

```bash
cd frontend
npm install
npm run build
```

2. Start backend from repo root:

macOS:

```bash
./scripts/start-mac.sh
```

Linux:

```bash
./scripts/start-linux.sh
```

Windows PowerShell:

```powershell
.\scripts\start-windows.ps1
```

3. Open `http://localhost:8000`

4. Sign in with:
- username: `user`
- password: `password`

Stop backend:

```bash
./scripts/stop-mac.sh
```

(or OS equivalent script)

## Development Workflow

- Backend changes: restart backend script if needed.
- Frontend UI changes: rebuild static output.

```bash
cd frontend
npm run build
cd ..
./scripts/stop-mac.sh
./scripts/start-mac.sh
```

- Hard refresh browser after rebuild.

## Testing

Backend:

```bash
cd backend
uv sync
uv run pytest -q
```

Frontend unit:

```bash
cd frontend
npm run test:unit
```

Frontend e2e:

```bash
cd frontend
npm run test:e2e
```

All frontend tests:

```bash
cd frontend
npm run test:all
```

## Core APIs

- `GET /api/health`
- `GET /api/board`
- `PUT /api/board`
- `GET /api/ai/smoke`
- `POST /api/ai/operate`

## AI Operation Contract

`POST /api/ai/operate` returns:
- `assistant_message`: string
- `board_updated`: boolean
- `board`: full board JSON

Backend validates AI output and board constraints before applying updates.

## Data Rules

- One board per user (MVP uses default user)
- Column structure is fixed (titles can be renamed)
- Cards can be created, edited, moved, and deleted

## Troubleshooting

AI request fails:
- Check `scripts/.backend.log`
- Verify `.env` contains `OPENROUTER_API_KEY`
- Retry if upstream provider is rate limited

Sidebar or latest UI missing:
- Rebuild frontend (`npm run build`)
- Restart backend
- Hard refresh browser

Backend reports already running:
- Stop with stop script, then restart

## Docker Workflow

```bash
docker compose up --build
```

If stale, rebuild container:

```bash
docker compose down
docker compose up --build
```

## Documentation Map

- `README.md`: project overview and quickstart
- `turorial.md`: onboarding tutorial for new developers
- `DEVELOPER_GUIDE.md`: engineering workflow reference
- `docs/PLAN.md`: phase-by-phase implementation tracking
