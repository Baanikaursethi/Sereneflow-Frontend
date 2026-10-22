import { api, ApiError } from "./api";
import { SpacesPost, SpacesReply } from "./types";

// ============================================================
// SPACES API — backend wiring for posts, replies, edit/delete,
// and reactions. Reactions are stored and counted server-side
// (POST /spaces/posts/:id/reactions toggles the calling user's
// reaction and returns the authoritative counts), so they stay
// correct for everyone after a refresh.
//
// The backend also decides `isOwner` / `authorIsCeo` per viewer
// and never sends author email/uid, so anonymous posts really
// stay anonymous and this file has nothing to compare against
// user.email/user.id — it just relays what the server says.
// ============================================================

function normalizeReply(raw: any): SpacesReply {
  return {
    id: raw.id ?? raw._id,
    text: raw.text ?? raw.content ?? "",
    time: raw.time ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    anonymous: raw.anonymous ?? raw.isAnonymous ?? false,
    authorName: raw.authorName ?? raw.author ?? null,
    authorAvatar: raw.authorAvatar ?? raw.avatar ?? raw.authorPhotoURL ?? null,
    authorIsCeo: !!raw.authorIsCeo,
    isOwner: !!raw.isOwner,
    edited: raw.edited ?? raw.editedAt ?? undefined,
  };
}

function normalizePost(raw: any): SpacesPost {
  return {
    id: raw.id ?? raw._id,
    text: raw.text ?? raw.content ?? "",
    time: raw.time ?? raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    anonymous: raw.anonymous ?? raw.isAnonymous ?? false,
    authorName: raw.authorName ?? raw.author ?? null,
    authorAvatar: raw.authorAvatar ?? raw.avatar ?? raw.authorPhotoURL ?? null,
    authorIsCeo: !!raw.authorIsCeo,
    isOwner: !!raw.isOwner,
    reactions: raw.reactions ?? {},
    myReactions: Array.isArray(raw.myReactions) ? raw.myReactions : [],
    replies: Array.isArray(raw.replies) ? raw.replies.map(normalizeReply) : [],
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

export async function editSpacesPost(postId: string, text: string): Promise<SpacesPost> {
  const res = await api.patch(`/spaces/posts/${postId}`, { text });
  return normalizePost(res?.data ?? res);
}

export async function deleteSpacesPost(postId: string): Promise<void> {
  await api.delete(`/spaces/posts/${postId}`);
}

export { ApiError };

export async function createSpacesReply(postId: string, params: { text: string; anonymous?: boolean }): Promise<SpacesReply> {
  const res = await api.post(`/spaces/posts/${postId}/replies`, params);
  return normalizeReply(res?.data ?? res);
}

export async function editSpacesReply(postId: string, replyId: string, text: string): Promise<SpacesReply> {
  const res = await api.patch(`/spaces/posts/${postId}/replies/${replyId}`, { text });
  return normalizeReply(res?.data ?? res);
}

export async function deleteSpacesReply(postId: string, replyId: string): Promise<void> {
  await api.delete(`/spaces/posts/${postId}/replies/${replyId}`);
}

/**
 * Toggles the current user's reaction of `reactionType` on a post.
 * Sending a reaction the user already holds removes it. The backend is the
 * source of truth: it returns the up-to-date counts and the viewer's own
 * reaction set for this post, both stored server-side.
 */
export async function toggleSpacesReaction(
  postId: string,
  reactionType: string,
): Promise<{ reactions: Record<string, number>; myReactions: string[] }> {
  const res = await api.post(`/spaces/posts/${postId}/reactions`, { reactionType });
  const raw = res?.data ?? res;
  return {
    reactions: raw?.reactions ?? {},
    myReactions: Array.isArray(raw?.myReactions) ? raw.myReactions : [],
  };
}
