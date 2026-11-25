import { dayKey } from "../lib/stamp-day";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

/**
 * Rebuilds the dashboard's totals from the cards, stamp records and delivered prizes. Needed once for data created
 * before the dashboard. It recalculates everything, so running it again changes nothing.
 * It runs in one transaction, which suits a small database; a large one would need batches.
 *
 *   npx convex run migrations:rebuildDashboard
 */
export const rebuildDashboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    const totals = new Map<string, {
      organizationId: Id<"organizations">; day: string;
      newCustomers: number; firstVisits: number; returnVisits: number; rewards: number;
    }>();
    function on(organizationId: Id<"organizations">, time: number) {
      const day = dayKey(time);
      const key = `${organizationId}:${day}`;
      let row = totals.get(key);
      if (!row) {
        totals.set(key, row = { organizationId, day, newCustomers: 0, firstVisits: 0, returnVisits: 0, rewards: 0 });
      }
      return row;
    }

    const memberships = await ctx.db.query("memberships").collect();
    let stamps = 0;
    for (const membership of memberships) {
      const events = await ctx.db.query("stampEvents")
        .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
        .collect();
      stamps += events.length;
      on(membership.organizationId, membership._creationTime).newCustomers++;
      events.forEach((event, index) => {
        on(event.organizationId, event._creationTime)[index === 0 ? "firstVisits" : "returnVisits"]++;
      });
      await ctx.db.patch("memberships", membership._id, {
        visits: events.length, lastVisitAt: events.at(-1)?._creationTime,
      });
    }

    for (const redemption of await ctx.db.query("redemptions").collect()) {
      on(redemption.organizationId, redemption._creationTime).rewards++;
    }

    for (const row of await ctx.db.query("dailyStats").collect()) await ctx.db.delete("dailyStats", row._id);
    for (const row of totals.values()) await ctx.db.insert("dailyStats", row);
    return { cards: memberships.length, stamps, days: totals.size };
  },
});
