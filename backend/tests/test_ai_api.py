from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import create_app


def _make_client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "pm-test.db"
    app = create_app(db_path=db_path)
    return TestClient(app)


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
    assert payload["model"] == "openai/gpt-oss-120b:free"
    assert payload["prompt"] == "2+2"
    assert payload["response"] == "4"


def test_ai_smoke_handles_openrouter_failure(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    from app.ai_client import OpenRouterError

    def fake_ask_openrouter(prompt: str, api_key: str) -> str:
        raise OpenRouterError("OpenRouter request failed.")

    monkeypatch.setattr("app.main.ask_openrouter", fake_ask_openrouter)
    client = _make_client(tmp_path)

    with client:
        response = client.get("/api/ai/smoke")

    assert response.status_code == 502
    assert "OpenRouter request failed." in response.json()["detail"]