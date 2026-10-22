import { api } from "./api";

// ============================================================
// MOOD API — talks to backend /moods endpoints.
//
// Backend DTO (CreateMoodDto, verified against backend source):
//   POST /moods  { rating: 1-5, moodLabel: string, emotions?: string[],
//                  notes?: string, recommendedExercise?: string }
// Response is the created mood entry: { id, userEmail, userId, rating,
// moodLabel, emotions, notes, recommendedExercise, timestamp }.
// GET /moods returns an array of these, sorted newest-first.
// ============================================================

// Maps the app's mood labels to the 1-5 rating scale required by the
// backend (Very Bad -> Great). Falls back to a neutral 3 for any label
// not in this list.
const MOOD_RATING: Record<string, number> = {
  Sad: 2,
  Anxious: 2,
  Angry: 2,
  Tired: 3,
  Calm: 4,
  Happy: 5,
  Lonely: 2,
  Overwhelmed: 1,
};

export interface MoodEntry {
  id: string;
  mood: string;
  time: string;
}

function normalizeEntry(raw: any, idx: number): MoodEntry {
  return {
    id: raw.id ?? raw._id ?? String(idx),
    mood: raw.moodLabel ?? raw.mood ?? raw.label,
    time: raw.timestamp ?? raw.time ?? raw.createdAt ?? new Date().toISOString(),
  };
}

export async function saveMoodCheckIn(mood: string): Promise<MoodEntry> {
  const rating = MOOD_RATING[mood] ?? 3;
  const res = await api.post("/moods", { rating, moodLabel: mood });
  const raw = res?.data ?? res;
  return normalizeEntry(raw ?? { moodLabel: mood }, 0);
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
