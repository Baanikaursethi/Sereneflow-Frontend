import { api } from "./api";
import { SFUser } from "./types";

// ============================================================
// PROFILE / USERS API — backend wiring for /users/me endpoints.
// Isolated here so any field-name mismatch (no backend source,
// only the README's endpoint list) only needs fixing in this file.
//
// UNVERIFIED ASSUMPTIONS:
// - GET /users/me returns the current user profile (streaks/stats
//   per README) — normalized defensively, same shape assumptions
//   as auth.ts's normalizeUser.
// - PATCH /users/me body: { name } -> updated user (or 200/204).
// - PATCH /users/me/avatar body: { avatar: dataUri } -> updated
//   user (or 200/204). Field name "avatar" vs "avatarUrl" unverified;
//   this is the most likely guess given the local field is also
//   called "avatar".
// - POST /users/me/activity: no required body; stamps lastActive
//   server-side.
// - DELETE /users/me: 200/204 on success.
// ============================================================

function normalizeUser(raw: any, existing: SFUser): SFUser {
  return {
    ...existing,
    email: raw.email ?? existing.email,
    name: raw.name ?? raw.displayName ?? existing.name,
    avatar: raw.avatar ?? raw.avatarUrl ?? raw.photoURL ?? existing.avatar,
    createdAt: raw.createdAt ?? raw.created ?? existing.createdAt,
    logins: raw.logins ?? raw.loginCount ?? existing.logins,
    lastActive: raw.lastActive ?? raw.lastActiveAt ?? existing.lastActive,
    id: raw.id ?? raw._id ?? raw.uid ?? existing.id,
  };
}

export async function fetchMyProfile(existing: SFUser): Promise<SFUser> {
  const res = await api.get("/users/me");
  const raw = res?.data ?? res;
  return normalizeUser(raw ?? {}, existing);
}

export async function updateMyName(name: string, existing: SFUser): Promise<SFUser> {
  const res = await api.patch("/users/me", { name });
  const raw = res?.data ?? res;
  return normalizeUser(raw ?? { name }, existing);
}

export async function updateMyAvatar(avatarDataUri: string, existing: SFUser): Promise<SFUser> {
  const res = await api.patch("/users/me/avatar", { avatar: avatarDataUri });
  const raw = res?.data ?? res;
  return normalizeUser(raw ?? { avatar: avatarDataUri }, existing);
}

export async function logMyActivity(): Promise<void> {
  try {
    await api.post("/users/me/activity");
  } catch {
    // best-effort — activity logging should never block the UI
  }
}

export async function deleteMyAccount(): Promise<void> {
  await api.delete("/users/me");
}
