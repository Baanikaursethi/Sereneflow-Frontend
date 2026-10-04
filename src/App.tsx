import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, BackHandler, Platform, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, CormorantGaramond_400Regular, CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { Jost_300Light, Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";

import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Forgot } from "./screens/Forgot";
import { Terms, Privacy } from "./screens/Legal";
import { Main } from "./screens/Main";
import { store, hydrateStore } from "./lib/store";
import { getRemember, setRemember, logout as apiLogout, isAuthenticated } from "./lib/auth";
import { getToken } from "./lib/api";
import { COLORS } from "./lib/theme";
import { NavState, SFUser } from "./lib/types";

// ============================================================
// APP ROOT — ported from the original's window.history-based
// navigation. The original used browser history push/replace so
// the Android hardware/gesture back button would step backward
// through screens. On native RN there's no window.history, so
// this keeps the *same* state-machine (navState: screen/navTab/
// subPage/pauseModeId/prevScreen) and instead wires the Android
// hardware back button via BackHandler to call the same goBack()
// logic — preserving the original navigation model/behavior,
// only swapping the underlying platform hook.
// ============================================================

const initialNav: NavState = {
  screen: "splash",
  user: null,
  navTab: "home",
  subPage: null,
  pauseModeId: null,
  prevScreen: null,
};

export default function App() {
  const [navState, setNavState] = useState<NavState>(initialNav);
  const [ready, setReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
  });

  const pushNav = useCallback((newState: Partial<NavState>) => {
    setNavState((prev) => ({ ...prev, ...newState }));
  }, []);

  useEffect(() => {
    (async () => {
      await hydrateStore();
      setReady(true);
    })();
  }, []);

  // Initial splash timer & remember-me auto-login. Same UX timing/flow as
  // before, but now restores the session from the persisted JWT + last-known
  // user profile (set by login/signup) instead of the local mock users map.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const rem = getRemember();
      const cachedUser: SFUser | null = store.get("sf_current_user", null);
      if (rem && isAuthenticated() && cachedUser && cachedUser.email === rem) {
        pushNav({ screen: "main", user: cachedUser, navTab: "home", subPage: null, pauseModeId: null });
      } else {
        pushNav({ screen: "login", user: null, subPage: null });
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [ready, pushNav]);

  const login = (u: SFUser) => {
    store.set("sf_current_user", u);
    pushNav({ screen: "main", user: u, navTab: "home", subPage: null, pauseModeId: null });
  };

  const logout = () => {
    apiLogout();
    setRemember(null);
    store.remove("sf_current_user");
    pushNav({ screen: "login", user: null, subPage: null });
  };

  const deleteAccount = () => {
    // Backend deletion is performed by the caller (ProfileTab) before this
    // is invoked, so by the time this runs the account is already gone
    // server-side — this only handles local session cleanup + navigation.
    apiLogout();
    setRemember(null);
    store.remove("sf_current_user");
    pushNav({ screen: "login", user: null, subPage: null });
  };

  const goBack = useCallback(() => {
    setNavState((prev) => {
      if (prev.subPage) {
        return { ...prev, subPage: null, pauseModeId: null };
      }
      if (prev.screen !== "main") {
        return { ...prev, screen: prev.prevScreen || "login" };
      }
      return prev;
    });
  }, []);

  // Android hardware back button — mirrors the original's popstate handler.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navState.screen === "main" && !navState.subPage && navState.navTab === "home") {
        return false; // let system handle exit at the true root, same as original's history.length check
      }
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [navState, goBack]);

  if ((!fontsLoaded && !fontError) || !ready) {
    return <View style={styles.loadingScreen} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.root}>
        {navState.screen === "splash" && <Splash />}
        {navState.screen === "login" && (
          <Login
            onLogin={login}
            onSignup={() => pushNav({ screen: "signup" })}
            onForgot={() => pushNav({ screen: "forgot" })}
            onTerms={() => pushNav({ screen: "terms", prevScreen: "login" })}
            onPrivacy={() => pushNav({ screen: "privacy", prevScreen: "login" })}
          />
        )}
        {navState.screen === "signup" && (
          <Signup
            onSignup={login}
            onLogin={() => pushNav({ screen: "login" })}
            onTerms={() => pushNav({ screen: "terms", prevScreen: "signup" })}
            onPrivacy={() => pushNav({ screen: "privacy", prevScreen: "signup" })}
          />
        )}
        {navState.screen === "forgot" && <Forgot onBack={goBack} />}
        {navState.screen === "terms" && <Terms onBack={goBack} />}
        {navState.screen === "privacy" && <Privacy onBack={goBack} />}
        {navState.screen === "main" && navState.user && (
          <Main
            user={navState.user}
            setUser={(u) => setNavState((prev) => ({ ...prev, user: u }))}
            navTab={navState.navTab}
            subPage={navState.subPage}
            pauseModeId={navState.pauseModeId}
            setNavTab={(tab) => pushNav({ navTab: tab, subPage: null, pauseModeId: null })}
            openSubPage={(sp, extraModeId = null) => pushNav({ subPage: sp, pauseModeId: extraModeId })}
            closeSubPage={goBack}
            onLogout={logout}
            onDeleteAccount={deleteAccount}
            onTerms={() => pushNav({ screen: "terms", prevScreen: "main" })}
            onPrivacy={() => pushNav({ screen: "privacy", prevScreen: "main" })}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingScreen: { flex: 1, backgroundColor: COLORS.bg },
});
