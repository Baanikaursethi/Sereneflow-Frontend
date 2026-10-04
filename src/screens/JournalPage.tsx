import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { TextButton, PillButton, SmButton } from "../components/UI";
import { store } from "../lib/store";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser, JournalEntry } from "../lib/types";

const PROMPTS = [
  "What's resting on your mind today?",
  "What would you like to let go of?",
  "What are you grateful for right now?",
  "How is your body feeling today?",
  "What do you need most in this moment?",
];

export const JournalPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
  const key = `sf_journal_${user.email}`;
  const [entries, setEntries] = useState<JournalEntry[]>(() => store.get(key, []));
  const [writing, setWriting] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [delConf, setDelConf] = useState<string | null>(null);
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const splitEntry = (raw: string) => {
    const lines = raw.split("\n");
    const title = lines[0].trim() || "Untitled";
    const content = lines.slice(1).join("\n").trim();
    return { title, content };
  };

  const save = () => {
    if (!text.trim()) return;
    const { title, content } = splitEntry(text);
    const all: JournalEntry[] = store.get(key, []);
    if (editId) {
      const i = all.findIndex((e) => e.id === editId);
      if (i >= 0) {
        all[i].title = title;
        all[i].content = content;
        all[i].edited = new Date().toISOString();
      }
    } else {
      all.unshift({ id: Date.now().toString(), title, content, created: new Date().toISOString() });
    }
    store.set(key, all);
    setEntries(all);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setWriting(false);
      setEditId(null);
      setText("");
    }, 1200);
  };

  const del = (id: string) => {
    const all = store.get(key, []).filter((e: JournalEntry) => e.id !== id);
    store.set(key, all);
    setEntries(all);
    setDelConf(null);
    setViewing(null);
  };

  const edit = (e: JournalEntry) => {
    setEditId(e.id);
    setText(e.content ? `${e.title}\n${e.content}` : e.title);
    setWriting(true);
    setSaved(false);
    setViewing(null);
  };

  const fmt = (ts: string) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (viewing) {
    const e = entries.find((x) => x.id === viewing);
    return (
      <View style={styles.subpage}>
        <View style={styles.header}>
          <TextButton title="← Back" onPress={() => setViewing(null)} />
          <Text style={styles.headerTitle}>Journal</Text>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {e && (
            <View>
              <Text style={styles.detailTitle}>{e.title}</Text>
              <Text style={styles.detailDate}>
                {fmt(e.edited || e.created)}
                {e.edited ? " (edited)" : ""}
              </Text>
              {!!e.content && <Text style={styles.detailContent}>{e.content}</Text>}
              <View style={styles.actionsRow}>
                <SmButton title="Edit" onPress={() => edit(e)} />
                {delConf === e.id ? (
                  <>
                    <SmButton title="Confirm" danger onPress={() => del(e.id)} />
                    <SmButton title="Cancel" onPress={() => setDelConf(null)} />
                  </>
                ) : (
                  <SmButton title="Delete" onPress={() => setDelConf(e.id)} />
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.subpage}>
      <View style={styles.header}>
        <TextButton title="← Back" onPress={onBack} />
        <Text style={styles.headerTitle}>Journal</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {!writing ? (
          <>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => {
                setWriting(true);
                setEditId(null);
                setText("");
                setSaved(false);
              }}
            >
              <Text style={styles.newBtnText}>+ New Entry</Text>
            </TouchableOpacity>
            {entries.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyMain}>Let it out...</Text>
                <Text style={styles.emptySub}>Your first entry is waiting for you.</Text>
              </View>
            )}
            <View style={{ gap: 10 }}>
              {entries.map((e) => (
                <TouchableOpacity key={e.id} style={styles.jCard} onPress={() => setViewing(e.id)}>
                  <Text style={styles.jListTitle}>{e.title}</Text>
                  <Text style={styles.jDate}>
                    {fmt(e.edited || e.created)}
                    {e.edited ? " (edited)" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View>
            <Text style={styles.jPrompt}>{prompt}</Text>
            <Text style={styles.jHint}>The first line becomes your entry's title.</Text>
            <TextInput
              style={styles.textarea}
              value={text}
              onChangeText={setText}
              placeholder={"Title...\nBegin whenever you're ready..."}
              placeholderTextColor="rgba(207,167,255,0.22)"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.row}>
              <PillButton
                title={saved ? "✓ Saved" : editId ? "Update Entry" : "Save Entry"}
                onPress={save}
                style={{ flex: 1 }}
              />
              <SmButton
                title="Cancel"
                onPress={() => {
                  setWriting(false);
                  setEditId(null);
                  setText("");
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 18 }}
              />
            </View>
          </View>
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
  newBtn: {
    backgroundColor: "rgba(207,167,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.17)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginBottom: 14,
  },
  newBtnText: { color: "rgba(207,167,255,0.55)", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  empty: { alignItems: "center", padding: 36 },
  emptyMain: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(207,167,255,0.38)" },
  emptySub: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.38)", marginTop: 6 },
  jCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.07)",
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  jListTitle: { fontFamily: FONT_SERIF, fontWeight: "600", fontSize: 18, color: COLORS.text },
  jDate: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.3)" },
  jPrompt: { fontFamily: FONT_SERIF, fontSize: 17, fontStyle: "italic", color: "#C4AFDE", marginBottom: 6, opacity: 0.75 },
  jHint: { fontFamily: FONT_SANS_LIGHT, fontSize: 12, color: "rgba(207,167,255,0.35)", marginBottom: 12 },
  textarea: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.12)",
    borderRadius: 14,
    padding: 14,
    color: COLORS.text,
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 160,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  detailTitle: { fontFamily: FONT_SERIF, fontWeight: "700", fontSize: 26, color: COLORS.text, marginBottom: 6 },
  detailDate: { fontFamily: FONT_SANS_LIGHT, fontSize: 12, color: "rgba(207,167,255,0.35)", marginBottom: 18 },
  detailContent: { fontFamily: FONT_SANS_LIGHT, fontSize: 15, color: "#D4C4F0", lineHeight: 26 },
  actionsRow: { flexDirection: "row", gap: 7, marginTop: 18 },
});
