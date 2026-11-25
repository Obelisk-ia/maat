import type { StampSound } from "./business-card";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext) sharedAudioContext = new Ctor();
  if (sharedAudioContext.state === "suspended") {
    void sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/** Synthesizes a short, tasteful tactile sound without loading external audio assets. */
export function playStampSound(sound: StampSound, isPrize = false) {
  if (sound === "none") return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (sound === "stamp") {
    // Low wooden thud + subtle paper transient.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.095);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);

    if (isPrize) {
      playTone(ctx, 523.25, now + 0.11, 0.22, 0.12, "sine");
      playTone(ctx, 659.25, now + 0.18, 0.28, 0.12, "sine");
      playTone(ctx, 783.99, now + 0.26, 0.38, 0.14, "sine");
    }
    return;
  }

  if (sound === "pop") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.085);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);

    if (isPrize) {
      playTone(ctx, 587.33, now + 0.1, 0.18, 0.11, "triangle");
      playTone(ctx, 880, now + 0.19, 0.34, 0.13, "triangle");
    }
    return;
  }

  if (sound === "chime") {
    playTone(ctx, 783.99, now, 0.34, 0.11, "sine");
    playTone(ctx, 1046.5, now + 0.08, 0.48, 0.11, "sine");
    if (isPrize) {
      playTone(ctx, 1318.51, now + 0.17, 0.56, 0.11, "sine");
      playTone(ctx, 1567.98, now + 0.27, 0.65, 0.12, "sine");
    }
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playStampHaptics(enabled: boolean, isPrize = false) {
  if (!enabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(isPrize ? [22, 48, 30, 48, 42] : [18]);
  } catch {
    // Vibration can be restricted by browser policies; fail silently.
  }
}

export function triggerStampSensory(options: { sound: StampSound; haptics: boolean; isPrize?: boolean }) {
  playStampSound(options.sound, options.isPrize);
  playStampHaptics(options.haptics, options.isPrize);
}
