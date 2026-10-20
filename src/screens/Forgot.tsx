import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { Input, PillButton, TextButton } from "../components/UI";
import { forgotPassword, resetPassword } from "../lib/auth";
import { ApiError } from "../lib/api";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";

export const Forgot: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2 — enter the six-digit reset code from the email + a new password.
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetErr, setResetErr] = useState("");
  const [resetDone, setResetDone] = useState(false);

  const go = async () => {
    setErr("");
    if (!email) {
      setErr("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setLoading(false);
      setSent(true);
    } catch (e) {
      setLoading(false);
      setErr(e instanceof ApiError ? e.message : "No account found with this email.");
    }
  };

  const submitReset = async () => {
    setResetErr("");
    if (!code.trim()) {
      setResetErr("Please enter the reset code from your email.");
      return;
    }
    if (newPw.length < 6) {
      setResetErr("Password must be at least 6 characters.");
      return;
    }
    if (newPw !== confPw) {
      setResetErr("Passwords do not match.");
      return;
    }
    setResetting(true);
    try {
      await resetPassword({ email, code: code.trim(), newPassword: newPw });
      setResetting(false);
      setResetDone(true);
    } catch (e) {
      setResetting(false);
      setResetErr(e instanceof ApiError ? e.message : "Invalid or expired reset code.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <SFLogo size={44} glow />
        </View>
        <Text style={styles.title}>Reset Password</Text>
        {resetDone ? (
          <>
            <View style={styles.okBox}>
              <Text style={styles.okText}>✓ Password updated. You can now sign in.</Text>
            </View>
            <PillButton title="Back to Sign In" onPress={onBack} />
          </>
        ) : sent ? (
          <>
            <View style={styles.okBox}>
              <Text style={styles.okText}>✓ Reset email sent. Please check your inbox.</Text>
            </View>
            <Text style={styles.sub}>Enter the 6-digit reset code from the email and choose a new password.</Text>
            {!!resetErr && (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{resetErr}</Text>
              </View>
            )}
            <Input placeholder="6-digit reset code" autoCapitalize="none" value={code} onChangeText={setCode} />
            <View style={{ height: 10 }} />
            <Input placeholder="New password" secureTextEntry value={newPw} onChangeText={setNewPw} />
            <View style={{ height: 10 }} />
            <Input placeholder="Confirm new password" secureTextEntry value={confPw} onChangeText={setConfPw} />
            <PillButton title="Reset Password" onPress={submitReset} loading={resetting} style={{ marginTop: 6 }} />
            <TextButton title="← Back" onPress={onBack} style={{ alignSelf: "center", marginTop: 12 }} />
          </>
        ) : (
          <>
            <Text style={styles.sub}>Enter your email to receive a reset code.</Text>
            {!!err && (
              <View style={styles.errBox}>
                <Text style={styles.errText}>{err}</Text>
              </View>
            )}
            <Input placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <PillButton title="Send Reset Code" onPress={go} loading={loading} style={{ marginTop: 6 }} />
            <TextButton title="← Back" onPress={onBack} style={{ alignSelf: "center", marginTop: 12 }} />
          </>
        )}
      </View>
    </ScrollView>
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
  logoWrap: { alignItems: "center", marginBottom: 8 },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text, textAlign: "center", letterSpacing: 1 },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, textAlign: "center", fontSize: 13, marginBottom: 6 },
  errBox: {
    backgroundColor: "rgba(255,100,100,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,100,100,0.18)",
    borderRadius: 10,
    padding: 10,
  },
  errText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.8)" },
  okBox: {
    backgroundColor: "rgba(100,255,180,0.08)",
    borderWidth: 1,
    borderColor: "rgba(100,255,180,0.18)",
    borderRadius: 10,
    padding: 10,
  },
  okText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(150,255,200,0.8)" },
});
