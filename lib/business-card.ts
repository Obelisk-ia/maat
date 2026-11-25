import { stampCatalog, type StampIcon } from "./stamp-catalog";

export const maxCardStamps = 100;
export const cardImageTypes = ["image/png", "image/jpeg", "image/webp"];
export const sourceImageLimit = 10 * 1024 * 1024;
export const cardImageLimit = 150 * 1024;
export const defaultBackgroundTint = 55;
export const cardImageSlots = ["logo", "background", "stampLogo"] as const;
export type CardImageSlot = (typeof cardImageSlots)[number];

export const stampAnimations = {
  press: "Golpe de sello",
  ripple: "Onda",
  glint: "Destello",
  flip: "Giro",
  ink: "Tinta",
} as const;
export type StampAnimation = keyof typeof stampAnimations;
export const defaultStampAnimation: StampAnimation = "press";

export const palettes = [
  { name: "Terracota Sol", background: "#7d4420", accent: "#f4c27f", text: "#fff8f0" },
  { name: "Obsidiana Café", background: "#1d1b1a", accent: "#e2b86b", text: "#faf6f0" },
  { name: "Bosque Matcha", background: "#29463b", accent: "#b9e3c6", text: "#f4fbf6" },
  { name: "Cobalto Noche", background: "#1e3250", accent: "#93c5fd", text: "#f2f7ff" },
  { name: "Vino Reserva", background: "#5b2133", accent: "#f5b8c8", text: "#fff5f8" },
  { name: "Coral Cítrico", background: "#b8472f", accent: "#ffe1b5", text: "#fff9f4" },
  { name: "Arena Dorada", background: "#c9a66b", accent: "#2a1f14", text: "#23190f" },
  { name: "Ciruela Velada", background: "#3f2a56", accent: "#e2c2ff", text: "#faf5ff" },
];

export type CardDetails = {
  displayName: string;
  branch: string;
  totalStamps: number;
  rewards: { id?: string; stamps: number; name: string }[];
  colors: { background: string; accent: string; text: string; stampFill?: string };
  stampIcon: StampIcon;
  stamped?: { color?: string; fill?: string; icon?: StampIcon; animation?: StampAnimation };
  backgroundTint?: number;
};

export function stampFillColor({ background, accent, stampFill }: CardDetails["colors"]) {
  if (stampFill) return stampFill;

  const channels = [1, 3, 5].map((start) => {
    const base = Number.parseInt(background.slice(start, start + 2), 16);
    const highlight = Number.parseInt(accent.slice(start, start + 2), 16);
    return Math.round(base + (highlight - base) * 0.2).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

// Anything the owner leaves unset on a stamped stamp follows the card's own style.
export function stampedLook({ colors, stampIcon, stamped }: CardDetails) {
  return {
    color: stamped?.color ?? colors.accent,
    fill: stamped?.fill ?? stampFillColor(colors),
    icon: stamped?.icon ?? stampIcon,
    animation: stamped?.animation ?? defaultStampAnimation,
  };
}

export function defaultBusinessCard(displayName: string): CardDetails {
  const { background, accent, text } = palettes[0];
  return {
    displayName, branch: "", totalStamps: 12, rewards: [],
    colors: { background, accent, text }, stampIcon: "croissant",
  };
}

export function cardValidationError(card: CardDetails) {
  const name = card.displayName.trim();
  if (name.length < 2 || name.length > 100 || card.branch.trim().length > 100) {
    return "Revisa el nombre de la tarjeta y la sucursal. El nombre necesita al menos 2 caracteres.";
  }
  if (!Number.isInteger(card.totalStamps) || card.totalStamps < 1 || card.totalStamps > maxCardStamps) {
    return `Elige un total de 1 a ${maxCardStamps} sellos.`;
  }
  if (!Object.hasOwn(stampCatalog, card.stampIcon)) return "Elige un ícono de la biblioteca.";
  if (card.stamped?.icon && !Object.hasOwn(stampCatalog, card.stamped.icon)) {
    return "Elige un ícono para el sello aplicado.";
  }
  if (card.stamped?.animation && !Object.hasOwn(stampAnimations, card.stamped.animation)) {
    return "Elige una animación para el sello aplicado.";
  }
  const tint = card.backgroundTint ?? defaultBackgroundTint;
  if (!Number.isInteger(tint) || tint < 0 || tint > 100) return "Usa un tinte entre 0 y 100%.";
  const colors = [...Object.values(card.colors), card.stamped?.color, card.stamped?.fill];
  if (colors.some((color) => color !== undefined && !/^#[0-9a-f]{6}$/i.test(color))) {
    return "Elige colores válidos para la tarjeta y los sellos.";
  }
  const stamps = new Set<number>();
  if (card.rewards.length > card.totalStamps) return "Hay más premios que sellos disponibles.";
  for (const reward of card.rewards) {
    if (!Number.isInteger(reward.stamps) || reward.stamps < 1 || reward.stamps > card.totalStamps) {
      return `Cada premio necesita una meta entre 1 y ${card.totalStamps} sellos.`;
    }
    if (stamps.has(reward.stamps)) return "Usa una cantidad de sellos distinta para cada premio.";
    if (!reward.name.trim() || reward.name.trim().length > 100) return "Escribe un nombre para cada premio.";
    stamps.add(reward.stamps);
  }
  return null;
}
