import type { CardPriority } from "@/lib/kanban";

type CardModalProps = {
  open: boolean;
  title: string;
  details: string;
  priority: CardPriority;
  assignee: string;
  dueDate: string;
  labels: string;
  heading: string;
  submitLabel: string;
  onTitleChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onPriorityChange: (value: CardPriority) => void;
  onAssigneeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onLabelsChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const CardModal = ({
  open,
  title,
  details,
  priority,
  assignee,
  dueDate,
  labels,
  heading,
  submitLabel,
  onTitleChange,
  onDetailsChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onLabelsChange,
  onSubmit,
  onClose,
}: CardModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,33,71,0.38)] p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--stroke)] bg-white p-5 shadow-[0_20px_48px_rgba(3,33,71,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-[var(--navy-dark)]">{heading}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--gray-text)]"
            aria-label="Close card modal"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3" role="dialog" aria-modal="true" aria-label={heading}>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Card title"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <textarea
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
            placeholder="Details"
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={priority}
              onChange={(event) => onPriorityChange(event.target.value as CardPriority)}
              className="rounded-xl border border-[var(--stroke)] bg-white px-2 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--navy-dark)] outline-none"
              aria-label="Priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
              type="date"
              className="rounded-xl border border-[var(--stroke)] bg-white px-2 py-2 text-xs text-[var(--gray-text)] outline-none"
              aria-label="Due date"
            />
          </div>
          <input
            value={assignee}
            onChange={(event) => onAssigneeChange(event.target.value)}
            placeholder="Assignee"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <input
            value={labels}
            onChange={(event) => onLabelsChange(event.target.value)}
            placeholder="Labels (comma separated)"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSubmit}
              className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
