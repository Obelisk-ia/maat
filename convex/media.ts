import { v } from "convex/values";
import { cardImageLimit } from "../lib/business-card";
import { query } from "./_generated/server";

/**
 * Resolves a validated card-image storage ID to its temporary Convex storage URL.
 * Only compressed card images stored under the image size cap are exposed.
 */
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const id = ctx.db.system.normalizeId("_storage", storageId);
    if (!id) return null;

    const meta = await ctx.db.system.get(id);
    if (!meta || meta.size > cardImageLimit) return null;
    if (!meta.contentType || !meta.contentType.startsWith("image/")) return null;

    const url = await ctx.storage.getUrl(id);
    if (!url) return null;
    return { url, contentType: meta.contentType };
  },
});
