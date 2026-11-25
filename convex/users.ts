import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { withPrizeIds } from "../lib/prizes";
import { normalizePhone } from "../lib/registration";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";
import { findByInviteCode, formatInviteCode, generateInviteCode } from "./organizations";

export const createUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.string(),
    businessName: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100) {
      throw new ConvexError("Escribe un nombre de 2 a 100 caracteres.");
    }

    let account: Doc<"users">["account"];
    switch (args.role) {
      case "owner": {
        const businessName = args.businessName?.trim() ?? "";
        if (businessName.length < 2 || businessName.length > 100) {
          throw new ConvexError("Escribe un nombre de negocio de 2 a 100 caracteres.");
        }
        const organizationId = await ctx.db.insert("organizations", {
          name: businessName,
          inviteCode: await generateInviteCode(ctx),
        });
        account = { role: "owner", organizationId };
        break;
      }
      case "staff": {
        const inviteCode = formatInviteCode(args.inviteCode ?? "");
        const organization = inviteCode && await findByInviteCode(ctx, inviteCode);
        if (!organization) throw new ConvexError("El código de invitación no es válido.");
        account = { role: "staff", organizationId: organization._id };
        break;
      }
      case "client": {
        const phone = normalizePhone(args.phone ?? "");
        if (!phone) throw new ConvexError("Escribe un número de celular válido.");
        // Staff register visits by phone number, so each number belongs to one customer.
        if (await ctx.db.query("users").withIndex("by_client_phone", (q) => q.eq("account.phone", phone)).first()) {
          throw new ConvexError("Ese número de celular ya tiene una cuenta. Inicia sesión.");
        }
        account = { role: "client", phone };
        break;
      }
      default:
        throw new ConvexError("Selecciona un tipo de cuenta.");
    }

    return await ctx.db.insert("users", { name, email: args.email, account });
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    if (!user) return null;

    const { name, email, account } = user;
    if (account.role === "client") {
      return { name, email, role: account.role, phone: account.phone };
    }

    const organization = await ctx.db.get("organizations", account.organizationId);
    if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
    if (account.role === "staff") {
      return { name, email, role: account.role, businessName: organization.name };
    }
    return {
      name, email, role: account.role, businessName: organization.name,
      organizationId: organization._id,
      inviteCode: organization.inviteCode,
      card: organization.card ? withPrizeIds(organization.card.details) : null,
      logoUrl: organization.card?.logoId ? await ctx.storage.getUrl(organization.card.logoId) : null,
      backgroundUrl: organization.card?.backgroundId ? await ctx.storage.getUrl(organization.card.backgroundId) : null,
      stampLogoUrl: organization.card?.stampLogoId ? await ctx.storage.getUrl(organization.card.stampLogoId) : null,
    };
  },
});
