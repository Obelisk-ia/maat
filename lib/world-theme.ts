import type { CSSProperties } from "react";
import { stampedLook, worldLook, type CardDetails, type WorldMood } from "./business-card";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#7d4420";
  return [
    Number.parseInt(clean.slice(1, 3), 16),
    Number.parseInt(clean.slice(3, 5), 16),
    Number.parseInt(clean.slice(5, 7), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

export function mixHex(base: string, target: string, ratio: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * ratio,
    a[1] + (b[1] - a[1]) * ratio,
    a[2] + (b[2] - a[2]) * ratio,
  ]);
}

function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightHex(hex: string) {
  return relativeLuminance(hex) > 0.44;
}

function bestInkFor(background: string) {
  return isLightHex(background) ? "#191714" : "#fbf8f3";
}

function ensureReadableAccent(accent: string, onDark: boolean) {
  const lum = relativeLuminance(accent);
  if (onDark && lum < 0.28) return mixHex(accent, "#ffffff", 0.55);
  if (!onDark && lum > 0.62) return mixHex(accent, "#181512", 0.55);
  return accent;
}

export type WorldTheme = {
  mood: WorldMood;
  dark: boolean;
  statusBarColor: string;
  confettiColors: string[];
  vars: CSSProperties;
};

/** Computes contrast-safe CSS custom properties for a business's full-screen brand world. */
export function buildWorldTheme(card: CardDetails): WorldTheme {
  const { mood } = worldLook(card);
  const stamped = stampedLook(card);
  const { background: brandBg, accent: brandAccent, text: brandText } = card.colors;

  let worldBg = mixHex("#f7f3ea", brandBg, 0.14);
  let dark = false;
  let worldInk = "#1d1c1a";
  let worldMuted = "#4f4a43";
  let worldSurface = "rgb(255 255 255 / 58%)";
  let worldSurfaceStrong = "rgb(255 255 255 / 80%)";
  let worldBorder = "rgb(31 30 28 / 13%)";
  let worldBarBg = "rgb(255 255 255 / 26%)";
  let worldAccent = ensureReadableAccent(brandBg, false);
  let worldCtaBg = "#151515";
  let worldCtaInk = "#ffffff";
  let worldChipBg = brandBg;
  let worldChipInk = brandText;
  let worldTrackBg = "rgb(31 30 28 / 12%)";
  let worldTrackFill = brandBg;
  let worldPatternInk = brandBg;

  if (mood === "nocturne") {
    dark = true;
    worldBg = mixHex("#100f12", brandBg, 0.24);
    worldInk = "#f7f3ec";
    worldMuted = "rgb(247 243 236 / 70%)";
    worldSurface = "rgb(255 255 255 / 7%)";
    worldSurfaceStrong = "rgb(255 255 255 / 12%)";
    worldBorder = "rgb(255 255 255 / 14%)";
    worldBarBg = "rgb(16 15 18 / 55%)";
    worldAccent = ensureReadableAccent(brandAccent, true);
    worldCtaBg = worldAccent;
    worldCtaInk = bestInkFor(worldAccent);
    worldChipBg = worldAccent;
    worldChipInk = bestInkFor(worldAccent);
    worldTrackBg = "rgb(255 255 255 / 14%)";
    worldTrackFill = worldAccent;
    worldPatternInk = worldAccent;
  } else if (mood === "editorial") {
    dark = false;
    worldBg = mixHex("#f5efe4", brandBg, 0.06);
    worldInk = "#1c1915";
    worldMuted = "#5b5349";
    worldSurface = mixHex("#fcf9f2", brandBg, 0.03);
    worldSurfaceStrong = "#fffdf9";
    worldBorder = "rgb(28 25 21 / 18%)";
    worldBarBg = "rgb(245 239 228 / 82%)";
    worldAccent = ensureReadableAccent(brandBg, false);
    worldCtaBg = "#1c1915";
    worldCtaInk = "#fbf8f2";
    worldChipBg = "#1c1915";
    worldChipInk = "#fbf8f2";
    worldTrackBg = "rgb(28 25 21 / 12%)";
    worldTrackFill = worldAccent;
    worldPatternInk = "#1c1915";
  } else if (mood === "vibrant") {
    // Deepen very bright brand backgrounds slightly so the card stands out from the canvas.
    worldBg = isLightHex(brandBg) ? mixHex(brandBg, "#ffffff", 0.24) : mixHex(brandBg, "#0b0a0a", 0.24);
    dark = !isLightHex(worldBg);
    worldInk = dark ? "#fff9f2" : "#1b1714";
    worldMuted = dark ? "rgb(255 249 242 / 76%)" : "rgb(27 23 20 / 70%)";
    worldSurface = dark ? "rgb(255 255 255 / 11%)" : "rgb(255 255 255 / 56%)";
    worldSurfaceStrong = dark ? "rgb(255 255 255 / 18%)" : "rgb(255 255 255 / 80%)";
    worldBorder = dark ? "rgb(255 255 255 / 20%)" : "rgb(27 23 20 / 16%)";
    worldBarBg = dark ? "rgb(0 0 0 / 20%)" : "rgb(255 255 255 / 35%)";
    worldAccent = ensureReadableAccent(brandAccent, dark);
    worldCtaBg = dark ? worldAccent : "#191714";
    worldCtaInk = dark ? bestInkFor(worldAccent) : "#ffffff";
    worldChipBg = worldAccent;
    worldChipInk = bestInkFor(worldAccent);
    worldTrackBg = dark ? "rgb(255 255 255 / 20%)" : "rgb(27 23 20 / 14%)";
    worldTrackFill = worldAccent;
    worldPatternInk = dark ? brandAccent : brandBg;
  } else if (mood === "minimal") {
    dark = false;
    worldBg = mixHex("#faf9f7", brandBg, 0.035);
    worldInk = "#181818";
    worldMuted = "#615e59";
    worldSurface = "#ffffff";
    worldSurfaceStrong = "#ffffff";
    worldBorder = "rgb(24 24 24 / 10%)";
    worldBarBg = "rgb(250 249 247 / 86%)";
    worldAccent = ensureReadableAccent(brandBg, false);
    worldCtaBg = brandBg;
    worldCtaInk = bestInkFor(brandBg);
    worldChipBg = mixHex("#ffffff", brandBg, 0.14);
    worldChipInk = ensureReadableAccent(brandBg, false);
    worldTrackBg = "rgb(24 24 24 / 9%)";
    worldTrackFill = brandBg;
    worldPatternInk = brandBg;
  }

  const confettiColors = Array.from(new Set([brandAccent, stamped.color, brandBg, brandText, "#ffffff"]));

  return {
    mood,
    dark,
    statusBarColor: worldBg,
    confettiColors,
    vars: {
      "--shop-card": brandBg,
      "--shop-accent": brandAccent,
      "--shop-card-ink": brandText,
      "--world-bg": worldBg,
      "--world-ink": worldInk,
      "--world-muted": worldMuted,
      "--world-surface": worldSurface,
      "--world-surface-strong": worldSurfaceStrong,
      "--world-border": worldBorder,
      "--world-bar-bg": worldBarBg,
      "--world-accent": worldAccent,
      "--world-cta-bg": worldCtaBg,
      "--world-cta-ink": worldCtaInk,
      "--world-chip-bg": worldChipBg,
      "--world-chip-ink": worldChipInk,
      "--world-track-bg": worldTrackBg,
      "--world-track-fill": worldTrackFill,
      "--world-pattern-ink": worldPatternInk,
    } as CSSProperties,
  };
}
