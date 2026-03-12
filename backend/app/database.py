import hashlib
import json
import secrets
import sqlite3
from pathlib import Path

from app.board_defaults import default_board
from app.board_validation import validate_board_payload


def _get_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _hash_password(password: str, salt: str | None = None) -> str:
    resolved_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), resolved_salt.encode("utf-8"), 100_000
    )
    return f"{resolved_salt}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    salt, sep, _ = stored_hash.partition("$")
    if not sep or not salt:
        return False
    return secrets.compare_digest(_hash_password(password, salt), stored_hash)


def _migrate_boards_table_if_needed(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='boards'"
    ).fetchone()
    if not row:
        return

    table_sql = str(row["sql"] or "")
    if "is_active" in table_sql and "name" in table_sql and "UNIQUE" not in table_sql:
        return

    existing_rows = conn.execute(
        "SELECT id, user_id, board_json, conversation_json, created_at, updated_at FROM boards"
    ).fetchall()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS boards_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 0,
          board_json TEXT NOT NULL,
          conversation_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    for row in existing_rows:
        conn.execute(
            """
            INSERT INTO boards_migrated (
                id, user_id, name, is_active, board_json, conversation_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(row["id"]),
                int(row["user_id"]),
                "My Board",
                1,
                str(row["board_json"]),
                str(row["conversation_json"]),
                str(row["created_at"]),
                str(row["updated_at"]),
            ),
        )

    conn.execute("DROP TABLE boards")
    conn.execute("ALTER TABLE boards_migrated RENAME TO boards")


def _migrate_users_table_if_needed(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    ).fetchone()
    if not row:
        return

    table_sql = str(row["sql"] or "")
    has_modern_columns = (
        "password_hash" in table_sql
        and "display_name" in table_sql
        and "updated_at" in table_sql
    )
    if has_modern_columns:
        return

    existing_rows = conn.execute(
        "SELECT id, username, created_at FROM users"
    ).fetchall()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          display_name TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )

    for row in existing_rows:
        username = str(row["username"])
        conn.execute(
            """
            INSERT INTO users_migrated (
                id, username, password_hash, display_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(row["id"]),
                username,
                _hash_password("password"),
                username,
                str(row["created_at"]),
                str(row["created_at"]),
            ),
        )

    conn.execute("DROP TABLE users")
    conn.execute("ALTER TABLE users_migrated RENAME TO users")


def _ensure_default_user(conn: sqlite3.Connection) -> int:
    return create_user(conn, "user", "password", "Demo User")


def _ensure_active_board(conn: sqlite3.Connection, user_id: int) -> int:
    row = conn.execute(
        "SELECT id FROM boards WHERE user_id = ? AND is_active = 1", (user_id,)
    ).fetchone()
    if row:
        return int(row["id"])

    any_board = conn.execute(
        "SELECT id FROM boards WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", (user_id,)
    ).fetchone()

    if any_board:
        board_id = int(any_board["id"])
        conn.execute("UPDATE boards SET is_active = 0 WHERE user_id = ?", (user_id,))
        conn.execute("UPDATE boards SET is_active = 1 WHERE id = ?", (board_id,))
        return board_id

    cursor = conn.execute(
        """
        INSERT INTO boards (user_id, name, is_active, board_json, conversation_json)
        VALUES (?, ?, 1, ?, ?)
        """,
        (user_id, "My Board", json.dumps(default_board()), "[]"),
    )
    return int(cursor.lastrowid)


def initialize_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with _get_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        _migrate_users_table_if_needed(conn)

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              password_hash TEXT,
              display_name TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 0,
              board_json TEXT NOT NULL,
              conversation_json TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        _migrate_boards_table_if_needed(conn)

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute("CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_boards_user_active ON boards(user_id, is_active)"
        )

        user_id = _ensure_default_user(conn)
        _ensure_active_board(conn, user_id)


def create_user(
    conn: sqlite3.Connection, username: str, password: str, display_name: str | None
) -> int:
    clean_username = username.strip().lower()
    if not clean_username:
        raise ValueError("Username is required.")
    if len(password) < 4:
        raise ValueError("Password must be at least 4 characters.")

    existing = conn.execute(
        "SELECT id, password_hash, display_name FROM users WHERE username = ?",
        (clean_username,),
    ).fetchone()
    if existing:
        if not existing["password_hash"]:
            conn.execute(
                """
                UPDATE users
                SET password_hash = ?, display_name = COALESCE(display_name, ?), updated_at = datetime('now')
                WHERE id = ?
                """,
                (_hash_password(password), display_name or clean_username, int(existing["id"])),
            )
        return int(existing["id"])

    hashed = _hash_password(password)
    resolved_display_name = (display_name or clean_username).strip()
    cursor = conn.execute(
        """
        INSERT INTO users (username, password_hash, display_name)
        VALUES (?, ?, ?)
        """,
        (clean_username, hashed, resolved_display_name),
    )
    return int(cursor.lastrowid)


def register_user(
    db_path: Path, username: str, password: str, display_name: str | None = None
) -> dict:
    with _get_connection(db_path) as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username.strip().lower(),)
        ).fetchone()
        if existing:
            raise ValueError("Username already exists.")

        user_id = create_user(conn, username, password, display_name)
        _ensure_active_board(conn, user_id)

        row = conn.execute(
            "SELECT id, username, display_name FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return {
            "id": int(row["id"]),
            "username": str(row["username"]),
            "display_name": str(row["display_name"] or row["username"]),
        }


def login_user(db_path: Path, username: str, password: str) -> tuple[str, dict]:
    with _get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT id, username, display_name, password_hash FROM users WHERE username = ?",
            (username.strip().lower(),),
        ).fetchone()
        if not row:
            raise ValueError("Invalid username or password.")

        password_hash = str(row["password_hash"] or "")
        if not _verify_password(password, password_hash):
            raise ValueError("Invalid username or password.")

        token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
            (token, int(row["id"])),
        )
        _ensure_active_board(conn, int(row["id"]))

        return token, {
            "id": int(row["id"]),
            "username": str(row["username"]),
            "display_name": str(row["display_name"] or row["username"]),
        }


def get_user_by_token(db_path: Path, token: str) -> dict | None:
    with _get_connection(db_path) as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.display_name
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            return None

        return {
            "id": int(row["id"]),
            "username": str(row["username"]),
            "display_name": str(row["display_name"] or row["username"]),
        }


def logout_user(db_path: Path, token: str) -> None:
    with _get_connection(db_path) as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def list_boards(db_path: Path, user_id: int) -> list[dict]:
    with _get_connection(db_path) as conn:
        _ensure_active_board(conn, user_id)
        rows = conn.execute(
            """
            SELECT id, name, is_active, updated_at
            FROM boards
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()

        return [
            {
                "id": int(row["id"]),
                "name": str(row["name"]),
                "is_active": bool(row["is_active"]),
                "updated_at": str(row["updated_at"]),
            }
            for row in rows
        ]


def create_board(db_path: Path, user_id: int, name: str) -> dict:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Board name is required.")

    with _get_connection(db_path) as conn:
        conn.execute("UPDATE boards SET is_active = 0 WHERE user_id = ?", (user_id,))
        cursor = conn.execute(
            """
            INSERT INTO boards (user_id, name, is_active, board_json, conversation_json)
            VALUES (?, ?, 1, ?, ?)
            """,
            (user_id, clean_name, json.dumps(default_board()), "[]"),
        )
        board_id = int(cursor.lastrowid)

        row = conn.execute(
            "SELECT id, name, is_active, updated_at FROM boards WHERE id = ?", (board_id,)
        ).fetchone()
        return {
            "id": int(row["id"]),
            "name": str(row["name"]),
            "is_active": bool(row["is_active"]),
            "updated_at": str(row["updated_at"]),
        }


def set_active_board(db_path: Path, user_id: int, board_id: int) -> None:
    with _get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT id FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
        ).fetchone()
        if not row:
            raise ValueError("Board not found.")

        conn.execute("UPDATE boards SET is_active = 0 WHERE user_id = ?", (user_id,))
        conn.execute(
            "UPDATE boards SET is_active = 1, updated_at = datetime('now') WHERE id = ?",
            (board_id,),
        )


def rename_board(db_path: Path, user_id: int, board_id: int, name: str) -> None:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Board name is required.")

    with _get_connection(db_path) as conn:
        updated = conn.execute(
            """
            UPDATE boards
            SET name = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
            """,
            (clean_name, board_id, user_id),
        )
        if updated.rowcount == 0:
            raise ValueError("Board not found.")


def delete_board(db_path: Path, user_id: int, board_id: int) -> None:
    with _get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT is_active FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
        ).fetchone()
        if not row:
            raise ValueError("Board not found.")

        count = conn.execute(
            "SELECT COUNT(*) AS count FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()
        if int(count["count"]) <= 1:
            raise ValueError("At least one board must remain.")

        conn.execute("DELETE FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id))

        if bool(row["is_active"]):
            fallback = conn.execute(
                "SELECT id FROM boards WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
            if fallback:
                conn.execute(
                    "UPDATE boards SET is_active = 1, updated_at = datetime('now') WHERE id = ?",
                    (int(fallback["id"]),),
                )


def _resolve_board_row(
    conn: sqlite3.Connection, user_id: int, board_id: int | None
) -> sqlite3.Row:
    _ensure_active_board(conn, user_id)

    if board_id is not None:
        row = conn.execute(
            "SELECT id, name, board_json, conversation_json FROM boards WHERE id = ? AND user_id = ?",
            (board_id, user_id),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT id, name, board_json, conversation_json FROM boards WHERE user_id = ? AND is_active = 1",
            (user_id,),
        ).fetchone()

    if not row:
        raise ValueError("Board not found.")
    return row


def get_board(db_path: Path, user_id: int, board_id: int | None = None) -> dict:
    with _get_connection(db_path) as conn:
        row = _resolve_board_row(conn, user_id, board_id)
        board = json.loads(str(row["board_json"]))
        return board


def update_board(db_path: Path, board: dict, user_id: int, board_id: int | None = None) -> dict:
    validate_board_payload(board)

    with _get_connection(db_path) as conn:
        row = _resolve_board_row(conn, user_id, board_id)
        resolved_board_id = int(row["id"])

        conn.execute(
            """
            UPDATE boards
            SET board_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (json.dumps(board), resolved_board_id),
        )

    return board


def get_conversation(
    db_path: Path, user_id: int, board_id: int | None = None
) -> list[dict[str, str]]:
    with _get_connection(db_path) as conn:
        row = _resolve_board_row(conn, user_id, board_id)

        conversation = json.loads(str(row["conversation_json"]))
        if not isinstance(conversation, list):
            return []
        return conversation


def apply_ai_operation(
    db_path: Path,
    user_id: int,
    user_message: str,
    assistant_message: str,
    board_update: dict | None,
    max_history_messages: int,
    board_id: int | None = None,
) -> tuple[dict, bool, list[dict[str, str]]]:
    if max_history_messages < 2:
        raise ValueError("max_history_messages must be at least 2.")

    with _get_connection(db_path) as conn:
        row = _resolve_board_row(conn, user_id, board_id)
        resolved_board_id = int(row["id"])

        current_board = json.loads(str(row["board_json"]))
        raw_history = json.loads(str(row["conversation_json"]))
        history = raw_history if isinstance(raw_history, list) else []

        board_updated = False
        next_board = current_board
        if board_update is not None:
            validate_board_payload(board_update)
            next_board = board_update
            board_updated = True

        next_history = [
            *history,
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message},
        ]
        if len(next_history) > max_history_messages:
            next_history = next_history[-max_history_messages:]

        conn.execute(
            """
            UPDATE boards
            SET board_json = ?, conversation_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (json.dumps(next_board), json.dumps(next_history), resolved_board_id),
        )

        return next_board, board_updated, next_history
