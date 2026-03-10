import os
from base64 import b64decode
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.ai_client import (
    OPENROUTER_MODEL,
    OpenRouterError,
    ask_openrouter,
    request_board_operation,
)
from app.database import (
    apply_ai_operation,
    get_board,
    get_conversation,
    initialize_db,
    update_board,
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


class AiOperationOutput(BaseModel):
    assistant_message: str
    board_update: dict | None


AUTH_USERNAME = "user"
AUTH_PASSWORD = "password"
MAX_HISTORY_MESSAGES = 40
MAX_HISTORY_FOR_MODEL = 20


def _authenticated_username(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "basic" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header.")

    try:
        decoded = b64decode(token).decode("utf-8")
    except Exception as exc:
        raise HTTPException(
            status_code=401, detail="Invalid Authorization token."
        ) from exc

    username, sep, password = decoded.partition(":")
    if not sep:
        raise HTTPException(status_code=401, detail="Invalid Authorization token.")

    if username != AUTH_USERNAME or password != AUTH_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    return username


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
    def read_board(authorization: str | None = Header(default=None)) -> dict:
        username = _authenticated_username(authorization)
        return get_board(app.state.db_path, username=username)

    @app.put("/api/board")
    def write_board(
        board: dict, authorization: str | None = Header(default=None)
    ) -> dict:
        username = _authenticated_username(authorization)
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
    def ai_operate(
        payload: AiOperationRequest,
        authorization: str | None = Header(default=None),
    ) -> dict:
        username = _authenticated_username(authorization)
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENROUTER_API_KEY is not configured.",
            )

        board = get_board(app.state.db_path, username=username)
        history = get_conversation(app.state.db_path, username=username)
        history_for_model = history[-MAX_HISTORY_FOR_MODEL:]

        try:
            raw_output = request_board_operation(
                board=board,
                history=history_for_model,
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

        try:
            next_board, board_updated, _ = apply_ai_operation(
                app.state.db_path,
                username=username,
                user_message=payload.message,
                assistant_message=operation.assistant_message,
                board_update=operation.board_update,
                max_history_messages=MAX_HISTORY_MESSAGES,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"AI board update failed validation: {str(exc)}",
            ) from exc

        return {
            "assistant_message": operation.assistant_message,
            "board_updated": board_updated,
            "board": next_board,
        }

    if FRONTEND_OUT_DIR.exists():
        app.mount(
            "/", StaticFiles(directory=FRONTEND_OUT_DIR, html=True), name="frontend"
        )
    else:

        @app.get("/")
        def root() -> FileResponse:
            return FileResponse(BACKEND_STATIC_DIR / "index.html")

    return app


app = create_app()
