import { ConvexError } from "convex/values";
import { defaultBusinessCard } from "../lib/business-card";
import { mediaUrl } from "../lib/media-url";
import { withPrizeIds } from "../lib/prizes";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** The business's card design, or the starting one while the owner hasn't saved theirs. */
export function cardOf(organization: Doc<"organizations">) {
  return withPrizeIds(organization.card?.details ?? defaultBusinessCard(organization.name));
}

/** Whether delivering the last prize starts the customer on a new card. */
export const restartsAfterFinalPrize = (organization: Doc<"organizations">) =>
  organization.restartAfterFinalPrize ?? true;

/** What a customer may see of a business: its card design. Never the staff invite code. */
export async function cardDesign(_ctx: QueryCtx, organization: Doc<"organizations">) {
  const { card } = organization;
  return {
    organizationId: organization._id,
    businessName: organization.name,
    details: cardOf(organization),
    logoUrl: mediaUrl(card?.logoId),
    backgroundUrl: mediaUrl(card?.backgroundId),
    stampLogoUrl: mediaUrl(card?.stampLogoId),
    coverUrl: mediaUrl(card?.coverId),
  };
}

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
