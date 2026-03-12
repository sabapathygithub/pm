import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.ai_client import (
    OPENROUTER_MODEL,
    OpenRouterError,
    ask_openrouter,
    request_board_operation,
)
from app.database import (
    apply_ai_operation,
    create_board,
    delete_board,
    get_board,
    get_conversation,
    get_user_by_token,
    initialize_db,
    list_boards,
    login_user,
    logout_user,
    register_user,
    rename_board,
    set_active_board,
    update_board,
)

REPO_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
FRONTEND_OUT_DIR = REPO_DIR / "frontend" / "out"
ENV_FILE = REPO_DIR / ".env"
MAX_HISTORY_MESSAGES = 40
MAX_HISTORY_FOR_MODEL = 20


class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class BoardCreateRequest(BaseModel):
    name: str


class BoardRenameRequest(BaseModel):
    name: str


class AiOperationRequest(BaseModel):
    message: str
    board_id: int | None = None


class AiOperationOutput(BaseModel):
    assistant_message: str
    board_update: dict | None


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


def _resolve_db_path() -> Path:
    configured_path = os.getenv("PM_DB_PATH")
    if configured_path:
        return Path(configured_path)

    return Path(__file__).resolve().parent.parent / "data" / "pm.db"


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header.")
    return token


def _authenticated_user(application: FastAPI, authorization: str | None) -> dict:
    token = _bearer_token(authorization)
    user = get_user_by_token(application.state.db_path, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


def create_app(db_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        initialize_db(application.state.db_path)
        yield

    app = FastAPI(title="PM Backend", lifespan=lifespan)
    app.state.db_path = db_path or _resolve_db_path()

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/hello")
    def hello() -> dict[str, str]:
        return {"message": "hello from fastapi"}

    @app.post("/api/auth/register")
    def register(payload: RegisterRequest) -> dict:
        try:
            user = register_user(
                app.state.db_path,
                username=payload.username,
                password=payload.password,
                display_name=payload.display_name,
            )
            token, _ = login_user(app.state.db_path, payload.username, payload.password)
            return AuthResponse(token=token, user=user).model_dump()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/auth/login")
    def login(payload: LoginRequest) -> dict:
        try:
            token, user = login_user(
                app.state.db_path, username=payload.username, password=payload.password
            )
            return AuthResponse(token=token, user=user).model_dump()
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

    @app.post("/api/auth/logout")
    def logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
        token = _bearer_token(authorization)
        logout_user(app.state.db_path, token)
        return {"status": "ok"}

    @app.get("/api/auth/me")
    def me(authorization: str | None = Header(default=None)) -> dict:
        return _authenticated_user(app, authorization)

    @app.get("/api/boards")
    def read_boards(authorization: str | None = Header(default=None)) -> list[dict]:
        user = _authenticated_user(app, authorization)
        return list_boards(app.state.db_path, user_id=int(user["id"]))

    @app.post("/api/boards")
    def write_board_create(
        payload: BoardCreateRequest,
        authorization: str | None = Header(default=None),
    ) -> dict:
        user = _authenticated_user(app, authorization)
        try:
            return create_board(
                app.state.db_path, user_id=int(user["id"]), name=payload.name
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.patch("/api/boards/{board_id}")
    def write_board_rename(
        board_id: int,
        payload: BoardRenameRequest,
        authorization: str | None = Header(default=None),
    ) -> dict[str, str]:
        user = _authenticated_user(app, authorization)
        try:
            rename_board(
                app.state.db_path,
                user_id=int(user["id"]),
                board_id=board_id,
                name=payload.name,
            )
            return {"status": "ok"}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.delete("/api/boards/{board_id}")
    def write_board_delete(
        board_id: int,
        authorization: str | None = Header(default=None),
    ) -> dict[str, str]:
        user = _authenticated_user(app, authorization)
        try:
            delete_board(app.state.db_path, user_id=int(user["id"]), board_id=board_id)
            return {"status": "ok"}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/boards/{board_id}/activate")
    def write_board_activate(
        board_id: int,
        authorization: str | None = Header(default=None),
    ) -> dict[str, str]:
        user = _authenticated_user(app, authorization)
        try:
            set_active_board(app.state.db_path, user_id=int(user["id"]), board_id=board_id)
            return {"status": "ok"}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/board")
    def read_board(authorization: str | None = Header(default=None)) -> dict:
        user = _authenticated_user(app, authorization)
        return get_board(app.state.db_path, user_id=int(user["id"]))

    @app.put("/api/board")
    def write_board(board: dict, authorization: str | None = Header(default=None)) -> dict:
        user = _authenticated_user(app, authorization)
        try:
            return update_board(app.state.db_path, board=board, user_id=int(user["id"]))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/boards/{board_id}/board")
    def read_board_by_id(
        board_id: int, authorization: str | None = Header(default=None)
    ) -> dict:
        user = _authenticated_user(app, authorization)
        try:
            return get_board(app.state.db_path, user_id=int(user["id"]), board_id=board_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.put("/api/boards/{board_id}/board")
    def write_board_by_id(
        board_id: int,
        board: dict,
        authorization: str | None = Header(default=None),
    ) -> dict:
        user = _authenticated_user(app, authorization)
        try:
            return update_board(
                app.state.db_path,
                board=board,
                user_id=int(user["id"]),
                board_id=board_id,
            )
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
        user = _authenticated_user(app, authorization)
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENROUTER_API_KEY is not configured.",
            )

        board_id = payload.board_id

        try:
            board = get_board(app.state.db_path, user_id=int(user["id"]), board_id=board_id)
            history = get_conversation(
                app.state.db_path, user_id=int(user["id"]), board_id=board_id
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

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
                user_id=int(user["id"]),
                user_message=payload.message,
                assistant_message=operation.assistant_message,
                board_update=operation.board_update,
                max_history_messages=MAX_HISTORY_MESSAGES,
                board_id=board_id,
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
