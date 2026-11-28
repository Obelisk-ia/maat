import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { createResetCodeForUser } from "../account";
import { generateInviteCode, isOrganizationActive, restartsAfterFinalPrize } from "../organizations";

async function ownerOrganization(ctx: QueryCtx, message: string) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "owner") throw new ConvexError(message);
  const organization = await ctx.db.get("organizations", user.account.organizationId);
  if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
  if (!isOrganizationActive(organization)) {
    throw new ConvexError("Tu cuenta de negocio está desactivada.");
  }
  return organization;
}

export const rewardSettings = query({
  args: {},
  handler: async (ctx) => {
    const organization = await ownerOrganization(ctx, "Solo el dueño puede ver los ajustes.");
    return { restartAfterFinalPrize: restartsAfterFinalPrize(organization) };
  },
});

export const setRestartAfterFinalPrize = mutation({
  args: { restartAfterFinalPrize: v.boolean() },
  handler: async (ctx, { restartAfterFinalPrize }) => {
    const organization = await ownerOrganization(ctx, "Solo el dueño puede cambiar los ajustes.");
    await ctx.db.patch("organizations", organization._id, { restartAfterFinalPrize });
    return null;
  },
});

export const rotateInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const organization = await ownerOrganization(ctx, "Solo el dueño puede renovar el código.");
    const inviteCode = await generateInviteCode(ctx);
    await ctx.db.patch("organizations", organization._id, { inviteCode });
  },
});

/** Lists the business's staff members so the owner can issue one-time password reset codes. */
export const listTeamStaff = query({
  args: {},
  handler: async (ctx) => {
    const organization = await ownerOrganization(ctx, "Solo el dueño puede ver su equipo.");
    const members = await ctx.db.query("users")
      .withIndex("by_organization", (q) => q.eq("account.organizationId", organization._id))
      .collect();
    return members
      .filter((member) => member.account.role === "staff")
      .map((member) => ({
        id: member._id,
        name: member.name,
        email: member.email,
      }));
  },
});

/** Generates a 15-minute one-time 6-digit password reset code for a staff member of the owner's business. */
export const issueStaffResetCode = mutation({
  args: { staffId: v.id("users") },
  handler: async (ctx, { staffId }) => {
    const userId = await getAuthUserId(ctx);
    const organization = await ownerOrganization(ctx, "Solo el dueño puede generar códigos de recuperación.");
    const staff = await ctx.db.get("users", staffId);
    if (!staff || staff.account.role !== "staff" || staff.account.organizationId !== organization._id) {
      throw new ConvexError("Ese miembro no pertenece al staff de tu negocio.");
    }
    const { code, expiresAt } = await createResetCodeForUser(ctx, {
      userId: staff._id,
      source: "owner",
      issuedBy: userId ?? undefined,
    });
    return {
      code,
      expiresAt,
      name: staff.name,
      email: staff.email,
    };
  },
});
