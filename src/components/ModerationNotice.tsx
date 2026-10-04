import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MODERATION_MESSAGES, ModerationReason } from "../lib/moderation";
import { FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";

export const ModerationNotice: React.FC<{ reason: ModerationReason }> = ({ reason }) => {
  const m = MODERATION_MESSAGES[reason];
  if (!m) return null;
  return (
    <View style={[styles.notice, reason === "selfharm" && styles.noticeCare]}>
      <Text style={styles.title}>{m.title}</Text>
      <Text style={styles.body}>{m.body}</Text>
      <Text style={styles.extra}>{m.extra}</Text>
      {m.resources.length > 0 && (
        <View style={styles.resources}>
          {m.resources.map((r, i) => (
            <View key={i} style={styles.resource}>
              <Text style={styles.resLabel}>{r.label}</Text>
              <Text style={styles.resValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    backgroundColor: "rgba(207,167,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.14)",
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },
  noticeCare: { backgroundColor: "rgba(168,230,207,0.05)", borderColor: "rgba(168,230,207,0.18)" },
  title: { fontFamily: FONT_SERIF, fontSize: 16, fontWeight: "500", color: "#E8D8FF", marginBottom: 8 },
  body: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "#C4AFDE", lineHeight: 21, marginBottom: 8 },
  extra: { fontFamily: FONT_SANS_LIGHT, fontSize: 12.5, color: "rgba(207,167,255,0.55)", lineHeight: 21 },
  resources: { marginTop: 12, gap: 8 },
  resource: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  resLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.45)" },
  resValue: { fontFamily: FONT_SERIF, fontSize: 15, fontStyle: "italic", color: "#A8E6CF" },
});
