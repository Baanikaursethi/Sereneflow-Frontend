import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SFLogo } from "../components/SFLogo";
import { Input, PillButton, TextButton } from "../components/UI";
import { verifyEmail, resendVerification } from "../lib/auth";
import { SFUser } from "../lib/types";
import { ApiError } from "../lib/api";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";

interface VerifyProps {
  email: string;
  onVerified: (user: SFUser) => void;
  onBack: () => void;
}

export const Verify: React.FC<VerifyProps> = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const go = async () => {
    setErr("");
    if (!code.trim()) {
      setErr("Please enter the verification code.");
      return;
    }
    setLoading(true);
    try {
      const verifiedUser = await verifyEmail({ email, code: code.trim() });
      setLoading(false);
      onVerified(verifiedUser);
    } catch (e) {
      setLoading(false);
      setErr(e instanceof ApiError ? e.message : "Invalid verification code.");
    }
  };

  const resend = async () => {
    setErr("");
    setResending(true);
    try {
      await resendVerification(email);
      setResending(false);
      setResent(true);
    } catch (e) {
      setResending(false);
      setErr(e instanceof ApiError ? e.message : "Couldn't resend the code. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <SFLogo size={44} glow />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.sub}>We sent a verification code to{"\n"}{email}</Text>
        {!!err && (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{err}</Text>
          </View>
        )}
        {resent && (
          <View style={styles.okBox}>
            <Text style={styles.okText}>✓ A new code has been sent.</Text>
          </View>
        )}
        <Input
          placeholder="Enter verification code"
          autoCapitalize="none"
          keyboardType="number-pad"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setResent(false);
          }}
        />
        <PillButton title="Verify" onPress={go} loading={loading} style={{ marginTop: 6 }} />
        <TextButton
          title={resending ? "Resending…" : "Resend Code"}
          onPress={resend}
          style={{ alignSelf: "center", marginTop: 12 }}
        />
        <TextButton title="← Back" onPress={onBack} style={{ alignSelf: "center", marginTop: 8 }} />
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
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, textAlign: "center", fontSize: 13, marginBottom: 6, lineHeight: 19 },
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
