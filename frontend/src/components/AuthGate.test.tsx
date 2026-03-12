import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthGate } from "@/components/AuthGate";

describe("AuthGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (input === "/api/auth/me") {
        return new Response(null, { status: 401 });
      }

      if (input === "/api/auth/login" && init?.method === "POST") {
        const body = JSON.parse((init.body as string) ?? "{}");
        if (body.username === "user" && body.password === "password") {
          return new Response(
            JSON.stringify({
              token: "token-123",
              user: { id: 1, username: "user", display_name: "Demo User" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ detail: "Invalid username or password." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (input === "/api/boards") {
        return new Response(
          JSON.stringify([{ id: 1, name: "My Board", is_active: true, updated_at: "now" }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (input === "/api/boards/1/board") {
        return new Response(
          JSON.stringify({
            columns: [
              { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
              { id: "col-discovery", title: "Discovery", cardIds: [] },
              { id: "col-progress", title: "In Progress", cardIds: [] },
              { id: "col-review", title: "Review", cardIds: [] },
              { id: "col-done", title: "Done", cardIds: [] },
            ],
            cards: {
              "card-1": {
                id: "card-1",
                title: "Task",
                details: "Details",
                priority: "medium",
                assignee: null,
                dueDate: null,
                labels: [],
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (input === "/api/auth/logout" && init?.method === "POST") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks invalid credentials", async () => {
    render(<AuthGate />);

    await userEvent.type(await screen.findByLabelText(/username/i), "bad");
    await userEvent.type(screen.getByLabelText(/password/i), "creds");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it("allows login with valid credentials", async () => {
    render(<AuthGate />);

    await userEvent.type(await screen.findByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("heading", { name: /kanban studio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("toggles and persists theme", async () => {
    render(<AuthGate />);

    const toggle = await screen.findByRole("button", { name: /toggle theme/i });
    expect(toggle).toHaveTextContent(/dark mode/i);

    await userEvent.click(toggle);

    expect(toggle).toHaveTextContent(/light mode/i);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("pm-theme")).toBe("dark");
  });
});
