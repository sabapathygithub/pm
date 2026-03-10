export const AUTH_TOKEN_KEY = "pm-auth-token";
export const VALID_USERNAME = "user";
export const VALID_PASSWORD = "password";

export const buildAuthToken = (username: string, password: string): string => {
  return btoa(`${username}:${password}`);
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return token && token.trim() ? token : null;
};

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};
