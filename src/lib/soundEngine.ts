import { Audio } from "expo-av";
// expo-file-system SDK 19 (Expo SDK 54) moved legacy APIs to the /legacy entry.
// cacheDirectory, writeAsStringAsync, and EncodingType are still available there.
// NOTE: on web, cacheDirectory is null — we detect that and use data: URIs instead
// (HTML5 Audio supports data: URIs; ExoPlayer on Android does not, hence the split).
import * as FileSystem from "expo-file-system/legacy";
import { getSoundWavBase64, getSoundDataUri, SoundId } from "./soundSynth";
import { Platform } from "react-native";

// ============================================================
// SOUND ENGINE — Expo-compatible ambient audio player.
//
// Platform strategy:
//   WEB   — data: URI passed directly to Audio.Sound.createAsync.
//           HTML5 Audio supports data: URIs natively; no file I/O needed.
//   NATIVE — Base64 WAV written to FileSystem.cacheDirectory as a
//           temp file:// URI, which ExoPlayer (Android) requires.
//
// Android's ExoPlayer does NOT support data: URIs. The file is
// written once per sound per app session (cached by SoundId).
// ============================================================

// Cache of already-written native temp file URIs (file:// paths)
const fileUriCache = new Map<SoundId, string>();

async function getSoundUri(id: SoundId): Promise<string> {
  // On web, use data: URI — no file system needed, HTML5 Audio handles it.
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) {
    return getSoundDataUri(id);
  }

  // On native, write once to cacheDirectory and reuse the file:// URI.
  if (fileUriCache.has(id)) return fileUriCache.get(id)!;
  const base64 = getSoundWavBase64(id);
  const path = `${FileSystem.cacheDirectory}sf_sound_${id}.wav`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  fileUriCache.set(id, path);
  return path;
}

class SoundEngine {
  private sound: Audio.Sound | null = null;
  private currentId: SoundId | null = null;
  private volume = 0.65;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onEndCb: (() => void) | null = null;

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }

  async play(id: SoundId) {
    await this.stop();
    await this.ensureAudioMode();
    // Platform-aware URI: data: on web, file:// on native
    const uri = await getSoundUri(id);
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { isLooping: true, volume: this.volume, shouldPlay: true }
    );
    this.sound = sound;
    this.currentId = id;
  }

  async stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        /* noop */
      }
      this.sound = null;
    }
    this.currentId = null;
  }

  async setVolume(v: number) {
    this.volume = v;
    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(v);
      } catch {
        /* noop */
      }
    }
  }

  startTimer(mins: number, onEnd?: () => void) {
    if (this.timer) clearTimeout(this.timer);
    this.onEndCb = onEnd || null;
    this.timer = setTimeout(() => {
      this.stop();
      this.onEndCb?.();
    }, mins * 60 * 1000);
  }

  getCurrentId() {
    return this.currentId;
  }
}

export const soundEngine = new SoundEngine();
export type { SoundId };
