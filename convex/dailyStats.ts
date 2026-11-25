import { dayKey } from "../lib/stamp-day";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { DayTotals } from "../lib/dashboard-periods";

/**
 * Adds to a business's totals for today. Called in the same transaction as the signup, stamp or prize
 * it counts, so the dashboard can read a few hundred days instead of every stamp ever given.
 */
export async function countToday(ctx: MutationCtx, organizationId: Id<"organizations">, add: Partial<DayTotals>) {
  const day = dayKey(Date.now());
  const row = await ctx.db.query("dailyStats")
    .withIndex("by_organization_and_day", (q) => q.eq("organizationId", organizationId).eq("day", day))
    .unique();
  const totals = {
    newCustomers: (row?.newCustomers ?? 0) + (add.newCustomers ?? 0),
    firstVisits: (row?.firstVisits ?? 0) + (add.firstVisits ?? 0),
    returnVisits: (row?.returnVisits ?? 0) + (add.returnVisits ?? 0),
    rewards: (row?.rewards ?? 0) + (add.rewards ?? 0),
  };
  if (row) await ctx.db.patch("dailyStats", row._id, totals);
  else await ctx.db.insert("dailyStats", { organizationId, day, ...totals });
}
