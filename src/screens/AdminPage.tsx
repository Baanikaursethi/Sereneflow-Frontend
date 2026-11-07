import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { TextButton } from "../components/UI";
import { CeoBadge } from "../components/SFLogo";
import { fetchAdminData } from "../lib/admin";
import type { AdminData, AdminActivityRow } from "../lib/admin";
import { ApiError } from "../lib/api";
import { isCeoUser } from "../lib/ceo";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

// ============================================================
// ADMIN DASHBOARD (CEO only)
//
// The numbers now come from the backend's /admin/stats, /admin/users and
// /admin/logs endpoints. They used to be computed from `sf_users` / `sf_logs`
// in local storage, which only ever held whatever this one device had seen —
// so on any fresh install the dashboard showed zeros, and no device could ever
// show real account totals.
//
// Showing this screen is a display decision only (see lib/ceo.ts): the backend
// authorises every admin request from the verified token, so a non-CEO who
// somehow reaches this state gets a 403 and the "restricted" message below.
//
// Privacy is unchanged: counts and event types only. No journal, Spaces
// content, anonymous authorship or per-user identity is requested or rendered.
// ============================================================

const typeLabel: Record<AdminActivityRow["type"], string> = {
  login: "Sign-in",
  signup: "New signup",
  auto: "Auto sign-in",
  deletion: "Account deleted",
  other: "Activity",
};

export const AdminPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
  const ceo = isCeoUser(user);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [restricted, setRestricted] = useState(false);

  const load = useCallback(async () => {
    if (!ceo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    setRestricted(false);
    try {
      setData(await fetchAdminData());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setRestricted(true);
      } else {
        setErr("Couldn't load dashboard data. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [ceo]);

  useEffect(() => {
    load();
  }, [load]);

  if (!ceo) {
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

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  // "—" rather than a misleading 0 when a source did not answer.
  const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));
  const stats = data?.stats;
  const activity = data?.activity ?? [];

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
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator color="rgba(207,167,255,0.6)" />
          </View>
        ) : restricted ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>This area is restricted.</Text>
          </View>
        ) : err ? (
          <View style={{ alignItems: "center", paddingBottom: 20 }}>
            <Text style={styles.errText}>{err}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{n(stats?.totalUsers)}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{n(stats?.activeUsers)}</Text>
                <Text style={styles.statLabel}>Active (7d)</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{n(stats?.newThisWeek)}</Text>
                <Text style={styles.statLabel}>New This Week</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{n(stats?.totalLogins)}</Text>
                <Text style={styles.statLabel}>Total Logins</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Login Activity</Text>
            <View style={styles.actCard}>
              <Text style={styles.actP}>Sign-ins today: {n(stats?.loginsToday)}</Text>
              <Text style={styles.actP}>Sign-ins this week: {n(stats?.loginsThisWeek)}</Text>
              <Text style={styles.actP}>New signups this week: {n(stats?.signupsThisWeek)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Account Deletions</Text>
            <View style={styles.actCard}>
              <Text style={styles.actP}>Total deletions: {n(stats?.totalDeletions)}</Text>
              <Text style={styles.actP}>Deletions this week: {n(stats?.deletionsThisWeek)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Recent Activity</Text>
            <View style={{ gap: 8 }}>
              {activity.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No activity recorded yet.</Text>
                </View>
              )}
              {activity.map((l, i) => (
                <View key={`${l.time}-${i}`} style={styles.logRow}>
                  <Text style={styles.logType}>{typeLabel[l.type]}</Text>
                  <Text style={styles.logTime}>{fmtTime(l.time)}</Text>
                </View>
              ))}
            </View>
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
  statLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 10.5, color: "rgba(207,167,255,0.72)", letterSpacing: 0.5, marginTop: 4 },
  sectionLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, letterSpacing: 1, color: "rgba(207,167,255,0.72)", textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
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
  logTime: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.72)" },
  empty: { alignItems: "center", padding: 20 },
  emptyText: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "rgba(207,167,255,0.72)" },
  errText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.8)", textAlign: "center", marginBottom: 10 },
  retryBtn: {
    backgroundColor: "rgba(207,167,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.2)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  retryText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.72)" },
});
