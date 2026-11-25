import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { generateInviteCode, restartsAfterFinalPrize } from "../organizations";

async function ownerOrganizationId(ctx: QueryCtx, message: string) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "owner") throw new ConvexError(message);
  return user.account.organizationId;
}

export const rewardSettings = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await ownerOrganizationId(ctx, "Solo el dueño puede ver los ajustes.");
    const organization = await ctx.db.get("organizations", organizationId);
    if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
    return { restartAfterFinalPrize: restartsAfterFinalPrize(organization) };
  },
});

export const setRestartAfterFinalPrize = mutation({
  args: { restartAfterFinalPrize: v.boolean() },
  handler: async (ctx, { restartAfterFinalPrize }) => {
    const organizationId = await ownerOrganizationId(ctx, "Solo el dueño puede cambiar los ajustes.");
    await ctx.db.patch("organizations", organizationId, { restartAfterFinalPrize });
    return null;
  },
});

export const rotateInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && await ctx.db.get("users", userId);
    if (!user || user.account.role !== "owner") {
      throw new ConvexError("Solo el dueño puede renovar el código.");
    }
    const inviteCode = await generateInviteCode(ctx);
    await ctx.db.patch("organizations", user.account.organizationId, { inviteCode });
  },
});
