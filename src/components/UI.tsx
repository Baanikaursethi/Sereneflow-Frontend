import React from "react";
import { TextInput, TextInputProps, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { COLORS, FONT_SANS_LIGHT } from "../lib/theme";

// ============================================================
// UI PRIMITIVES — RN equivalents of the original CSS classes
// .inp, .pill-btn, .sm-btn, .txt-btn (same visual intent/colors).
// ============================================================

// Placeholder text is low-contrast decoration, so every input also carries an
// accessible name for screen readers (falls back to the placeholder).
export const Input: React.FC<TextInputProps> = (props) => (
  <TextInput
    placeholderTextColor="rgba(207,167,255,0.66)"
    accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
    style={[styles.input, props.style]}
    {...props}
  />
);

export const PillButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, disabled, loading, style }) => (
  <TouchableOpacity
    style={[styles.pillBtn, (disabled || loading) && styles.pillBtnDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
  >
    {loading ? <ActivityIndicator color="#F0E4FF" /> : <Text style={styles.pillBtnText}>{title}</Text>}
  </TouchableOpacity>
);

export const TextButton: React.FC<{ title: string; onPress: () => void; style?: ViewStyle }> = ({
  title,
  onPress,
  style,
}) => (
  <TouchableOpacity onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel={title}>
    <Text style={styles.txtBtn}>{title}</Text>
  </TouchableOpacity>
);

export const SmButton: React.FC<{
  title: string;
  onPress: () => void;
  danger?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, danger, style }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.smBtn, style]}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <Text style={[styles.smBtnText, danger && styles.smBtnTextDanger]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  input: {
    width: "100%",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 15,
  },
  pillBtn: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: COLORS.purpleDeep,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pillBtnDisabled: { opacity: 0.52 },
  pillBtnText: {
    color: "#FFFFFF",
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 15,
    letterSpacing: 1,
  },
  txtBtn: {
    color: COLORS.purple,
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 14,
  },
  smBtn: {
    backgroundColor: "rgba(207,167,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.1)",
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  smBtnText: {
    color: "rgba(207,167,255,0.7)",
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 13,
  },
  smBtnTextDanger: { color: "rgba(255,150,150,0.7)" },
});
