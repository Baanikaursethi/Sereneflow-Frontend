import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { TextButton } from "../components/UI";
import { MIND_DROPS, MindDrop } from "../data/content";
import { store } from "../lib/store";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser } from "../lib/types";

export const DropsPage: React.FC<{ user: SFUser; onBack: () => void }> = ({ user, onBack }) => {
  const favKey = `sf_drops_${user.email}`;
  const [favs, setFavs] = useState<MindDrop[]>(() => store.get(favKey, []));
  const [cur, setCur] = useState<MindDrop>(MIND_DROPS[0]);
  const [tab, setTab] = useState<"discover" | "saved">("discover");

  const shuffle = () => {
    const pool = MIND_DROPS.filter((d) => d.id !== cur.id);
    setCur(pool[Math.floor(Math.random() * pool.length)]);
  };
  const toggleFav = (d: MindDrop) => {
    const ex = favs.find((f) => f.id === d.id);
    const n = ex ? favs.filter((f) => f.id !== d.id) : [...favs, d];
    setFavs(n);
    store.set(favKey, n);
  };
  const isFav = (d: MindDrop) => !!favs.find((f) => f.id === d.id);

  return (
    <View style={styles.subpage}>
      <View style={styles.header}>
        <TextButton title="← Back" onPress={onBack} />
        <Text style={styles.headerTitle}>Mind Drops</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === "discover" && styles.tabA]} onPress={() => setTab("discover")}>
            <Text style={[styles.tabText, tab === "discover" && styles.tabTextA]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === "saved" && styles.tabA]} onPress={() => setTab("saved")}>
            <Text style={[styles.tabText, tab === "saved" && styles.tabTextA]}>
              Saved {favs.length > 0 && `(${favs.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "discover" && (
          <>
            <View style={styles.dropBig}>
              <Text style={styles.dropBigText}>"{cur.text}"</Text>
              <TouchableOpacity style={[styles.favBtn, isFav(cur) && styles.favActive]} onPress={() => toggleFav(cur)}>
                <Text style={[styles.favBtnText, isFav(cur) && styles.favActiveText]}>
                  {isFav(cur) ? "♥ Saved" : "♡ Save"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shuffleBtn} onPress={shuffle}>
              <Text style={styles.shuffleText}>🔀 Shuffle</Text>
            </TouchableOpacity>
            <View style={{ gap: 8 }}>
              {MIND_DROPS.map((d) => (
                <TouchableOpacity key={d.id} style={styles.dropRow} onPress={() => setCur(d)}>
                  <Text style={styles.dropRowText}>{d.text}</Text>
                  <TouchableOpacity
                    onPress={(e) => {
                      toggleFav(d);
                    }}
                  >
                    <Text style={[styles.favSm, isFav(d) && styles.favActiveText]}>{isFav(d) ? "♥" : "♡"}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {tab === "saved" && (
          <View style={{ gap: 8 }}>
            {favs.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Save Mind Drops that speak to you.</Text>
              </View>
            )}
            {favs.map((d) => (
              <View key={d.id} style={styles.dropRow}>
                <Text style={styles.dropRowText}>{d.text}</Text>
                <TouchableOpacity onPress={() => toggleFav(d)}>
                  <Text style={[styles.favSm, styles.favActiveText]}>♥</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
  tabs: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: { borderWidth: 1, borderColor: "rgba(207,167,255,0.11)", borderRadius: 22, paddingVertical: 8, paddingHorizontal: 18 },
  tabA: { backgroundColor: "rgba(124,92,191,0.18)", borderColor: "rgba(207,167,255,0.28)" },
  tabText: { color: "rgba(207,167,255,0.45)", fontFamily: FONT_SANS_LIGHT, fontSize: 13 },
  tabTextA: { color: COLORS.text },
  dropBig: {
    backgroundColor: "rgba(124,92,191,0.16)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.12)",
    borderRadius: 20,
    padding: 26,
    alignItems: "center",
    marginBottom: 16,
  },
  dropBigText: { fontFamily: FONT_SERIF, fontSize: 20, fontStyle: "italic", color: COLORS.text, lineHeight: 30, marginBottom: 20, textAlign: "center" },
  favBtn: { borderWidth: 1, borderColor: "rgba(207,167,255,0.1)", backgroundColor: "rgba(207,167,255,0.06)", borderRadius: 9, paddingVertical: 7, paddingHorizontal: 13 },
  favActive: {},
  favBtnText: { color: "rgba(207,167,255,0.52)", fontFamily: FONT_SANS_LIGHT, fontSize: 13 },
  favActiveText: { color: "#FF9BD4" },
  shuffleBtn: {
    backgroundColor: "rgba(124,92,191,0.2)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.14)",
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  shuffleText: { color: "rgba(207,167,255,0.7)", fontFamily: FONT_SANS_LIGHT, fontSize: 14 },
  dropRow: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.065)",
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropRowText: { fontFamily: FONT_SANS_LIGHT, color: "#C4AFDE", fontSize: 13.5, lineHeight: 20, flex: 1 },
  favSm: { fontSize: 17, color: "rgba(207,167,255,0.3)" },
  empty: { alignItems: "center", padding: 30 },
  emptyText: { fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(207,167,255,0.38)" },
});
