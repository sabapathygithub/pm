from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import create_app


def _make_client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "pm-test.db"
    app = create_app(db_path=db_path)
    return TestClient(app)


def test_forgot_password_allows_login_with_new_password(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        reset_response = client.post(
            "/api/auth/forgot-password",
            json={"username": "user", "new_password": "new-password"},
        )
        old_login_response = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "password"},
        )
        new_login_response = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "new-password"},
        )

    assert reset_response.status_code == 200
    assert old_login_response.status_code == 401
    assert new_login_response.status_code == 200


def test_forgot_password_invalidates_existing_sessions(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        login_response = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "password"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]

        reset_response = client.post(
            "/api/auth/forgot-password",
            json={"username": "user", "new_password": "new-password"},
        )
        me_response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert reset_response.status_code == 200
    assert me_response.status_code == 401


def test_forgot_password_rejects_unknown_user(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        response = client.post(
            "/api/auth/forgot-password",
            json={"username": "unknown", "new_password": "new-password"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "User not found."


def test_forgot_password_rejects_short_password(tmp_path: Path) -> None:
    client = _make_client(tmp_path)

    with client:
        response = client.post(
            "/api/auth/forgot-password",
            json={"username": "user", "new_password": "123"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Password must be at least 4 characters."
