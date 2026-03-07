import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

describe("AuthGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("blocks invalid credentials", async () => {
    render(<AuthGate />);

    await userEvent.type(screen.getByLabelText(/username/i), "bad");
    await userEvent.type(screen.getByLabelText(/password/i), "creds");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      screen.getByText(/invalid credentials\. use user \/ password\./i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^kanban studio$/i })
    ).not.toBeInTheDocument();
  });

  it("allows login with valid credentials", async () => {
    render(<AuthGate />);

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /kanban studio/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("logs out and returns to login", async () => {
    render(<AuthGate />);

    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(
      screen.getByRole("heading", { name: /sign in to kanban studio/i })
    ).toBeInTheDocument();
  });
});
