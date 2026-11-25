import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { cardImageLimit, cardImageSlots, cardValidationError, type CardImageSlot } from "../lib/business-card";
import { assignPrizeIds } from "../lib/prizes";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { cardDetails } from "./cardModel";

async function ownerOrganization(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get("users", userId);
  if (user?.account.role !== "owner") throw new ConvexError("Solo el dueño puede editar la tarjeta.");
  const organization = await ctx.db.get("organizations", user.account.organizationId);
  if (!organization) throw new ConvexError("No se encontró el negocio.");
  return organization;
}

export const assertOwner = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ownerOrganization(ctx, userId);
    return null;
  },
});

const storageChange = v.optional(v.union(v.id("_storage"), v.null()));
const imageChange = v.optional(v.union(v.bytes(), v.null()));

export const writeCard = internalMutation({
  args: {
    userId: v.id("users"),
    details: cardDetails,
    assets: v.object({ logo: storageChange, background: storageChange, stampLogo: storageChange }),
  },
  handler: async (ctx, { userId, details, assets }) => {
    const organization = await ownerOrganization(ctx, userId);
    const previousLogo = organization.card?.logoId;
    const previousBackground = organization.card?.backgroundId;
    const previousStampLogo = organization.card?.stampLogoId;
    const logoId = assets.logo === undefined ? previousLogo : assets.logo ?? undefined;
    const backgroundId = assets.background === undefined ? previousBackground : assets.background ?? undefined;
    const stampLogoId = assets.stampLogo === undefined ? previousStampLogo : assets.stampLogo ?? undefined;

    // Redeemed prizes are remembered by ID, so every saved prize needs one.
    const rewards = assignPrizeIds(details.rewards, organization.card?.details.rewards ?? []);
    await ctx.db.patch("organizations", organization._id, {
      card: {
        details: { ...details, rewards },
        ...(logoId ? { logoId } : {}),
        ...(backgroundId ? { backgroundId } : {}),
        ...(stampLogoId ? { stampLogoId } : {}),
      },
    });
    if (previousLogo && previousLogo !== logoId) await ctx.storage.delete(previousLogo);
    if (previousBackground && previousBackground !== backgroundId) await ctx.storage.delete(previousBackground);
    if (previousStampLogo && previousStampLogo !== stampLogoId) await ctx.storage.delete(previousStampLogo);
    return null;
  },
});

export const save = action({
  args: {
    details: cardDetails,
    assets: v.optional(v.object({ logo: imageChange, background: imageChange, stampLogo: imageChange })),
  },
  handler: async (ctx, { details, assets = {} }): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Inicia sesión para guardar la tarjeta.");
    const error = cardValidationError(details);
    if (error) throw new ConvexError(error);
    for (const slot of cardImageSlots) {
      const image = assets[slot];
      if (image && !isCompressedWebP(image)) {
        throw new ConvexError("Las imágenes de la tarjeta deben ser WebP de hasta 150 KB.");
      }
    }

    if (cardImageSlots.some((slot) => assets[slot])) await ctx.runQuery(internal.businessCards.assertOwner, { userId });
    const changes: Partial<Record<CardImageSlot, Id<"_storage"> | null>> = {};
    const uploads: Id<"_storage">[] = [];
    try {
      for (const slot of cardImageSlots) {
        const image = assets[slot];
        if (image === null) changes[slot] = null;
        if (image) {
          const id = await ctx.storage.store(new Blob([image], { type: "image/webp" }));
          uploads.push(id);
          changes[slot] = id;
        }
      }
      return await ctx.runMutation(internal.businessCards.writeCard, {
        userId,
        details: {
          ...details,
          displayName: details.displayName.trim(),
          branch: details.branch.trim(),
          rewards: details.rewards.map((reward) => ({ ...reward, name: reward.name.trim() }))
            .sort((a, b) => a.stamps - b.stamps),
        },
        assets: changes,
      });
    } catch (error) {
      await Promise.allSettled(uploads.map((id) => ctx.storage.delete(id)));
      throw error;
    }
  },
});

function isCompressedWebP(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20 || buffer.byteLength > cardImageLimit) return false;
  const bytes = new Uint8Array(buffer);
  return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(String.fromCharCode(...bytes.slice(12, 16))) &&
    new DataView(buffer).getUint32(4, true) === buffer.byteLength - 8;
}
