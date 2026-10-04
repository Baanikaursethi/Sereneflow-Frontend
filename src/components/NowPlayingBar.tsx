import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import { SOUNDS } from "../data/content";
import { FONT_SANS_MED, FONT_SANS_LIGHT } from "../lib/theme";

interface NowPlayingBarProps {
  soundPlaying: string;
  soundVol: number;
  timerLeft: number | null;
  onStop: () => void;
  onVol: (v: number) => void;
  hasNav: boolean;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ soundPlaying, soundVol, timerLeft, onStop, onVol, hasNav }) => {
  const sound = SOUNDS.find((s) => s.id === soundPlaying);
  const fmt = (s: number | null) => (s != null ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);

  return (
    <View style={[styles.npb, { bottom: hasNav ? 82 : 16 }]}>
      <Text style={styles.icon}>{sound?.icon}</Text>
      <View style={styles.textWrap}>
        <Text style={styles.name} numberOfLines={1}>
          {sound?.label}
        </Text>
        {timerLeft != null && <Text style={styles.timer}>{fmt(timerLeft)}</Text>}
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={soundVol}
        onValueChange={onVol}
        minimumTrackTintColor="#CFA7FF"
        maximumTrackTintColor="rgba(207,167,255,0.15)"
        thumbTintColor="#CFA7FF"
      />
      <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
        <Text style={styles.stopText}>■</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  npb: {
    position: "absolute",
    left: 16,
    right: 16,
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "rgba(18,8,34,0.94)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.18)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 200,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: { fontSize: 17 },
  textWrap: { flex: 1, minWidth: 0 },
  name: { fontFamily: FONT_SANS_MED, fontWeight: "500", fontSize: 13, color: "#E8D8FF" },
  timer: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.55)" },
  slider: { width: 76, height: 30 },
  stopBtn: {
    backgroundColor: "rgba(207,167,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.18)",
    borderRadius: 9,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  stopText: { color: "rgba(207,167,255,0.65)", fontSize: 11 },
});
