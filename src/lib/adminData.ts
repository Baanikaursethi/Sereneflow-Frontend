import { firstTime } from "./time";

// ============================================================
// ADMIN PAYLOAD MAPPING (pure — no network, no React)
// ============================================================
// The admin endpoints exist and are JWT-guarded, but their exact response
// bodies could not be inspected without an account. So every number is read
// through an alias list, and — when a scalar is missing — computed from the
// user/log lists instead. That keeps the dashboard correct for a flat stats
// object, a nested one, or lists-only responses.
//
// PRIVACY: counts and event types only. Nothing here carries another user's
// email, name, journal or Spaces content out of the raw payload.
// ============================================================

export interface AdminStats {
  totalUsers: number | null;
  activeUsers: number | null;
  newThisWeek: number | null;
  totalLogins: number | null;
  loginsToday: number | null;
  loginsThisWeek: number | null;
  signupsThisWeek: number | null;
  totalDeletions: number | null;
  deletionsThisWeek: number | null;
}

export interface AdminActivityRow {
  /** Mapped onto the app's existing labels: login/signup/auto/deletion. */
  type: "login" | "signup" | "auto" | "deletion" | "other";
  time: string;
}

export interface AdminData {
  stats: AdminStats;
  activity: AdminActivityRow[];
  /** Which sources actually answered, so the UI can stay honest about gaps. */
  sources: { stats: boolean; users: boolean; logs: boolean };
}

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** Extracts an array from a bare array or a common list envelope. */
export function asArray(res: any): any[] | null {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== "object") return null;
  for (const key of ["data", "items", "results", "list"]) {
    if (Array.isArray(res[key])) return res[key];
  }
  for (const key of Object.keys(res)) {
    if (Array.isArray((res as any)[key])) return (res as any)[key];
  }
  return null;
}

/** Extracts the object holding the scalars. */
export function asObject(res: any): any | null {
  if (!res || typeof res !== "object" || Array.isArray(res)) return null;
  return res?.data ?? res?.stats ?? res?.summary ?? res;
}

/** Depth-limited numeric lookup across the plausible stat containers. */
export function findNumber(obj: any, keys: string[], depth = 2): number | null {
  if (!obj || typeof obj !== "object" || depth < 0) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  for (const container of ["data", "stats", "summary", "totals", "counts", "users", "logins", "activity"]) {
    const nested = findNumber(obj[container], keys, depth - 1);
    if (nested !== null) return nested;
  }
  return null;
}

export function timeOf(row: any): string {
  return firstTime(row?.time, row?.timestamp, row?.createdAt, row?.created, row?.at);
}

function within(iso: string, ms: number): boolean {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && Date.now() - t <= ms;
}

/** Maps whatever the log rows call their event onto the app's four labels. */
export function classify(row: any): AdminActivityRow["type"] {
  const raw = String(row?.type ?? row?.action ?? row?.event ?? row?.kind ?? "").toLowerCase();
  if (raw.includes("delet")) return "deletion";
  if (raw.includes("signup") || raw.includes("register") || raw.includes("account_created")) return "signup";
  if (raw.includes("auto")) return "auto";
  if (raw.includes("login") || raw.includes("signin") || raw.includes("sign_in")) return "login";
  return "other";
}

function countBy(rows: any[], type: AdminActivityRow["type"], windowMs?: number): number {
  return rows.filter((r) => {
    if (classify(r) !== type) return false;
    return windowMs === undefined ? true : within(timeOf(r), windowMs);
  }).length;
}

function isSession(row: any): boolean {
  const t = classify(row);
  return t === "login" || t === "auto";
}

/**
 * Builds the dashboard view model from the three raw endpoint payloads.
 * `null` means that endpoint did not answer; an empty array means it answered
 * with no rows, which is a real zero.
 */
export function buildAdminData(
  statsRaw: any,
  usersRaw: any,
  logsRaw: any,
  sources: AdminData["sources"],
): AdminData {
  const statsObj = sources.stats ? asObject(statsRaw) : null;
  const users = sources.users ? asArray(usersRaw) : null;
  const logs = sources.logs ? asArray(logsRaw) : null;

  const stats: AdminStats = {
    totalUsers:
      findNumber(statsObj, ["totalUsers", "usersCount", "userCount", "totalUserCount"]) ??
      (users ? users.length : null),
    activeUsers:
      findNumber(statsObj, ["activeUsers", "activeUsers7d", "weeklyActiveUsers", "activeLast7Days"]) ??
      (users
        ? users.filter((u) => within(firstTime(u?.lastActive, u?.lastActiveAt, u?.updatedAt, 0), WEEK)).length
        : null),
    newThisWeek:
      findNumber(statsObj, ["newThisWeek", "newUsersThisWeek", "newUsers7d", "signupsThisWeek"]) ??
      (users ? users.filter((u) => within(firstTime(u?.createdAt, u?.created, 0), WEEK)).length : null),
    totalLogins:
      findNumber(statsObj, ["totalLogins", "loginsTotal", "loginCount", "signIns"]) ??
      (logs ? logs.filter(isSession).length : null),
    loginsToday:
      findNumber(statsObj, ["loginsToday", "todayLogins", "logins24h", "signInsToday"]) ??
      (logs ? logs.filter((l) => isSession(l) && within(timeOf(l), DAY)).length : null),
    loginsThisWeek:
      findNumber(statsObj, ["loginsThisWeek", "weeklyLogins", "logins7d", "signInsThisWeek"]) ??
      (logs ? logs.filter((l) => isSession(l) && within(timeOf(l), WEEK)).length : null),
    signupsThisWeek:
      findNumber(statsObj, ["signupsThisWeek", "newSignupsThisWeek", "signups7d"]) ??
      (logs ? countBy(logs, "signup", WEEK) : null),
    totalDeletions:
      findNumber(statsObj, ["totalDeletions", "deletions", "deletedAccounts", "accountDeletions"]) ??
      (logs ? countBy(logs, "deletion") : null),
    deletionsThisWeek:
      findNumber(statsObj, ["deletionsThisWeek", "weeklyDeletions", "deletions7d"]) ??
      (logs ? countBy(logs, "deletion", WEEK) : null),
  };

  const activity: AdminActivityRow[] = (logs ?? [])
    .map((row) => ({ type: classify(row), time: timeOf(row) }))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
    .slice(0, 12);

  return { stats, activity, sources };
}
