import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, BackHandler, Platform, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, CormorantGaramond_400Regular, CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { Jost_300Light, Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";

import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Verify } from "./screens/Verify";
import { Forgot } from "./screens/Forgot";
import { Terms, Privacy } from "./screens/Legal";
import { Main } from "./screens/Main";
import { store, hydrateStore } from "./lib/store";
import { getRemember, logout as apiLogout } from "./lib/auth";
import { hydrateToken } from "./lib/secureStore";
import {
  beginSession,
  cacheUser,
  endSession,
  getCachedUser,
  hasSession,
  purgeLocalUserData,
} from "./lib/session";
import { ApiError, setUnauthorizedHandler } from "./lib/api";
import { fetchMyProfile } from "./lib/profile";
import { COLORS } from "./lib/theme";
import { NavState, Screen, SFUser } from "./lib/types";

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
//
// SECURITY: the app is a single state machine, so "routes" are not
// URLs — there is no address a user could copy to reach someone
// else's journal, moods or profile, and no private page can be
// opened in a browser or restored from history. What this file adds
// is the equivalent protection for the in-app state machine:
//   * the main app is only rendered when a session token exists,
//   * a stored token is validated against /users/me at launch, so an
//     expired/revoked token cannot expose cached private screens,
//   * any 401 from the backend forces a full sign-out,
//   * logout/account switch wipes the token and every cached private
//     value (see lib/session.ts).
// ============================================================

const initialNav: NavState = {
  screen: "splash",
  user: null,
  navTab: "home",
  subPage: null,
  pauseModeId: null,
  prevScreen: null,
};

const EXPIRED_NOTICE = "Your session has expired. Please sign in again.";

const mainState = (user: SFUser): NavState => ({
  screen: "main",
  user,
  navTab: "home",
  subPage: null,
  pauseModeId: null,
  prevScreen: null,
});

export default function App() {
  const [navState, setNavState] = useState<NavState>(initialNav);
  const [ready, setReady] = useState(false);
  // Holds the just-signed-up user while they're on the Verify screen —
  // separate from navState.user so verify->main only happens after
  // the code is confirmed.
  const [pendingUser, setPendingUser] = useState<SFUser | null>(null);
  // Shown on the Login screen, e.g. after an expired session.
  const [notice, setNotice] = useState("");

  const [fontsLoaded] = useFonts({
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
      await hydrateToken();
      // Earlier builds wrote the JWT through the generic key/value store;
      // make sure no plaintext copy is left behind after migration.
      store.remove("sf_token");
      setReady(true);
    })();
  }, []);

  // Any 401 from the backend ends the session immediately: clear the token,
  // cached profile and volatile caches, then return to sign-in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void endSession();
      setPendingUser(null);
      setNotice(EXPIRED_NOTICE);
      setNavState({ ...initialNav, screen: "login" });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Splash timer & remember-me auto-login. Same UX timing/flow as before, but
  // the persisted token is now validated against the backend before any
  // private screen is shown.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      const remembered = getRemember();
      const cached = getCachedUser();
      const canRestore =
        !!remembered &&
        hasSession() &&
        !!cached &&
        cached.email.toLowerCase() === remembered.toLowerCase();

      if (!canRestore) {
        if (!cancelled) setNavState({ ...initialNav, screen: "login" });
        return;
      }

      try {
        const fresh = await fetchMyProfile(cached as SFUser);
        if (cancelled) return;
        // A valid token that belongs to a different account than the cached
        // profile (shared device, swapped token) must never be merged with it:
        // the journal is namespaced per email and would otherwise be shown
        // under the wrong identity. Force a fresh sign-in instead.
        if (fresh.email.toLowerCase() !== (cached as SFUser).email.toLowerCase()) {
          await endSession();
          if (cancelled) return;
          setNotice(EXPIRED_NOTICE);
          setNavState({ ...initialNav, screen: "login" });
          return;
        }
        cacheUser(fresh);
        setNotice("");
        setNavState(mainState(fresh));
      } catch (e) {
        if (cancelled) return;
        const status = e instanceof ApiError ? e.status : -1;
        if (status === 401 || status === 403) {
          await endSession();
          if (cancelled) return;
          setNotice(EXPIRED_NOTICE);
          setNavState({ ...initialNav, screen: "login" });
        } else if (status === 0) {
          // Offline: the remembered session stays usable (journal, sounds and
          // breathing are local); server-backed screens show their own errors.
          setNavState(mainState(cached as SFUser));
        } else {
          setNavState({ ...initialNav, screen: "login" });
        }
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready]);

  const login = useCallback((u: SFUser) => {
    // Drops the previous account's volatile caches if this is a different user.
    beginSession(u);
    setPendingUser(null);
    setNotice("");
    setNavState(mainState(u));
  }, []);

  const logout = useCallback(() => {
    // Start the server-side revocation while the token is still available,
    // then clear local state synchronously — a failed network call must never
    // leave a session (or cached private data) behind.
    void apiLogout();
    void endSession();
    setPendingUser(null);
    setNotice("");
    setNavState({ ...initialNav, screen: "login" });
  }, []);

  const deleteAccount = useCallback(() => {
    // Backend deletion is performed by the caller (ProfileTab) before this
    // is invoked, so by the time this runs the account is already gone
    // server-side. Locally we must also erase the device-only data (journal
    // entries, saved Mind Drops) — otherwise "your data is deleted" is false
    // for everything this app keeps on the device.
    const email = navState.user?.email ?? getCachedUser()?.email ?? "";
    purgeLocalUserData(email);
    void apiLogout();
    void endSession();
    setPendingUser(null);
    setNotice("");
    setNavState({ ...initialNav, screen: "login" });
  }, [navState.user]);

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

  if (!fontsLoaded || !ready) {
    return <View style={styles.loadingScreen} />;
  }

  // Route guard: the authenticated area is unreachable without a live session,
  // even if navState was somehow left on "main" (e.g. token cleared elsewhere).
  const authenticated = navState.screen === "main" && !!navState.user && hasSession();
  const screen: Screen = navState.screen === "main" && !authenticated ? "login" : navState.screen;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.root}>
        {screen === "splash" && <Splash />}
        {screen === "login" && (
          <Login
            notice={notice}
            onLogin={(u) => {
              if (u.isVerified) {
                login(u);
              } else {
                setPendingUser(u);
                pushNav({ screen: "verify", prevScreen: "login" });
              }
            }}
            onSignup={() => {
              setNotice("");
              pushNav({ screen: "signup" });
            }}
            onForgot={() => pushNav({ screen: "forgot" })}
            onTerms={() => pushNav({ screen: "terms", prevScreen: "login" })}
            onPrivacy={() => pushNav({ screen: "privacy", prevScreen: "login" })}
          />
        )}
        {screen === "signup" && (
          <Signup
            onSignup={(u) => {
              if (u.isVerified) {
                login(u);
              } else {
                setPendingUser(u);
                pushNav({ screen: "verify", prevScreen: "signup" });
              }
            }}
            onLogin={() => pushNav({ screen: "login" })}
            onTerms={() => pushNav({ screen: "terms", prevScreen: "signup" })}
            onPrivacy={() => pushNav({ screen: "privacy", prevScreen: "signup" })}
          />
        )}
        {screen === "verify" && pendingUser && (
          <Verify
            email={pendingUser.email}
            onVerified={(verifiedUser) => {
              login(verifiedUser);
            }}
            onBack={() => {
              setPendingUser(null);
              pushNav({ screen: "login" });
            }}
          />
        )}
        {screen === "forgot" && <Forgot onBack={goBack} />}
        {screen === "terms" && <Terms onBack={goBack} />}
        {screen === "privacy" && <Privacy onBack={goBack} />}
        {authenticated && navState.user && (
          <Main
            user={navState.user}
            setUser={(u) => {
              cacheUser(u);
              setNavState((prev) => ({ ...prev, user: u }));
            }}
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
