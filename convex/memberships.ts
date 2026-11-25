import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { randomMemberCode } from "../lib/member-code";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { countToday } from "./dailyStats";
import { cardDesign } from "./organizations";
import { latestRedemptions } from "./stamper";

async function currentClient(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "client") {
    throw new ConvexError("Entra con una cuenta de cliente para usar tus tarjetas.");
  }
  return user;
}

/** The signed-in customer's cards, newest first, each with its business's current design. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentClient(ctx);
    const memberships = await ctx.db.query("memberships")
      .withIndex("by_client_and_organization", (q) => q.eq("clientId", user._id))
      .collect();
    const followed = memberships.filter((membership) => membership.leftAt === undefined);
    const cards = await Promise.all(followed.map(async (membership) => {
      const organization = await ctx.db.get("organizations", membership.organizationId);
      if (!organization) return null;
      return {
        membershipId: membership._id,
        code: membership.code,
        stamps: membership.stamps,
        joinedAt: membership._creationTime,
        redeemedPrizes: membership.redeemedPrizes ?? [],
        completedCards: membership.completedCards ?? 0,
        history: (await latestRedemptions(ctx, membership._id, 20)).map((redemption) => ({
          id: redemption._id,
          prizeId: redemption.prizeId,
          prizeName: redemption.prizeName,
          round: redemption.round,
          restartedCard: redemption.restartedCard,
          at: redemption._creationTime,
          // Customers see only the first name of whoever served them.
          deliveredBy: redemption.deliveredBy.split(/\s+/)[0],
        })),
        ...await cardDesign(ctx, organization),
      };
    }));
    return cards.filter((card) => card !== null).sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

/** Adds a business's card to the signed-in customer. Scanning the same QR again changes nothing. */
export const join = mutation({
  // The ID comes from a QR or the address bar, so it arrives as untrusted text.
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const user = await currentClient(ctx);
    const organizationId = ctx.db.normalizeId("organizations", args.organizationId);
    if (!organizationId || !await ctx.db.get("organizations", organizationId)) {
      throw new ConvexError("Este código QR no corresponde a un negocio en Maat.");
    }

    // Convex mutations are transactions, so two quick scans can't create two cards.
    const existing = await ctx.db.query("memberships")
      .withIndex("by_client_and_organization", (q) => q.eq("clientId", user._id).eq("organizationId", organizationId))
      .unique();
    if (existing) {
      const restored = existing.leftAt !== undefined;
      if (restored) await ctx.db.patch("memberships", existing._id, { leftAt: undefined });
      return { membershipId: existing._id, added: false, restored };
    }

    const code = randomMemberCode();
    if (await ctx.db.query("memberships").withIndex("by_code", (q) => q.eq("code", code)).unique()) {
      throw new ConvexError("No pudimos crear tu tarjeta. Intenta de nuevo.");
    }
    const membershipId = await ctx.db.insert("memberships", {
      clientId: user._id, organizationId, code, stamps: 0, visits: 0,
    });
    await countToday(ctx, organizationId, { newCustomers: 1 });
    return { membershipId, added: true, restored: false };
  },
});

/** Stops following a business: its card leaves the wallet, and the business can't find or stamp it. */
export const leave = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const user = await currentClient(ctx);
    const membership = await ctx.db.get("memberships", membershipId);
    if (!membership || membership.clientId !== user._id) throw new ConvexError("Esa tarjeta no es tuya.");
    if (membership.leftAt === undefined) await ctx.db.patch("memberships", membershipId, { leftAt: Date.now() });
    return null;
  },
});
