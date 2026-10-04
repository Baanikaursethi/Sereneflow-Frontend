import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { TextButton } from "../components/UI";
import { CeoBadge } from "../components/SFLogo";
import { store } from "../lib/store";
import { CEO_EMAIL } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser, LogEntry } from "../lib/types";

export const AdminPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
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

  const users: Record<string, SFUser> = store.get("sf_users", {});
  const logs: LogEntry[] = store.get("sf_logs", []);
  const userList = Object.values(users);
  const totalUsers = userList.length;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const activeUsers = userList.filter((u) => u.lastActive && new Date(u.lastActive) >= weekAgo).length;
  const newThisWeek = userList.filter((u) => u.createdAt && new Date(u.createdAt) >= weekAgo).length;
  const loginsToday = logs.filter((l) => l.type === "login" && new Date(l.time) >= dayAgo).length;
  const loginsThisWeek = logs.filter((l) => l.type === "login" && new Date(l.time) >= weekAgo).length;
  const totalLogins = logs.filter((l) => l.type === "login" || l.type === "auto").length;
  const signupsThisWeek = logs.filter((l) => l.type === "signup" && new Date(l.time) >= weekAgo).length;
  const deletions = logs.filter((l) => l.type === "deletion");
  const deletionsThisWeek = deletions.filter((l) => new Date(l.time) >= weekAgo).length;
  const recentLogs = [...logs].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 12);

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const typeLabel: Record<string, string> = { login: "Sign-in", signup: "New signup", auto: "Auto sign-in", deletion: "Account deleted" };

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
        <View style={styles.grid}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{activeUsers}</Text>
            <Text style={styles.statLabel}>Active (7d)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{newThisWeek}</Text>
            <Text style={styles.statLabel}>New This Week</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{totalLogins}</Text>
            <Text style={styles.statLabel}>Total Logins</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Login Activity</Text>
        <View style={styles.actCard}>
          <Text style={styles.actP}>Sign-ins today: {loginsToday}</Text>
          <Text style={styles.actP}>Sign-ins this week: {loginsThisWeek}</Text>
          <Text style={styles.actP}>New signups this week: {signupsThisWeek}</Text>
        </View>

        <Text style={styles.sectionLabel}>Account Deletions</Text>
        <View style={styles.actCard}>
          <Text style={styles.actP}>Total deletions: {deletions.length}</Text>
          <Text style={styles.actP}>Deletions this week: {deletionsThisWeek}</Text>
        </View>

        <Text style={styles.sectionLabel}>Recent Activity</Text>
        <View style={{ gap: 8 }}>
          {recentLogs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
            </View>
          )}
          {recentLogs.map((l, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logType}>{typeLabel[l.type] || l.type}</Text>
              <Text style={styles.logTime}>{fmtTime(l.time)}</Text>
            </View>
          ))}
        </View>
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
