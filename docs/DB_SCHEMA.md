# Database Schema Proposal (Part 5)

This proposal keeps the MVP simple and stores the board as JSON in SQLite, while preserving a path for future multi-user growth.

## Goals

- Keep MVP persistence simple and reliable.
- Support one board per user for now.
- Keep schema easy to evolve later.
- Enforce constraints that matter at DB level (one board per user, valid FK).

## Proposed Tables

## `users`

Purpose:
- Store users for current MVP and future expansion.

Schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Notes:
- MVP login is still frontend-only (`user` / `password`).
- This table still exists now to avoid redesign later when auth becomes backend-driven.

## `boards`

Purpose:
- Store one board per user as JSON.

Schema:

```sql
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  board_json TEXT NOT NULL,
  conversation_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Notes:
- `UNIQUE(user_id)` enforces one-board-per-user for MVP.
- `board_json` stores board structure (columns/cards).
- `conversation_json` stores AI conversation history for Part 9.

## JSON Payload Shapes

`board_json` stores this shape:

```json
{
  "columns": [
    { "id": "col-backlog", "title": "Backlog", "cardIds": ["card-1"] },
    { "id": "col-discovery", "title": "Discovery", "cardIds": [] },
    { "id": "col-progress", "title": "In Progress", "cardIds": [] },
    { "id": "col-review", "title": "Review", "cardIds": [] },
    { "id": "col-done", "title": "Done", "cardIds": [] }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Example",
      "details": "Example details"
    }
  }
}
```

`conversation_json` stores this shape:

```json
[
  { "role": "user", "content": "..." },
  { "role": "assistant", "content": "..." }
]
```

## Why JSON For MVP

- Board reads/writes are straightforward and match current frontend shape.
- No complex joins for card/column operations in MVP.
- Minimal backend code for Phase 6 and 7.

Tradeoff:
- DB cannot deeply enforce board internals (fixed column IDs, card integrity).
- Those rules will be validated in backend request handling.

## Required Backend Validation Rules (Phase 6)

When loading or updating `board_json`, backend must validate:
- Exactly 5 columns exist.
- Column IDs are fixed: `col-backlog`, `col-discovery`, `col-progress`, `col-review`, `col-done`.
- Column titles are editable.
- Card IDs referenced in `cardIds` exist in `cards` map.
- Every card appears in exactly one column list.

## Basic Access Pattern

Read board by username:
1. Lookup `users.id` by `username`.
2. Lookup `boards.board_json` by `user_id`.
3. If board row missing, create default board for that user.

Update board by username:
1. Lookup `users.id`.
2. Validate incoming board JSON.
3. `UPDATE boards SET board_json = ?, updated_at = datetime('now') WHERE user_id = ?`.

## Migration Strategy

MVP migration strategy is intentionally simple:
- On backend startup, run `CREATE TABLE IF NOT EXISTS` statements.
- Ensure default user row (`user`) exists.
- Ensure default board row exists for that user.

Future evolution option:
- Move from whole-board JSON to normalized `columns` and `cards` tables if query needs grow.

## Success Criteria For Part 5

- Schema is approved by user.
- It clearly supports one-board-per-user and JSON board persistence.
- It includes conversation storage for upcoming AI phases.
