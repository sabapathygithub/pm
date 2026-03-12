"use client";

import { FormEvent, useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { clearAuthToken, getAuthToken, setAuthToken, type AuthUser } from "@/lib/auth";
import { getMe, login, logout, register } from "@/lib/api";

type Mode = "login" | "register";
type Theme = "light" | "dark";
const THEME_KEY = "pm-theme";

export const AuthGate = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const resolvedTheme: Theme = storedTheme === "dark" ? "dark" : "light";
    setTheme(resolvedTheme);
    document.documentElement.setAttribute("data-theme", resolvedTheme);

    const bootstrap = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const me = await getMe();
      if (!me) {
        clearAuthToken();
        setIsLoading(false);
        return;
      }
      setCurrentUser(me);
      setIsLoading(false);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const auth =
        mode === "login"
          ? await login(username, password)
          : await register(username, password, displayName);
      setAuthToken(auth.token);
      setCurrentUser(auth.user);
      setUsername("");
      setPassword("");
      setDisplayName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : "Unable to continue."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      setCurrentUser(null);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <button
          type="button"
          onClick={toggleTheme}
          className="fixed left-4 top-4 z-10 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--navy-dark)] shadow-[var(--shadow)]"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <section className="w-full max-w-md rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Project Management
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            {mode === "login" ? "Continue with your account." : "Create a new account."}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
                mode === "login"
                  ? "bg-[var(--primary-blue)] text-white"
                  : "border border-[var(--stroke)] text-[var(--gray-text)]"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
                mode === "register"
                  ? "bg-[var(--primary-blue)] text-white"
                  : "border border-[var(--stroke)] text-[var(--gray-text)]"
              }`}
            >
              Register
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className="block text-sm font-semibold text-[var(--navy-dark)]">
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-4 py-2 outline-none focus:border-[var(--primary-blue)]"
                  placeholder="Demo User"
                />
              </label>
            ) : null}

            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-4 py-2 outline-none focus:border-[var(--primary-blue)]"
                placeholder="user"
                autoComplete="username"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[var(--navy-dark)]">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-4 py-2 outline-none focus:border-[var(--primary-blue)]"
                placeholder="password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <p className="text-sm font-semibold text-[var(--secondary-purple)]" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "login" ? (
            <p className="mt-4 text-xs text-[var(--gray-text)]">
              MVP default account: <span className="font-semibold">user / password</span>
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <div>
      <div className="fixed left-4 top-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--navy-dark)] shadow-[var(--shadow)]"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 shadow-[var(--shadow)]">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--gray-text)]">
          {currentUser.display_name}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--navy-dark)]"
        >
          Logout
        </button>
      </div>
      <KanbanBoard currentUser={currentUser} />
    </div>
  );
};
