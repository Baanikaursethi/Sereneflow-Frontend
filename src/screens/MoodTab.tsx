import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { MOODS, Mood } from "../data/content";
import { store } from "../lib/store";
import { saveMoodCheckIn, getMoodHistory, MoodEntry } from "../lib/mood";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser, SubPage } from "../lib/types";
import { SoundId } from "../lib/soundEngine";

interface MoodTabProps {
  user: SFUser;
  onOpen: (sp: SubPage, extraModeId?: string | null) => void;
  playSound: (id: SoundId) => void;
}

export const MoodTab: React.FC<MoodTabProps> = ({ user, onOpen, playSound }) => {
  const [sel, setSel] = useState<Mood | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErr, setHistoryErr] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const entries = await getMoodHistory();
      // most recent first
      setHistory([...entries].sort((a, b) => (a.time < b.time ? 1 : -1)));
    } catch (e) {
      setHistoryErr("Couldn't load mood history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const pick = (m: Mood) => {
    setSaved(false);
    setSaveErr("");
    if (sel?.label === m.label) {
      setSel(null);
      return;
    }
    setSel(m);
    store.set("sf_last_mood", m.label);
  };

  const save = async () => {
    if (!sel || saving) return;
    setSaving(true);
    setSaveErr("");
    try {
      const entry = await saveMoodCheckIn(sel.label);
      setSaved(true);
      // Reflect immediately without requiring navigation/reload.
      setHistory((prev) => [entry, ...prev]);
    } catch (e) {
      setSaveErr("Couldn't save your check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.sub}>There's no wrong answer here.</Text>
      </View>
      <View style={styles.grid}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.label}
            style={[styles.moodBtn, sel?.label === m.label && { borderColor: m.color, backgroundColor: "rgba(207,167,255,0.07)" }]}
            onPress={() => pick(m)}
          >
            <Text style={styles.moodEm}>{m.emoji}</Text>
            <Text style={styles.moodLb}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sel && (
        <View>
          <View style={[styles.qcard, { borderColor: "rgba(207,167,255,0.1)" }]}>
            <View style={[styles.accent, { backgroundColor: sel.color }]} />
            <Text style={styles.qt}>"{sel.quote}"</Text>
            <Text style={styles.msg}>{sel.message}</Text>
          </View>
          <View style={styles.aff}>
            <View style={[styles.affDot, { backgroundColor: sel.color }]} />
            <Text style={styles.affText}>{sel.affirmation}</Text>
          </View>
          <Text style={styles.recLabel}>What might help right now</Text>
          <View style={styles.recs}>
            <TouchableOpacity style={styles.recCard} onPress={() => onOpen("pause", sel.breathingRec.id)}>
              <Text style={styles.recIcon}>🫧</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{sel.breathingRec.label} Breathing</Text>
                <Text style={styles.recSub}>Guided breathing exercise</Text>
              </View>
              <Text style={styles.recArr}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recCard}
              onPress={() => {
                playSound(sel.soundRec.id as SoundId);
                onOpen("sounds");
              }}
            >
              <Text style={styles.recIcon}>{sel.soundRec.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recTitle}>{sel.soundRec.label}</Text>
                <Text style={styles.recSub}>Calming sound</Text>
              </View>
              <Text style={styles.recArr}>→</Text>
            </TouchableOpacity>
          </View>
          {!saved ? (
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="rgba(207,167,255,0.65)" />
              ) : (
                <Text style={styles.saveBtnText}>Save this check-in</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.savedOk}>✓ Check-in saved</Text>
          )}
          {!!saveErr && <Text style={styles.errText}>{saveErr}</Text>}
        </View>
      )}

      <View style={styles.historySection}>
        <Text style={styles.recLabel}>Mood History</Text>
        {historyLoading ? (
          <ActivityIndicator color="rgba(207,167,255,0.5)" style={{ marginTop: 8 }} />
        ) : historyErr ? (
          <Text style={styles.errText}>{historyErr}</Text>
        ) : history.length === 0 ? (
          <Text style={styles.sub}>No check-ins yet. Your saved moods will appear here.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {history.map((h) => {
              const moodMeta = MOODS.find((m) => m.label === h.mood);
              return (
                <View key={h.id} style={styles.historyRow}>
                  <Text style={styles.historyEmoji}>{moodMeta?.emoji ?? "•"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyMood}>{h.mood}</Text>
                    <Text style={styles.historyTime}>
                      {new Date(h.time).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 24, maxWidth: 680, width: "100%", alignSelf: "center" },
  header: { marginBottom: 22 },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text, marginBottom: 4 },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  moodBtn: {
    width: "22.5%",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.09)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  moodEm: { fontSize: 22 },
  moodLb: { fontFamily: FONT_SANS_LIGHT, fontSize: 10, color: "rgba(207,167,255,0.52)" },
  qcard: {
    backgroundColor: "rgba(124,92,191,0.13)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    overflow: "hidden",
  },
  accent: { position: "absolute", top: 0, left: 0, width: 3, height: "100%" },
  qt: { fontFamily: FONT_SERIF, fontSize: 18, fontStyle: "italic", color: COLORS.text, lineHeight: 26, marginBottom: 10, paddingLeft: 10 },
  msg: { fontFamily: FONT_SANS_LIGHT, fontSize: 13.5, color: "#B4A0D4", lineHeight: 21, paddingLeft: 10 },
  aff: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.07)",
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  affDot: { width: 5, height: 5, borderRadius: 3 },
  affText: { fontFamily: FONT_SERIF, fontSize: 15, fontStyle: "italic", color: "#C4AFDE", flex: 1, lineHeight: 22 },
  recLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 10.5, letterSpacing: 1, color: "rgba(207,167,255,0.35)", textTransform: "uppercase", marginBottom: 10 },
  recs: { gap: 8, marginBottom: 16 },
  recCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.08)",
    borderRadius: 14,
    padding: 13,
  },
  recIcon: { fontSize: 22 },
  recTitle: { fontFamily: FONT_SANS_LIGHT, fontWeight: "500", color: COLORS.text, fontSize: 13.5 },
  recSub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  recArr: { color: "rgba(207,167,255,0.32)", fontSize: 15 },
  saveBtn: { backgroundColor: "rgba(207,167,255,0.08)", borderWidth: 1, borderColor: "rgba(207,167,255,0.17)", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "rgba(207,167,255,0.65)", fontFamily: FONT_SANS_LIGHT, fontSize: 13.5 },
  savedOk: { textAlign: "center", color: "#A8E6CF", fontFamily: FONT_SANS_LIGHT, fontSize: 13.5, padding: 12 },
  errText: { textAlign: "center", color: "#E8A0A0", fontFamily: FONT_SANS_LIGHT, fontSize: 12.5, marginTop: 8 },
  historySection: { marginTop: 26 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.08)",
    borderRadius: 14,
    padding: 12,
  },
  historyEmoji: { fontSize: 20 },
  historyMood: { fontFamily: FONT_SANS_LIGHT, fontWeight: "500", color: COLORS.text, fontSize: 13 },
  historyTime: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 11, marginTop: 2 },
});
