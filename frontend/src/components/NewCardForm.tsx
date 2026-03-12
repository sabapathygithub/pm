import { useState, type FormEvent } from "react";
import type { CardPriority } from "@/lib/kanban";

const initialFormState = {
  title: "",
  details: "",
  priority: "medium" as CardPriority,
  assignee: "",
  dueDate: "",
  labels: "",
};

type NewCardFormProps = {
  onAdd: (
    title: string,
    details: string,
    metadata: {
      priority: CardPriority;
      assignee: string | null;
      dueDate: string | null;
      labels: string[];
    }
  ) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(formState.title.trim(), formState.details.trim(), {
      priority: formState.priority,
      assignee: formState.assignee.trim() || null,
      dueDate: formState.dueDate || null,
      labels: formState.labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    });
    setFormState(initialFormState);
    setIsOpen(false);
  };

  return (
    <div className="mt-4">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            required
          />
          <textarea
            value={formState.details}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, details: event.target.value }))
            }
            placeholder="Details"
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formState.priority}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  priority: event.target.value as CardPriority,
                }))
              }
              className="rounded-xl border border-[var(--stroke)] bg-white px-2 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--navy-dark)] outline-none"
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              value={formState.dueDate}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              type="date"
              className="rounded-xl border border-[var(--stroke)] bg-white px-2 py-2 text-xs text-[var(--gray-text)] outline-none"
              aria-label="Due date"
            />
          </div>
          <input
            value={formState.assignee}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, assignee: event.target.value }))
            }
            placeholder="Assignee"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <input
            value={formState.labels}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, labels: event.target.value }))
            }
            placeholder="Labels (comma separated)"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormState(initialFormState);
              }}
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-full border border-dashed border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
        >
          Add a card
        </button>
      )}
    </div>
  );
};
