import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { TextButton, SmButton, PillButton } from "../components/UI";
import { ModerationNotice } from "../components/ModerationNotice";
import { CeoBadge } from "../components/SFLogo";
import { moderateSpacesPost, ModerationReason } from "../lib/moderation";
import { store } from "../lib/store";
import { fetchSpacesPosts, createSpacesPost, editSpacesPost, deleteSpacesPost, ApiError } from "../lib/spaces";
import { CEO_EMAIL } from "../data/content";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT, FONT_SANS_MED } from "../lib/theme";
import { SFUser, SpacesPost } from "../lib/types";

const REACTIONS = [
  { emoji: "❤️", label: "I'm here for you" },
  { emoji: "😊", label: "I understand" },
  { emoji: "🌸", label: "Stay strong" },
  { emoji: "💛", label: "Sending care" },
  { emoji: "🌈", label: "There's hope" },
];

export const SpacesPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
  // Reactions/replies remain local-only mutations layered on top of the
  // backend-loaded posts (unchanged from before — not part of this task's
  // Edit/Delete scope). `key` is still used for that local reaction/reply
  // overlay so existing behavior there is preserved byte-for-byte.
  const key = "sf_spaces";
  const [posts, setPosts] = useState<SpacesPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [delConf, setDelConf] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState("");
  const [blocked, setBlocked] = useState<ModerationReason | null>(null);
  const isCeo = user.email === CEO_EMAIL;

  const loadPosts = async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const backendPosts = await fetchSpacesPosts();
      // Merge in the local reaction/reply overlay so those still-local
      // features keep working unchanged for posts the backend returns.
      const overlay: SpacesPost[] = store.get(key, []);
      const merged = backendPosts.map((p) => {
        const local = overlay.find((o) => o.id === p.id);
        return local ? { ...p, reactions: local.reactions, replies: local.replies } : p;
      });
      store.set(key, merged);
      setPosts(merged);
    } catch (e) {
      setLoadErr("Couldn't load posts. Pull to refresh or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const post = async () => {
    if (!text.trim() || posting) return;
    const mod = moderateSpacesPost(text);
    if (mod.blocked) {
      setBlocked(mod.reason);
      return;
    }
    setPosting(true);
    setActionErr("");
    try {
      const created = await createSpacesPost({ text, anonymous: anon });
      const withAuthor: SpacesPost = {
        ...created,
        authorName: anon ? null : created.authorName ?? user.name,
        authorEmail: anon ? null : created.authorEmail ?? user.email,
      };
      const all = [withAuthor, ...posts];
      store.set(key, all);
      setPosts(all);
      setText("");
      setWriting(false);
      setAnon(false);
      setBlocked(null);
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Couldn't share your post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const react = (pid: string, emoji: string) => {
    const all: SpacesPost[] = store.get(key, []);
    const p = all.find((x) => x.id === pid);
    if (!p) return;
    p.reactions = p.reactions || {};
    if (p.reactions[emoji]) delete p.reactions[emoji];
    else p.reactions[emoji] = 1;
    store.set(key, all);
    setPosts([...all]);
  };

  const reply = (pid: string) => {
    if (!replyText.trim()) return;
    const all: SpacesPost[] = store.get(key, []);
    const p = all.find((x) => x.id === pid);
    if (!p) return;
    p.replies = p.replies || [];
    p.replies.push({ id: Date.now().toString(), text: replyText, time: new Date().toISOString() });
    store.set(key, all);
    setPosts([...all]);
    setReplyText("");
    setReplyTo(null);
  };

  const startEdit = (p: SpacesPost) => {
    setEditId(p.id);
    setEditText(p.text);
    setMenuOpen(null);
  };
  const saveEdit = async () => {
    if (!editText.trim() || editSaving) return;
    const mod = moderateSpacesPost(editText);
    if (mod.blocked) {
      setBlocked(mod.reason);
      return;
    }
    if (!editId) return;
    setEditSaving(true);
    setActionErr("");
    try {
      await editSpacesPost(editId, editText);
      const all: SpacesPost[] = store.get(key, []);
      const p = all.find((x) => x.id === editId);
      if (p) {
        p.text = editText;
        p.edited = new Date().toISOString();
        store.set(key, all);
        setPosts([...all]);
      }
      setEditId(null);
      setEditText("");
      setBlocked(null);
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Couldn't save your edit. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
    setBlocked(null);
  };

  const deletePost = async (pid: string) => {
    if (deleting) return;
    setDeleting(pid);
    setActionErr("");
    try {
      await deleteSpacesPost(pid);
      // UI updates only after successful deletion (per task requirement).
      const all = store.get(key, []).filter((x: SpacesPost) => x.id !== pid);
      store.set(key, all);
      setPosts(all);
      setDelConf(null);
      setMenuOpen(null);
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Couldn't delete this post. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const fmt = (ts: string) => {
    const d = new Date(ts),
      n = new Date(),
      diff = (n.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  const isOwn = (p: SpacesPost) => !p.anonymous && !!p.authorEmail && p.authorEmail === user.email;
  const canManage = (p: SpacesPost) => isOwn(p) || isCeo;
  const canEdit = (p: SpacesPost) => isOwn(p);

  return (
    <View style={styles.subpage}>
      <View style={styles.header}>
        <TextButton title="← Back" onPress={onBack} />
        <Text style={styles.headerTitle}>Spaces</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🌸 A safe space to share. You're not alone.</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setWriting(!writing)}>
          <Text style={styles.newBtnText}>{writing ? "Cancel" : "+ Share something..."}</Text>
        </TouchableOpacity>

        {writing && (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              style={styles.textarea}
              value={text}
              onChangeText={(t) => {
                setText(t);
                setBlocked(null);
              }}
              placeholder={anon ? "Someone shared... what's on your heart?" : "What's on your heart?"}
              placeholderTextColor="rgba(207,167,255,0.22)"
              multiline
              textAlignVertical="top"
            />
            {blocked && <ModerationNotice reason={blocked} />}
            <TouchableOpacity style={styles.anonToggle} onPress={() => setAnon(!anon)} activeOpacity={0.8}>
              <Switch
                value={anon}
                onValueChange={setAnon}
                trackColor={{ false: "rgba(207,167,255,0.12)", true: "rgba(124,92,191,0.45)" }}
                thumbColor={anon ? "#CFA7FF" : "rgba(207,167,255,0.4)"}
              />
              <Text style={styles.anonLabel}>
                {anon ? (
                  <Text style={styles.anonBadge}>🎭 Anonymous — your name won't appear</Text>
                ) : (
                  <>
                    Post as <Text style={{ color: "#CFA7FF" }}>{user.name}</Text>
                  </>
                )}
              </Text>
            </TouchableOpacity>
            <PillButton
              title={anon ? "Share Anonymously" : "Share as " + user.name}
              onPress={post}
              loading={posting}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {!!actionErr && <Text style={styles.errBanner}>{actionErr}</Text>}

        {loading ? (
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator color="rgba(207,167,255,0.6)" />
          </View>
        ) : loadErr ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={styles.errBanner}>{loadErr}</Text>
            <SmButton title="Retry" onPress={loadPosts} style={{ marginTop: 10 }} />
          </View>
        ) : (
          <>
            {posts.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyMain}>Be the first to share.</Text>
                <Text style={styles.emptySub}>Your words might be exactly what someone else needs.</Text>
              </View>
            )}
        <View style={{ gap: 10 }}>
          {posts.map((p) => (
            <View key={p.id} style={styles.sCard}>
              <View style={styles.sCardHead}>
                {p.anonymous !== false || p.authorName == null ? (
                  <Text style={styles.sAnon}>🎭 Someone shared...</Text>
                ) : (
                  <View style={styles.sAuthorRow}>
                    <View style={styles.sAuthorAv}>
                      <Text style={styles.sAuthorAvText}>{p.authorName[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.sAuthorName}>{p.authorName}</Text>
                    {p.authorEmail === CEO_EMAIL && <CeoBadge size="small" />}
                  </View>
                )}
                {canManage(p) && (
                  <View>
                    <TouchableOpacity
                      style={styles.menuBtn}
                      onPress={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                    >
                      <Text style={styles.menuBtnText}>⋯</Text>
                    </TouchableOpacity>
                    {menuOpen === p.id && (
                      <View style={styles.menuDropdown}>
                        {canEdit(p) && (
                          <TouchableOpacity style={styles.menuItem} onPress={() => startEdit(p)}>
                            <Text style={styles.menuItemText}>✎ Edit Post</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => {
                            setDelConf(p.id);
                            setMenuOpen(null);
                          }}
                        >
                          <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                            🗑 {isCeo && !isOwn(p) ? "Remove Post" : "Delete Post"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {editId === p.id ? (
                <View style={{ marginBottom: 8 }}>
                  <TextInput
                    style={styles.textarea}
                    value={editText}
                    onChangeText={(t) => {
                      setEditText(t);
                      setBlocked(null);
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                  {blocked && <ModerationNotice reason={blocked} />}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <PillButton title="Save" onPress={saveEdit} loading={editSaving} style={{ flex: 1, paddingVertical: 10 }} />
                    <SmButton title="Cancel" onPress={cancelEdit} />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.sText}>{p.text}</Text>
                  <Text style={styles.sTime}>
                    {fmt(p.edited || p.time)}
                    {p.edited ? " (edited)" : ""}
                  </Text>
                </>
              )}

              {delConf === p.id && (
                <View style={styles.delConfirm}>
                  <Text style={styles.delConfirmText}>
                    {isCeo && !isOwn(p)
                      ? "Remove this post for violating community guidelines? This cannot be undone."
                      : "Delete this post? This cannot be undone."}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" }}>
                    <SmButton
                      title={isCeo && !isOwn(p) ? "Yes, Remove" : "Yes, Delete"}
                      danger
                      onPress={() => deletePost(p.id)}
                    />
                    <SmButton title="Cancel" onPress={() => setDelConf(null)} />
                    {deleting === p.id && <ActivityIndicator color="rgba(255,150,150,0.7)" />}
                  </View>
                </View>
              )}

              {editId !== p.id && (
                <View style={styles.reactions}>
                  {REACTIONS.map((r) => (
                    <TouchableOpacity key={r.emoji} style={styles.reactBtn} onPress={() => react(p.id, r.emoji)}>
                      <Text style={styles.reactEmoji}>{r.emoji}</Text>
                      <Text style={styles.reactLabel}>{r.label}</Text>
                      {p.reactions?.[r.emoji] > 0 && <Text style={styles.reactCount}>{p.reactions[r.emoji]}</Text>}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.reactBtn} onPress={() => setReplyTo(replyTo === p.id ? null : p.id)}>
                    <Text style={styles.reactLabel}>💬 Reply</Text>
                  </TouchableOpacity>
                </View>
              )}

              {p.replies?.length > 0 && (
                <View style={styles.repliesWrap}>
                  {p.replies.map((r) => (
                    <View key={r.id} style={styles.reply}>
                      <Text style={styles.replyText}>{r.text}</Text>
                      <Text style={styles.sTime}>{fmt(r.time)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {replyTo === p.id && (
                <View style={{ marginTop: 10 }}>
                  <TextInput
                    style={[styles.textarea, { minHeight: 44, marginBottom: 6 }]}
                    placeholder="Write a kind reply..."
                    placeholderTextColor="rgba(207,167,255,0.22)"
                    value={replyText}
                    onChangeText={setReplyText}
                  />
                  <SmButton title="Send" onPress={() => reply(p.id)} />
                </View>
              )}
            </View>
          ))}
        </View>
        </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  subpage: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 20 },
  headerTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.text },
  body: { padding: 18, paddingBottom: 40, maxWidth: 680, width: "100%", alignSelf: "center" },
  banner: {
    backgroundColor: "rgba(124,92,191,0.09)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.09)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  bannerText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.55)", textAlign: "center" },
  errBanner: {
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 12.5,
    color: "rgba(255,150,150,0.75)",
    textAlign: "center",
    marginBottom: 12,
  },
  newBtn: {
    backgroundColor: "rgba(207,167,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.17)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginBottom: 14,
  },
  newBtnText: { color: "rgba(207,167,255,0.55)", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  textarea: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.12)",
    borderRadius: 14,
    padding: 14,
    color: COLORS.text,
    fontFamily: FONT_SANS_LIGHT,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 90,
  },
  anonToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "rgba(207,167,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.08)",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  anonLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "#C4AFDE", flex: 1 },
  anonBadge: { color: "#CFA7FF" },
  empty: { alignItems: "center", padding: 36 },
  emptyMain: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(207,167,255,0.38)" },
  emptySub: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.38)", marginTop: 6, textAlign: "center" },
  sCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.07)",
    borderRadius: 14,
    padding: 15,
  },
  sCardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sAnon: { fontFamily: FONT_SANS_LIGHT, fontSize: 11, color: "rgba(207,167,255,0.3)", marginBottom: 8 },
  sAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sAuthorAv: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.purpleDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  sAuthorAvText: { fontSize: 11, color: "#E8D8FF", fontFamily: FONT_SANS_MED },
  sAuthorName: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(207,167,255,0.55)" },
  menuBtn: { paddingVertical: 2, paddingHorizontal: 8 },
  menuBtnText: { color: "rgba(207,167,255,0.35)", fontSize: 18 },
  menuDropdown: {
    position: "absolute",
    top: 28,
    right: 0,
    backgroundColor: "rgba(24,12,40,0.97)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.16)",
    borderRadius: 12,
    padding: 6,
    minWidth: 150,
    zIndex: 10,
    gap: 2,
  },
  menuItem: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
  menuItemText: { color: "rgba(207,167,255,0.7)", fontFamily: FONT_SANS_LIGHT, fontSize: 13 },
  menuItemDanger: { color: "rgba(255,150,150,0.6)" },
  sText: { fontFamily: FONT_SANS_LIGHT, color: "#D4C4F0", lineHeight: 23, fontSize: 14.5, marginBottom: 8 },
  sTime: { fontFamily: FONT_SANS_LIGHT, fontSize: 10.5, color: "rgba(207,167,255,0.26)", marginBottom: 10 },
  delConfirm: {
    backgroundColor: "rgba(255,80,80,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.1)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  delConfirmText: { fontFamily: FONT_SANS_LIGHT, fontSize: 13, color: "rgba(255,180,180,0.62)" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  reactBtn: {
    backgroundColor: "rgba(207,167,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.09)",
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reactEmoji: { fontSize: 15 },
  // NOTE: original .react-btn span had opacity:0.8 applied to a dim
  // rgba(207,167,255,0.55) color for the reaction count, which made the
  // number nearly unreadable. Fixed here by rendering the numeric count
  // in a solid, high-contrast color with medium weight, while leaving the
  // reaction label styling and all reaction functionality unchanged.
  reactLabel: { fontSize: 9.5, color: "rgba(207,167,255,0.7)", marginTop: 1 },
  reactCount: {
    fontFamily: FONT_SANS_MED,
    fontWeight: "700",
    fontSize: 11,
    color: "#FFFFFF",
    opacity: 1,
    marginLeft: 2,
  },
  repliesWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(207,167,255,0.055)",
    gap: 6,
  },
  reply: { backgroundColor: "rgba(207,167,255,0.035)", borderRadius: 10, padding: 10 },
  replyText: { fontFamily: FONT_SANS_LIGHT, color: "#C4AFDE", fontSize: 13, lineHeight: 20 },
});
