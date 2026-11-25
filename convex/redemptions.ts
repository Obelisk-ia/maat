import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** A customer's most recent delivered prizes, newest first. */
export function latestRedemptions(ctx: QueryCtx, membershipId: Id<"memberships">, count: number) {
  return ctx.db.query("redemptions")
    .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
    .order("desc")
    .take(count);
}
