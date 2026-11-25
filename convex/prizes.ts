import { ConvexError, v } from "convex/values";
import { cardProgress, restartsCard } from "../lib/card-progress";
import { parseMemberCode } from "../lib/member-code";
import { mutation } from "./_generated/server";
import { countToday } from "./dailyStats";
import { cardOf, restartsAfterFinalPrize } from "./organizations";
import { currentStamper, followedCard } from "./stamper";

/** Hands over the next ready prize. It can't be undone. */
export const deliver = mutation({
  args: {
    membershipId: v.id("memberships"),
    // The prize staff saw. A repeated tap or a second register can't deliver another one.
    prizeId: v.string(),
    // Proof the customer is there: the code from their QR or card. A phone search doesn't give it.
    cardCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { staffId, staffName, role, organization } = await currentStamper(ctx);
    const membership = await followedCard(ctx, organization._id, args.membershipId);
    if (parseMemberCode(args.cardCode) !== membership.code) {
      throw new ConvexError("Para entregar un premio, escanea el QR del cliente o escribe el código de su tarjeta.");
    }
    const { goals, ready } = cardProgress(cardOf(organization), membership.stamps, membership.redeemedPrizes);
    const prize = ready[0];
    if (!prize || prize.id !== args.prizeId) {
      throw new ConvexError("El premio pendiente cambió. Revisa la tarjeta antes de entregar.");
    }

    const restartedCard = restartsCard(goals, prize.id, restartsAfterFinalPrize(organization));
    const completed = membership.completedCards ?? 0;
    await ctx.db.patch("memberships", membership._id, {
      prizesRedeemed: (membership.prizesRedeemed ?? 0) + 1,
      ...(restartedCard
        ? { stamps: 0, redeemedPrizes: [], completedCards: completed + 1 }
        : { redeemedPrizes: [...membership.redeemedPrizes ?? [], prize.id] }),
    });
    await ctx.db.insert("redemptions", {
      organizationId: organization._id, membershipId: membership._id, staffId,
      deliveredBy: staffName, deliveredByRole: role,
      prizeId: prize.id, prizeName: prize.name, prizeStamps: prize.stamps,
      round: completed + 1, restartedCard,
    });
    await countToday(ctx, organization._id, { rewards: 1 });
    return { restartedCard };
  },
});

/**
 * For a full card with nothing left to deliver: when the owner turned automatic restart off, or
 * edited the prizes so that none is pending. No prize is lost, so no card code is needed.
 */
export const startNewCard = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, { membershipId }) => {
    const { organization } = await currentStamper(ctx);
    const membership = await followedCard(ctx, organization._id, membershipId);
    const { total, stamps, ready } = cardProgress(cardOf(organization), membership.stamps, membership.redeemedPrizes);
    if (stamps < total) throw new ConvexError("La tarjeta todavía no está completa.");
    if (ready.length) throw new ConvexError("Entrega primero los premios pendientes.");
    await ctx.db.patch("memberships", membershipId, {
      stamps: 0, redeemedPrizes: [], completedCards: (membership.completedCards ?? 0) + 1,
    });
    return null;
  },
});
