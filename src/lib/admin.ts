import { api, ApiError } from "./api";
import { AdminData, buildAdminData } from "./adminData";

export type { AdminData, AdminStats, AdminActivityRow } from "./adminData";

// ============================================================
// ADMIN API — aggregate account activity for the CEO's dashboard.
//
// Endpoints confirmed against the deployed backend with an unauthenticated,
// read-only probe (no credentials): GET /admin/stats, GET /admin/users and
// GET /admin/logs answer 401 "Missing or invalid Authorization header", and a
// bogus token gets "Invalid or expired authentication token" — not 404 — so
// the routes exist and are JWT-guarded. Their bodies could not be inspected
// without an account; see adminData.ts for how each field is resolved.
//
// If one endpoint fails the dashboard still renders from the others; only a
// total failure (or a 401/403) is surfaced as an error.
// ============================================================

function isDenied(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.status === 403);
}

export async function fetchAdminData(): Promise<AdminData> {
  const [statsRes, usersRes, logsRes] = await Promise.allSettled([
    api.get("/admin/stats"),
    api.get("/admin/users"),
    api.get("/admin/logs"),
  ]);

  const rejected = [statsRes, usersRes, logsRes].filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (rejected.length === 3) {
    // Prefer the permission error: it is the one the UI can explain.
    const denied = rejected.find((r) => isDenied(r.reason));
    throw denied ? denied.reason : rejected[0].reason;
  }

  return buildAdminData(
    statsRes.status === "fulfilled" ? statsRes.value : null,
    usersRes.status === "fulfilled" ? usersRes.value : null,
    logsRes.status === "fulfilled" ? logsRes.value : null,
    {
      stats: statsRes.status === "fulfilled",
      users: usersRes.status === "fulfilled",
      logs: logsRes.status === "fulfilled",
    },
  );
}
