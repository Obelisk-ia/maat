import { v } from "convex/values";
import { stampAnimations, type StampAnimation } from "../lib/business-card";
import { stampCatalog, type StampIcon } from "../lib/stamp-catalog";

const stampIcon = v.union(...(Object.keys(stampCatalog) as StampIcon[]).map((icon) => v.literal(icon)));

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
});
