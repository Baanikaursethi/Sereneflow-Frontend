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
}

export type Screen = "splash" | "login" | "signup" | "forgot" | "terms" | "privacy" | "main";
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
}

export interface SpacesPost {
  id: string;
  text: string;
  time: string;
  anonymous: boolean;
  authorName: string | null;
  authorEmail: string | null;
  reactions: Record<string, number>;
  replies: SpacesReply[];
  edited?: string;
}

export interface LogEntry {
  email?: string;
  time: string;
  type: "login" | "signup" | "auto" | "deletion";
}
