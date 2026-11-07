import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// TOKEN STORAGE
// ============================================================
// The JWT used to live in AsyncStorage, which on Android is a
// plaintext SQLite/prefs file inside the app sandbox (readable on a
// rooted device or through a backup, and it was also duplicated into
// the "current user" cache). It now lives in the platform secure
// store:
//   iOS     -> Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY: never synced,
//               never restored to another device)
//   Android -> Keystore-backed EncryptedSharedPreferences
//
// On web there is no secure keystore available to JS, so we keep the
// AsyncStorage fallback only there; the web build is a secondary target.
//
// The token is also mirrored in memory so the existing synchronous
// call sites (apiRequest building headers) keep working unchanged.
// It is never logged and never placed in a URL.
// ============================================================

const TOKEN_KEY = "sf_token";
const SECURE_AVAILABLE = Platform.OS === "ios" || Platform.OS === "android";

let token: string | null = null;
let hydrated = false;

function parseStored(raw: string | null): string | null {
  if (!raw) return null;
  // Values written by the previous build went through store.set(), which
  // JSON-encoded them ("\"eyJ...\""). Accept both raw and JSON-encoded.
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string" && parsed.length > 0) return parsed;
    return null;
  } catch {
    return raw;
  }
}

/**
 * Reads the persisted token once at startup. Also removes any token left in
 * plaintext AsyncStorage by earlier versions (one-time migration).
 */
export async function hydrateToken(): Promise<string | null> {
  if (hydrated) return token;
  hydrated = true;
  try {
    const legacyRaw = await AsyncStorage.getItem(TOKEN_KEY);
    const legacy = parseStored(legacyRaw);
    if (SECURE_AVAILABLE) {
      let stored: string | null = null;
      try {
        stored = await SecureStore.getItemAsync(TOKEN_KEY);
      } catch {
        stored = null;
      }
      if (!stored && legacy) {
        await SecureStore.setItemAsync(TOKEN_KEY, legacy, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        stored = legacy;
      }
      token = stored;
    } else {
      token = legacy;
    }
  } catch {
    token = null;
  } finally {
    // Purge the plaintext copy regardless of which branch we took.
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      /* best effort */
    }
  }
  return token;
}

export function getToken(): string | null {
  return token;
}

export function hasToken(): boolean {
  return !!token;
}

export async function setToken(next: string | null): Promise<void> {
  token = next;
  try {
    if (SECURE_AVAILABLE) {
      if (next) {
        await SecureStore.setItemAsync(TOKEN_KEY, next, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } else if (next) {
      await AsyncStorage.setItem(TOKEN_KEY, next);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // If the secure store is unavailable we keep the in-memory token for this
    // session only: better to require a fresh sign-in than to persist insecurely.
  } finally {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      /* best effort */
    }
  }
}
