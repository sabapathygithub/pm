export const AUTH_TOKEN_KEY = "pm-session-token";

export type AuthUser = {
  id: number;
  username: string;
  display_name: string;
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return token && token.trim() ? token : null;
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};
