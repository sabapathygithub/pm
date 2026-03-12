import sqlite3
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.board_defaults import FIXED_COLUMN_IDS
from app.main import create_app


def _make_client(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "pm-test.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


def _login(client: TestClient, username: str = "user", password: str = "password") -> str:
    response = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_startup_creates_db_and_default_user_board(tmp_path: Path) -> None:
    client, db_path = _make_client(tmp_path)

    with client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert db_path.exists()

    with sqlite3.connect(db_path) as conn:
        users_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        boards_count = conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0]

    assert users_count == 1
    assert boards_count >= 1


def test_get_board_returns_default_shape(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        token = _login(client)
        response = client.get("/api/board", headers=_auth_headers(token))

    assert response.status_code == 200
    payload = response.json()
    assert [column["id"] for column in payload["columns"]] == FIXED_COLUMN_IDS
    assert isinstance(payload["cards"], dict)
    assert len(payload["cards"]) == 0


def test_update_board_persists_changes(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        token = _login(client)
        board = client.get("/api/board", headers=_auth_headers(token)).json()
        board["cards"]["card-new"] = {
            "id": "card-new",
            "title": "Initial task",
            "details": "Initial details",
            "priority": "medium",
            "assignee": None,
            "dueDate": None,
            "labels": [],
        }
        board["columns"][0]["cardIds"].append("card-new")
        board["columns"][0]["title"] = "Ideas"
        board["cards"]["card-new"]["title"] = "Renamed card"

        update_response = client.put("/api/board", json=board, headers=_auth_headers(token))
        read_response = client.get("/api/board", headers=_auth_headers(token))

    assert update_response.status_code == 200
    assert read_response.status_code == 200
    assert read_response.json()["columns"][0]["title"] == "Ideas"
    assert read_response.json()["cards"]["card-new"]["title"] == "Renamed card"


def test_board_crud_supports_multiple_boards_per_user(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        token = _login(client)
        create_response = client.post(
            "/api/boards",
            json={"name": "Sprint 2"},
            headers=_auth_headers(token),
        )
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]

        boards_response = client.get("/api/boards", headers=_auth_headers(token))
        assert boards_response.status_code == 200
        assert len(boards_response.json()) >= 2

        active_response = client.post(
            f"/api/boards/{created_id}/activate", headers=_auth_headers(token)
        )
        assert active_response.status_code == 200

        board_response = client.get(f"/api/boards/{created_id}/board", headers=_auth_headers(token))
        assert board_response.status_code == 200


def test_update_board_rejects_invalid_column_ids(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        token = _login(client)
        board = client.get("/api/board", headers=_auth_headers(token)).json()
        board["columns"][0]["id"] = "col-custom"

        response = client.put("/api/board", json=board, headers=_auth_headers(token))

    assert response.status_code == 400
    assert "Column IDs are fixed" in response.json()["detail"]


def test_board_requires_authorization_header(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        response = client.get("/api/board")

    assert response.status_code == 401


def test_legacy_users_schema_is_migrated_and_login_works(tmp_path: Path) -> None:
    db_path = tmp_path / "pm-legacy.db"
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL UNIQUE,
              board_json TEXT NOT NULL,
              conversation_json TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute("INSERT INTO users (username) VALUES ('user')")
        conn.execute(
            "INSERT INTO boards (user_id, board_json, conversation_json) VALUES (1, ?, '[]')",
            ('{"columns":[],"cards":{}}',),
        )

    app = create_app(db_path=db_path)
    client = TestClient(app)

    with client:
        health = client.get("/api/health")
        login = client.post(
            "/api/auth/login", json={"username": "user", "password": "password"}
        )

    assert health.status_code == 200
    assert login.status_code == 200
