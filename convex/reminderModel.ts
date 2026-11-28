import { v } from "convex/values";

const reminderType = v.union(v.literal("near"), v.literal("ready"), v.literal("inactive"));

export const reminderRule = v.object({
  id: v.string(),
  type: reminderType,
  // Used by "near": how many stamps short of a prize, at most.
  stamps: v.number(),
  // Days without a visit.
  days: v.number(),
  message: v.string(),
  enabled: v.boolean(),
  // Missing: sent once until the customer comes back.
  repeatEveryDays: v.optional(v.number()),
  // Missing on a repeating reminder: no limit.
  maxTimes: v.optional(v.number()),
});

export const audience = v.object({
  type: v.union(v.literal("all"), reminderType, v.literal("nearby")),
  stamps: v.number(),
  days: v.number(),
  radiusMeters: v.optional(v.number()),
});
