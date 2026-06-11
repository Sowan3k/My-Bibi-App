/**
 * My Bibi — Axios API client
 *
 * All API calls go through this module. It:
 * - Points to the backend (via Next.js rewrite or direct URL)
 * - Attaches JWT from localStorage on every request
 * - Handles 401 by clearing the token and redirecting to /login
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://localhost:8000"
    : ""; // On client, use Next.js rewrites (proxy to backend)

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bibi_token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("bibi_token");
        // Only redirect if not already on an auth page
        const authPaths = ["/login", "/setup", "/join"];
        const isAuthPage = authPaths.some((p) =>
          window.location.pathname.startsWith(p)
        );
        if (!isAuthPage) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Helper: check if user is logged in (has a token in localStorage).
 * Does NOT validate the token against the backend.
 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("bibi_token");
}

/**
 * Helper: clear auth and redirect to login.
 */
export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bibi_token");
    window.location.href = "/login";
  }
}
