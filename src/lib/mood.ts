import { api } from "./api";

// ============================================================
// MOOD API — talks to backend /moods endpoints. Isolated here so
// any field-name mismatch (we don't have backend source, only the
// README's endpoint list) only needs fixing in this one file.
//
// UNVERIFIED ASSUMPTION: check-in body is { mood, note? } and the
// backend stamps the authenticated user + timestamp server-side
// (auth via Bearer token, same pattern as /auth). List/latest/trends
// responses are assumed to be an array of { id?, mood, time/createdAt }
// and a trends object respectively; normalized defensively below.
// ============================================================

export interface MoodEntry {
  id: string;
  mood: string;
  time: string;
}

function normalizeEntry(raw: any, idx: number): MoodEntry {
  return {
    id: raw.id ?? raw._id ?? String(idx),
    mood: raw.mood ?? raw.label,
    time: raw.time ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
  };
}

export async function saveMoodCheckIn(mood: string): Promise<MoodEntry> {
  const res = await api.post("/moods", { mood });
  const raw = res?.data ?? res;
  return normalizeEntry(raw ?? { mood }, 0);
}

export async function getMoodHistory(): Promise<MoodEntry[]> {
  const res = await api.get("/moods");
  const list = Array.isArray(res) ? res : res?.data ?? [];
  return list.map(normalizeEntry);
}

export async function getLatestMood(): Promise<MoodEntry | null> {
  const res = await api.get("/moods/latest");
  const raw = res?.data ?? res;
  if (!raw) return null;
  return normalizeEntry(raw, 0);
}

export async function getMoodTrends(): Promise<any> {
  return api.get("/moods/trends");
}
