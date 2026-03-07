# New Developer Tutorial

This tutorial gets you productive in this project from a clean machine.

## 1. Understand What You Are Running

This app is a single container-style web app split into two parts:
- `frontend/` builds a static Next.js site
- `backend/` serves API routes and the built frontend

At runtime, you open one URL: `http://localhost:8000`.

## 2. Install Prerequisites

Install:
- Node.js 22+
- Python 3.12+
- `uv`
- Docker (optional, if using container workflow)

## 3. Configure Environment

From repository root, create or update `.env`:

```env
OPENROUTER_API_KEY=your_key_here
```

The backend reads `.env` on startup.

## 4. First Local Run

From repo root:

```bash
cd frontend
npm install
npm run build
cd ..
./scripts/start-mac.sh
```

If you are on Linux:

```bash
./scripts/start-linux.sh
```

If you are on Windows (PowerShell):

```powershell
.\scripts\start-windows.ps1
```

Open `http://localhost:8000`.

Login credentials:
- Username: `user`
- Password: `password`

## 5. Verify Core Flows

After login, verify:
- Board loads with 5 columns
- You can rename a column
- You can drag a card between columns
- You can add/edit/delete a card
- AI sidebar appears on the right

Quick AI check prompt:
- `Rename Backlog to Intake`

## 6. Run Tests

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

## 7. Daily Development Workflow

1. Make frontend/backend changes.
2. If frontend UI changed, rebuild static output:

```bash
cd frontend
npm run build
```

3. Restart backend scripts if needed:

```bash
cd ..
./scripts/stop-mac.sh
./scripts/start-mac.sh
```

4. Hard refresh browser (`Cmd+Shift+R` on macOS).

## 8. Useful API Endpoints

- `GET /api/health` - service status
- `GET /api/board` - current board
- `PUT /api/board` - save board
- `GET /api/ai/smoke` - OpenRouter smoke prompt (`2+2`)
- `POST /api/ai/operate` - AI operation with optional board update

## 9. Common Issues and Fixes

Issue: AI says it cannot process request.
- Check backend log: `scripts/.backend.log`
- Confirm `.env` has `OPENROUTER_API_KEY`
- Retry later if upstream rate-limited

Issue: UI changes are not visible.
- Rebuild frontend: `cd frontend && npm run build`
- Restart backend script
- Hard refresh browser

Issue: Backend start script says already running.
- Stop it first with `./scripts/stop-mac.sh` (or OS equivalent)

## 10. Docker Workflow (Optional)

From repo root:

```bash
docker compose up --build
```

If frontend/backend code changes and container is stale, rebuild:

```bash
docker compose down
docker compose up --build
```

## 11. Where To Read Next

- Project overview: `README.md`
- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`
- Implementation plan: `docs/PLAN.md`
