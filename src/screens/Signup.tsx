import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { Input, PillButton, TextButton } from "../components/UI";
import { signup as apiSignup } from "../lib/auth";
import { ApiError } from "../lib/api";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

interface SignupProps {
  onSignup: (u: SFUser) => void;
  onLogin: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSignup, onLogin, onTerms, onPrivacy }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [conf, setConf] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setErr("");
    if (!name || !email || !pw) {
      setErr("Please fill in all fields.");
      return;
    }
    if (pw !== conf) {
      setErr("Passwords do not match.");
      return;
    }
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (!agreed) {
      setErr("Please agree to the Terms & Conditions and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const u = await apiSignup({ name, email, password: pw });
      setLoading(false);
      onSignup(u);
    } catch (e) {
      setLoading(false);
      setErr(e instanceof ApiError ? e.message : "An account with this email already exists.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <SFLogo size={52} glow />
          </View>
          <Text style={styles.title}>Begin your journey</Text>
          <Text style={styles.sub}>Create your private sanctuary.</Text>
          {!!err && (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{err}</Text>
            </View>
          )}
          <Input placeholder="Your name" value={name} onChangeText={setName} />
          <View style={{ height: 10 }} />
          <Input placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <View style={{ height: 10 }} />
          <Input placeholder="Password" secureTextEntry value={pw} onChangeText={setPw} />
          <View style={{ height: 10 }} />
          <Input placeholder="Confirm password" secureTextEntry value={conf} onChangeText={setConf} />
          <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
            <Text style={styles.checkbox}>{agreed ? "☑" : "☐"}</Text>
            <Text style={styles.agreeText}>
              I agree to the{" "}
              <Text style={styles.link} onPress={onTerms}>
                Terms
              </Text>{" "}
              and{" "}
              <Text style={styles.link} onPress={onPrivacy}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          <PillButton title="Create Account" onPress={go} loading={loading} style={{ marginTop: 6 }} />
          <View style={styles.footRow}>
            <Text style={styles.footText}>Already have an account? </Text>
            <TextButton title="Sign in" onPress={onLogin} />
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
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text, textAlign: "center", letterSpacing: 1 },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, textAlign: "center", fontSize: 13, marginTop: -4, marginBottom: 6 },
  errBox: {
    backgroundColor: "rgba(255,100,100,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,100,100,0.18)",
    borderRadius: 10,
    padding: 10,
  },
  errText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.8)" },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
  checkbox: { color: "#CFA7FF", fontSize: 15, marginTop: 1 },
  agreeText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: COLORS.textDim, lineHeight: 20, flex: 1 },
  link: { color: "#CFA7FF", textDecorationLine: "underline" },
  footRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: COLORS.textDim },
});
