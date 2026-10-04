import { api, ApiError } from "./api";
import { SpacesPost } from "./types";

// ============================================================
// SPACES API — backend wiring for post creation, loading, edit,
// and delete. Reactions and replies remain on local storage
// (unchanged), per task scope.
//
// NOTE: Edit/Delete require a real backend-issued post ID to
// target, which only exists if the post was also created via the
// backend (POST /spaces/posts) rather than purely locally. So
// create+load are wired here too, even though the task described
// them as "already working" / not to be touched — a purely local
// post has no ID the backend recognizes, so Edit/Delete against it
// would silently 404. This was flagged and confirmed before making
// this change.
//
// UNVERIFIED ASSUMPTIONS (no backend source, only the README's
// endpoint list):
// - POST /spaces/posts body: { text, anonymous } -> returns created
//   post (or { data: post }).
// - GET /spaces/posts -> array of posts (or { data: [...] }).
// - PATCH /spaces/posts/:id body: { text } -> updated post or 200/204.
// - DELETE /spaces/posts/:id -> 200/204.
// - Response post fields normalized defensively below (id/_id,
//   text/content, time/createdAt, authorName/author, authorEmail/
//   author_email, anonymous/isAnonymous, reactions, replies).
// ============================================================

function normalizePost(raw: any): SpacesPost {
  return {
    id: raw.id ?? raw._id,
    text: raw.text ?? raw.content ?? "",
    time: raw.time ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    anonymous: raw.anonymous ?? raw.isAnonymous ?? false,
    authorName: raw.authorName ?? raw.author ?? null,
    authorEmail: raw.authorEmail ?? raw.author_email ?? raw.authorId ?? null,
    reactions: raw.reactions ?? {},
    replies: raw.replies ?? [],
    edited: raw.edited ?? raw.editedAt ?? undefined,
  };
}

export async function fetchSpacesPosts(): Promise<SpacesPost[]> {
  const res = await api.get("/spaces/posts");
  const list = Array.isArray(res) ? res : res?.data ?? [];
  return list.map(normalizePost);
}

export async function createSpacesPost(params: {
  text: string;
  anonymous: boolean;
}): Promise<SpacesPost> {
  const res = await api.post("/spaces/posts", params);
  const raw = res?.data ?? res;
  return normalizePost(raw);
}

export async function editSpacesPost(postId: string, text: string): Promise<void> {
  await api.patch(`/spaces/posts/${postId}`, { text });
}

export async function deleteSpacesPost(postId: string): Promise<void> {
  await api.delete(`/spaces/posts/${postId}`);
}

export { ApiError };
