import { api, setToken, getToken } from "./api";
import { SFUser } from "./types";
import { store } from "./store";

// ============================================================
// AUTH — talks to the backend /auth endpoints and maps its
// response shape onto the app's existing SFUser type, so the
// rest of the app (which reads user.email / user.name / etc.)
// doesn't need to change.
//
// UNVERIFIED ASSUMPTION: we do not have backend source, only the
// README's endpoint list. We assume signup/login responses look
// like { user: {...}, token: "..." } (common Nest/JWT pattern),
// and normalize a few likely field-name variants (id/_id/uid,
// createdAt/created, avatar/avatarUrl, lastActive/lastActiveAt).
// If actual field names differ, only this file needs updating.
// ============================================================

function normalizeUser(raw: any, token?: string): SFUser {
  return {
    email: raw.email,
    name: raw.name ?? raw.displayName ?? "",
    password: "", // never stored/echoed by backend
    avatar: raw.avatar ?? raw.avatarUrl ?? raw.photoURL ?? null,
    createdAt: raw.createdAt ?? raw.created ?? new Date().toISOString(),
    logins: raw.logins ?? raw.loginCount ?? 0,
    lastActive: raw.lastActive ?? raw.lastActiveAt ?? new Date().toISOString(),
    id: raw.id ?? raw._id ?? raw.uid,
    isVerified: raw.isVerified ?? false,
    token,
  };
}

function extractUserAndToken(res: any): { user: SFUser; token: string } {
  // Handle a few plausible response shapes defensively.
  const token = res.token ?? res.accessToken ?? res.jwt ?? res.idToken;
  const rawUser = res.user ?? res.data?.user ?? res;
  if (!token) {
    throw new Error("Login succeeded but no auth token was returned by the server.");
  }
  return { user: normalizeUser(rawUser, token), token };
}

export async function signup(params: {
  name: string;
  email: string;
  password: string;
}): Promise<SFUser> {
  const res = await api.post("/auth/signup", params, false);
  const { user, token } = extractUserAndToken(res);
  if (user.isVerified) setToken(token);
  else setToken(null);
  return user;
}

export async function login(params: { email: string; password: string }): Promise<SFUser> {
  const res = await api.post("/auth/login", params, false);
  const { user, token } = extractUserAndToken(res);
  if (user.isVerified) setToken(token);
  else setToken(null);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout", undefined, true);
  } catch {
    // best-effort — proceed with local logout regardless of server result
  }
  setToken(null);
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email }, false);
}

export async function resetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/reset-password", params, false);
}

// Backend: POST /auth/verify-email { email, code } -> { message, token, user }
export async function verifyEmail(params: { email: string; code: string }): Promise<SFUser> {
  const res = await api.post("/auth/verify-email", params, false);
  const token = res?.token;
  const rawUser = res?.user;

  if (!token || !rawUser) {
    throw new Error("Email verification succeeded but no verified session was returned by the server.");
  }

  const user = normalizeUser(rawUser, token);
  setToken(token);
  return user;
}

// Backend: POST /auth/resend-verification { email } -> { message }
export async function resendVerification(email: string): Promise<void> {
  await api.post("/auth/resend-verification", { email }, false);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Remember-me: persist which account to auto-restore, mirroring the
// original local-only "sf_remember" behavior but now re-hydrating via
// the backend token instead of the local users map.
export function setRemember(email: string | null): void {
  if (email) store.set("sf_remember", email);
  else store.remove("sf_remember");
}

export function getRemember(): string | null {
  return store.get("sf_remember", null);
}
