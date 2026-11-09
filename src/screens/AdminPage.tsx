import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { TextButton } from "../components/UI";
import { CeoBadge } from "../components/SFLogo";
import { api } from "../lib/api";
import { CEO_EMAIL } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

// ============================================================
// ADMIN DASHBOARD — CEO-only view of aggregate platform stats.
// Fetches live data from the backend /admin/stats endpoint.
// Falls back gracefully if the endpoint is unavailable.
// ============================================================

interface AdminStats {
  totalUsers: number;
  activeUsersWeek: number;
  newUsersWeek: number;
  totalLogins: number;
  loginsToday: number;
  loginsWeek: number;
  signupsWeek: number;
  totalDeletions: number;
  deletionsWeek: number;
  totalPosts: number;
  totalReplies: number;
  recentActivity: { type: string; time: string; email?: string }[];
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  activeUsersWeek: 0,
  newUsersWeek: 0,
  totalLogins: 0,
  loginsToday: 0,
  loginsWeek: 0,
  signupsWeek: 0,
  totalDeletions: 0,
  deletionsWeek: 0,
  totalPosts: 0,
  totalReplies: 0,
  recentActivity: [],
};

function normalizeStats(raw: any): AdminStats {
  if (!raw) return EMPTY_STATS;
  return {
    totalUsers: raw.totalUsers ?? raw.userCount ?? raw.users ?? 0,
    activeUsersWeek: raw.activeUsersWeek ?? raw.activeUsers ?? raw.activeUsersLast7Days ?? 0,
    newUsersWeek: raw.newUsersWeek ?? raw.newUsers ?? raw.newUsersLast7Days ?? 0,
    totalLogins: raw.totalLogins ?? raw.loginCount ?? 0,
    loginsToday: raw.loginsToday ?? raw.loginsLast24h ?? 0,
    loginsWeek: raw.loginsWeek ?? raw.loginsLast7Days ?? 0,
    signupsWeek: raw.signupsWeek ?? raw.signupsLast7Days ?? raw.newUsersWeek ?? 0,
    totalDeletions: raw.totalDeletions ?? raw.deletions ?? raw.deletedAccounts ?? 0,
    deletionsWeek: raw.deletionsWeek ?? raw.deletionsLast7Days ?? 0,
    totalPosts: raw.totalPosts ?? raw.postCount ?? raw.spacesPostCount ?? 0,
    totalReplies: raw.totalReplies ?? raw.replyCount ?? raw.spacesReplyCount ?? 0,
    recentActivity: Array.isArray(raw.recentActivity ?? raw.logs ?? raw.activity)
      ? (raw.recentActivity ?? raw.logs ?? raw.activity).slice(0, 12)
      : [],
  };
}

export const AdminPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user.email !== CEO_EMAIL) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/admin/stats");
        setStats(normalizeStats(res?.data ?? res));
      } catch (e: any) {
        setErr(e?.message ?? "Couldn't load dashboard stats.");
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.email]);

  if (user.email !== CEO_EMAIL) {
    return (
      <View style={styles.subpage}>
        <View style={styles.header}>
          <TextButton title="← Back" onPress={onBack} />
          <Text style={styles.headerTitle}>Admin</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.empty}>
            <Text style={styles.emptyText}>This area is restricted.</Text>
          </View>
        </View>
      </View>
    );
  }

  const s = stats ?? EMPTY_STATS;

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const typeLabel: Record<string, string> = {
    login: "Sign-in",
    signup: "New signup",
    auto: "Auto sign-in",
    deletion: "Account deleted",
  };

  return (
    <View style={styles.subpage}>
      <View style={styles.header}>
        <TextButton title="← Back" onPress={onBack} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <CeoBadge size="small" />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.disclaimer}>
          Aggregate account activity only — journal entries, Spaces content, and anonymous identities are never
          shown here.
        </Text>

        {loading ? (
          <ActivityIndicator color="rgba(207,167,255,0.6)" style={{ marginTop: 24 }} />
        ) : (
          <>
            {!!err && (
              <View style={styles.errCard}>
                <Text style={styles.errText}>{err}</Text>
              </View>
            )}
            <View style={styles.grid}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{s.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{s.activeUsersWeek}</Text>
                <Text style={styles.statLabel}>Active (7d)</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{s.newUsersWeek}</Text>
                <Text style={styles.statLabel}>New This Week</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{s.totalLogins}</Text>
                <Text style={styles.statLabel}>Total Logins</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Login Activity</Text>
            <View style={styles.actCard}>
              <Text style={styles.actP}>Sign-ins today: {s.loginsToday}</Text>
              <Text style={styles.actP}>Sign-ins this week: {s.loginsWeek}</Text>
              <Text style={styles.actP}>New signups this week: {s.signupsWeek}</Text>
            </View>

            <Text style={styles.sectionLabel}>Spaces</Text>
            <View style={styles.actCard}>
              <Text style={styles.actP}>Total posts: {s.totalPosts}</Text>
              <Text style={styles.actP}>Total replies: {s.totalReplies}</Text>
            </View>

            <Text style={styles.sectionLabel}>Account Deletions</Text>
            <View style={styles.actCard}>
              <Text style={styles.actP}>Total deletions: {s.totalDeletions}</Text>
              <Text style={styles.actP}>Deletions this week: {s.deletionsWeek}</Text>
            </View>

            {s.recentActivity.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Recent Activity</Text>
                <View style={{ gap: 8 }}>
                  {s.recentActivity.map((l, i) => (
                    <View key={i} style={styles.logRow}>
                      <Text style={styles.logType}>{typeLabel[l.type] || l.type}</Text>
                      <Text style={styles.logTime}>{fmtTime(l.time)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  subpage: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 20 },
  headerTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.text },
  body: { padding: 18, paddingBottom: 40, maxWidth: 680, width: "100%", alignSelf: "center" },
  disclaimer: { fontFamily: FONT_SANS_LIGHT, fontSize: 12.5, color: COLORS.textDim, marginBottom: 18, lineHeight: 19 },
  errCard: {
    backgroundColor: "rgba(255,100,100,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,100,100,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errText: { fontFamily: FONT_SANS_LIGHT, fontSize: 12.5, color: "rgba(255,180,180,0.75)" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  stat: {
    width: "47%",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.09)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statNum: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.text },
  statLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 10.5, color: "rgba(207,167,255,0.42)", letterSpacing: 0.5, marginTop: 4 },
  sectionLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, letterSpacing: 1, color: "rgba(207,167,255,0.38)", textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  actCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.065)",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 20,
  },
  actP: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: COLORS.textDim },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.06)",
    borderRadius: 10,
    padding: 12,
  },
  logType: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "#C4AFDE" },
  logTime: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.32)" },
  empty: { alignItems: "center", padding: 20 },
  emptyText: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "rgba(207,167,255,0.38)" },
});
