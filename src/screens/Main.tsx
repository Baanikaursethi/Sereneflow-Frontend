import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { HomePage } from "./HomePage";
import { SoundsTab } from "./SoundsTab";
import { MoodTab } from "./MoodTab";
import { ProfileTab } from "./ProfileTab";
import { JournalPage } from "./JournalPage";
import { SpacesPage } from "./SpacesPage";
import { DropsPage } from "./DropsPage";
import { PausePage } from "./PausePage";
import { AdminPage } from "./AdminPage";
import { NowPlayingBar } from "../components/NowPlayingBar";
import { TextButton } from "../components/UI";
import { soundEngine, SoundId } from "../lib/soundEngine";
import { COLORS, FONT_SERIF, FONT_SANS_LIGHT } from "../lib/theme";
import { SFUser, NavTab, SubPage } from "../lib/types";

interface MainProps {
  user: SFUser;
  setUser: (u: SFUser) => void;
  navTab: NavTab;
  subPage: SubPage;
  pauseModeId: string | null;
  setNavTab: (tab: NavTab) => void;
  openSubPage: (sp: SubPage, extraModeId?: string | null) => void;
  closeSubPage: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

const NAV: { id: NavTab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "sounds", icon: "🎵", label: "Sounds" },
  { id: "mood", icon: "💜", label: "Mood" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export const Main: React.FC<MainProps> = ({
  user,
  setUser,
  navTab,
  subPage,
  pauseModeId,
  setNavTab,
  openSubPage,
  closeSubPage,
  onLogout,
  onDeleteAccount,
  onTerms,
  onPrivacy,
}) => {
  const [soundPlaying, setSoundPlaying] = useState<SoundId | null>(null);
  const [soundVol, setSoundVol] = useState(0.65);
  const [timerMins, setTimerMins] = useState<number | null>(null);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const timerIv = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSound = useCallback(() => {
    soundEngine.stop();
    setSoundPlaying(null);
    if (timerIv.current) clearInterval(timerIv.current);
    setTimerLeft(null);
    setTimerMins(null);
  }, []);

  const startSoundTimer = useCallback((mins: number) => {
    if (timerIv.current) clearInterval(timerIv.current);
    let s = mins * 60;
    setTimerLeft(s);
    timerIv.current = setInterval(() => {
      s--;
      setTimerLeft(s);
      if (s <= 0) {
        if (timerIv.current) clearInterval(timerIv.current);
        soundEngine.stop();
        setSoundPlaying(null);
        setTimerLeft(null);
        setTimerMins(null);
      }
    }, 1000);
  }, []);

  const playSound = useCallback(
    (id: SoundId) => {
      if (soundPlaying === id) {
        stopSound();
        return;
      }
      soundEngine.play(id);
      setSoundPlaying(id);
      if (timerMins) startSoundTimer(timerMins);
    },
    [soundPlaying, timerMins, stopSound, startSoundTimer]
  );

  const changeVol = useCallback((v: number) => {
    setSoundVol(v);
    soundEngine.setVolume(v);
  }, []);

  const hasNav = !subPage;
  const bottomOffset = soundPlaying ? 148 : 90;

  return (
    <View style={styles.wrap}>
      <View style={[styles.content, { paddingBottom: bottomOffset }]}>
        {subPage === "journal" && <JournalPage user={user} onBack={closeSubPage} />}
        {subPage === "spaces" && <SpacesPage user={user} onBack={closeSubPage} />}
        {subPage === "drops" && <DropsPage user={user} onBack={closeSubPage} />}
        {subPage === "pause" && <PausePage initialModeId={pauseModeId} onBack={closeSubPage} />}
        {subPage === "sounds" && (
          <View style={styles.subpage}>
            <View style={styles.subpageHeader}>
              <TextButton title="← Back" onPress={closeSubPage} />
              <Text style={styles.subpageIcon}>🎵</Text>
              <Text style={styles.subpageTitle}>Sounds</Text>
            </View>
            <SoundsTab
              soundPlaying={soundPlaying}
              soundVol={soundVol}
              timerMins={timerMins}
              timerLeft={timerLeft}
              playSound={playSound}
              stopSound={stopSound}
              changeVol={changeVol}
              setTimerMins={setTimerMins}
              startSoundTimer={startSoundTimer}
            />
          </View>
        )}
        {subPage === "admin" && <AdminPage user={user} onBack={closeSubPage} />}
        {!subPage && (
          <>
            {navTab === "home" && <HomePage user={user} onOpen={openSubPage} />}
            {navTab === "sounds" && (
              <SoundsTab
                soundPlaying={soundPlaying}
                soundVol={soundVol}
                timerMins={timerMins}
                timerLeft={timerLeft}
                playSound={playSound}
                stopSound={stopSound}
                changeVol={changeVol}
                setTimerMins={setTimerMins}
                startSoundTimer={startSoundTimer}
              />
            )}
            {navTab === "mood" && (
              <MoodTab user={user} onOpen={openSubPage} playSound={playSound} />
            )}
            {navTab === "profile" && (
              <ProfileTab
                user={user}
                setUser={setUser}
                onLogout={onLogout}
                onDeleteAccount={onDeleteAccount}
                onTerms={onTerms}
                onPrivacy={onPrivacy}
                onOpenAdmin={() => openSubPage("admin")}
              />
            )}
          </>
        )}
      </View>

      {soundPlaying && (
        <NowPlayingBar
          soundPlaying={soundPlaying}
          soundVol={soundVol}
          timerLeft={timerLeft}
          onStop={stopSound}
          onVol={changeVol}
          hasNav={hasNav}
        />
      )}

      {hasNav && (
        <View style={styles.bottomNav}>
          {NAV.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.navBtn, navTab === t.id && styles.navBtnActive]} onPress={() => setNavTab(t.id)}>
              <Text style={styles.navIcon}>{t.icon}</Text>
              <Text style={[styles.navLabel, navTab === t.id && styles.navLabelActive]}>{t.label}</Text>
              {t.id === "sounds" && soundPlaying && <View style={styles.playingDot} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flex: 1 },
  subpage: { flex: 1, backgroundColor: COLORS.bg },
  subpageHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingTop: 20 },
  subpageIcon: { fontSize: 24 },
  subpageTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.text },
  bottomNav: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignSelf: "center",
    gap: 4,
    backgroundColor: "rgba(13,7,23,0.92)",
    borderWidth: 1,
    borderColor: "rgba(207,167,255,0.12)",
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  navBtn: { alignItems: "center", gap: 2, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, position: "relative" },
  navBtnActive: { backgroundColor: "rgba(124,92,191,0.22)" },
  navIcon: { fontSize: 19 },
  navLabel: { fontFamily: FONT_SANS_LIGHT, fontSize: 9.5, color: "rgba(207,167,255,0.42)" },
  navLabelActive: { color: "#CFA7FF" },
  playingDot: { position: "absolute", top: 4, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: "#A8E6CF" },
});
