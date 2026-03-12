# Project Management App

A local-first project management app with multi-user auth, multi-board Kanban, and AI assistance.

Tech stack:
- Frontend: Next.js + React + TypeScript
- Backend: FastAPI + SQLite
- AI: OpenRouter (`openai/gpt-oss-120b:free`)
- Packaging: Docker + docker-compose

## Features

- User authentication (`register`, `login`, `logout`, `me`) with session tokens
- Multi-board workspace per user (create, rename, delete, switch active board)
- Fixed-column Kanban board with persistence in SQLite
- Card create, edit, delete, drag-and-drop move
- Card metadata: priority, assignee, due date, labels
- Search and filter (text, priority, label)
- AI sidebar that can respond and optionally apply board updates

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

## Deploy on Vercel

This repository is a split architecture in production:
- Deploy `frontend/` to Vercel.
- Deploy `backend/` to another host (Render, Railway, Fly.io, etc.) because SQLite on Vercel serverless is ephemeral and not durable.

### 1) Deploy frontend to Vercel

In Vercel project settings:
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output: default Next.js

Set frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain
```

`NEXT_PUBLIC_API_BASE_URL` is optional for local same-origin usage. In Vercel, set it to your backend base URL so frontend calls:
- `${NEXT_PUBLIC_API_BASE_URL}/api/board`
- `${NEXT_PUBLIC_API_BASE_URL}/api/ai/operate`

### 2) Deploy backend separately

Backend required environment variables:

```env
OPENROUTER_API_KEY=your_key_here
```

Optional backend env:

```env
PM_DB_PATH=/absolute/path/to/pm.db
```

Important: for production persistence, use durable storage (managed database). SQLite local disk is fine for local/dev but not reliable on serverless ephemeral filesystems.

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

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/boards`
- `POST /api/boards`
- `PATCH /api/boards/{board_id}`
- `DELETE /api/boards/{board_id}`
- `POST /api/boards/{board_id}/activate`
- `GET /api/board`
- `PUT /api/board`
- `GET /api/boards/{board_id}/board`
- `PUT /api/boards/{board_id}/board`
- `GET /api/ai/smoke`
- `POST /api/ai/operate`

## Notes

- Backend serves `frontend/out` at `/` when present.
- After frontend UI changes, run `npm run build` in `frontend/` and restart backend.
- Backend loads root `.env` at startup.
- Local DB path defaults to `backend/data/pm.db` (override with `PM_DB_PATH`).
