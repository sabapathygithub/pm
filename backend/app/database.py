import json
import sqlite3
from pathlib import Path

from app.board_defaults import default_board
from app.board_validation import validate_board_payload


def _get_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_user(conn: sqlite3.Connection, username: str) -> int:
    row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if row:
        return int(row["id"])

    cursor = conn.execute("INSERT INTO users (username) VALUES (?)", (username,))
    return int(cursor.lastrowid)


def _ensure_board(conn: sqlite3.Connection, user_id: int) -> None:
    row = conn.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,)).fetchone()
    if row:
        return

    conn.execute(
        """
        INSERT INTO boards (user_id, board_json, conversation_json)
        VALUES (?, ?, ?)
        """,
        (user_id, json.dumps(default_board()), "[]"),
    )


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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL UNIQUE,
              board_json TEXT NOT NULL,
              conversation_json TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        user_id = _ensure_user(conn, "user")
        _ensure_board(conn, user_id)


def get_board(db_path: Path, username: str = "user") -> dict:
    with _get_connection(db_path) as conn:
        user_id = _ensure_user(conn, username)
        _ensure_board(conn, user_id)

        row = conn.execute(
            "SELECT board_json FROM boards WHERE user_id = ?",
            (user_id,),
        ).fetchone()

        if not row:
            # Defensive fallback; should not happen after _ensure_board.
            board = default_board()
            conn.execute(
                "INSERT INTO boards (user_id, board_json, conversation_json) VALUES (?, ?, ?)",
                (user_id, json.dumps(board), "[]"),
            )
            return board

        board = json.loads(str(row["board_json"]))
        return board


def update_board(db_path: Path, board: dict, username: str = "user") -> dict:
    validate_board_payload(board)

    with _get_connection(db_path) as conn:
        user_id = _ensure_user(conn, username)
        _ensure_board(conn, user_id)

        conn.execute(
            """
            UPDATE boards
            SET board_json = ?, updated_at = datetime('now')
            WHERE user_id = ?
            """,
            (json.dumps(board), user_id),
        )

    return board


def get_conversation(db_path: Path, username: str = "user") -> list[dict[str, str]]:
    with _get_connection(db_path) as conn:
        user_id = _ensure_user(conn, username)
        _ensure_board(conn, user_id)

        row = conn.execute(
            "SELECT conversation_json FROM boards WHERE user_id = ?",
            (user_id,),
        ).fetchone()

        if not row:
            return []

        conversation = json.loads(str(row["conversation_json"]))
        if not isinstance(conversation, list):
            return []
        return conversation


def update_conversation(
    db_path: Path,
    conversation: list[dict[str, str]],
    username: str = "user",
) -> list[dict[str, str]]:
    with _get_connection(db_path) as conn:
        user_id = _ensure_user(conn, username)
        _ensure_board(conn, user_id)

        conn.execute(
            """
            UPDATE boards
            SET conversation_json = ?, updated_at = datetime('now')
            WHERE user_id = ?
            """,
            (json.dumps(conversation), user_id),
        )

    return conversation
