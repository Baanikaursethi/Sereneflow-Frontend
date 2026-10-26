import { store } from "./store";

// ============================================================
// API CLIENT — thin fetch wrapper for the Serene Flow NestJS
// backend. Kept isolated in this one file so that if actual
// request/response field names differ from what's documented
// in the backend README (we do not have backend source to
// verify exact DTOs), fixes are localized here rather than
// spread across every screen.
//
// Deployed backend base URL. All backend routes are mounted under
// an /api prefix, added centrally below in apiRequest() so every
// existing call site (paths like "/auth/login", "/moods", etc.)
// automatically resolves to the correct /api/... path without
// needing to be changed individually.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://us-central1-serene-flow-9e7e4.cloudfunctions.net";

const TOKEN_KEY = "sf_token";

export function getToken(): string | null {
  return store.get(TOKEN_KEY, null);
}

export function setToken(token: string | null): void {
  if (token) store.set(TOKEN_KEY, token);
  else store.remove(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: any;
  auth?: boolean; // attach Authorization header (default true)
}

// NOTE: exact error response shape (e.g. { message } vs { error })
// is unverified against real backend source; both are handled below.
export async function apiRequest<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new ApiError(
      "Network error — could not reach the server. Please check your connection.",
      0,
      null
    );
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, auth = true) => apiRequest<T>(path, { method: "GET", auth }),
  post: <T = any>(path: string, body?: any, auth = true) =>
    apiRequest<T>(path, { method: "POST", body, auth }),
  patch: <T = any>(path: string, body?: any, auth = true) =>
    apiRequest<T>(path, { method: "PATCH", body, auth }),
  delete: <T = any>(path: string, auth = true) => apiRequest<T>(path, { method: "DELETE", auth }),
};
