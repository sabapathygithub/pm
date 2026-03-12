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


def test_ai_smoke_requires_api_key(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    client = _make_client(tmp_path)

    with client:
        response = client.get("/api/ai/smoke")

    assert response.status_code == 503
    assert "OPENROUTER_API_KEY" in response.json()["detail"]


def test_ai_smoke_returns_openrouter_answer(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def fake_ask_openrouter(prompt: str, api_key: str) -> str:
        assert prompt == "2+2"
        assert api_key == "test-key"
        return "4"

    monkeypatch.setattr("app.main.ask_openrouter", fake_ask_openrouter)
    client = _make_client(tmp_path)

    with client:
        response = client.get("/api/ai/smoke")

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "openai/gpt-oss-120b"
    assert payload["prompt"] == "2+2"
    assert payload["response"] == "4"


def test_board_rejects_bad_auth_header(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        response = client.get(
            "/api/board",
            headers={"Authorization": "Basic invalid"},
        )

    assert response.status_code == 401


def test_board_accepts_valid_auth_header(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        token = _login(client)
        response = client.get("/api/board", headers=_auth_headers(token))

    assert response.status_code == 200
