import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { maximumPasswordLength, minimumPasswordLength } from "../lib/registration";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { createResetCodeForUser } from "./account";
import { isOrganizationActive } from "./organizations";

const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

async function requireAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "admin") {
    throw new ConvexError("Solo un administrador puede hacer esto.");
  }
  return user;
}

export const emailExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
    return existing !== null;
  },
});

/**
 * Creates a platform admin account. Only callable from the Convex CLI or dashboard — never from clients.
 *
 *   npx convex run admin:createAdmin '{"name":"Tu Nombre","email":"admin@ejemplo.mx","password":"tu-password-seguro"}'
 */
export const createAdmin = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ userId: Id<"users">; email: string; name: string }> => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100) {
      throw new ConvexError("Escribe un nombre de 2 a 100 caracteres.");
    }
    const email = args.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Escribe un correo electrónico válido.");
    }
    if (args.password.length < minimumPasswordLength || args.password.length > maximumPasswordLength) {
      throw new ConvexError(`Usa entre ${minimumPasswordLength} y ${maximumPasswordLength} caracteres para la contraseña.`);
    }
    if (await ctx.runQuery(internal.admin.emailExists, { email })) {
      throw new ConvexError("Ese correo ya tiene una cuenta.");
    }

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: {
        email,
        name,
        account: { role: "admin" },
      },
    });
    return { userId: user._id as Id<"users">, email, name };
  },
});

/** Lists every business with its owner, active status, staff count and active customer count. */
export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const organizations = await ctx.db.query("organizations").order("desc").collect();
    return await Promise.all(organizations.map(async (organization) => {
      const members = await ctx.db.query("users")
        .withIndex("by_organization", (q) => q.eq("account.organizationId", organization._id))
        .collect();
      const owner = members.find((member) => member.account.role === "owner") ?? null;
      const staffCount = members.filter((member) => member.account.role === "staff").length;
      const memberships = await ctx.db.query("memberships")
        .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
        .collect();
      const customerCount = memberships.filter((membership) => membership.leftAt === undefined).length;
      return {
        organizationId: organization._id,
        businessName: organization.name,
        active: isOrganizationActive(organization),
        createdAt: organization._creationTime,
        ownerName: owner?.name ?? null,
        ownerEmail: owner?.email ?? null,
        staffCount,
        customerCount,
        lastPaidAt: organization.lastPaidAt ?? null,
        nextPaymentDueAt: organization.nextPaymentDueAt ?? null,
        paymentCount: organization.paymentCount ?? 0,
      };
    }));
  },
});

export const setOrganizationActive = mutation({
  args: {
    organizationId: v.id("organizations"),
    active: v.boolean(),
  },
  handler: async (ctx, { organizationId, active }) => {
    await requireAdmin(ctx);
    const organization = await ctx.db.get("organizations", organizationId);
    if (!organization) {
      throw new ConvexError("No se encontró ese negocio.");
    }
    await ctx.db.patch("organizations", organizationId, { active });
    return { organizationId, active };
  },
});

/** Records the first or next monthly payment for a business and schedules the next due date (+30 days). */
export const recordPayment = mutation({
  args: {
    organizationId: v.id("organizations"),
    paidAt: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, paidAt, note }) => {
    const admin = await requireAdmin(ctx);
    const organization = await ctx.db.get("organizations", organizationId);
    if (!organization) {
      throw new ConvexError("No se encontró ese negocio.");
    }
    const effectivePaidAt = paidAt ?? Date.now();
    if (!Number.isFinite(effectivePaidAt) || effectivePaidAt <= 0) {
      throw new ConvexError("La fecha de pago no es válida.");
    }
    const trimmedNote = note?.trim();
    if (trimmedNote && trimmedNote.length > 200) {
      throw new ConvexError("La nota puede tener máximo 200 caracteres.");
    }

    // First payment starts a 30-day cycle from paidAt; confirming early preserves the cycle anchor,
    // while confirming after the due date starts a fresh 30-day window from the payment date.
    const baseTime =
      organization.nextPaymentDueAt !== undefined
        ? Math.max(effectivePaidAt, organization.nextPaymentDueAt)
        : effectivePaidAt;
    const nextDueAt = baseTime + BILLING_CYCLE_MS;
    const paymentCount = (organization.paymentCount ?? 0) + 1;

    await ctx.db.insert("organizationPayments", {
      organizationId,
      recordedBy: admin._id,
      paidAt: effectivePaidAt,
      nextDueAt,
      ...(trimmedNote ? { note: trimmedNote } : {}),
    });

    await ctx.db.patch("organizations", organizationId, {
      lastPaidAt: effectivePaidAt,
      nextPaymentDueAt: nextDueAt,
      paymentCount,
    });

    return { organizationId, paidAt: effectivePaidAt, nextDueAt, paymentCount };
  },
});

/** Lists recent confirmed payments for one business (admin only). */
export const listOrganizationPayments = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireAdmin(ctx);
    const payments = await ctx.db.query("organizationPayments")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(12);
    return payments.map((payment) => ({
      id: payment._id,
      paidAt: payment.paidAt,
      nextDueAt: payment.nextDueAt,
      note: payment.note ?? null,
    }));
  },
});

/** Generates a 15-minute one-time 6-digit password reset code for any user by email (admin only). */
export const issueResetCode = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email: rawEmail }) => {
    const admin = await requireAdmin(ctx);
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Escribe un correo electrónico válido.");
    }
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
    if (!user) {
      throw new ConvexError("No encontramos ninguna cuenta con ese correo.");
    }
    const { code, expiresAt } = await createResetCodeForUser(ctx, {
      userId: user._id,
      source: "admin",
      issuedBy: admin._id,
    });
    return {
      code,
      expiresAt,
      name: user.name,
      email: user.email,
      role: user.account.role,
    };
  },
});
