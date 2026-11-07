import { api } from "./api";
import { SFUser } from "./types";
import { store } from "./store";
import { getToken, setToken } from "./secureStore";

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
//
// SECURITY NOTES
//  * The JWT is written to the platform secure store (see
//    secureStore.ts) and is deliberately NOT copied onto the SFUser
//    object, so it can never end up in the "current user" cache, in
//    component state, or in a crash/analytics payload.
//  * Emails are only trimmed before being sent to the backend. The identifier
//    is never rewritten (lowercasing could lock out an account whose stored
//    address is case-sensitive). Local comparisons are case-insensitive.
// ============================================================

export function normalizeEmail(email: string): string {
  return email.trim();
}

/** Case-insensitive comparison key for local-only decisions (never sent). */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length <= 254 && EMAIL_PATTERN.test(e);
}

/**
 * Reads the email-verification state from whichever field the backend uses.
 *
 * The endpoints were probed unauthenticated, so the exact response field is
 * not confirmed. Reading only `isVerified` was dangerous in one direction:
 * if the API omits the flag on a successful sign-in, the token would be
 * discarded and a fully verified user could never get past the Verify screen
 * (the flow would loop login -> verify -> back). So an explicit `false` still
 * means "unverified", while a completely absent flag is treated as verified —
 * the server only issues a token to an account it is willing to authenticate.
 */
function readVerified(raw: any): boolean {
  const v =
    raw?.isVerified ??
    raw?.emailVerified ??
    raw?.isEmailVerified ??
    raw?.email_verified ??
    raw?.verified;
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return Boolean(v);
}

/** Server-issued role, used only for display gating (see lib/ceo.ts). */
function readRole(raw: any): string | undefined {
  const r = raw?.role ?? raw?.userRole;
  return typeof r === "string" && r.trim() ? r.trim().toLowerCase() : undefined;
}

function normalizeUser(raw: any): SFUser {
  return {
    email: raw.email ?? raw.userEmail ?? raw.emailAddress ?? "",
    name: raw.name ?? raw.displayName ?? "",
    avatar: raw.avatar ?? raw.avatarUrl ?? raw.photoURL ?? null,
    createdAt: raw.createdAt ?? raw.created ?? new Date().toISOString(),
    logins: raw.logins ?? raw.loginCount ?? 0,
    lastActive: raw.lastActive ?? raw.lastActiveAt ?? new Date().toISOString(),
    id: raw.id ?? raw._id ?? raw.uid,
    isVerified: readVerified(raw),
    role: readRole(raw),
    isCeo: raw.isCeo === true ? true : undefined,
  };
}

function extractUserAndToken(res: any): { user: SFUser; token: string } {
  // Handle a few plausible response shapes defensively.
  const token = res?.token ?? res?.accessToken ?? res?.jwt ?? res?.idToken;
  const rawUser = res?.user ?? res?.data?.user ?? res;
  if (!token) {
    throw new Error("Login succeeded but no auth token was returned by the server.");
  }
  if (!rawUser || typeof rawUser !== "object") {
    throw new Error("Login succeeded but no user profile was returned by the server.");
  }
  return { user: normalizeUser(rawUser), token };
}

export async function signup(params: {
  name: string;
  email: string;
  password: string;
}): Promise<SFUser> {
  const payload = {
    name: params.name.trim(),
    email: normalizeEmail(params.email),
    password: params.password,
  };
  const res = await api.post("/auth/signup", payload, false);
  const { user, token } = extractUserAndToken(res);
  // Unverified accounts get no usable session until /auth/verify-email.
  await setToken(user.isVerified ? token : null);
  return user;
}

export async function login(params: { email: string; password: string }): Promise<SFUser> {
  const payload = { email: normalizeEmail(params.email), password: params.password };
  const res = await api.post("/auth/login", payload, false);
  const { user, token } = extractUserAndToken(res);
  await setToken(user.isVerified ? token : null);
  return user;
}

/**
 * Best-effort server-side session revocation. Local cleanup is the caller's
 * responsibility (session.endSession) so that a failed network call can never
 * leave a token or cached private data on the device.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout", undefined, true);
  } catch {
    // proceed with local logout regardless of server result
  }
  await setToken(null);
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email: normalizeEmail(email) }, false);
}

// Verified against the deployed API: POST /auth/reset-password requires
// { email, code, newPassword } and rejects a code that is not exactly 6
// digits ("Reset code must be exactly 6 digits"). Checking that here turns a
// generic 400 into a message the user can act on before sending a request.
export const RESET_CODE_PATTERN = /^\d{6}$/;

export function isValidResetCode(code: string): boolean {
  return RESET_CODE_PATTERN.test(code.trim());
}

export async function resetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await api.post(
    "/auth/reset-password",
    {
      email: normalizeEmail(params.email),
      code: params.code.trim(),
      newPassword: params.newPassword,
    },
    false
  );
}

// Backend: POST /auth/verify-email { email, code } -> { message, token, user }
export async function verifyEmail(params: { email: string; code: string }): Promise<SFUser> {
  const res = await api.post(
    "/auth/verify-email",
    { email: normalizeEmail(params.email), code: params.code.trim() },
    false
  );
  const token = res?.token;
  const rawUser = res?.user;

  if (!token || !rawUser) {
    throw new Error("Email verification succeeded but no verified session was returned by the server.");
  }

  const user = normalizeUser(rawUser);
  await setToken(token);
  return user;
}

// Backend: POST /auth/resend-verification { email } -> { message }
export async function resendVerification(email: string): Promise<void> {
  await api.post("/auth/resend-verification", { email: normalizeEmail(email) }, false);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Remember-me: persist which account to auto-restore, mirroring the
// original local-only "sf_remember" behavior but now re-hydrating via
// the backend token instead of the local users map. Only the email is
// stored — never credentials.
export function setRemember(email: string | null): void {
  if (email) store.set("sf_remember", normalizeEmail(email));
  else store.remove("sf_remember");
}

export function getRemember(): string | null {
  const v = store.get("sf_remember", null);
  return typeof v === "string" && v ? normalizeEmail(v) : null;
}
