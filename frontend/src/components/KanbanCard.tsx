import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useState } from "react";
import type { Card, CardPriority } from "@/lib/kanban";
import { CardModal } from "@/components/CardModal";

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

  const dndProps = isEditing ? {} : { ...attributes, ...listeners };

  return (
    <>
      <article
        ref={setNodeRef}
        style={style}
        className={clsx(
          "rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
          "transition-all duration-150",
          isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
        )}
        {...dndProps}
        data-testid={`card-${card.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-full">
            <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">{card.title}</h4>
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
          </div>
          <div className="flex flex-col gap-2">
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

      <CardModal
        open={isEditing}
        heading={`Edit card: ${card.title}`}
        submitLabel="Save card"
        title={title}
        details={details}
        priority={priority}
        assignee={assignee}
        dueDate={dueDate}
        labels={labels}
        onTitleChange={setTitle}
        onDetailsChange={setDetails}
        onPriorityChange={setPriority}
        onAssigneeChange={setAssignee}
        onDueDateChange={setDueDate}
        onLabelsChange={setLabels}
        onSubmit={handleSave}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
};
