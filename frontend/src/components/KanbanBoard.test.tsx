import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData, type BoardData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const cloneBoard = (board: BoardData): BoardData =>
  JSON.parse(JSON.stringify(board)) as BoardData;

const renderBoardOffline = async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  render(<KanbanBoard />);
  await screen.findByText(/backend unavailable/i);
};

const installMockBoardApi = (seedBoard: BoardData) => {
  let storedBoard = cloneBoard(seedBoard);

  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      if (input !== "/api/board") {
        return new Response(null, { status: 404 });
      }

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

      return new Response(null, { status: 405 });
    });

  return {
    fetchMock,
    getStoredBoard: () => cloneBoard(storedBoard),
  };
};

const installMockBoardAndAiApi = (
  seedBoard: BoardData,
  aiResponse: { assistant_message: string; board_updated: boolean; board: BoardData }
) => {
  let storedBoard = cloneBoard(seedBoard);

  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      if (input === "/api/board") {
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

      if (input === "/api/ai/operate" && init?.method === "POST") {
        if (aiResponse.board_updated) {
          storedBoard = cloneBoard(aiResponse.board);
        }
        return new Response(JSON.stringify(aiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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
    await renderBoardOffline();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("keeps AI sidebar closed by default and opens on toggle", async () => {
    await renderBoardOffline();

    expect(screen.queryByLabelText("AI message")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));

    expect(screen.getByLabelText("AI message")).toBeInTheDocument();
  });

  it("renames a column", async () => {
    await renderBoardOffline();
    const column = getFirstColumn();
    const input = within(column).getByLabelText(/column title for/i);
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    await renderBoardOffline();
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits an existing card", async () => {
    await renderBoardOffline();
    const column = getFirstColumn();

    await userEvent.click(
      within(column).getByRole("button", { name: /edit align roadmap themes/i })
    );

    const titleInput = within(column).getByLabelText("Card title");
    const detailsInput = within(column).getByLabelText("Card details");

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated roadmap task");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Updated details");

    await userEvent.click(
      within(column).getByRole("button", { name: /save align roadmap themes/i })
    );

    expect(within(column).getByText("Updated roadmap task")).toBeInTheDocument();
    expect(within(column).getByText("Updated details")).toBeInTheDocument();
  });

  it("loads board data from backend API", async () => {
    const boardFromApi = cloneBoard(initialData);
    boardFromApi.columns[0].title = "Ideas";
    boardFromApi.cards["card-1"].title = "Loaded from backend";
    installMockBoardApi(boardFromApi);

    render(<KanbanBoard />);

    expect(await screen.findByDisplayValue("Ideas")).toBeInTheDocument();
    expect(screen.getByText("Loaded from backend")).toBeInTheDocument();
    expect(screen.getByText(/connected to backend/i)).toBeInTheDocument();
  });

  it("persists updates to backend API", async () => {
    const { fetchMock, getStoredBoard } = installMockBoardApi(initialData);
    render(<KanbanBoard />);

    const column = await screen.findByTestId("column-col-backlog");
    const input = within(column).getByLabelText(/column title for/i);
    await userEvent.clear(input);
    await userEvent.type(input, "API Saved");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/board",
        expect.objectContaining({ method: "PUT" })
      );
    });

    expect(getStoredBoard().columns[0].title).toBe("API Saved");
  });

  it("keeps persisted board state after remount", async () => {
    const { getStoredBoard } = installMockBoardApi(initialData);
    const firstRender = render(<KanbanBoard />);

    const firstColumn = await screen.findByTestId("column-col-backlog");
    const input = within(firstColumn).getByLabelText(/column title for/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Persisted Name");

    await waitFor(() => {
      expect(getStoredBoard().columns[0].title).toBe("Persisted Name");
    });

    firstRender.unmount();
    render(<KanbanBoard />);

    expect(await screen.findByDisplayValue("Persisted Name")).toBeInTheDocument();
  });

  it("submits chat and renders AI response", async () => {
    const aiResponse = {
      assistant_message: "I renamed backlog to Ideas.",
      board_updated: false,
      board: cloneBoard(initialData),
    };
    const { fetchMock } = installMockBoardAndAiApi(initialData, aiResponse);

    render(<KanbanBoard />);

    await screen.findByTestId("column-col-backlog");
    await userEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    await userEvent.type(screen.getByLabelText("AI message"), "Rename backlog");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("I renamed backlog to Ideas.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/operate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("applies AI board update immediately", async () => {
    const updatedBoard = cloneBoard(initialData);
    updatedBoard.columns[0].title = "AI Ideas";

    const aiResponse = {
      assistant_message: "Updated the board.",
      board_updated: true,
      board: updatedBoard,
    };

    installMockBoardAndAiApi(initialData, aiResponse);
    render(<KanbanBoard />);

    await screen.findByTestId("column-col-backlog");
    await userEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    await userEvent.type(screen.getByLabelText("AI message"), "Rename first column to AI Ideas");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByDisplayValue("AI Ideas")).toBeInTheDocument();
    expect(screen.getByText(/ai updated board/i)).toBeInTheDocument();
  });

  it("does not crash when API returns malformed card references", async () => {
    const malformedBoard = cloneBoard(initialData);
    malformedBoard.columns[0].cardIds.push("missing-card-id");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (input === "/api/board" && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify(malformedBoard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (input === "/api/board" && init?.method === "PUT") {
        return new Response(JSON.stringify(malformedBoard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 404 });
    });

    render(<KanbanBoard />);

    expect(
      await screen.findByText(/using local demo board \(backend unavailable\)/i)
    ).toBeInTheDocument();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renders AI error when AI response shape is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (input === "/api/board") {
        const method = init?.method ?? "GET";
        if (method === "GET") {
          return new Response(JSON.stringify(initialData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (method === "PUT") {
          return new Response(JSON.stringify(initialData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (input === "/api/ai/operate" && init?.method === "POST") {
        return new Response(JSON.stringify({ invalid: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 404 });
    });

    render(<KanbanBoard />);

    await screen.findByTestId("column-col-backlog");
    await userEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    await userEvent.type(screen.getByLabelText("AI message"), "Rename backlog");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/ai response had an invalid shape\./i)
    ).toBeInTheDocument();
  });
});
