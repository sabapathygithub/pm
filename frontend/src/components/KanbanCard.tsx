import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useState } from "react";
import type { Card, CardPriority } from "@/lib/kanban";

const iconClassName = "h-3.5 w-3.5";

type KanbanCardProps = {
  card: Card;
  onUpdate: (
    cardId: string,
    title: string,
    details: string,
    metadata: {
      priority: CardPriority;
      assignee: string | null;
      dueDate: string | null;
      labels: string[];
    }
  ) => void;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onUpdate, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<CardPriority>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const nextTitle = title.trim() || "Untitled";
    const nextDetails = details.trim() || "No details yet.";
    onUpdate(card.id, nextTitle, nextDetails, {
      priority,
      assignee: assignee.trim() || null,
      dueDate: dueDate || null,
      labels: labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const dndProps = isEditing ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...dndProps}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-[var(--stroke)] px-2 py-1 font-display text-base font-semibold text-[var(--navy-dark)] outline-none"
                aria-label="Card title"
              />
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--stroke)] px-2 py-1 text-sm leading-6 text-[var(--gray-text)] outline-none"
                aria-label="Card details"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as CardPriority)}
                  aria-label="Card priority"
                  className="rounded-lg border border-[var(--stroke)] px-2 py-1 text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Card due date"
                  className="rounded-lg border border-[var(--stroke)] px-2 py-1 text-xs"
                />
              </div>
              <input
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                aria-label="Card assignee"
                placeholder="Assignee"
                className="w-full rounded-lg border border-[var(--stroke)] px-2 py-1 text-xs"
              />
              <input
                value={labels}
                onChange={(event) => setLabels(event.target.value)}
                aria-label="Card labels"
                placeholder="Labels (comma separated)"
                className="w-full rounded-lg border border-[var(--stroke)] px-2 py-1 text-xs"
              />
            </div>
          ) : (
            <>
              <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
                {card.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">{card.details}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                <span className="rounded-full border border-[var(--stroke)] px-2 py-1 text-[var(--primary-blue)]">
                  {card.priority ?? "medium"}
                </span>
                {card.assignee ? (
                  <span className="rounded-full border border-[var(--stroke)] px-2 py-1 text-[var(--gray-text)]">
                    {card.assignee}
                  </span>
                ) : null}
                {card.dueDate ? (
                  <span className="rounded-full border border-[var(--stroke)] px-2 py-1 text-[var(--secondary-purple)]">
                    due {card.dueDate}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--secondary-purple)] transition hover:border-[var(--stroke)]"
                aria-label={`Save ${card.title}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={iconClassName}
                  aria-hidden="true"
                >
                  <path d="M5 21h14" />
                  <path d="M7 21V7h8l2 2v12" />
                  <path d="M9 3h6v4H9z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                aria-label={`Cancel editing ${card.title}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={iconClassName}
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitle(card.title);
                setDetails(card.details);
                setPriority(card.priority ?? "medium");
                setAssignee(card.assignee ?? "");
                setDueDate(card.dueDate ?? "");
                setLabels((card.labels ?? []).join(", "));
                setIsEditing(true);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
              aria-label={`Edit ${card.title}`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={iconClassName}
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
            aria-label={`Delete ${card.title}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={iconClassName}
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
};
