import { getToken } from "./secureStore";

// ============================================================
// API CLIENT — thin fetch wrapper for the Serene Flow NestJS
// backend. Kept isolated in this one file so that if actual
// request/response field names differ from what's documented
// in the backend README (we do not have backend source to
// verify exact DTOs), fixes are localized here rather than
// spread across every screen.
//
// Deployed backend base URL. Paths passed by call sites are used
// verbatim (e.g. "/auth/login" -> <base>/auth/login); the earlier
// comment here claimed an "/api" prefix was added centrally, which was
// never true in this file — the deployed base URL already includes
// whatever prefix the backend exposes, and changing it blindly would
// break every working call. If the backend is ever mounted under a
// different prefix, set EXPO_PUBLIC_API_BASE_URL instead of editing paths.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api-ysdoljkngq-uc.a.run.app";

// Requests must not hang forever: a stuck fetch leaves screens in a loading
// state with no way out and keeps stale private content on screen.
export const API_TIMEOUT_MS = 20000;

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Invoked once when the backend rejects the stored credentials (401).
 * App.tsx registers a handler that clears the session and returns the user
 * to the sign-in screen, so an expired/revoked token can never leave someone
 * looking at private screens backed by cached data.
 */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

function notifyUnauthorized(): void {
  if (!unauthorizedHandler) return;
  try {
    unauthorizedHandler();
  } catch {
    /* never let cleanup failure mask the original error */
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: any;
  auth?: boolean; // attach Authorization header (default true)
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// NOTE: exact error response shape (e.g. { message } vs { error })
// is unverified against real backend source; both are handled below.
export async function apiRequest<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (auth) {
    const token = getToken();
    if (!token) {
      // No credentials -> do not send an anonymous request to a protected
      // endpoint and treat it like an expired session.
      notifyUnauthorized();
      throw new ApiError("Your session has ended. Please sign in again.", 401, null);
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    if (e && e.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.", 0, null);
    }
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

  if (res.status === 401 && auth) {
    // Token expired, revoked, or belongs to a deleted account.
    notifyUnauthorized();
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

export { getToken };
