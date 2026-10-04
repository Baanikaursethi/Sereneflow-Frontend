import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Path, Ellipse } from "react-native-svg";
import { FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";

// ============================================================
// LOGO — ported 1:1 from the original inline SVG drop shape
// (same path data, same gradient stops, same highlight ellipses).
// ============================================================

interface SFLogoProps {
  size?: number;
  glow?: boolean;
  showWordmark?: boolean;
}

export const SFLogo: React.FC<SFLogoProps> = ({ size = 56, glow = true, showWordmark = false }) => {
  const s = size;
  return (
    <View style={{ alignItems: "center", gap: showWordmark ? 14 : 0 }}>
      <View
        style={
          glow
            ? {
                shadowColor: "#CFA7FF",
                shadowOpacity: 0.65,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
              }
            : undefined
        }
      >
        <Svg width={s} height={s} viewBox="0 0 200 220">
          <Defs>
            <RadialGradient id="dropCore" cx="42%" cy="38%" r="62%" fx="38%" fy="32%">
              <Stop offset="0%" stopColor="#FAF0FF" />
              <Stop offset="18%" stopColor="#EDD6FF" />
              <Stop offset="48%" stopColor="#CFA7F5" />
              <Stop offset="78%" stopColor="#9B6DD4" />
              <Stop offset="100%" stopColor="#6B3FA8" />
            </RadialGradient>
            <RadialGradient id="dropSheen" cx="38%" cy="30%" r="50%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.88)" />
              <Stop offset="55%" stopColor="rgba(230,200,255,0.25)" />
              <Stop offset="100%" stopColor="rgba(180,130,240,0)" />
            </RadialGradient>
          </Defs>
          <Path
            d="M100 18 C100 18 42 88 42 132 C42 165 68 190 100 190 C132 190 158 165 158 132 C158 88 100 18 100 18 Z"
            fill="url(#dropCore)"
          />
          <Path
            d="M100 18 C100 18 42 88 42 132 C42 165 68 190 100 190 C132 190 158 165 158 132 C158 88 100 18 100 18 Z"
            fill="url(#dropSheen)"
            opacity={0.5}
          />
          <Ellipse cx={80} cy={80} rx={13} ry={9} fill="rgba(255,255,255,0.44)" transform="rotate(-22 80 80)" />
          <Ellipse cx={91} cy={98} rx={5} ry={3.5} fill="rgba(255,255,255,0.22)" />
        </Svg>
      </View>
      {showWordmark && (
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: FONT_SERIF,
              fontSize: s > 70 ? 33 : 22,
              letterSpacing: 2,
              color: "#E8D5FF",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Serene Flow
          </Text>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>
          <Text
            style={{
              fontFamily: FONT_SANS_LIGHT,
              fontSize: s > 70 ? 12 : 10,
              letterSpacing: 1.5,
              color: "rgba(207,167,255,0.52)",
              fontStyle: "italic",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            For the thoughts that drift in silence
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================
// CEO BADGE
// ============================================================
export const CeoBadge: React.FC<{ size?: "normal" | "small" }> = ({ size = "normal" }) => {
  const small = size === "small";
  return (
    <View style={[styles.badge, small && styles.badgeSm]}>
      <Text style={small ? styles.badgeIconSm : styles.badgeIcon}>👑</Text>
      <Text style={small ? styles.badgeTextSm : styles.badgeText}>CEO</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { width: 36, height: 1, backgroundColor: "rgba(220,160,180,0.35)", borderRadius: 1 },
  dividerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(220,150,170,0.6)" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(160,120,220,0.28)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.4)",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 11,
    marginLeft: 8,
  },
  badgeSm: { paddingVertical: 1, paddingHorizontal: 8, marginLeft: 6 },
  badgeIcon: { fontSize: 12 },
  badgeIconSm: { fontSize: 10 },
  badgeText: { fontFamily: FONT_SANS_LIGHT, fontWeight: "500", fontSize: 11, letterSpacing: 1, color: "#F0E4FF" },
  badgeTextSm: { fontFamily: FONT_SANS_LIGHT, fontWeight: "500", fontSize: 9, letterSpacing: 1, color: "#F0E4FF" },
});
