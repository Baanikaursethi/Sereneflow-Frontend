import { store } from "./store";

// ============================================================
// API CLIENT — thin fetch wrapper for the Serene Flow NestJS
// backend. Kept isolated in this one file so that if actual
// request/response field names differ from what's documented
// in the backend README, fixes are localized here rather than
// spread across every screen.
//
// Deployed backend base URL (Google Cloud Run).
// The NestJS backend sets a global "/api" prefix via app.setGlobalPrefix('api').
// All requests must therefore use paths like "/api/auth/login", "/api/moods", etc.
// The EXPO_PUBLIC_API_BASE_URL env var should already include the /api suffix if
// overridden (e.g. "https://my-backend.run.app/api"), otherwise the default below
// appends it. The Cloud Function deployment strips /api at the edge, so it remains
// compatible with both deployment targets.
const _rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api-ysdoljkngq-uc.a.run.app";
export const API_BASE_URL = _rawBase.endsWith("/api")
  ? _rawBase
  : _rawBase.replace(/\/$/, "") + "/api";

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
