// ============================================================
// TIMESTAMP NORMALISATION
// ============================================================
// Every timestamp the app renders (mood history, Spaces posts/replies,
// admin activity) comes from the backend and is only displayed. This
// helper accepts the shapes a JSON API realistically returns and always
// produces a valid ISO string:
//
//   "2026-01-31T10:00:00.000Z"              -> unchanged
//   1769853600000                           -> epoch millis
//   { seconds, nanoseconds }                -> Firestore Timestamp
//   { _seconds, _nanoseconds }              -> Firestore Timestamp (JSON form)
//   { toDate() }                            -> Firestore Timestamp (SDK object)
//
// Without this, a Firestore Timestamp object reaches `new Date(obj)`, which
// yields "Invalid Date" and renders as such in Mood History and post times.
// ============================================================

/** Parses one value; returns null when it is not a usable timestamp. */
function tryIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Accept both second and millisecond epochs.
    const ms = Math.abs(value) < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "object") {
    const v = value as any;
    if (typeof v.toDate === "function") {
      try {
        const d = v.toDate();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
      } catch {
        /* fall through to the numeric forms below */
      }
    }
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      const nanos = v.nanoseconds ?? v._nanoseconds;
      const ms = seconds * 1000 + (typeof nanos === "number" ? Math.round(nanos / 1e6) : 0);
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

/** Always returns an ISO string: the parsed value, or `now` if unusable. */
export function toIsoTime(value: unknown): string {
  return tryIso(value) ?? new Date().toISOString();
}

/** First candidate that parses; otherwise now. Keeps a row from rendering broken. */
export function firstTime(...candidates: unknown[]): string {
  for (const c of candidates) {
    const iso = tryIso(c);
    if (iso) return iso;
  }
  return new Date().toISOString();
}
