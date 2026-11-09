import { Audio } from "expo-av";
// expo-file-system SDK 19 (Expo SDK 54) moved legacy APIs to the /legacy entry.
// cacheDirectory, writeAsStringAsync, and EncodingType are still available there.
import * as FileSystem from "expo-file-system/legacy";
import { getSoundWavBase64, SoundId } from "./soundSynth";

// ============================================================
// SOUND ENGINE — Expo-compatible ambient audio player.
//
// Android's ExoPlayer (used by expo-av under the hood) does NOT
// support data: URIs. The fix is to write the base64 WAV to a
// temp file in expo-file-system's cacheDirectory and pass a
// file:// URI to Audio.Sound.createAsync — which ExoPlayer handles
// correctly. The temp file is written once per sound per app
// session (cached by SoundId so subsequent plays reuse it).
// ============================================================

// Cache of already-written temp file URIs (file:// paths)
const fileUriCache = new Map<SoundId, string>();

async function getSoundFileUri(id: SoundId): Promise<string> {
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
    // Write WAV to cache dir first so ExoPlayer gets a file:// URI
    const uri = await getSoundFileUri(id);
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
