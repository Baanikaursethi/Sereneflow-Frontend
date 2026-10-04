import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import { SOUNDS } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SoundId } from "../lib/soundEngine";

interface SoundsTabProps {
  soundPlaying: SoundId | null;
  soundVol: number;
  timerMins: number | null;
  timerLeft: number | null;
  playSound: (id: SoundId) => void;
  stopSound: () => void;
  changeVol: (v: number) => void;
  setTimerMins: (m: number) => void;
  startSoundTimer: (m: number) => void;
}

export const SoundsTab: React.FC<SoundsTabProps> = ({
  soundPlaying,
  soundVol,
  timerMins,
  timerLeft,
  playSound,
  stopSound,
  changeVol,
  setTimerMins,
  startSoundTimer,
}) => {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const handleTimer = (m: number) => {
    setTimerMins(m);
    if (soundPlaying) startSoundTimer(m);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Calming Sounds</Text>
        <Text style={styles.sub}>Select a sound — it stays with you across the whole app.</Text>
      </View>
      <View style={styles.grid}>
        {SOUNDS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.card, soundPlaying === s.id && styles.cardActive]}
            onPress={() => playSound(s.id as SoundId)}
            activeOpacity={0.85}
          >
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={styles.name}>{s.label}</Text>
            <Text style={styles.desc}>{s.description}</Text>
            {soundPlaying === s.id && <Text style={styles.playingHint}>♪ playing</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {soundPlaying && (
        <View style={styles.ctrl}>
          <Text style={styles.playingText}>🎵 Playing while you use the app</Text>
          <View style={styles.volRow}>
            <Text style={{ opacity: 0.55 }}>🔈</Text>
            <Slider
              style={{ flex: 1, height: 32 }}
              minimumValue={0}
              maximumValue={1}
              value={soundVol}
              onValueChange={changeVol}
              minimumTrackTintColor="#CFA7FF"
              maximumTrackTintColor="rgba(207,167,255,0.13)"
              thumbTintColor="#CFA7FF"
            />
            <Text style={{ opacity: 0.55 }}>🔊</Text>
          </View>
          {timerLeft != null && <Text style={styles.timerDisp}>⏱ {fmt(timerLeft)}</Text>}
          <Text style={styles.timerLabel}>Sleep timer:</Text>
          <View style={styles.timerRow}>
            {[5, 10, 30].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.timerBtn, timerMins === m && styles.timerBtnA]}
                onPress={() => handleTimer(m)}
              >
                <Text style={[styles.timerBtnText, timerMins === m && styles.timerBtnTextA]}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.stopBtn} onPress={stopSound}>
            <Text style={styles.stopBtnText}>■ Stop Sound</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 24, maxWidth: 680, width: "100%", alignSelf: "center" },
  header: { marginBottom: 22 },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text, marginBottom: 4 },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 13, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginBottom: 16 },
  card: {
    width: "47%",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.07)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 6,
  },
  cardActive: { borderColor: "rgba(207,167,255,0.32)", backgroundColor: "rgba(124,92,191,0.12)" },
  icon: { fontSize: 26 },
  name: { fontFamily: FONT_SANS_LIGHT, fontWeight: "500", color: COLORS.text, fontSize: 14 },
  desc: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 11, textAlign: "center" },
  playingHint: { fontFamily: FONT_SANS_LIGHT, fontSize: 10, color: "#A8E6CF", marginTop: 2 },
  ctrl: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: "rgba(207,167,255,0.07)", borderRadius: 16, padding: 18 },
  playingText: { fontFamily: FONT_SANS_LIGHT, fontSize: 12.5, color: "rgba(168,230,207,0.6)", marginBottom: 12 },
  volRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 16 },
  timerDisp: { textAlign: "center", fontFamily: FONT_SERIF, fontSize: 26, color: "#CFA7FF", marginBottom: 8 },
  timerLabel: { opacity: 0.5, fontSize: 12, fontFamily: FONT_SANS_LIGHT, marginBottom: 8 },
  timerRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  timerBtn: { backgroundColor: "rgba(207,167,255,0.055)", borderWidth: 1, borderColor: "rgba(207,167,255,0.1)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  timerBtnA: { backgroundColor: "rgba(124,92,191,0.18)", borderColor: "rgba(207,167,255,0.28)" },
  timerBtnText: { color: "rgba(207,167,255,0.52)", fontFamily: FONT_SANS_LIGHT, fontSize: 12.5 },
  timerBtnTextA: { color: COLORS.text },
  stopBtn: { width: "100%", backgroundColor: "rgba(207,167,255,0.06)", borderWidth: 1, borderColor: "rgba(207,167,255,0.1)", borderRadius: 10, paddingVertical: 10, marginTop: 12, alignItems: "center" },
  stopBtnText: { color: "rgba(207,167,255,0.45)", fontFamily: FONT_SANS_LIGHT, fontSize: 13 },
});
