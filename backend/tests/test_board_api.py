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


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Basic dXNlcjpwYXNzd29yZA=="}


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
    assert boards_count == 1


def test_get_board_returns_default_shape(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        response = client.get("/api/board", headers=_auth_headers())

    assert response.status_code == 200
    payload = response.json()
    assert [column["id"] for column in payload["columns"]] == FIXED_COLUMN_IDS
    assert isinstance(payload["cards"], dict)
    assert len(payload["cards"]) > 0


def test_update_board_persists_changes(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        board = client.get("/api/board", headers=_auth_headers()).json()
        board["columns"][0]["title"] = "Ideas"
        board["cards"]["card-1"]["title"] = "Renamed card"

        update_response = client.put("/api/board", json=board, headers=_auth_headers())
        read_response = client.get("/api/board", headers=_auth_headers())

    assert update_response.status_code == 200
    assert read_response.status_code == 200
    assert read_response.json()["columns"][0]["title"] == "Ideas"
    assert read_response.json()["cards"]["card-1"]["title"] == "Renamed card"


def test_update_board_rejects_invalid_column_ids(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        board = client.get("/api/board", headers=_auth_headers()).json()
        board["columns"][0]["id"] = "col-custom"

        response = client.put("/api/board", json=board, headers=_auth_headers())

    assert response.status_code == 400
    assert "Column IDs are fixed" in response.json()["detail"]


def test_update_board_rejects_mismatched_card_references(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        board = client.get("/api/board", headers=_auth_headers()).json()
        board["cards"].pop("card-1")

        response = client.put("/api/board", json=board, headers=_auth_headers())

    assert response.status_code == 400
    assert "Card references" in response.json()["detail"]


def test_one_board_per_user_constraint_holds(tmp_path: Path) -> None:
    client, db_path = _make_client(tmp_path)

    with client:
        board = client.get("/api/board", headers=_auth_headers()).json()
        board["columns"][1]["title"] = "Research"
        put_response = client.put("/api/board", json=board, headers=_auth_headers())
        assert put_response.status_code == 200

        second_put_response = client.put(
            "/api/board", json=board, headers=_auth_headers()
        )
        assert second_put_response.status_code == 200

    with sqlite3.connect(db_path) as conn:
        user_id = conn.execute(
            "SELECT id FROM users WHERE username = 'user'"
        ).fetchone()[0]
        board_count = conn.execute(
            "SELECT COUNT(*) FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()[0]

    assert board_count == 1


def test_board_requires_authorization_header(tmp_path: Path) -> None:
    client, _ = _make_client(tmp_path)

    with client:
        response = client.get("/api/board")

    assert response.status_code == 401
