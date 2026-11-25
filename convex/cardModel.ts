import { v } from "convex/values";
import {
  stampAnimations, stampSounds, worldFonts, worldMoods, worldPatterns,
  type StampAnimation, type StampSound, type WorldFont, type WorldMood, type WorldPattern,
} from "../lib/business-card";
import { stampCatalog, type StampIcon } from "../lib/stamp-catalog";

const stampIcon = v.union(...(Object.keys(stampCatalog) as StampIcon[]).map((icon) => v.literal(icon)));
const worldMood = v.union(...(Object.keys(worldMoods) as WorldMood[]).map((mood) => v.literal(mood)));
const worldFont = v.union(...(Object.keys(worldFonts) as WorldFont[]).map((font) => v.literal(font)));
const worldPattern = v.union(...(Object.keys(worldPatterns) as WorldPattern[]).map((pattern) => v.literal(pattern)));
const stampSound = v.union(...(Object.keys(stampSounds) as StampSound[]).map((sound) => v.literal(sound)));

export const cardWorld = v.object({
  mood: v.optional(worldMood),
  font: v.optional(worldFont),
  pattern: v.optional(worldPattern),
  sound: v.optional(stampSound),
  haptics: v.optional(v.boolean()),
  celebratePrize: v.optional(v.boolean()),
  stampUnit: v.optional(v.object({
    singular: v.string(),
    plural: v.string(),
  })),
  tagline: v.optional(v.string()),
  welcomeMessage: v.optional(v.string()),
  board: v.optional(v.object({
    title: v.string(),
    body: v.optional(v.string()),
    badge: v.optional(v.string()),
  })),
  secretMenu: v.optional(v.array(v.object({
    id: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    minCompletedCards: v.optional(v.number()),
  }))),
  links: v.optional(v.object({
    menuUrl: v.optional(v.string()),
    mapsUrl: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    instagram: v.optional(v.string()),
    hours: v.optional(v.string()),
  })),
});

export const cardDetails = v.object({
  displayName: v.string(),
  branch: v.string(),
  totalStamps: v.number(),
  // Cards saved before prizes had IDs have none; see lib/prizes.
  rewards: v.array(v.object({ id: v.optional(v.string()), stamps: v.number(), name: v.string() })),
  colors: v.object({
    background: v.string(), accent: v.string(), text: v.string(),
    stampFill: v.optional(v.string()),
  }),
  stampIcon,
  stamped: v.optional(v.object({
    color: v.optional(v.string()),
    fill: v.optional(v.string()),
    icon: v.optional(stampIcon),
    animation: v.optional(v.union(...(Object.keys(stampAnimations) as StampAnimation[]).map((name) => v.literal(name)))),
  })),
  backgroundTint: v.optional(v.number()),
  world: v.optional(cardWorld),
});
