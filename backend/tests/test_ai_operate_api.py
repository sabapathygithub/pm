from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import create_app


def _make_client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "pm-test.db"
    app = create_app(db_path=db_path)
    return TestClient(app)


def _login(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    return response.json()["token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_ai_operate_valid_output_without_board_update(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def fake_request_board_operation(
        board: dict,
        history: list[dict[str, str]],
        user_message: str,
        api_key: str,
    ) -> dict:
        assert isinstance(board, dict)
        assert isinstance(history, list)
        assert user_message == "Summarize current board"
        assert api_key == "test-key"
        return {
            "assistant_message": "Board looks healthy.",
            "board_update": None,
        }

    monkeypatch.setattr("app.main.request_board_operation", fake_request_board_operation)
    client = _make_client(tmp_path)

    with client:
        token = _login(client)
        response = client.post(
            "/api/ai/operate",
            json={"message": "Summarize current board"},
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assistant_message"] == "Board looks healthy."
    assert payload["board_updated"] is False


def test_ai_operate_valid_output_with_board_update(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def fake_request_board_operation(
        board: dict,
        history: list[dict[str, str]],
        user_message: str,
        api_key: str,
    ) -> dict:
        updated_board = {
            **board,
            "columns": [
                {
                    **board["columns"][0],
                    "title": "Ideas",
                },
                *board["columns"][1:],
            ],
        }
        return {
            "assistant_message": "Renamed the first column to Ideas.",
            "board_update": updated_board,
        }

    monkeypatch.setattr("app.main.request_board_operation", fake_request_board_operation)
    client = _make_client(tmp_path)

    with client:
        token = _login(client)
        response = client.post(
            "/api/ai/operate",
            json={"message": "Rename backlog to ideas"},
            headers=_auth_headers(token),
        )
        board_response = client.get("/api/board", headers=_auth_headers(token))

    assert response.status_code == 200
    payload = response.json()
    assert payload["board_updated"] is True
    assert payload["board"]["columns"][0]["title"] == "Ideas"
    assert board_response.status_code == 200


def test_ai_operate_requires_authorization_header(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    client = _make_client(tmp_path)

    with client:
        response = client.post(
            "/api/ai/operate",
            json={"message": "Do something"},
        )

    assert response.status_code == 401
