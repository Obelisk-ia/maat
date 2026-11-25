import { ConvexError, v } from "convex/values";
import { cardProgress, restartsCard } from "../lib/card-progress";
import { parseMemberCode } from "../lib/member-code";
import { normalizePhone } from "../lib/registration";
import { sameStampDay } from "../lib/stamp-day";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { countToday } from "./dailyStats";
import { cardDesign, cardOf, restartsAfterFinalPrize } from "./organizations";
import { currentStamper, followedCard, latestRedemptions } from "./stamper";

async function lastStampTime(ctx: QueryCtx, membershipId: Id<"memberships">) {
  const latest = await ctx.db.query("stampEvents")
    .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
    .order("desc")
    .first();
  return latest?._creationTime ?? null;
}

/** Finds this business's cards by card code or by the customer's phone number. */
export const find = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const { organization } = await currentStamper(ctx);
    const code = parseMemberCode(term);
    const phone = code ? null : normalizePhone(term);
    if (!code && !phone) return { valid: false as const };

    let memberships: Doc<"memberships">[] = [];
    if (code) {
      const membership = await ctx.db.query("memberships").withIndex("by_code", (q) => q.eq("code", code)).unique();
      if (membership?.organizationId === organization._id && membership.leftAt === undefined) memberships = [membership];
    } else {
      // New signups can't share a number, but older accounts might, so staff see every match.
      const clients = await ctx.db.query("users")
        .withIndex("by_client_phone", (q) => q.eq("account.phone", phone!))
        .take(10);
      for (const client of clients) {
        const membership = await ctx.db.query("memberships")
          .withIndex("by_client_and_organization", (q) => q.eq("clientId", client._id).eq("organizationId", organization._id))
          .unique();
        if (membership && membership.leftAt === undefined) memberships.push(membership);
      }
    }

    return {
      valid: true as const,
      design: await cardDesign(ctx, organization),
      matches: await Promise.all(memberships.map(async (membership) => {
        const redeemedPrizes = membership.redeemedPrizes ?? [];
        const { goals, ready } = cardProgress(cardOf(organization), membership.stamps, redeemedPrizes);
        return {
          membershipId: membership._id,
          // Delivering a prize takes this code, so only a search that already had it gets it back.
          code: code ? membership.code : null,
          stamps: membership.stamps,
          redeemedPrizes,
          nextPrizeRestartsCard: ready.length > 0 &&
            restartsCard(goals, ready[0].id, restartsAfterFinalPrize(organization)),
          recentPrizes: (await latestRedemptions(ctx, membership._id, 3)).map((redemption) => ({
            id: redemption._id, name: redemption.prizeName, at: redemption._creationTime,
            deliveredBy: redemption.deliveredBy,
          })),
          lastStampAt: await lastStampTime(ctx, membership._id),
          customerName: (await ctx.db.get("users", membership.clientId))?.name ?? "Cliente",
        };
      })),
    };
  },
});

export const add = mutation({
  args: {
    membershipId: v.id("memberships"),
    // The count staff saw. A repeated tap or a second register can't add a stamp they didn't intend.
    expectedStamps: v.number(),
  },
  handler: async (ctx, { membershipId, expectedStamps }) => {
    const { staffId, organization } = await currentStamper(ctx);
    const membership = await followedCard(ctx, organization._id, membershipId);
    if (membership.stamps !== expectedStamps) {
      throw new ConvexError("La tarjeta cambió mientras la veías. Revisa los sellos antes de agregar otro.");
    }
    const total = cardOf(organization).totalStamps;
    if (membership.stamps >= total) throw new ConvexError("La tarjeta ya está completa.");
    // Checked inside the transaction, so two registers can't both give today's stamp.
    const last = await lastStampTime(ctx, membershipId);
    if (last !== null && sameStampDay(last, Date.now())) {
      throw new ConvexError("Este cliente ya recibió su sello de hoy. Puede ganar otro mañana.");
    }

    // Cards from before visit counting get their number from the stamp records.
    const visits = membership.visits ?? (await ctx.db.query("stampEvents")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .collect()).length;
    await ctx.db.patch("memberships", membershipId, {
      stamps: membership.stamps + 1, visits: visits + 1, lastVisitAt: Date.now(),
    });
    await ctx.db.insert("stampEvents", { membershipId, organizationId: organization._id, staffId });
    await countToday(ctx, organization._id, last === null ? { firstVisits: 1 } : { returnVisits: 1 });
    return { stamps: membership.stamps + 1 };
  },
});
