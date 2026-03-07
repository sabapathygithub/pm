from app.board_defaults import FIXED_COLUMN_IDS


def validate_board_payload(board: dict) -> None:
    if not isinstance(board, dict):
        raise ValueError("Board must be an object.")

    columns = board.get("columns")
    cards = board.get("cards")

    if not isinstance(columns, list):
        raise ValueError("Board columns must be a list.")
    if not isinstance(cards, dict):
        raise ValueError("Board cards must be an object map.")

    if len(columns) != len(FIXED_COLUMN_IDS):
        raise ValueError("Board must contain exactly 5 fixed columns.")

    column_ids = []
    all_card_ids: list[str] = []

    for column in columns:
        if not isinstance(column, dict):
            raise ValueError("Each column must be an object.")

        column_id = column.get("id")
        title = column.get("title")
        card_ids = column.get("cardIds")

        if not isinstance(column_id, str):
            raise ValueError("Each column id must be a string.")
        if not isinstance(title, str):
            raise ValueError("Each column title must be a string.")
        if not isinstance(card_ids, list) or not all(
            isinstance(card_id, str) for card_id in card_ids
        ):
            raise ValueError("Each column cardIds must be a list of strings.")

        column_ids.append(column_id)
        all_card_ids.extend(card_ids)

    if column_ids != FIXED_COLUMN_IDS:
        raise ValueError("Column IDs are fixed and must match MVP configuration.")

    if len(all_card_ids) != len(set(all_card_ids)):
        raise ValueError("Each card must appear in exactly one column.")

    for card_key, card in cards.items():
        if not isinstance(card_key, str):
            raise ValueError("Card map keys must be strings.")
        if not isinstance(card, dict):
            raise ValueError("Each card must be an object.")

        card_id = card.get("id")
        title = card.get("title")
        details = card.get("details")

        if card_id != card_key:
            raise ValueError("Card id must match card map key.")
        if not isinstance(title, str):
            raise ValueError("Card title must be a string.")
        if not isinstance(details, str):
            raise ValueError("Card details must be a string.")

    if set(all_card_ids) != set(cards.keys()):
        raise ValueError("Card references in columns and cards map must match exactly.")
