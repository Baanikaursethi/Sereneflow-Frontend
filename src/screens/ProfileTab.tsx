import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Input, PillButton, SmButton } from "../components/UI";
import { CeoBadge } from "../components/SFLogo";
import { store } from "../lib/store";
import { fetchMyProfile, updateMyName, updateMyAvatar, logMyActivity, deleteMyAccount } from "../lib/profile";
import { ApiError } from "../lib/api";
import { CEO_EMAIL } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

interface ProfileTabProps {
  user: SFUser;
  setUser: (u: SFUser) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onOpenAdmin: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  setUser,
  onLogout,
  onDeleteAccount,
  onTerms,
  onPrivacy,
  onOpenAdmin,
}) => {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [delConf, setDelConf] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [avError, setAvError] = useState("");
  const [avUploading, setAvUploading] = useState(false);

  // Load the authenticated user's profile from the backend on mount, and
  // log activity/lastActive — same pattern as the rest of the app: best
  // effort, doesn't block the existing UI if it fails.
  useEffect(() => {
    (async () => {
      try {
        const fresh = await fetchMyProfile(user);
        setUser(fresh);
        setName(fresh.name);
      } catch {
        // keep showing the locally-known profile if the fetch fails
      }
    })();
    logMyActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setSaveErr("");
    try {
      const updated = await updateMyName(name, user);
      const users = store.get("sf_users", {});
      if (users[user.email]) {
        users[user.email].name = name;
        store.set("sf_users", users);
      }
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveErr(e instanceof ApiError ? e.message : "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async () => {
    setAvError("");
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setAvError("Photo library permission was not granted.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // graceful cancellation, matches original
      }
      const asset = result.assets[0];
      if (!asset.base64) {
        setAvError("Unable to save photo. Try a different image.");
        return;
      }
      const mime = asset.mimeType || "image/jpeg";
      const dataUri = `data:${mime};base64,${asset.base64}`;
      setAvUploading(true);
      const updated = await updateMyAvatar(dataUri, user);
      const users = store.get("sf_users", {});
      if (users[user.email]) {
        users[user.email].avatar = updated.avatar;
        store.set("sf_users", users);
      }
      setUser(updated);
    } catch (err) {
      setAvError(err instanceof ApiError ? err.message : "An error occurred while selecting photo.");
    } finally {
      setAvUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteErr("");
    try {
      await deleteMyAccount();
      onDeleteAccount();
    } catch (e) {
      setDeleteErr(e instanceof ApiError ? e.message : "Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.title}>Your Profile</Text>
          {user.email === CEO_EMAIL && <CeoBadge />}
        </View>
        <Text style={styles.sub}>Your space, your story.</Text>
      </View>

      <View style={styles.avWrap}>
        <TouchableOpacity style={styles.av} onPress={handleAvatarPick} activeOpacity={0.8} disabled={avUploading}>
          {avUploading ? (
            <ActivityIndicator color="#F0E4FF" />
          ) : user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avImg} />
          ) : (
            <Text style={{ fontSize: 32 }}>👤</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.avHint}>Tap to change photo</Text>
        {!!avError && <Text style={styles.errText}>{avError}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Display Name</Text>
        <Input value={name} onChangeText={setName} />
        <Text style={[styles.label, { marginTop: 8 }]}>Email</Text>
        <Input value={user.email} editable={false} style={{ opacity: 1, color: "#E8D5FF" }} />
        <PillButton title={saved ? "✓ Saved" : "Save Changes"} onPress={save} loading={saving} style={{ marginTop: 12 }} />
        {!!saveErr && <Text style={styles.errText}>{saveErr}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Account Activity</Text>
        <View style={styles.actCard}>
          <Text style={styles.actP}>Member since: {new Date(user.createdAt || Date.now()).toLocaleDateString()}</Text>
          <Text style={styles.actP}>Total logins: {user.logins || 1}</Text>
          <Text style={styles.actP}>Last active: {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Today"}</Text>
        </View>
      </View>

      {user.email === CEO_EMAIL && (
        <View style={styles.section}>
          <Text style={styles.label}>Admin</Text>
          <TouchableOpacity style={styles.adminBtn} onPress={onOpenAdmin}>
            <Text style={styles.adminBtnText}>👑 Open Admin Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Legal</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SmButton title="Terms" onPress={onTerms} />
          <SmButton title="Privacy" onPress={onPrivacy} />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        {!delConf ? (
          <TouchableOpacity style={styles.delBtn} onPress={() => setDelConf(true)}>
            <Text style={styles.delBtnText}>Delete Account</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.delConfirm}>
            <Text style={styles.delConfirmText}>This will permanently delete all your data. Are you sure?</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" }}>
              <TouchableOpacity style={styles.delBtn} onPress={confirmDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator color="rgba(255,150,150,0.7)" />
                ) : (
                  <Text style={styles.delBtnText}>Yes, Delete</Text>
                )}
              </TouchableOpacity>
              <SmButton title="Cancel" onPress={() => setDelConf(false)} />
            </View>
            {!!deleteErr && <Text style={styles.errText}>{deleteErr}</Text>}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 24, maxWidth: 680, width: "100%", alignSelf: "center" },
  header: { marginBottom: 22 },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.text },
  sub: { fontFamily: FONT_SANS_LIGHT, color: COLORS.textDim, fontSize: 13, marginTop: 4 },
  avWrap: { alignItems: "center", marginBottom: 24 },
  av: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.purpleDeep,
    borderWidth: 1.5,
    borderColor: "rgba(207,167,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avImg: { width: "100%", height: "100%" },
  avHint: { opacity: 0.45, fontSize: 12, marginTop: 7, fontFamily: FONT_SANS_LIGHT },
  errText: { color: "rgba(255,180,180,0.8)", marginTop: 8, fontSize: 12, fontFamily: FONT_SANS_LIGHT },
  section: { marginBottom: 20 },
  label: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, letterSpacing: 1, color: "rgba(207,167,255,0.38)", textTransform: "uppercase", marginBottom: 8 },
  actCard: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: "rgba(207,167,255,0.065)", borderRadius: 12, padding: 14, gap: 6 },
  actP: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: COLORS.textDim },
  adminBtn: {
    backgroundColor: "rgba(160,120,220,0.2)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.28)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  adminBtnText: { color: "#F0E4FF", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  logoutBtn: {
    backgroundColor: "rgba(207,167,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.12)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  logoutText: { color: "rgba(207,167,255,0.62)", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  delBtn: {
    backgroundColor: "rgba(255,80,80,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.12)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    flex: 1,
  },
  delBtnText: { color: "rgba(255,150,150,0.7)", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  delConfirm: { backgroundColor: "rgba(255,80,80,0.055)", borderWidth: 1, borderColor: "rgba(255,80,80,0.1)", borderRadius: 14, padding: 14 },
  delConfirmText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.62)" },
});
