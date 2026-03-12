import { expect, test, type Page } from "@playwright/test";

type BoardData = {
  columns: Array<{ id: string; title: string; cardIds: string[] }>;
  cards: Record<
    string,
    {
      id: string;
      title: string;
      details: string;
      priority?: "low" | "medium" | "high" | "critical";
      assignee?: string | null;
      dueDate?: string | null;
      labels?: string[];
    }
  >;
};

const makeInitialBoard = (): BoardData => ({
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      details: "Draft quarterly themes with impact statements and metrics.",
      priority: "medium",
      assignee: "Product",
      labels: ["planning"],
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      details: "Review support tags, sales notes, and churn feedback.",
      priority: "high",
      assignee: "Research",
      labels: ["discovery"],
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      details: "Sketch initial dashboard layout and key drill-downs.",
      priority: "medium",
      assignee: "Design",
      labels: ["design"],
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      details: "Standardize column labels and tone across the board.",
      priority: "low",
      assignee: "Ops",
      labels: ["ux"],
    },
    "card-5": {
      id: "card-5",
      title: "Design card layout",
      details: "Add hierarchy and spacing for scanning dense lists.",
      priority: "medium",
      assignee: "Design",
      labels: ["ui"],
    },
    "card-6": {
      id: "card-6",
      title: "QA micro-interactions",
      details: "Verify hover, focus, and loading states.",
      priority: "high",
      assignee: "QA",
      labels: ["qa"],
    },
    "card-7": {
      id: "card-7",
      title: "Ship marketing page",
      details: "Final copy approved and asset pack delivered.",
      priority: "medium",
      assignee: "Marketing",
      labels: ["release"],
    },
    "card-8": {
      id: "card-8",
      title: "Close onboarding sprint",
      details: "Document release notes and share internally.",
      priority: "low",
      assignee: "Team",
      labels: ["retrospective"],
    },
  },
});

const mockApi = async (page: Page) => {
  let board = makeInitialBoard();

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 401 });
  });

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "token-1",
        user: { id: 1, username: "user", display_name: "Demo User" },
      }),
    });
  });

  await page.route("**/api/boards", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: 1, name: "My Board", is_active: true, updated_at: "now" }]),
      });
      return;
    }

    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 2, name: "Board 2", is_active: true, updated_at: "now" }),
      });
      return;
    }

    await route.fulfill({ status: 405 });
  });

  await page.route("**/api/boards/*/activate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });

  await page.route("**/api/boards/*/board", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(board),
      });
      return;
    }

    if (request.method() === "PUT") {
      board = request.postDataJSON() as BoardData;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(board),
      });
      return;
    }

    await route.fulfill({ status: 405 });
  });
};

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
};

test("loads the kanban board", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await mockApi(page);
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("filters cards using search", async ({ page }) => {
  await mockApi(page);
  await login(page);

  await page.getByPlaceholder(/search title/i).fill("qa micro");
  await expect(page.getByTestId("card-card-6")).toBeVisible();
  await expect(page.getByTestId("card-card-1")).toHaveCount(0);
});
