from copy import deepcopy

FIXED_COLUMN_IDS = [
    "col-backlog",
    "col-discovery",
    "col-progress",
    "col-review",
    "col-done",
]

DEFAULT_BOARD = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": []},
        {"id": "col-discovery", "title": "Discovery", "cardIds": []},
        {"id": "col-progress", "title": "In Progress", "cardIds": []},
        {"id": "col-review", "title": "Review", "cardIds": []},
        {"id": "col-done", "title": "Done", "cardIds": []},
    ],
    "cards": {},
}


def default_board() -> dict:
    return deepcopy(DEFAULT_BOARD)
