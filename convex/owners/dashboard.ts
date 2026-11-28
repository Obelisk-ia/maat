import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { cardProgress } from "../../lib/card-progress";
import { addDays, periodRange, sumDays } from "../../lib/dashboard-periods";
import { dayKey } from "../../lib/stamp-day";
import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { cardOf, isOrganizationActive } from "../organizations";

// Most cards read at once. Past this, the dashboard says its customer figures are partial.
const cardLimit = 5000;
const listLimit = 500;

/** The dashboard is the owner's alone: staff only register visits. */
async function ownedBusiness(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "owner") throw new ConvexError("Solo el dueño puede ver el dashboard.");
  const organization = await ctx.db.get("organizations", user.account.organizationId);
  if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
  if (!isOrganizationActive(organization)) {
    throw new ConvexError("Tu cuenta de negocio está desactivada.");
  }
  return { organization, card: cardOf(organization) };
}

/** Cards of customers who still follow the business, newest first. */
async function followedCards(ctx: QueryCtx, organization: Doc<"organizations">) {
  const memberships = await ctx.db.query("memberships")
    .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
    .order("desc")
    .take(cardLimit + 1);
  return {
    partial: memberships.length > cardLimit,
    followed: memberships.slice(0, cardLimit).filter((membership) => membership.leftAt === undefined),
  };
}

// Names and card codes only: the dashboard doesn't need customers' phones or emails.
async function customerRow(ctx: QueryCtx, membership: Doc<"memberships">) {
  return {
    membershipId: membership._id,
    name: (await ctx.db.get("users", membership.clientId))?.name ?? "Cliente",
    code: membership.code,
    stamps: membership.stamps,
    visits: membership.visits ?? 0,
    lastVisitAt: membership.lastVisitAt ?? null,
    redeemedPrizes: membership.redeemedPrizes ?? [],
    prizesRedeemed: membership.prizesRedeemed ?? 0,
    joinedAt: membership._creationTime,
  };
}

export const overview = query({
  args: {
    period: v.union(v.literal("30d"), v.literal("90d"), v.literal("year")),
    // The viewer sends the date, so results refresh when the day changes.
    today: v.string(),
  },
  handler: async (ctx, { period, today }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) throw new ConvexError("Fecha no válida.");
    const { organization, card } = await ownedBusiness(ctx);
    const { start, previousStart, buckets } = periodRange(period, today);

    // At most two years of days.
    const days = await ctx.db.query("dailyStats")
      .withIndex("by_organization_and_day", (q) =>
        q.eq("organizationId", organization._id).gte("day", previousStart).lte("day", today))
      .collect();

    const { followed, partial } = await followedCards(ctx, organization);
    const visitors = followed.filter((membership) => {
      if (membership.lastVisitAt === undefined) return false;
      const day = dayKey(membership.lastVisitAt);
      return day >= start && day <= today;
    });
    const progress = followed.map((membership) => ({
      membership, ...cardProgress(card, membership.stamps, membership.redeemedPrizes),
    }));
    // Deliveries from this period. The first filter is a few hours wide; the day decides.
    const redemptions = await ctx.db.query("redemptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organization._id).gte("_creationTime", Date.parse(`${start}T00:00:00Z`)))
      .order("desc")
      .take(cardLimit + 1);
    const delivered = redemptions.slice(0, cardLimit).filter((redemption) => {
      const day = dayKey(redemption._creationTime);
      return day >= start && day <= today;
    });
    const goals = cardProgress(card, 0).goals.map(({ id, stamps: goal, name }) => ({
      id, stamps: goal, name,
      // On their current card: enough stamps, or already redeemed.
      reached: progress.filter(({ stamps, goals }) =>
        stamps >= goal || goals.some((other) => other.id === id && other.redeemed)).length,
      ready: progress.filter(({ ready }) => ready.some((other) => other.id === id)).length,
      delivered: delivered.filter((redemption) => redemption.prizeId === id).length,
    }));

    // Customers with a prize reached first, then those fewest stamps away from one.
    const nearPrize = progress
      .filter(({ ready, next }) => ready.length > 0 || next)
      .sort((a, b) => Number(b.ready.length > 0) - Number(a.ready.length > 0) ||
        (a.remaining ?? 0) - (b.remaining ?? 0) ||
        (b.membership.lastVisitAt ?? 0) - (a.membership.lastVisitAt ?? 0))
      .slice(0, 6);

    return {
      period,
      current: sumDays(days, start, today),
      previous: sumDays(days, previousStart, addDays(start, -1)),
      joinedToday: sumDays(days, today, today).newCustomers,
      chart: buckets.map((bucket) => ({ ...bucket, ...sumDays(days, bucket.start, bucket.end) })),
      following: followed.length,
      visitors: visitors.length,
      // Visited in this period, and it wasn't their only visit ever.
      returned: visitors.filter((membership) => (membership.visits ?? 0) >= 2).length,
      withPrize: progress.filter(({ ready }) => ready.length > 0).length,
      goals,
      nearPrize: await Promise.all(nearPrize.map(({ membership }) => customerRow(ctx, membership))),
      card,
      partial: partial || redemptions.length > cardLimit,
    };
  },
});

export const customers = query({
  args: {},
  handler: async (ctx) => {
    const { organization, card } = await ownedBusiness(ctx);
    const { followed } = await followedCards(ctx, organization);
    return {
      card,
      total: followed.length,
      customers: await Promise.all(followed.slice(0, listLimit).map((membership) => customerRow(ctx, membership))),
    };
  },
});

/** The latest delivered prizes, with who handed each one over. */
export const deliveries = query({
  args: {},
  handler: async (ctx) => {
    const { organization } = await ownedBusiness(ctx);
    const latest = await ctx.db.query("redemptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .order("desc")
      .take(listLimit + 1);
    return {
      more: latest.length > listLimit,
      deliveries: await Promise.all(latest.slice(0, listLimit).map(async (redemption) => {
        const membership = await ctx.db.get("memberships", redemption.membershipId);
        const customer = membership && await ctx.db.get("users", membership.clientId);
        return {
          id: redemption._id,
          at: redemption._creationTime,
          customerName: customer?.name ?? "Cliente",
          code: membership?.code ?? null,
          prizeName: redemption.prizeName,
          prizeStamps: redemption.prizeStamps,
          deliveredBy: redemption.deliveredBy,
          deliveredByRole: redemption.deliveredByRole,
          restartedCard: redemption.restartedCard,
        };
      })),
    };
  },
});
