import { useState } from "react";
import type { CardPriority } from "@/lib/kanban";
import { CardModal } from "@/components/CardModal";

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

  const handleSubmit = () => {
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
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-full border border-dashed border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
      >
        Add a card
      </button>

      <CardModal
        open={isOpen}
        heading="Add card"
        submitLabel="Add card"
        title={formState.title}
        details={formState.details}
        priority={formState.priority}
        assignee={formState.assignee}
        dueDate={formState.dueDate}
        labels={formState.labels}
        onTitleChange={(value) => setFormState((prev) => ({ ...prev, title: value }))}
        onDetailsChange={(value) => setFormState((prev) => ({ ...prev, details: value }))}
        onPriorityChange={(value) => setFormState((prev) => ({ ...prev, priority: value }))}
        onAssigneeChange={(value) => setFormState((prev) => ({ ...prev, assignee: value }))}
        onDueDateChange={(value) => setFormState((prev) => ({ ...prev, dueDate: value }))}
        onLabelsChange={(value) => setFormState((prev) => ({ ...prev, labels: value }))}
        onSubmit={handleSubmit}
        onClose={() => {
          setIsOpen(false);
          setFormState(initialFormState);
        }}
      />
    </div>
  );
};
