import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from "react-native";
import { TextButton } from "../components/UI";
import { BreathBubble } from "../components/BreathVisuals";
import { BREATHING_MODES, BreathingMode } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";

// ============================================================
// PAUSE & BREATHE
// Behavior change from the original (per explicit product
// requirement): the breathing exercise no longer auto-starts when
// a mode is selected. The description/pattern/purpose information
// is shown up front and the user must tap "Begin" to start the
// guided cycle. The expand/contract orb animation (driven by
// phase, same durations as the original phases[].duration) is
// preserved, now via BreathBubble's Animated.Value scale.
// ============================================================

export const PausePage: React.FC<{ initialModeId: string | null; onBack: () => void }> = ({ initialModeId, onBack }) => {
  const [mode, setMode] = useState<BreathingMode | null>(() =>
    initialModeId ? BREATHING_MODES.find((m) => m.id === initialModeId) || null : null
  );
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [label, setLabel] = useState("Ready...");
  const [orbState, setOrbState] = useState<"rest" | "inhale" | "hold" | "exhale">("rest");
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
    setPhaseIdx(0);
    setLabel("Ready...");
    setOrbState("rest");
    setCycles(0);
    scaleAnim.stopAnimation();
    Animated.timing(scaleAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
  }, [scaleAnim]);

  const runPhase = useCallback(
    (idx: number) => {
      if (!modeRef.current) return;
      const phases = modeRef.current.phases;
      const ph = phases[idx % phases.length];
      setPhaseIdx(idx % phases.length);
      setLabel(ph.name);
      if (idx > 0 && idx % phases.length === 0) setCycles((c) => c + 1);
      const l = ph.name.toLowerCase();
      const nextState = l.includes("in") ? "inhale" : l.includes("hold") ? "hold" : "exhale";
      setOrbState(nextState);

      const targetScale = nextState === "inhale" || nextState === "hold" ? 1 : 0.15;
      Animated.timing(scaleAnim, {
        toValue: targetScale,
        duration: ph.duration,
        useNativeDriver: false,
      }).start();

      timerRef.current = setTimeout(() => runPhase(idx + 1), ph.duration);
    },
    [scaleAnim]
  );

  // Cleanup on unmount / mode change — does NOT auto-start (per requirement).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode]);

  const begin = () => {
    setRunning(true);
    setCycles(0);
    runPhase(0);
  };

  const toggle = () => {
    if (running) {
      stop();
    } else {
      begin();
    }
  };

  const selectMode = (m: BreathingMode) => {
    stop();
    setMode(m);
  };

  // Exercise selection list view
  if (!mode) {
    return (
      <View style={styles.subpage}>
        <View style={styles.header}>
          <TextButton title="← Back" onPress={onBack} />
          <Text style={styles.headerIcon}>🫧</Text>
          <Text style={styles.headerTitle}>Pause & Breathe</Text>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={{ gap: 12 }}>
            {BREATHING_MODES.map((m) => (
              <TouchableOpacity key={m.id} style={styles.card} onPress={() => selectMode(m)} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardLabel}>{m.label}</Text>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
                <Text style={styles.cardDesc}>{m.description}</Text>
                <View style={styles.purposeRow}>
                  {m.purpose.map((p, i) => (
                    <View key={i} style={styles.purposeTag}>
                      <Text style={styles.purposeTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.cardPattern}>{m.pattern}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Session view
  return (
    <View style={styles.subpage}>
      <View style={styles.header}>
        <TextButton
          title="← Back"
          onPress={() => {
            stop();
            setMode(null);
          }}
        />
        <Text style={styles.headerIcon}>🫧</Text>
        <Text style={styles.headerTitle}>{mode.label}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { alignItems: "center" }]}>
        <View style={styles.sessionContainer}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDesc}>{mode.description}</Text>
            <Text style={styles.sessionPattern}>{mode.pattern}</Text>
            {!running && (
              <View style={styles.purposeRow}>
                {mode.purpose.map((p, i) => (
                  <View key={i} style={styles.purposeTag}>
                    <Text style={styles.purposeTagText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <BreathBubble scale={scaleAnim} size={250} active={running} />

          <Text style={styles.instructionLabel}>{running ? label : "Press Begin when you're ready"}</Text>
          {running && cycles > 0 && <Text style={styles.cycleCount}>Cycles completed: {cycles}</Text>}

          <TouchableOpacity style={styles.beginBtn} onPress={toggle} activeOpacity={0.85}>
            <Text style={styles.beginBtnText}>{running ? "Pause" : cycles > 0 ? "Resume" : "Begin"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  subpage: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 20 },
  headerTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.text },
  headerIcon: { fontSize: 24 },
  body: { padding: 18, paddingBottom: 40, maxWidth: 680, width: "100%", alignSelf: "center" },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.1)",
    borderRadius: 18,
    padding: 18,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLabel: { fontFamily: FONT_SERIF, fontSize: 19, fontWeight: "500", color: COLORS.text },
  cardArrow: { color: "rgba(207,167,255,0.35)", fontSize: 15 },
  cardDesc: { fontFamily: FONT_SANS_LIGHT, fontSize: 13.5, color: "rgba(207,167,255,0.65)", lineHeight: 21, marginBottom: 12 },
  purposeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  purposeTag: {
    backgroundColor: "rgba(207,167,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.1)",
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  purposeTagText: { fontFamily: FONT_SANS_LIGHT, fontSize: 10.5, color: "rgba(207,167,255,0.55)" },
  cardPattern: { fontFamily: FONT_SANS_LIGHT, fontSize: 12, color: "rgba(207,167,255,0.4)" },
  sessionContainer: { alignItems: "center", gap: 16, width: "100%", maxWidth: 380 },
  sessionInfo: { alignItems: "center", marginBottom: 6 },
  sessionDesc: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 16, color: "#D4C4F0", lineHeight: 24, textAlign: "center", marginBottom: 6 },
  sessionPattern: { fontFamily: FONT_SANS_LIGHT, fontSize: 12, letterSpacing: 0.5, color: "rgba(207,167,255,0.45)" },
  instructionLabel: { fontFamily: FONT_SERIF, fontSize: 21, color: COLORS.text, textAlign: "center", marginTop: 4 },
  cycleCount: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.5)", marginTop: -6 },
  beginBtn: {
    backgroundColor: COLORS.purpleDeep,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 42,
    marginTop: 8,
  },
  beginBtnText: { color: "#F0E4FF", fontFamily: FONT_SANS_LIGHT, fontSize: 14, letterSpacing: 1 },
});
