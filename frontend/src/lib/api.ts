import type { AuthUser } from "@/lib/auth";
import { getAuthToken } from "@/lib/auth";
import type { BoardData, CardPriority } from "@/lib/kanban";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type BoardSummary = {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
};

export type AiOperateResponse = {
  assistant_message: string;
  board_updated: boolean;
  board: BoardData;
};

const VALID_PRIORITIES: CardPriority[] = ["low", "medium", "high", "critical"];

const isCard = (value: unknown): value is BoardData["cards"][string] => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const card = value as Record<string, unknown>;
  const priority = card.priority;
  if (priority !== undefined && (!VALID_PRIORITIES.includes(priority as CardPriority))) {
    return false;
  }
  if (card.assignee !== undefined && card.assignee !== null && typeof card.assignee !== "string") {
    return false;
  }
  if (card.dueDate !== undefined && card.dueDate !== null && typeof card.dueDate !== "string") {
    return false;
  }
  if (card.labels !== undefined && (!Array.isArray(card.labels) || !card.labels.every((v) => typeof v === "string"))) {
    return false;
  }
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
  return { Authorization: `Bearer ${token}` };
};

const extractError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    // fallback
  }
  return fallback;
};

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Login failed."));
  }
  return (await response.json()) as AuthResponse;
};

export const register = async (
  username: string,
  password: string,
  displayName: string
): Promise<AuthResponse> => {
  const response = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, display_name: displayName || null }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Registration failed."));
  }
  return (await response.json()) as AuthResponse;
};

export const getMe = async (): Promise<AuthUser | null> => {
  const response = await fetch(apiUrl("/api/auth/me"), {
    headers: authHeaders(),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as AuthUser;
};

export const logout = async (): Promise<void> => {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers: authHeaders(),
  });
};

export const listBoards = async (): Promise<BoardSummary[]> => {
  const response = await fetch(apiUrl("/api/boards"), { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to load boards."));
  }
  return (await response.json()) as BoardSummary[];
};

export const createBoard = async (name: string): Promise<BoardSummary> => {
  const response = await fetch(apiUrl("/api/boards"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to create board."));
  }
  return (await response.json()) as BoardSummary;
};

export const renameBoard = async (boardId: number, name: string): Promise<void> => {
  const response = await fetch(apiUrl(`/api/boards/${boardId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to rename board."));
  }
};

export const deleteBoard = async (boardId: number): Promise<void> => {
  const response = await fetch(apiUrl(`/api/boards/${boardId}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to delete board."));
  }
};

export const activateBoard = async (boardId: number): Promise<void> => {
  const response = await fetch(apiUrl(`/api/boards/${boardId}/activate`), {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to activate board."));
  }
};

export const fetchBoard = async (): Promise<BoardData | null> => {
  try {
    const response = await fetch(apiUrl("/api/board"), {
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

export const fetchBoardById = async (boardId: number): Promise<BoardData | null> => {
  try {
    const response = await fetch(apiUrl(`/api/boards/${boardId}/board`), {
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
    const response = await fetch(apiUrl("/api/board"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(board),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const saveBoardById = async (boardId: number, board: BoardData): Promise<boolean> => {
  try {
    const response = await fetch(apiUrl(`/api/boards/${boardId}/board`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(board),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const runAiOperation = async (
  message: string,
  boardId: number | null
): Promise<AiOperateResponse> => {
  const response = await fetch(apiUrl("/api/ai/operate"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message, board_id: boardId }),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, "AI request failed"));
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
