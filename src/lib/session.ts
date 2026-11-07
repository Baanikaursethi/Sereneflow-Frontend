import { store } from "./store";
import { getToken, hasToken, setToken } from "./secureStore";
import { SFUser } from "./types";

// ============================================================
// SESSION LIFECYCLE
// ============================================================
// One place that decides what may be cached, and what must be wiped
// when a session ends or the device is handed to a different account.
//
// Rules:
//  * The cached user object never contains the JWT (that lives in the
//    platform secure store) and never contained a password.
//  * On logout / account switch, every key that can show one person's
//    private data to another person is removed.
//  * Journal entries and saved Mind Drops are deliberately NOT deleted:
//    they are this device's only copy and are namespaced per account
//    (`sf_journal_<email>`, `sf_drops_<email>`), so they can never be
//    read through another account's UI. Deleting them on logout would
//    silently destroy user data.
// ============================================================

const CURRENT_USER_KEY = "sf_current_user";
const REMEMBER_KEY = "sf_remember";

// Keys from the pre-backend local-only build. `sf_users` could hold a whole
// users map (including the `password` field in the very first local mock) and
// `sf_logs` every account's activity, so they must never survive a session.
const LEGACY_PRIVATE_KEYS = ["sf_users", "sf_logs"];

// Personalisation / shared content caches that must not bleed across accounts.
const VOLATILE_KEYS = ["sf_last_mood", "sf_spaces"];

/** The only shape persisted for a user: an explicit allow-list, so a field
 * added later (a token, a role flag, anything secret) can never leak into the
 * cache by accident. */
export type CachedUser = SFUser;

export function sanitizeUser(u: SFUser): CachedUser {
  return {
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    createdAt: u.createdAt,
    logins: u.logins,
    lastActive: u.lastActive,
    id: u.id,
    isVerified: u.isVerified,
    // Kept so the CEO keeps their admin entry point after an app restart.
    // Display-only: the backend decides what they may actually do.
    role: u.role,
    isCeo: u.isCeo,
  };
}

export function getCachedUser(): SFUser | null {
  const raw = store.get(CURRENT_USER_KEY, null);
  if (!raw || typeof raw !== "object" || typeof raw.email !== "string") return null;
  return raw as SFUser;
}

export function cacheUser(u: SFUser): void {
  store.set(CURRENT_USER_KEY, sanitizeUser(u));
}

/** Throws away caches that must not be shared between accounts. */
export function clearVolatileCaches(): void {
  VOLATILE_KEYS.forEach((k) => store.remove(k));
}

/** Removes data written by the pre-backend local-only build. */
export function clearLegacyCaches(): void {
  LEGACY_PRIVATE_KEYS.forEach((k) => store.remove(k));
}

/**
 * Starts a session for `u`. If a different account was signed in before,
 * that account's volatile caches are dropped first so nothing from the
 * previous user can appear in the new one's screens.
 */
export function beginSession(u: SFUser): void {
  const previous = getCachedUser();
  if (!previous || previous.email.toLowerCase() !== u.email.toLowerCase()) {
    clearVolatileCaches();
    clearLegacyCaches();
  }
  cacheUser(u);
  clearLegacyCaches();
}

/** Full local teardown: token, cached profile, remember flag and caches. */
export async function endSession(): Promise<void> {
  await setToken(null);
  store.remove(CURRENT_USER_KEY);
  store.remove(REMEMBER_KEY);
  clearVolatileCaches();
  clearLegacyCaches();
}

/**
 * Removes the local, device-only data belonging to `email`.
 *
 * Used on account deletion: journal entries and saved Mind Drops exist only on
 * this device, so nothing server-side can erase them. The Privacy Policy tells
 * users their data is removed when they delete their account — this is what
 * makes that true for the on-device copy.
 */
export function purgeLocalUserData(email: string): void {
  if (!email) return;
  store.remove(`sf_journal_${email}`);
  store.remove(`sf_drops_${email}`);
}

export function hasSession(): boolean {
  return hasToken();
}

export function sessionToken(): string | null {
  return getToken();
}
