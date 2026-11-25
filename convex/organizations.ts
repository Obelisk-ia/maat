import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { defaultBusinessCard } from "../lib/business-card";
import { withPrizeIds } from "../lib/prizes";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

/** The business's card design, or the starting one while the owner hasn't saved theirs. */
export function cardOf(organization: Doc<"organizations">) {
  return withPrizeIds(organization.card?.details ?? defaultBusinessCard(organization.name));
}

/** Whether delivering the last prize starts the customer on a new card. */
export const restartsAfterFinalPrize = (organization: Doc<"organizations">) =>
  organization.restartAfterFinalPrize ?? true;

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

/** What a customer may see of a business: its card design. Never the staff invite code. */
export async function cardDesign(ctx: QueryCtx, organization: Doc<"organizations">) {
  const url = (id: Id<"_storage"> | undefined) => id ? ctx.storage.getUrl(id) : null;
  const { card } = organization;
  return {
    organizationId: organization._id,
    businessName: organization.name,
    details: cardOf(organization),
    logoUrl: await url(card?.logoId),
    backgroundUrl: await url(card?.backgroundId),
    stampLogoUrl: await url(card?.stampLogoId),
  };
}

// Public: someone who just scanned a business's QR sees its card before signing up.
export const publicCard = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId("organizations", args.organizationId);
    const organization = organizationId && await ctx.db.get("organizations", organizationId);
    return organization ? await cardDesign(ctx, organization) : null;
  },
});

export function findByInviteCode(ctx: MutationCtx, inviteCode: string) {
  return ctx.db.query("organizations")
    .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
    .unique();
}

export async function generateInviteCode(ctx: MutationCtx) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const code = formatInviteCode(hex)!;
  if (await findByInviteCode(ctx, code)) {
    throw new ConvexError("Vuelve a intentar generar el código.");
  }
  return code;
}

export function formatInviteCode(input: string) {
  const hex = input.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[0-9A-F]{32}$/.test(hex)) return null;
  return hex.match(/.{4}/g)!.join("-");
}

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
