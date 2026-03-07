import httpx
import json

OPENROUTER_MODEL = "openai/gpt-oss-120b:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterError(Exception):
    pass


def ask_openrouter(prompt: str, api_key: str) -> str:
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            OPENROUTER_URL,
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        details = exc.response.text.strip()
        if details:
            details = details[:300]
            raise OpenRouterError(
                f"OpenRouter request failed with status {exc.response.status_code}: {details}"
            ) from exc
        raise OpenRouterError(
            f"OpenRouter request failed with status {exc.response.status_code}."
        ) from exc
    except httpx.HTTPError as exc:
        raise OpenRouterError("OpenRouter request failed.") from exc

    data = response.json()
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise OpenRouterError("OpenRouter returned no choices.")

    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise OpenRouterError("OpenRouter response message was invalid.")

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("OpenRouter returned empty content.")

    return content.strip()


def request_board_operation(
    board: dict,
    history: list[dict[str, str]],
    user_message: str,
    api_key: str,
) -> dict:
    prompt = (
        "You are helping with a Kanban board. "
        "Return only valid JSON with exactly these keys: "
        '"assistant_message" (string) and "board_update" (object or null). '
        "If no board change is needed, set board_update to null.\n\n"
        f"Current board JSON:\n{json.dumps(board)}\n\n"
        f"Conversation history JSON:\n{json.dumps(history)}\n\n"
        f"User message:\n{user_message}"
    )

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "kanban_operation",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "assistant_message": {"type": "string"},
                        "board_update": {
                            "anyOf": [
                                {"type": "null"},
                                {"type": "object"},
                            ]
                        },
                    },
                    "required": ["assistant_message", "board_update"],
                    "additionalProperties": False,
                },
            },
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            OPENROUTER_URL,
            json=payload,
            headers=headers,
            timeout=45.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        details = exc.response.text.strip()
        if details:
            details = details[:300]
            raise OpenRouterError(
                f"OpenRouter request failed with status {exc.response.status_code}: {details}"
            ) from exc
        raise OpenRouterError(
            f"OpenRouter request failed with status {exc.response.status_code}."
        ) from exc
    except httpx.HTTPError as exc:
        raise OpenRouterError("OpenRouter request failed.") from exc

    data = response.json()
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise OpenRouterError("OpenRouter returned no choices.")

    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise OpenRouterError("OpenRouter response message was invalid.")

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("OpenRouter returned empty content.")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("OpenRouter returned invalid JSON content.") from exc

    if not isinstance(parsed, dict):
        raise OpenRouterError("OpenRouter JSON output must be an object.")

    return parsed