# Backend Notes

Current backend scope (Phase 2 scaffold):
- FastAPI app entrypoint at `backend/app/main.py`
- Frontend static export served at `GET /` when `frontend/out` exists
- Static hello page fallback at `GET /` when `frontend/out` does not exist
- API endpoints:
- `GET /api/health`
- `GET /api/hello`
- `GET /api/board`
- `PUT /api/board`

Persistence:
- SQLite DB auto-created at startup (`backend/data/pm.db` by default)
- Env override for DB path: `PM_DB_PATH`
- Tables: `users`, `boards`
- One board per user is enforced with `UNIQUE(user_id)`
- Backend validates fixed column IDs and board/card integrity on updates

Package/dependency setup:
- `backend/pyproject.toml` defines backend dependencies
- Use `uv` for dependency management and runtime commands

Local dev run:
- `cd backend`
- `uv sync`
- `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

Container run:
- Root `Dockerfile` and `docker-compose.yml` start this backend at port `8000`

Upcoming phases:
- Add AI endpoints and OpenRouter integration
- Add structured outputs workflow for board updates