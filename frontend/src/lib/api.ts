import type { BoardData } from "@/lib/kanban";
import { getAuthToken } from "@/lib/auth";

export type AiOperateResponse = {
  assistant_message: string;
  board_updated: boolean;
  board: BoardData;
};

const isCard = (value: unknown): value is BoardData["cards"][string] => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const card = value as Record<string, unknown>;
  return (
    typeof card.id === "string" &&
    typeof card.title === "string" &&
    typeof card.details === "string"
  );
};

const isBoardData = (value: unknown): value is BoardData => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const board = value as Record<string, unknown>;
  if (!Array.isArray(board.columns) || !board.cards || typeof board.cards !== "object") {
    return false;
  }

  const cards = board.cards as Record<string, unknown>;
  for (const [id, card] of Object.entries(cards)) {
    if (!isCard(card) || card.id !== id) {
      return false;
    }
  }

  for (const column of board.columns) {
    if (!column || typeof column !== "object") {
      return false;
    }
    const item = column as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      !Array.isArray(item.cardIds) ||
      !item.cardIds.every((cardId) => typeof cardId === "string" && Boolean(cards[cardId]))
    ) {
      return false;
    }
  }

  return true;
};

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Basic ${token}` };
};

export const fetchBoard = async (): Promise<BoardData | null> => {
  try {
    const response = await fetch("/api/board", {
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return isBoardData(payload) ? payload : null;
  } catch {
    return null;
  }
};

export const saveBoard = async (board: BoardData): Promise<boolean> => {
  try {
    const response = await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(board),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const runAiOperation = async (message: string): Promise<AiOperateResponse> => {
  const response = await fetch("/api/ai/operate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    let detail = "AI request failed";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string" && payload.detail.trim()) {
        detail = payload.detail;
      }
    } catch {
      // Keep the fallback message when the error response is not JSON.
    }

    throw new Error(detail);
  }

  const payload = await response.json();
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { assistant_message?: unknown }).assistant_message !== "string" ||
    typeof (payload as { board_updated?: unknown }).board_updated !== "boolean" ||
    !isBoardData((payload as { board?: unknown }).board)
  ) {
    throw new Error("AI response had an invalid shape.");
  }

  return payload as AiOperateResponse;
};
