import type { BoardData } from "@/lib/kanban";

export type AiOperateResponse = {
  assistant_message: string;
  board_updated: boolean;
  board: BoardData;
};

export const fetchBoard = async (): Promise<BoardData | null> => {
  try {
    const response = await fetch("/api/board", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const board = (await response.json()) as BoardData;
    return board;
  } catch {
    return null;
  }
};

export const saveBoard = async (board: BoardData): Promise<boolean> => {
  try {
    const response = await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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

  return (await response.json()) as AiOperateResponse;
};
