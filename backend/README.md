# Backend (Phase 2 Scaffold)

This backend currently serves:
- `GET /` -> built frontend app (`frontend/out`) when available
- `GET /` -> static hello page fallback when frontend build output is missing
- `GET /api/health` -> health JSON
- `GET /api/hello` -> hello JSON
- `POST /api/auth/register` -> create user and return bearer token
- `POST /api/auth/login` -> login and return bearer token
- `POST /api/auth/logout` -> revoke bearer token
- `GET /api/auth/me` -> current user from bearer token
- `GET /api/boards` -> list boards for current user
- `POST /api/boards` -> create board and set active
- `PATCH /api/boards/{board_id}` -> rename board
- `DELETE /api/boards/{board_id}` -> delete board (requires at least one remaining board)
- `POST /api/boards/{board_id}/activate` -> set active board
- `GET /api/board` -> active board JSON
- `PUT /api/board` -> update active board JSON
- `GET /api/boards/{board_id}/board` -> get specific board JSON
- `PUT /api/boards/{board_id}/board` -> update specific board JSON
- `GET /api/ai/smoke` -> OpenRouter smoke test for prompt `2+2`
- `POST /api/ai/operate` -> structured AI response with optional board update (`board_id` optional)

Persistence notes:
- SQLite database is auto-created on startup
- Default path: `backend/data/pm.db`
- Optional override with env var: `PM_DB_PATH`
- Database stores users, sessions, and multiple boards per user

AI connectivity notes:
- `OPENROUTER_API_KEY` must be set in environment (root `.env` is used by `docker-compose`)
- Model used: `openai/gpt-oss-120b`

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
