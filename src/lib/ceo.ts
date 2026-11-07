import { CEO_EMAIL } from "../data/content";
import { SFUser } from "./types";

// ============================================================
// CEO IDENTITY
// ============================================================
// The CEO is one specific account. This module answers "is the signed-in
// user the CEO?" for DISPLAY decisions only — which buttons the app offers:
// the admin dashboard, the moderation/removal menu in Spaces, the badge.
//
// It is deliberately NOT a security boundary. Every privileged action is
// enforced by the backend, which derives the role from the verified token.
// A forged local cache can at most make the app show a control that the
// server will refuse with 403.
//
// Why not compare emails with `===`: email is an identifier, not a secret,
// and the backend may hand it back with different casing or surrounding
// whitespace (e.g. after a signup typed as "SereneFlow27@Gmail.com"). A
// case-sensitive comparison would silently strip the real CEO of the admin
// dashboard and moderation menu. Comparisons here are trimmed + lowercased,
// and the same value is never rewritten before being sent to the API.
// ============================================================

function key(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True when `email` is the CEO account (case-insensitive, trimmed). */
export function isCeoEmail(email: string | null | undefined): boolean {
  const e = key(email);
  return !!e && e === key(CEO_EMAIL);
}

/**
 * True when the signed-in user should see CEO-only UI.
 *
 * The server-issued role is preferred when present (it is the backend's own
 * answer), with the email comparison kept as a fallback so a profile payload
 * that omits `role` still shows the CEO their controls.
 */
export function isCeoUser(user: SFUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isCeo === true) return true;
  if (typeof user.role === "string" && user.role.trim().toLowerCase() === "ceo") return true;
  return isCeoEmail(user.email);
}
