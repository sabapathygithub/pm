# Project Management MVP

A local-first Project Management MVP with a Kanban board and AI assistant.

Tech stack:
- Frontend: Next.js + React + TypeScript
- Backend: FastAPI + SQLite
- AI: OpenRouter (`openai/gpt-oss-120b:free`)
- Packaging: Docker + docker-compose

## Features

- Login gate with MVP credentials (`user` / `password`)
- Single Kanban board per user
- Fixed columns with editable column titles
- Card create, edit, delete, and drag-and-drop move
- AI sidebar that can respond and optionally apply board updates
- Board persistence in SQLite

## Repository Layout

- `frontend/`: Next.js app, unit tests (Vitest), e2e tests (Playwright)
- `backend/`: FastAPI app, SQLite persistence, AI integration, backend tests (pytest)
- `scripts/`: start/stop scripts for macOS, Linux, and Windows
- `docs/PLAN.md`: implementation checklist and progress

## Requirements

- Node.js 22+
- Python 3.12+
- `uv` installed
- OpenRouter API key in root `.env`

Example `.env`:

```env
OPENROUTER_API_KEY=your_key_here
```

## Run Locally (Recommended)

1. Build frontend static output:

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

Windows (PowerShell):

```powershell
.\scripts\start-windows.ps1
```

3. Open app at `http://localhost:8000`

Stop backend:

macOS:

```bash
./scripts/stop-mac.sh
```

Linux:

```bash
./scripts/stop-linux.sh
```

Windows (PowerShell):

```powershell
.\scripts\stop-windows.ps1
```

## Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:8000`.

## Testing

Backend tests:

```bash
cd backend
uv sync
uv run pytest -q
```

Frontend unit tests:

```bash
cd frontend
npm run test:unit
```

Frontend e2e tests:

```bash
cd frontend
npm run test:e2e
```

Run all frontend tests:

```bash
cd frontend
npm run test:all
```

## API Summary

- `GET /api/health`
- `GET /api/hello`
- `GET /api/board`
- `PUT /api/board`
- `GET /api/ai/smoke`
- `POST /api/ai/operate`

## Notes

- Backend serves `frontend/out` at `/` when present.
- After frontend UI changes, run `npm run build` in `frontend/` and restart backend.
- Backend loads root `.env` at startup.
- Local DB path defaults to `backend/data/pm.db` (override with `PM_DB_PATH`).
