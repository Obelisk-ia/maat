import { v } from "convex/values";
import { query } from "../_generated/server";
import { cardDesign, isOrganizationActive } from "../organizations";

// Public: someone who just scanned a business's QR sees its card before signing up.
export const publicCard = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId("organizations", args.organizationId);
    const organization = organizationId && await ctx.db.get("organizations", organizationId);
    return organization && isOrganizationActive(organization) ? await cardDesign(ctx, organization) : null;
  },
});
