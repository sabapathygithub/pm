type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiSidebarProps = {
  messages: ChatMessage[];
  draft: string;
  isSending: boolean;
  error: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export const AiSidebar = ({
  messages,
  draft,
  isSending,
  error,
  onDraftChange,
  onSend,
}: AiSidebarProps) => {
  return (
    <aside className="h-full rounded-3xl border border-[var(--stroke)] bg-white p-5 shadow-[var(--shadow)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
        AI Copilot
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
        Board Assistant
      </h2>
      <p className="mt-1 text-sm text-[var(--gray-text)]">
        Ask for card updates, moves, and column renames.
      </p>

      <div
        className="mt-4 flex max-h-[420px] min-h-[220px] flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3"
        data-testid="ai-chat-messages"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "self-end rounded-2xl rounded-br-md bg-[var(--primary-blue)] px-3 py-2 text-sm text-white"
                : "self-start rounded-2xl rounded-bl-md border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)]"
            }
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gray-text)]">
          Ask AI
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-2xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            placeholder="Ask AI to update board..."
            aria-label="AI message"
          />
        </label>

        {error ? (
          <p className="text-sm font-semibold text-[var(--secondary-purple)]">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={onSend}
          disabled={isSending || !draft.trim()}
          className="w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Thinking..." : "Send"}
        </button>
      </div>
    </aside>
  );
};
