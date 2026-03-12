"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AiSidebar } from "@/components/AiSidebar";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import {
  activateBoard,
  createBoard,
  deleteBoard,
  fetchBoard,
  fetchBoardById,
  listBoards,
  renameBoard,
  runAiOperation,
  saveBoard,
  saveBoardById,
  type BoardSummary,
} from "@/lib/api";
import { createId, initialData, moveCard, type BoardData, type CardPriority } from "@/lib/kanban";
import type { AuthUser } from "@/lib/auth";

export const KanbanBoard = ({ currentUser }: { currentUser: AuthUser }) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>("Ready");
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | CardPriority>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([{ role: "assistant", content: "Ask me to create, edit, move, or rename board items." }]);
  const [chatDraft, setChatDraft] = useState<string>("");
  const [isSendingAi, setIsSendingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const renameSaveTimeoutRef = useRef<number | null>(null);

  const loadBoards = async () => {
    const boardList = await listBoards();
    setBoards(boardList);
    const active = boardList.find((item) => item.is_active) ?? boardList[0] ?? null;
    setActiveBoardId(active?.id ?? null);
    return active?.id ?? null;
  };

  useEffect(() => {
    let isMounted = true;
    setSyncMessage("Loading boards...");

    const loadBoardData = async () => {
      try {
        const activeId = await loadBoards();
        const serverBoard = activeId ? await fetchBoardById(activeId) : await fetchBoard();

        if (!isMounted) {
          return;
        }

        if (serverBoard) {
          setBoard(serverBoard);
          setSyncMessage("Connected to backend");
          return;
        }

        setSyncMessage("Using local demo board (backend unavailable)");
      } catch {
        if (isMounted) {
          setSyncMessage("Using local demo board (backend unavailable)");
        }
      }
    };

    void loadBoardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (renameSaveTimeoutRef.current !== null) {
        window.clearTimeout(renameSaveTimeoutRef.current);
      }
    };
  }, []);

  const applyBoardUpdate = (updater: (previous: BoardData) => BoardData) => {
    setBoard((previous) => {
      const next = updater(previous);
      const persist = activeBoardId ? saveBoardById(activeBoardId, next) : saveBoard(next);
      void persist.then((ok) => {
        setSyncMessage(ok ? "Saved" : "Save failed (local changes still visible)");
      });
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    Object.values(board.cards).forEach((card) => {
      (card.labels ?? []).forEach((label) => labels.add(label));
    });
    return ["all", ...Array.from(labels).sort((a, b) => a.localeCompare(b))];
  }, [board.cards]);

  const isVisible = (cardId: string) => {
    const card = board.cards[cardId];
    if (!card) {
      return false;
    }

    const textFilter = searchText.trim().toLowerCase();
    if (textFilter) {
      const haystack = `${card.title} ${card.details} ${card.assignee ?? ""} ${(card.labels ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(textFilter)) {
        return false;
      }
    }

    if (priorityFilter !== "all" && (card.priority ?? "medium") !== priorityFilter) {
      return false;
    }

    if (labelFilter !== "all" && !(card.labels ?? []).includes(labelFilter)) {
      return false;
    }

    return true;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    applyBoardUpdate((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => {
      const next = {
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      };

      if (renameSaveTimeoutRef.current !== null) {
        window.clearTimeout(renameSaveTimeoutRef.current);
      }

      renameSaveTimeoutRef.current = window.setTimeout(() => {
        const persist = activeBoardId ? saveBoardById(activeBoardId, next) : saveBoard(next);
        void persist.then((ok) => {
          setSyncMessage(ok ? "Saved" : "Save failed (local changes still visible)");
        });
      }, 350);

      return next;
    });
  };

  const handleAddCard = (
    columnId: string,
    title: string,
    details: string,
    metadata: {
      priority: CardPriority;
      assignee: string | null;
      dueDate: string | null;
      labels: string[];
    }
  ) => {
    const id = createId("card");
    applyBoardUpdate((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: {
          id,
          title,
          details: details || "No details yet.",
          priority: metadata.priority,
          assignee: metadata.assignee,
          dueDate: metadata.dueDate,
          labels: metadata.labels,
        },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleUpdateCard = (
    cardId: string,
    title: string,
    details: string,
    metadata: {
      priority: CardPriority;
      assignee: string | null;
      dueDate: string | null;
      labels: string[];
    }
  ) => {
    applyBoardUpdate((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: {
          ...prev.cards[cardId],
          title,
          details,
          priority: metadata.priority,
          assignee: metadata.assignee,
          dueDate: metadata.dueDate,
          labels: metadata.labels,
        },
      },
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    applyBoardUpdate((prev) => {
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
    });
  };

  const handleSendAiMessage = async () => {
    const message = chatDraft.trim();
    if (!message) {
      return;
    }

    setChatDraft("");
    setAiError("");
    setIsSendingAi(true);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const response = await runAiOperation(message, activeBoardId);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.assistant_message },
      ]);

      if (response.board_updated) {
        setBoard(response.board);
        setSyncMessage("AI updated board");
      } else {
        setSyncMessage("AI responded");
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AI request failed. Please try again.";
      setAiError(message);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I could not process that request right now.",
        },
      ]);
    } finally {
      setIsSendingAi(false);
    }
  };

  const switchBoard = async (boardId: number) => {
    await activateBoard(boardId);
    setActiveBoardId(boardId);
    const data = await fetchBoardById(boardId);
    if (data) {
      setBoard(data);
      setSyncMessage("Board switched");
    }
    const updated = await listBoards();
    setBoards(updated);
  };

  const createNewBoard = async () => {
    const name = window.prompt("New board name", `Board ${boards.length + 1}`);
    if (!name) {
      return;
    }
    const created = await createBoard(name);
    const updatedBoards = await listBoards();
    setBoards(updatedBoards);
    await switchBoard(created.id);
  };

  const renameCurrentBoard = async () => {
    if (!activeBoardId) {
      return;
    }
    const current = boards.find((item) => item.id === activeBoardId);
    const nextName = window.prompt("Rename board", current?.name ?? "");
    if (!nextName) {
      return;
    }
    await renameBoard(activeBoardId, nextName);
    setBoards(await listBoards());
    setSyncMessage("Board renamed");
  };

  const deleteCurrentBoard = async () => {
    if (!activeBoardId) {
      return;
    }
    const confirmed = window.confirm("Delete current board?");
    if (!confirmed) {
      return;
    }
    await deleteBoard(activeBoardId);
    const updated = await listBoards();
    setBoards(updated);
    const active = updated.find((item) => item.is_active) ?? updated[0] ?? null;
    setActiveBoardId(active?.id ?? null);
    if (active) {
      const data = await fetchBoardById(active.id);
      if (data) {
        setBoard(data);
      }
    }
    setSyncMessage("Board deleted");
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  const visibleCardsCount = Object.keys(board.cards).filter((cardId) => isVisible(cardId)).length;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-[var(--panel-bg)] p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Multi-board workspace
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-2 text-sm text-[var(--gray-text)]">Welcome, {currentUser.display_name}</p>
              <p
                className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gray-text)]"
                role="status"
                aria-live="polite"
              >
                {syncMessage}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Visible cards
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">{visibleCardsCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeBoardId ?? ""}
              onChange={(event) => {
                const id = Number(event.target.value);
                if (!Number.isNaN(id)) {
                  void switchBoard(id);
                }
              }}
              className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm"
              aria-label="Board selector"
            >
              {boards.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-full bg-[var(--secondary-purple)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
              onClick={() => void createNewBoard()}
            >
              New board
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--navy-dark)]"
              onClick={() => void renameCurrentBoard()}
            >
              Rename
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--navy-dark)]"
              onClick={() => void deleteCurrentBoard()}
            >
              Delete
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search title, details, assignee, label"
              className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm"
            />
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | CardPriority)}
              className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm"
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm"
            >
              {allLabels.map((label) => (
                <option key={label} value={label}>
                  {label === "all" ? "All labels" : label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section
          className={
            isAiSidebarOpen ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-6"
          }
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="grid gap-6 lg:grid-cols-5">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds
                    .filter((cardId) => isVisible(cardId))
                    .map((cardId) => board.cards[cardId])
                    .filter((card): card is (typeof board.cards)[string] => Boolean(card))}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
            <DragOverlay>
              {activeCard ? (
                <div className="w-[260px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {isAiSidebarOpen ? (
            <AiSidebar
              messages={chatMessages}
              draft={chatDraft}
              isSending={isSendingAi}
              error={aiError}
              onDraftChange={setChatDraft}
              onSend={handleSendAiMessage}
              onClose={() => setIsAiSidebarOpen(false)}
            />
          ) : null}
        </section>

        {!isAiSidebarOpen ? (
          <button
            type="button"
            onClick={() => setIsAiSidebarOpen(true)}
            aria-label="Open AI assistant"
            className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--secondary-purple)] text-white shadow-[0_14px_32px_rgba(3,33,71,0.22)] transition hover:scale-[1.03] hover:opacity-95"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M7 10h10" />
              <path d="M7 14h6" />
              <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-5.5A8.5 8.5 0 1 1 21 11.5Z" />
            </svg>
          </button>
        ) : null}
      </main>
    </div>
  );
};
