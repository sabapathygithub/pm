import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiSidebar } from "@/components/AiSidebar";

describe("AiSidebar", () => {
  it("renders existing messages", () => {
    render(
      <AiSidebar
        messages={[
          { role: "assistant", content: "Hi" },
          { role: "user", content: "Rename backlog" },
        ]}
        draft=""
        isSending={false}
        error=""
        onDraftChange={() => {}}
        onSend={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("Rename backlog")).toBeInTheDocument();
  });

  it("allows input editing and send", async () => {
    const onDraftChange = vi.fn();
    const onSend = vi.fn();

    render(
      <AiSidebar
        messages={[]}
        draft="Move card to review"
        isSending={false}
        error=""
        onDraftChange={onDraftChange}
        onSend={onSend}
        onClose={() => {}}
      />
    );

    await userEvent.type(screen.getByLabelText("AI message"), " now");
    expect(onDraftChange).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
