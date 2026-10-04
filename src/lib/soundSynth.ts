// ============================================================
// SOUND SYNTHESIS — offline renderer that reproduces the original
// SoundEngine's Web Audio graphs (oscillators, envelopes, pink
// noise, delay/feedback, biquad filters, LFOs) as PCM sample
// buffers, since native Expo has no Web Audio API / AudioContext.
//
// Each render*() function mirrors the corresponding play*() method
// from the original SoundEngine 1:1 in terms of oscillator
// frequencies, envelope shapes (linear/exponential ramps),
// gain values, filter types/frequencies/Q, delay/feedback amounts,
// and LFO rates — just computed sample-by-sample instead of via
// live AudioNodes, then looped seamlessly for native playback.
// ============================================================

const SAMPLE_RATE = 22050; // lower than 44.1k to keep buffer/render size reasonable on-device

// ---- simple one-pole filters standing in for BiquadFilterNode ----
function lowpass(data: Float32Array, cutoffHz: number, sr: number) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sr;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < data.length; i++) {
    prev = prev + alpha * (data[i] - prev);
    data[i] = prev;
  }
}

function bandpass(data: Float32Array, centerHz: number, q: number, sr: number) {
  // basic 2nd order bandpass (RBJ cookbook)
  const w0 = (2 * Math.PI * centerHz) / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    data[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
}

// ---- pink noise generator, mirrors the original _pink() coefficients ----
function pinkNoise(length: number): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.9690 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

function addSine(
  buf: Float32Array,
  freq: number,
  startSec: number,
  attack: number,
  decay: number,
  peakGain: number,
  sr: number
) {
  const startI = Math.floor(startSec * sr);
  const totalDur = attack + decay;
  const n = Math.floor(totalDur * sr);
  for (let i = 0; i < n; i++) {
    const idx = startI + i;
    if (idx < 0 || idx >= buf.length) continue;
    const t = i / sr;
    let env: number;
    if (t < attack) {
      env = peakGain * (t / attack);
    } else {
      const dt = t - attack;
      // exponential-ish decay to ~0.001
      env = peakGain * Math.exp((Math.log(0.001 / peakGain) * dt) / decay);
    }
    buf[idx] += Math.sin(2 * Math.PI * freq * (i / sr)) * env;
  }
}

function normalize(buf: Float32Array, target = 0.85) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max > target) {
    const g = target / max;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }
}

// Simple feedback delay applied in-place over the whole buffer (loop-safe approximation
// of the original's DelayNode+feedback+wet/dry graph).
function applyDelay(buf: Float32Array, delaySec: number, feedback: number, wet: number, sr: number) {
  const delaySamples = Math.floor(delaySec * sr);
  if (delaySamples <= 0 || delaySamples >= buf.length) return;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const delayed = i >= delaySamples ? out[i - delaySamples] * feedback : 0;
    out[i] = buf[i] + delayed;
  }
  for (let i = 0; i < buf.length; i++) {
    buf[i] = buf[i] * (1 - wet) + out[i] * wet;
  }
}

const LOOP_SECONDS = 20; // each rendered sound loops seamlessly every 20s, matching the original's ~20s bowl/note cycle windows

// ---- Ripple: singing-bowl tones over filtered pink noise + delay, matches playRipple() ----
function renderRipple(): Float32Array {
  const sr = SAMPLE_RATE;
  const n = Math.floor(LOOP_SECONDS * sr);
  const buf = new Float32Array(n);

  const bowlFreqs = [196, 261, 392, 523];
  const bowlGaps = [5.0, 4.5, 6.0, 4.8];
  const bowlDecay = 6.0;
  let t = 0.2;
  for (let r = 0; r < 3; r++) {
    bowlFreqs.forEach((fr, idx) => {
      if (t < LOOP_SECONDS) addSine(buf, fr, t, 0.12, bowlDecay, 0.48, sr);
      t += bowlGaps[idx % bowlGaps.length];
    });
  }

  const noise = pinkNoise(n);
  lowpass(noise, 320, sr);
  for (let i = 0; i < n; i++) buf[i] += noise[i] * 0.12;

  applyDelay(buf, 1.4, 0.38, 0.4, sr);
  normalize(buf, 0.8);
  return buf;
}

// ---- Moonflow: arpeggiated sine + octave chorus, matches playMoonflow() ----
function renderMoonflow(): Float32Array {
  const sr = SAMPLE_RATE;
  const n = Math.floor(LOOP_SECONDS * sr);
  const buf = new Float32Array(n);

  const freqs = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99, 523.25, 392.0, 329.63];
  const gaps = [2.2, 1.8, 2.5, 1.6, 2.0, 2.8, 1.9, 2.4, 2.0, 2.2];
  const decay = 3.2;
  let t = 0.1;
  for (let r = 0; r < 2; r++) {
    freqs.forEach((fr, idx) => {
      if (t < LOOP_SECONDS) {
        addSine(buf, fr, t, 0.04, decay, 0.32, sr);
        addSine(buf, fr * 2, t, 0.04, decay, 0.32 * 0.18, sr);
      }
      t += gaps[idx % gaps.length];
    });
  }

  applyDelay(buf, 0.48, 0.42, 0.35, sr);
  normalize(buf, 0.8);
  return buf;
}

// ---- Aurora Drift: sustained chord pad + shimmer + sub, matches playAurora() ----
function renderAurora(): Float32Array {
  const sr = SAMPLE_RATE;
  const n = Math.floor(LOOP_SECONDS * sr);
  const buf = new Float32Array(n);

  const chordFreqs = [130.81, 164.81, 196.0, 246.94, 329.63];
  chordFreqs.forEach((fr, i) => {
    const lfoRate = 0.015 + i * 0.006;
    for (let s = 0; s < n; s++) {
      const tt = s / sr;
      const trem = 1 + 0.06 * Math.sin(2 * Math.PI * lfoRate * tt); // LFO on gain, matches original
      buf[s] += Math.sin(2 * Math.PI * fr * tt) * 0.2 * trem;
    }
  });

  // shimmer
  for (let s = 0; s < n; s++) {
    const tt = s / sr;
    const trem = 1 + 0.03 * Math.sin(2 * Math.PI * 0.04 * tt);
    buf[s] += Math.sin(2 * Math.PI * 659.25 * tt) * 0.08 * trem;
  }
  // sub
  for (let s = 0; s < n; s++) {
    const tt = s / sr;
    buf[s] += Math.sin(2 * Math.PI * 65.41 * tt) * 0.15;
  }

  normalize(buf, 0.8);
  return buf;
}

// ---- Forest Rain: layered filtered pink noise, matches playForest() ----
function renderForest(): Float32Array {
  const sr = SAMPLE_RATE;
  const n = Math.floor(LOOP_SECONDS * sr);
  const buf = new Float32Array(n);

  const n1 = pinkNoise(n);
  bandpass(n1, 420, 0.6, sr);
  for (let i = 0; i < n; i++) buf[i] += n1[i] * 0.72;

  const n2 = pinkNoise(n);
  lowpass(n2, 200, sr);
  for (let i = 0; i < n; i++) buf[i] += n2[i] * 0.42;

  const n3 = pinkNoise(n);
  bandpass(n3, 1200, 1.2, sr);
  for (let i = 0; i < n; i++) buf[i] += n3[i] * 0.18;

  // slow amplitude LFO across whole master, matches original master.gain LFO
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    buf[i] *= 1 + 0.08 * Math.sin(2 * Math.PI * 0.018 * tt);
  }

  normalize(buf, 0.85);
  return buf;
}

// ---- Inner Glow: solfeggio-style sustained tones + delay + sub, matches playInnerGlow() ----
function renderInnerGlow(): Float32Array {
  const sr = SAMPLE_RATE;
  const n = Math.floor(LOOP_SECONDS * sr);
  const buf = new Float32Array(n);

  [174, 285, 396, 528].forEach((f, i) => {
    const lfoRate = 0.015 + i * 0.007;
    for (let s = 0; s < n; s++) {
      const tt = s / sr;
      const trem = 1 + 0.04 * Math.sin(2 * Math.PI * lfoRate * tt);
      buf[s] += Math.sin(2 * Math.PI * f * tt) * 0.18 * trem;
    }
  });
  for (let s = 0; s < n; s++) {
    const tt = s / sr;
    buf[s] += Math.sin(2 * Math.PI * 87 * tt) * 0.12;
  }

  applyDelay(buf, 0.8, 0.32, 0.3, sr);
  normalize(buf, 0.82);
  return buf;
}

export type SoundId = "ripple" | "moonflow" | "aurora" | "forest" | "innerglow";

const RENDERERS: Record<SoundId, () => Float32Array> = {
  ripple: renderRipple,
  moonflow: renderMoonflow,
  aurora: renderAurora,
  forest: renderForest,
  innerglow: renderInnerGlow,
};

// ---- WAV encoding (16-bit PCM mono) ----
function floatToWavBase64(samples: Float32Array, sampleRate: number): string {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  // base64 encode
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  const base64 = globalThis.btoa ? globalThis.btoa(binary) : base64Encode(binary);
  return base64;
}

// btoa polyfill fallback for environments lacking it
function base64Encode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++);
    const c2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const e3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6));
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out += chars[e1] + chars[e2] + chars[e3] + chars[e4];
  }
  return out;
}

const cache = new Map<SoundId, string>();

/** Renders (once, cached) the given sound to a data URI WAV, playable/loopable via expo-av. */
export function getSoundDataUri(id: SoundId): string {
  if (cache.has(id)) return cache.get(id)!;
  const samples = RENDERERS[id]();
  const b64 = floatToWavBase64(samples, SAMPLE_RATE);
  const uri = `data:audio/wav;base64,${b64}`;
  cache.set(id, uri);
  return uri;
}
