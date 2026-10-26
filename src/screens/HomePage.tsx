import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { BreathMiniPreview } from "../components/BreathVisuals";
import { MIND_DROPS, MindDrop, getDropsForMood } from "../data/content";
import { store } from "../lib/store";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT, FONT_SANS_MED } from "../lib/theme";
import { SFUser, SubPage } from "../lib/types";

interface HomePageProps {
  user: SFUser;
  onOpen: (sp: SubPage) => void;
}

const pickWeightedDrop = (excludeId: number | null): MindDrop => {
  const lastMood = store.get("sf_last_mood", null);
  let pool: MindDrop[] = MIND_DROPS;
  if (lastMood) {
    const preferred = getDropsForMood(lastMood);
    if (preferred.length > 0 && Math.random() < 0.7) pool = preferred;
  }
  let options = pool.filter((d) => d.id !== excludeId);
  if (options.length === 0) options = MIND_DROPS.filter((d) => d.id !== excludeId);
  if (options.length === 0) options = MIND_DROPS;
  return options[Math.floor(Math.random() * options.length)];
};

export const HomePage: React.FC<HomePageProps> = ({ user, onOpen }) => {
  const [drop, setDrop] = useState<MindDrop>(() => pickWeightedDrop(null));
  const [dropAnim, setDropAnim] = useState(true);
  const [orbPulse, setOrbPulse] = useState(false);
  const spaces = store.get("sf_spaces", []);
  const journals = store.get(`sf_journal_${user.email}`, []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const t = setInterval(() => {
      setDropAnim(false);
      setTimeout(() => {
        setDrop((d) => pickWeightedDrop(d?.id ?? null));
        setDropAnim(true);
      }, 300);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setOrbPulse((p) => !p), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greet}>{greeting},</Text>
          <Text style={styles.name}>{user.name} 👋</Text>
        </View>
        <SFLogo size={38} glow />
      </View>

      <TouchableOpacity style={styles.card} onPress={() => onOpen("journal")} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardIcon}>📓</Text>
          <Text style={styles.cardTitle}>Journal</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
        <Text style={styles.cardPrompt}>A private space for your thoughts & feelings.</Text>
        {journals.length > 0 && (
          <Text style={styles.cardMeta}>
            {journals.length} {journals.length === 1 ? "entry" : "entries"} saved
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => onOpen("drops")} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardIcon}>💜</Text>
          <Text style={styles.cardTitle}>Mind Drops</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
        <Text style={[styles.dropsQuote, { opacity: dropAnim ? 1 : 0 }]}>"{drop.text}"</Text>
        <Text style={styles.cardMeta}>Gentle affirmations · refreshing every few seconds</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => onOpen("pause")} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardIcon}>🫧</Text>
          <Text style={styles.cardTitle}>Pause & Breathe</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
        <View style={styles.pausePreview}>
          <BreathMiniPreview pulse={orbPulse} />
          <View>
            <Text style={styles.pausePreviewText}>Take a moment to breathe</Text>
            <Text style={styles.cardMeta}>Guided breathing exercises</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => onOpen("spaces")} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardIcon}>🤝</Text>
          <Text style={styles.cardTitle}>Spaces</Text>
          <Text style={styles.cardArrow}>→</Text>
        </View>
        <Text style={styles.spacesSafe}>You're not alone. 🌸</Text>
        {spaces.length > 0 ? (
          <Text style={styles.spacesPreview}>
            "{spaces[0].text.slice(0, 68)}
            {spaces[0].text.length > 68 ? "…" : ""}"
          </Text>
        ) : (
          <Text style={styles.spacesEmpty}>A quiet space to share and be heard.</Text>
        )}
        {spaces.length > 0 && (
          <Text style={styles.cardMeta}>
            {spaces.length} {spaces.length === 1 ? "voice" : "voices"} in this space
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 16, maxWidth: 680, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greet: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 13 },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text },
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 18, fontWeight: "500", color: COLORS.text, flex: 1 },
  cardArrow: { color: "rgba(207,167,255,0.35)", fontSize: 15 },
  cardPrompt: { fontFamily: FONT_SANS_LIGHT, fontSize: 14, color: "rgba(207,167,255,0.7)", lineHeight: 22 },
  cardMeta: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.3)", marginTop: 8 },
  dropsQuote: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 16, color: "#D4C4F0", lineHeight: 24 },
  pausePreview: { flexDirection: "row", alignItems: "center", gap: 16 },
  pausePreviewText: { fontFamily: FONT_SANS_LIGHT, color: "#CFA7FF", fontSize: 14 },
  spacesSafe: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 16, color: "#C4AFDE", marginBottom: 6 },
  spacesPreview: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.6)", fontStyle: "italic" },
  spacesEmpty: { fontFamily: FONT_SERIF, fontSize: 13, color: "rgba(207,167,255,0.38)", fontStyle: "italic" },
});
