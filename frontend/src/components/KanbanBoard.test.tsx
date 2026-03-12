import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData, type BoardData } from "@/lib/kanban";

const cloneBoard = (board: BoardData): BoardData =>
  JSON.parse(JSON.stringify(board)) as BoardData;

const currentUser = { id: 1, username: "user", display_name: "Demo User" };

const installMockApi = (seedBoard: BoardData) => {
  let storedBoard = cloneBoard(seedBoard);
  const boards = [{ id: 1, name: "My Board", is_active: true, updated_at: "now" }];

  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (input === "/api/boards") {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify(boards), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (input === "/api/boards/1/board") {
      const method = init?.method ?? "GET";
      if (method === "GET") {
        return new Response(JSON.stringify(storedBoard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "PUT") {
        const body = (init?.body ?? "{}") as string;
        storedBoard = JSON.parse(body) as BoardData;
        return new Response(JSON.stringify(storedBoard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (input === "/api/boards/1/activate") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (input === "/api/ai/operate" && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          assistant_message: "Updated the board.",
          board_updated: true,
          board: storedBoard,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(null, { status: 404 });
  });

  return {
    fetchMock,
    getStoredBoard: () => cloneBoard(storedBoard),
  };
};

describe("KanbanBoard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders five columns", async () => {
    installMockApi(initialData);
    render(<KanbanBoard currentUser={currentUser} />);
    await screen.findByText(/connected to backend/i);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("adds and removes a card", async () => {
    installMockApi(initialData);
    render(<KanbanBoard currentUser={currentUser} />);

    const column = await screen.findByTestId("column-col-backlog");
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    const dialog = screen.getByRole("dialog", { name: /add card/i });
    await userEvent.type(within(dialog).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(dialog).getByPlaceholderText(/^details$/i), "Notes");
    await userEvent.click(within(dialog).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    await userEvent.click(within(column).getByRole("button", { name: /delete new card/i }));
    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("persists updates to backend API", async () => {
    const { fetchMock, getStoredBoard } = installMockApi(initialData);
    render(<KanbanBoard currentUser={currentUser} />);

    const column = await screen.findByTestId("column-col-backlog");
    const input = within(column).getByLabelText(/column title for/i);
    await userEvent.clear(input);
    await userEvent.type(input, "API Saved");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/boards/1/board",
        expect.objectContaining({ method: "PUT" })
      );
    });

    expect(getStoredBoard().columns[0].title).toBe("API Saved");
  });
});
