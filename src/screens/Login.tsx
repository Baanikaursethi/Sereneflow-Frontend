import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { Input, PillButton, TextButton } from "../components/UI";
import { login as apiLogin, setRemember } from "../lib/auth";
import { ApiError } from "../lib/api";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

interface LoginProps {
  onLogin: (u: SFUser) => void;
  onSignup: () => void;
  onForgot: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSignup, onForgot, onTerms, onPrivacy }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [rem, setRem] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setErr("");
    if (!email || !pw) {
      setErr("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const u = await apiLogin({ email, password: pw });
      if (rem) setRemember(email);
      else setRemember(null);
      setLoading(false);
      onLogin(u);
    } catch (e) {
      setLoading(false);
      setErr(e instanceof ApiError ? e.message : "Invalid email or password.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <SFLogo size={52} glow />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Your sanctuary awaits.</Text>
          {!!err && (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{err}</Text>
            </View>
          )}
          <Input placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <View style={{ height: 10 }} />
          <Input placeholder="Password" secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={go} />
          <View style={styles.row}>
            <TextButton title={rem ? "☑ Remember me" : "☐ Remember me"} onPress={() => setRem(!rem)} />
            <TextButton title="Forgot password?" onPress={onForgot} />
          </View>
          <PillButton title="Sign In" onPress={go} loading={loading} style={{ marginTop: 6 }} />
          <View style={styles.footRow}>
            <Text style={styles.footText}>Don't have an account? </Text>
            <TextButton title="Create one" onPress={onSignup} />
          </View>
          <View style={styles.legalRow}>
            <TextButton title="Terms" onPress={onTerms} />
            <Text style={styles.dot}>·</Text>
            <TextButton title="Privacy" onPress={onPrivacy} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.1)",
    borderRadius: 24,
    padding: 28,
    gap: 12,
  },
  logoWrap: { alignItems: "center", marginBottom: 12 },
  title: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.text, textAlign: "center", letterSpacing: 1 },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, textAlign: "center", fontSize: 13, marginTop: -4, marginBottom: 6 },
  errBox: {
    backgroundColor: "rgba(255,100,100,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,100,100,0.18)",
    borderRadius: 10,
    padding: 10,
  },
  errText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.8)" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 4 },
  footRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: COLORS.textDim },
  legalRow: { flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 4, alignItems: "center" },
  dot: { color: "rgba(207,167,255,0.32)", fontSize: 12 },
});
