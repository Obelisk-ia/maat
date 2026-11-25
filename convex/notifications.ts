import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";

/** The public half of the server's key pair, which a browser needs to subscribe. */
export const config = query({
  args: {},
  handler: async () => ({
    publicKey: process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
      ? process.env.VAPID_PUBLIC_KEY : null,
  }),
});

export async function isMuted(ctx: QueryCtx, membershipId: Id<"memberships">) {
  return await ctx.db.query("mutedCards")
    .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
    .first() !== null;
}

/** Where a notification goes, checked at the moment of sending: either switch may have changed. */
export const device = internalQuery({
  args: { subscriptionId: v.id("pushSubscriptions"), membershipId: v.optional(v.id("memberships")) },
  handler: async (ctx, { subscriptionId, membershipId }) => {
    if (membershipId && await isMuted(ctx, membershipId)) return null;
    return ctx.db.get("pushSubscriptions", subscriptionId);
  },
});

export const recordResult = internalMutation({
  args: {
    subscriptionId: v.id("pushSubscriptions"), logId: v.optional(v.id("notificationLog")),
    ok: v.boolean(), status: v.optional(v.number()),
  },
  handler: async (ctx, { subscriptionId, logId, ok, status }) => {
    const entry = logId && await ctx.db.get("notificationLog", logId);
    if (entry) {
      const failures = entry.failures + (ok ? 0 : 1);
      // One phone taking it is enough; it failed only once every phone has failed.
      const accepted = ok || entry.accepted === true ? true : failures >= entry.devices ? false : undefined;
      await ctx.db.patch("notificationLog", entry._id, { failures, accepted });
    }
    if (!await ctx.db.get("pushSubscriptions", subscriptionId)) return null;
    // The push service says the device is gone: the app was removed or permission withdrawn.
    if (status === 404 || status === 410) await ctx.db.delete("pushSubscriptions", subscriptionId);
    else await ctx.db.patch("pushSubscriptions", subscriptionId, { lastResult: { at: Date.now(), ok, status } });
    return null;
  },
});
