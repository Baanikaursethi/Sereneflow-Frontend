import { api, ApiError } from "./api";
import { SpacesPost, SpacesReply } from "./types";
import { normalizePost, normalizePostList, normalizeReply, unwrapPayload } from "./spacesNormalize";

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
//
// Payload mapping lives in spacesNormalize.ts (pure, unit-tested);
// edit responses are merged against the previous object there.
// ============================================================

export async function fetchSpacesPosts(): Promise<SpacesPost[]> {
  return normalizePostList(await api.get("/spaces/posts"));
}

export async function createSpacesPost(params: {
  text: string;
  anonymous: boolean;
}): Promise<SpacesPost> {
  const res = await api.post("/spaces/posts", params);
  return normalizePost(unwrapPayload(res, "post"));
}

/**
 * `previous` is the post as currently rendered. Passing it means a partial
 * PATCH response updates only the fields the server actually returned.
 */
export async function editSpacesPost(
  postId: string,
  text: string,
  previous?: SpacesPost,
): Promise<SpacesPost> {
  const res = await api.patch(`/spaces/posts/${postId}`, { text });
  return normalizePost(unwrapPayload(res, "post"), previous);
}

export async function deleteSpacesPost(postId: string): Promise<void> {
  await api.delete(`/spaces/posts/${postId}`);
}

export { ApiError };

export async function createSpacesReply(postId: string, params: { text: string; anonymous?: boolean }): Promise<SpacesReply> {
  const res = await api.post(`/spaces/posts/${postId}/replies`, params);
  return normalizeReply(unwrapPayload(res, "reply"));
}

export async function editSpacesReply(
  postId: string,
  replyId: string,
  text: string,
  previous?: SpacesReply,
): Promise<SpacesReply> {
  const res = await api.patch(`/spaces/posts/${postId}/replies/${replyId}`, { text });
  return normalizeReply(unwrapPayload(res, "reply"), previous);
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
  const raw = unwrapPayload(res, "reaction", "post");
  return {
    reactions: raw?.reactions ?? {},
    myReactions: Array.isArray(raw?.myReactions) ? raw.myReactions : [],
  };
}
