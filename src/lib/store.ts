import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// STORAGE — async wrapper mirroring the original localStorage
// helper's API/behavior (get/set/remove), backed by AsyncStorage.
// Original used synchronous localStorage; RN requires async storage,
// so this module keeps an in-memory mirror that is hydrated once at
// app start (see hydrateStore()) so call sites can keep using
// store.get/set/remove synchronously exactly like the original code.
// ============================================================

type Json = any;

const memory: Record<string, Json> = {};
let hydrated = false;

export async function hydrateStore(): Promise<void> {
  if (hydrated) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      if (v != null) {
        try {
          memory[k] = JSON.parse(v);
        } catch {
          // ignore corrupt entry
        }
      }
    });
  } catch {
    // ignore hydrate errors; memory stays empty, matches original try/catch fallback
  } finally {
    hydrated = true;
  }
}

export const store = {
  get: (k: string, d: Json = null): Json => {
    try {
      return k in memory ? memory[k] : d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: Json): void => {
    try {
      memory[k] = v;
      // fire and forget, mirrors original's synchronous-looking usage
      AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
    } catch {
      /* noop */
    }
  },
  remove: (k: string): void => {
    try {
      delete memory[k];
      AsyncStorage.removeItem(k).catch(() => {});
    } catch {
      /* noop */
    }
  },
};
