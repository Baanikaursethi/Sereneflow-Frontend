import { SpacesPost, SpacesReply } from "./types";
import { firstTime } from "./time";

// ============================================================
// SPACES PAYLOAD NORMALISATION (pure — no network, no React)
// ============================================================
// PATCH responses are normalised AGAINST the previous object (`base`).
// A PATCH that returns only the edited text used to be mapped through the
// same defaults as a full post, which reset `replies` to [], `reactions` to {}
// and `isOwner` to false — visibly wiping a thread from the screen and
// removing the author's own edit/delete menu right after they edited.
// ============================================================

export function normalizeReply(raw: any, base?: SpacesReply): SpacesReply {
  return {
    id: raw?.id ?? raw?._id ?? base?.id,
    text: raw?.text ?? raw?.content ?? base?.text ?? "",
    time:
      raw?.time || raw?.createdAt || raw?.timestamp
        ? firstTime(raw.time, raw.createdAt, raw.timestamp)
        : base?.time ?? new Date().toISOString(),
    anonymous: raw?.anonymous ?? raw?.isAnonymous ?? base?.anonymous ?? false,
    authorName: raw?.authorName ?? raw?.author ?? base?.authorName ?? null,
    authorAvatar: raw?.authorAvatar ?? raw?.avatar ?? raw?.authorPhotoURL ?? base?.authorAvatar ?? null,
    authorIsCeo: raw?.authorIsCeo !== undefined ? !!raw.authorIsCeo : base?.authorIsCeo ?? false,
    isOwner: raw?.isOwner !== undefined ? !!raw.isOwner : base?.isOwner ?? false,
    edited: raw?.edited ?? raw?.editedAt ?? base?.edited ?? undefined,
  };
}

export function normalizePost(raw: any, base?: SpacesPost): SpacesPost {
  const reactions = raw?.reactions ?? base?.reactions;
  // A partial PATCH that omits `myReactions` must not clear the viewer's own
  // highlighted reactions, so the previous value is kept when one exists.
  const myReactions: string[] = Array.isArray(raw?.myReactions) ? raw.myReactions : base?.myReactions ?? [];
  return {
    id: raw?.id ?? raw?._id ?? base?.id,
    text: raw?.text ?? raw?.content ?? base?.text ?? "",
    time:
      raw?.time || raw?.createdAt || raw?.timestamp
        ? firstTime(raw.time, raw.createdAt, raw.timestamp)
        : base?.time ?? new Date().toISOString(),
    anonymous: raw?.anonymous ?? raw?.isAnonymous ?? base?.anonymous ?? false,
    authorName: raw?.authorName ?? raw?.author ?? base?.authorName ?? null,
    authorAvatar: raw?.authorAvatar ?? raw?.avatar ?? raw?.authorPhotoURL ?? base?.authorAvatar ?? null,
    authorIsCeo: raw?.authorIsCeo !== undefined ? !!raw.authorIsCeo : base?.authorIsCeo ?? false,
    isOwner: raw?.isOwner !== undefined ? !!raw.isOwner : base?.isOwner ?? false,
    reactions: reactions && typeof reactions === "object" ? reactions : {},
    myReactions,
    replies: Array.isArray(raw?.replies) ? raw.replies.map((r: any) => normalizeReply(r)) : base?.replies ?? [],
    edited: raw?.edited ?? raw?.editedAt ?? base?.edited ?? undefined,
  };
}

/**
 * Finds the payload object in the envelopes this API realistically uses:
 * a bare object, { post }, { data: post } or { data: { post } }.
 */
export function unwrapPayload(res: any, ...keys: string[]): any {
  if (!res || typeof res !== "object") return res;
  for (const k of keys) {
    if (res[k] !== undefined && res[k] !== null) return res[k];
  }
  const inner = res.data;
  if (inner && typeof inner === "object") {
    for (const k of keys) {
      if (inner[k] !== undefined && inner[k] !== null) return inner[k];
    }
    return inner;
  }
  return res;
}

/** A list response may be a bare array or wrapped in a known envelope. */
export function normalizePostList(res: any): SpacesPost[] {
  const list = Array.isArray(res) ? res : res?.data ?? res?.posts ?? res?.items ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((raw) => normalizePost(raw));
}
