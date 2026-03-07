import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.ai_client import OPENROUTER_MODEL, OpenRouterError, ask_openrouter, request_board_operation
from app.database import (
    get_board,
    get_conversation,
    initialize_db,
    update_board,
    update_conversation,
)

REPO_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
FRONTEND_OUT_DIR = REPO_DIR / "frontend" / "out"
ENV_FILE = REPO_DIR / ".env"


def _load_env_file() -> None:
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_env_file()


class AiOperationRequest(BaseModel):
    message: str
    username: str = "user"


class AiOperationOutput(BaseModel):
    assistant_message: str
    board_update: dict | None


def _resolve_db_path() -> Path:
    configured_path = os.getenv("PM_DB_PATH")
    if configured_path:
        return Path(configured_path)

    return Path(__file__).resolve().parent.parent / "data" / "pm.db"


def create_app(db_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        initialize_db(application.state.db_path)
        yield

    app = FastAPI(title="PM MVP Backend", lifespan=lifespan)
    app.state.db_path = db_path or _resolve_db_path()

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/hello")
    def hello() -> dict[str, str]:
        return {"message": "hello from fastapi"}

    @app.get("/api/board")
    def read_board(username: str = "user") -> dict:
        return get_board(app.state.db_path, username=username)

    @app.put("/api/board")
    def write_board(board: dict, username: str = "user") -> dict:
        try:
            return update_board(app.state.db_path, board=board, username=username)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/ai/smoke")
    def ai_smoke() -> dict[str, str]:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENROUTER_API_KEY is not configured.",
            )

        try:
            answer = ask_openrouter(prompt="2+2", api_key=api_key)
        except OpenRouterError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return {
            "model": OPENROUTER_MODEL,
            "prompt": "2+2",
            "response": answer,
        }

    @app.post("/api/ai/operate")
    def ai_operate(payload: AiOperationRequest) -> dict:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENROUTER_API_KEY is not configured.",
            )

        board = get_board(app.state.db_path, username=payload.username)
        history = get_conversation(app.state.db_path, username=payload.username)

        try:
            raw_output = request_board_operation(
                board=board,
                history=history,
                user_message=payload.message,
                api_key=api_key,
            )
        except OpenRouterError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        try:
            operation = AiOperationOutput.model_validate(raw_output)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="AI response did not match required structured output.",
            ) from exc

        board_updated = False
        next_board = board
        if operation.board_update is not None:
            try:
                next_board = update_board(
                    app.state.db_path,
                    board=operation.board_update,
                    username=payload.username,
                )
                board_updated = True
            except ValueError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"AI board update failed validation: {str(exc)}",
                ) from exc

        next_history = [
            *history,
            {"role": "user", "content": payload.message},
            {"role": "assistant", "content": operation.assistant_message},
        ]
        update_conversation(app.state.db_path, conversation=next_history, username=payload.username)

        return {
            "assistant_message": operation.assistant_message,
            "board_updated": board_updated,
            "board": next_board,
        }


    if FRONTEND_OUT_DIR.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_OUT_DIR, html=True), name="frontend")
    else:

        @app.get("/")
        def root() -> FileResponse:
            return FileResponse(BACKEND_STATIC_DIR / "index.html")

    return app


app = create_app()
