// ============================================================
// SHARED TYPES
// ============================================================

export interface SFUser {
  email: string;
  name: string;
  password: string;
  avatar: string | null;
  createdAt: string;
  logins: number;
  lastActive: string;
  // Backend-auth additions (additive — existing local-mock fields above
  // are kept so untouched screens reading user.email/name/avatar keep working).
  id?: string;
  token?: string;
  isVerified?: boolean;
}

export type Screen = "splash" | "login" | "signup" | "verify" | "forgot" | "terms" | "privacy" | "main";
export type NavTab = "home" | "sounds" | "mood" | "profile";
export type SubPage = "journal" | "spaces" | "drops" | "pause" | "sounds" | "admin" | null;

export interface NavState {
  screen: Screen;
  user: SFUser | null;
  navTab: NavTab;
  subPage: SubPage;
  pauseModeId: string | null;
  prevScreen: Screen | null;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created: string;
  edited?: string;
}

export interface SpacesReply {
  id: string;
  text: string;
  time: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  authorIsCeo?: boolean;
  anonymous?: boolean;
  // Whether the CURRENT viewer wrote this reply — set by the backend so the
  // client never has to compare emails/uids (and anonymous authorship stays
  // hidden from everyone except the poster).
  isOwner?: boolean;
  edited?: string;
}

export interface SpacesPost {
  id: string;
  text: string;
  time: string;
  anonymous: boolean;
  authorName: string | null;
  authorAvatar?: string | null;
  authorIsCeo?: boolean;
  isOwner?: boolean;
  // Reaction counts per type, and which of those (if any) the CURRENT viewer
  // has selected. Both are computed server-side and are authoritative.
  reactions: Record<string, number>;
  myReactions?: string[];
  replies: SpacesReply[];
  edited?: string;
}

export interface LogEntry {
  email?: string;
  time: string;
  type: "login" | "signup" | "auto" | "deletion";
}
