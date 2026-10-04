import { Audio, AVPlaybackStatus } from "expo-av";
import { getSoundDataUri, SoundId } from "./soundSynth";

// ============================================================
// SOUND ENGINE — Expo-compatible replacement for the original
// Web Audio SoundEngine class. Same public surface (play, stop,
// setVolume, startTimer) and same 5 sounds/behavior (looping,
// volume 0..1, sleep timer that stops playback), but audio is
// produced by rendering the original synthesis graphs offline to
// a seamless WAV loop (see soundSynth.ts) and looping it with
// expo-av, since AudioContext/OscillatorNode do not exist on
// native RN.
// ============================================================

class SoundEngine {
  private sound: Audio.Sound | null = null;
  private currentId: SoundId | null = null;
  private volume = 0.65;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onEndCb: (() => void) | null = null;
  private readyPromise: Promise<void> | null = null;

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }

  async play(id: SoundId) {
    // toggling same sound is handled by the caller (Main screen), same as original
    await this.stop();
    await this.ensureAudioMode();
    const uri = getSoundDataUri(id);
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
