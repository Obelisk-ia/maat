import { stampCatalog, type StampIcon } from "./stamp-catalog";

export const maxCardStamps = 100;
export const maxSecretMenuItems = 6;
export const cardImageTypes = ["image/png", "image/jpeg", "image/webp"];
export const sourceImageLimit = 10 * 1024 * 1024;
export const cardImageLimit = 150 * 1024;
export const defaultBackgroundTint = 55;
export const cardImageSlots = ["logo", "background", "stampLogo", "cover"] as const;
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

export const worldMoods = {
  tinted: {
    label: "Clásico Maat",
    description: "Luminoso con un tinte suave de tu color.",
  },
  nocturne: {
    label: "Nocturno",
    description: "Oscuro, íntimo y con reflejos de acento.",
  },
  editorial: {
    label: "Editorial",
    description: "Papel cálido, líneas finas y aire artesanal.",
  },
  vibrant: {
    label: "Vibrante",
    description: "Bloques inmersivos con toda la energía de tu marca.",
  },
  minimal: {
    label: "Minimal",
    description: "Sereno, limpio y con énfasis en el espacio.",
  },
} as const;
export type WorldMood = keyof typeof worldMoods;
export const defaultWorldMood: WorldMood = "tinted";

export const worldFonts = {
  modern: { label: "Moderna", description: "Geométrica y clara" },
  editorial: { label: "Editorial", description: "Serif cálida de cafetería" },
  classic: { label: "Clásica", description: "Elegante de restaurante" },
  specialty: { label: "Especialidad", description: "Técnica y contemporánea" },
  bold: { label: "Urbana", description: "Fuerte y expresiva" },
} as const;
export type WorldFont = keyof typeof worldFonts;
export const defaultWorldFont: WorldFont = "modern";

export const worldPatterns = {
  none: "Sin textura",
  grain: "Papel sutil",
  dots: "Puntos",
  stripes: "Líneas",
  glow: "Halo de luz",
} as const;
export type WorldPattern = keyof typeof worldPatterns;
export const defaultWorldPattern: WorldPattern = "none";

export const stampSounds = {
  none: "Sin sonido",
  stamp: "Golpe de sello",
  pop: "Pop festivo",
  chime: "Campanita",
} as const;
export type StampSound = keyof typeof stampSounds;
export const defaultStampSound: StampSound = "none";

export const stampUnitPresets = [
  { label: "Sellos", singular: "sello", plural: "sellos" },
  { label: "Tazas", singular: "taza", plural: "tazas" },
  { label: "Tacos", singular: "taco", plural: "tacos" },
  { label: "Visitas", singular: "visita", plural: "visitas" },
  { label: "Copas", singular: "copa", plural: "copas" },
  { label: "Cortes", singular: "corte", plural: "cortes" },
] as const;

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

export type WorldBoard = {
  title: string;
  body?: string;
  badge?: string;
};

export type WorldSecretItem = {
  id: string;
  title: string;
  description?: string;
  minCompletedCards?: number;
};

export type WorldLinks = {
  menuUrl?: string;
  mapsUrl?: string;
  whatsapp?: string;
  instagram?: string;
  hours?: string;
};

export type CardWorld = {
  mood?: WorldMood;
  font?: WorldFont;
  pattern?: WorldPattern;
  sound?: StampSound;
  haptics?: boolean;
  celebratePrize?: boolean;
  stampUnit?: { singular: string; plural: string };
  tagline?: string;
  welcomeMessage?: string;
  board?: WorldBoard;
  secretMenu?: WorldSecretItem[];
  links?: WorldLinks;
};

export type CardDetails = {
  displayName: string;
  branch: string;
  totalStamps: number;
  rewards: { id?: string; stamps: number; name: string }[];
  colors: { background: string; accent: string; text: string; stampFill?: string };
  stampIcon: StampIcon;
  stamped?: { color?: string; fill?: string; icon?: StampIcon; animation?: StampAnimation };
  backgroundTint?: number;
  world?: CardWorld;
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

export function stampUnitOf(card?: Pick<CardDetails, "world">) {
  const singular = card?.world?.stampUnit?.singular?.trim() || "sello";
  const plural = card?.world?.stampUnit?.plural?.trim() || "sellos";
  return { singular, plural };
}

export function stampWord(count: number, card?: Pick<CardDetails, "world">) {
  const unit = stampUnitOf(card);
  return count === 1 ? unit.singular : unit.plural;
}

export function worldLook(card: CardDetails) {
  const world = card.world;
  return {
    mood: world?.mood ?? defaultWorldMood,
    font: world?.font ?? defaultWorldFont,
    pattern: world?.pattern ?? defaultWorldPattern,
    sound: world?.sound ?? defaultStampSound,
    haptics: world?.haptics ?? true,
    celebratePrize: world?.celebratePrize ?? true,
    stampUnit: stampUnitOf(card),
    tagline: world?.tagline?.trim() ?? "",
    welcomeMessage: world?.welcomeMessage?.trim() ?? "",
    board: world?.board?.title.trim() ? {
      title: world.board.title.trim(),
      body: world.board.body?.trim() ?? "",
      badge: world.board.badge?.trim() ?? "",
    } : null,
    secretMenu: (world?.secretMenu ?? [])
      .filter((item) => item.title.trim().length > 0)
      .map((item) => ({
        id: item.id,
        title: item.title.trim(),
        description: item.description?.trim() ?? "",
        minCompletedCards: Math.max(0, Math.trunc(item.minCompletedCards ?? 0)),
      })),
    links: {
      menuUrl: world?.links?.menuUrl?.trim() ?? "",
      mapsUrl: world?.links?.mapsUrl?.trim() ?? "",
      whatsapp: world?.links?.whatsapp?.trim() ?? "",
      instagram: world?.links?.instagram?.trim() ?? "",
      hours: world?.links?.hours?.trim() ?? "",
    },
  };
}

export function formatWelcomeMessage(template: string, customerName: string) {
  const firstName = customerName.trim().split(/\s+/)[0] || "amigo";
  return template.replace(/\{nombre\}/gi, firstName);
}

export function normalizeExternalUrl(raw?: string) {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function formatWhatsappHref(raw?: string) {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return normalizeExternalUrl(value);
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  // Local 10-digit Mexican numbers get +52 automatically.
  const phone = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${phone}`;
}

export function formatInstagramHref(raw?: string) {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return normalizeExternalUrl(value);
  const handle = value.replace(/^@+/, "").replace(/^instagram\.com\//i, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9._]{1,30}$/i.test(handle)) return null;
  return `https://instagram.com/${handle}`;
}

export function sanitizeWorldForSave(world?: CardWorld): CardWorld | undefined {
  if (!world) return undefined;
  const cleaned: CardWorld = {};
  if (world.mood && world.mood !== defaultWorldMood) cleaned.mood = world.mood;
  if (world.font && world.font !== defaultWorldFont) cleaned.font = world.font;
  if (world.pattern && world.pattern !== defaultWorldPattern) cleaned.pattern = world.pattern;
  if (world.sound && world.sound !== defaultStampSound) cleaned.sound = world.sound;
  if (world.haptics === false) cleaned.haptics = false;
  if (world.celebratePrize === false) cleaned.celebratePrize = false;

  const singular = world.stampUnit?.singular.trim();
  const plural = world.stampUnit?.plural.trim();
  if (singular && plural && (singular.toLowerCase() !== "sello" || plural.toLowerCase() !== "sellos")) {
    cleaned.stampUnit = { singular, plural };
  }

  const tagline = world.tagline?.trim();
  if (tagline) cleaned.tagline = tagline;
  const welcomeMessage = world.welcomeMessage?.trim();
  if (welcomeMessage) cleaned.welcomeMessage = welcomeMessage;

  const boardTitle = world.board?.title.trim();
  if (boardTitle) {
    const boardBody = world.board?.body?.trim();
    const boardBadge = world.board?.badge?.trim();
    cleaned.board = {
      title: boardTitle,
      ...(boardBody ? { body: boardBody } : {}),
      ...(boardBadge ? { badge: boardBadge } : {}),
    };
  }

  const secretMenu = (world.secretMenu ?? [])
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      description: item.description?.trim(),
      minCompletedCards: item.minCompletedCards && item.minCompletedCards > 0 ? Math.trunc(item.minCompletedCards) : undefined,
    }))
    .filter((item) => item.title.length > 0)
    .map(({ id, title, description, minCompletedCards }) => ({
      id,
      title,
      ...(description ? { description } : {}),
      ...(minCompletedCards ? { minCompletedCards } : {}),
    }));
  if (secretMenu.length > 0) cleaned.secretMenu = secretMenu;

  if (world.links) {
    const menuUrl = world.links.menuUrl?.trim();
    const mapsUrl = world.links.mapsUrl?.trim();
    const whatsapp = world.links.whatsapp?.trim();
    const instagram = world.links.instagram?.trim();
    const hours = world.links.hours?.trim();
    const links: WorldLinks = {
      ...(menuUrl ? { menuUrl } : {}),
      ...(mapsUrl ? { mapsUrl } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(instagram ? { instagram } : {}),
      ...(hours ? { hours } : {}),
    };
    if (Object.keys(links).length > 0) cleaned.links = links;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
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

  const world = card.world;
  if (world) {
    if (world.mood && !Object.hasOwn(worldMoods, world.mood)) return "Elige una atmósfera válida.";
    if (world.font && !Object.hasOwn(worldFonts, world.font)) return "Elige una tipografía válida.";
    if (world.pattern && !Object.hasOwn(worldPatterns, world.pattern)) return "Elige una textura válida.";
    if (world.sound && !Object.hasOwn(stampSounds, world.sound)) return "Elige un sonido válido.";
    if (world.stampUnit) {
      const singular = world.stampUnit.singular.trim();
      const plural = world.stampUnit.plural.trim();
      if ((singular && !plural) || (!singular && plural)) {
        return "Escribe tanto el singular como el plural del nombre de tus sellos.";
      }
      if (singular.length > 24 || plural.length > 24) {
        return "El nombre de tus sellos debe tener máximo 24 caracteres.";
      }
    }
    if ((world.tagline?.trim().length ?? 0) > 100) return "La frase del negocio debe tener máximo 100 caracteres.";
    if ((world.welcomeMessage?.trim().length ?? 0) > 140) return "El mensaje de bienvenida debe tener máximo 140 caracteres.";
    if (world.board) {
      const hasBodyOrBadge = Boolean(world.board.body?.trim() || world.board.badge?.trim());
      if (hasBodyOrBadge && !world.board.title.trim()) {
        return "Escribe un título para tu pizarrón del día.";
      }
      if (world.board.title.trim().length > 80) return "El título del pizarrón debe tener máximo 80 caracteres.";
      if ((world.board.body?.trim().length ?? 0) > 220) return "La descripción del pizarrón debe tener máximo 220 caracteres.";
      if ((world.board.badge?.trim().length ?? 0) > 24) return "La etiqueta del pizarrón debe tener máximo 24 caracteres.";
    }
    if (world.secretMenu) {
      if (world.secretMenu.length > maxSecretMenuItems) {
        return `Puedes agregar hasta ${maxSecretMenuItems} exclusivos en el menú secreto.`;
      }
      for (const item of world.secretMenu) {
        if (!item.title.trim() || item.title.trim().length > 80) {
          return "Cada ítem del menú secreto necesita un nombre de máximo 80 caracteres.";
        }
        if ((item.description?.trim().length ?? 0) > 160) {
          return "La descripción del menú secreto debe tener máximo 160 caracteres.";
        }
        const min = item.minCompletedCards ?? 0;
        if (!Number.isInteger(min) || min < 0 || min > 50) {
          return "El requisito de tarjetas completadas debe estar entre 0 y 50.";
        }
      }
    }
    if (world.links) {
      if (world.links.menuUrl?.trim() && !normalizeExternalUrl(world.links.menuUrl)) {
        return "Escribe un enlace válido para tu menú (ej. https://...).";
      }
      if (world.links.mapsUrl?.trim() && !normalizeExternalUrl(world.links.mapsUrl)) {
        return "Escribe un enlace válido de Google Maps.";
      }
      if (world.links.whatsapp?.trim() && !formatWhatsappHref(world.links.whatsapp)) {
        return "Escribe un número de WhatsApp válido (10 a 15 dígitos) o un enlace.";
      }
      if (world.links.instagram?.trim() && !formatInstagramHref(world.links.instagram)) {
        return "Escribe un usuario de Instagram válido (ej. @tunegocio) o enlace.";
      }
      if ((world.links.hours?.trim().length ?? 0) > 100) {
        return "Los horarios deben tener máximo 100 caracteres.";
      }
    }
  }
  return null;
}
