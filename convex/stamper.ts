import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Only a business's owner and staff may serve its customers, and only their own business's. */
export async function currentStamper(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role === "client") {
    throw new ConvexError("Solo el equipo del negocio puede registrar sellos.");
  }
  const organization = await ctx.db.get("organizations", user.account.organizationId);
  if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
  return { staffId: user._id, staffName: user.name, role: user.account.role, organization };
}

/** A card of this business that's still followed. */
export async function followedCard(ctx: QueryCtx, organizationId: Id<"organizations">, membershipId: Id<"memberships">) {
  const membership = await ctx.db.get("memberships", membershipId);
  if (!membership || membership.organizationId !== organizationId) {
    throw new ConvexError("Esa tarjeta no es de tu negocio.");
  }
  if (membership.leftAt !== undefined) throw new ConvexError("El cliente ya no sigue tu negocio.");
  return membership;
}

/** A customer's most recent delivered prizes, newest first. */
export function latestRedemptions(ctx: QueryCtx, membershipId: Id<"memberships">, count: number) {
  return ctx.db.query("redemptions")
    .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
    .order("desc")
    .take(count);
}
