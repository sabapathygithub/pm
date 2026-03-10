# Backend (Phase 2 Scaffold)

This backend currently serves:
- `GET /` -> built frontend app (`frontend/out`) when available
- `GET /` -> static hello page fallback when frontend build output is missing
- `GET /api/health` -> health JSON
- `GET /api/hello` -> hello JSON
- `GET /api/board` -> persisted board JSON for current user
- `PUT /api/board` -> persist updated board JSON for current user
- `GET /api/ai/smoke` -> OpenRouter smoke test for prompt `2+2`
- `POST /api/ai/operate` -> structured AI response with optional board update

Persistence notes:
- SQLite database is auto-created on startup
- Default path: `backend/data/pm.db`
- Optional override with env var: `PM_DB_PATH`

AI connectivity notes:
- `OPENROUTER_API_KEY` must be set in environment (root `.env` is used by `docker-compose`)
- Model used: `openai/gpt-oss-120b:free`

## Local run (non-Docker)

From repository root:

```bash
cd frontend
npm install
npm run build

cd ../backend
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000`.

## Backend tests

From repository root:

```bash
cd backend
uv sync
uv run pytest -q
```

If `frontend/out` does not exist, backend serves a hello fallback page instead.

## Local run (backend hello fallback only)

From repository root:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000`.

## Docker run

From repository root:

```bash
docker compose up --build
```

Open `http://localhost:8000`.
