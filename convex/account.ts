import {
  getAuthSessionId, getAuthUserId, invalidateSessions, modifyAccountCredentials, retrieveAccount,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { maximumPasswordLength, minimumPasswordLength, normalizePhone } from "../lib/registration";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { currentClient } from "./clients/currentClient";

export const RESET_CODE_TTL_MS = 15 * 60_000;
const PUSH_REQUEST_COOLDOWN_MS = 60_000;
const MAX_RESET_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 6;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRecoveryCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSixDigitCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

function generateBackupCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) {
    raw += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

/** Shared helper for admin, owner->staff, and push OTP code issuance. Stores only a SHA-256 hash. */
export async function createResetCodeForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    source: "push" | "admin" | "owner";
    issuedBy?: Id<"users">;
  },
) {
  const now = Date.now();
  const existing = await ctx.db.query("passwordResetCodes")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  for (const row of existing) {
    if (row.source === args.source && row.usedAt === undefined) {
      await ctx.db.patch("passwordResetCodes", row._id, { usedAt: now });
    }
  }
  const code = generateSixDigitCode();
  const codeHash = await sha256Hex(normalizeRecoveryCode(code));
  const expiresAt = now + RESET_CODE_TTL_MS;
  await ctx.db.insert("passwordResetCodes", {
    userId: args.userId,
    codeHash,
    source: args.source,
    ...(args.issuedBy ? { issuedBy: args.issuedBy } : {}),
    expiresAt,
    attempts: 0,
  });
  return { code, expiresAt };
}

export const viewerEmail = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    return user ? user.email : null;
  },
});

/** Lets any signed-in user (client, staff, owner, or admin) change their password. */
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Inicia sesión para cambiar tu contraseña.");
    }
    if (!currentPassword) {
      throw new ConvexError("Escribe tu contraseña actual.");
    }
    if (newPassword.length < minimumPasswordLength || newPassword.length > maximumPasswordLength) {
      throw new ConvexError(`Usa entre ${minimumPasswordLength} y ${maximumPasswordLength} caracteres para la nueva contraseña.`);
    }
    if (newPassword === currentPassword) {
      throw new ConvexError("La nueva contraseña debe ser diferente a la actual.");
    }

    const email = await ctx.runQuery(internal.account.viewerEmail, { userId });
    if (!email) {
      throw new ConvexError("No encontramos tu cuenta.");
    }

    try {
      const verified = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: currentPassword },
      });
      if (!verified) {
        throw new ConvexError("Tu contraseña actual es incorrecta.");
      }
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      throw new ConvexError("Tu contraseña actual es incorrecta.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });

    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, {
      userId,
      except: sessionId ? [sessionId] : [],
    });

    return null;
  },
});

/** Lets a signed-in client update their phone number (unique across all clients). */
export const updateClientPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const user = await currentClient(ctx);
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      throw new ConvexError("Escribe un número válido de 10 dígitos o incluye el prefijo internacional.");
    }
    if (user.account.role === "client" && user.account.phone === phone) {
      return { phone };
    }
    const existing = await ctx.db.query("users")
      .withIndex("by_client_phone", (q) => q.eq("account.phone", phone))
      .first();
    if (existing && existing._id !== user._id) {
      throw new ConvexError("Ese número de celular ya está registrado en otra cuenta.");
    }
    await ctx.db.patch("users", user._id, {
      account: { role: "client", phone },
    });
    return { phone };
  },
});

/** How many unused backup recovery codes the signed-in user has left. */
export const recoveryCodeStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db.query("recoveryCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const remaining = rows.filter((row) => row.usedAt === undefined).length;
    return { remaining, total: rows.length };
  },
});

/** Generates 6 fresh single-use backup recovery codes and returns them once for PDF download. */
export const generateRecoveryCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Inicia sesión para generar tus códigos de respaldo.");
    const user = await ctx.db.get("users", userId);
    if (!user) throw new ConvexError("No encontramos tu cuenta.");

    const existing = await ctx.db.query("recoveryCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete("recoveryCodes", row._id);
    }

    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const code = generateBackupCode();
      codes.push(code);
      await ctx.db.insert("recoveryCodes", {
        userId,
        codeHash: await sha256Hex(normalizeRecoveryCode(code)),
      });
    }

    return {
      codes,
      name: user.name,
      email: user.email,
      role: user.account.role,
      generatedAt: Date.now(),
    };
  },
});

/**
 * Sends a 6-digit password reset code via Web Push to a client's registered device(s).
 * Requires the client to have push notifications enabled on their phone.
 */
export const requestPushResetCode = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email: rawEmail }) => {
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Escribe un correo electrónico válido.");
    }
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
    if (!user || user.account.role !== "client") {
      return { sent: false as const, reason: "no-push" as const };
    }
    const devices = await ctx.db.query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(10);
    if (devices.length === 0) {
      return { sent: false as const, reason: "no-push" as const };
    }
    if (!process.env.VAPID_PRIVATE_KEY) {
      return { sent: false as const, reason: "unavailable" as const };
    }

    const now = Date.now();
    const recent = await ctx.db.query("passwordResetCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const tooSoon = recent.some(
      (row) => row.source === "push" && row.usedAt === undefined && now - row._creationTime < PUSH_REQUEST_COOLDOWN_MS,
    );
    if (tooSoon) {
      throw new ConvexError("Espera un minuto antes de pedir otro código.");
    }

    const { code } = await createResetCodeForUser(ctx, { userId: user._id, source: "push" });
    for (const device of devices) {
      await ctx.scheduler.runAfter(0, internal.pushSender.deliver, {
        subscriptionId: device._id,
        message: {
          title: "Maat · Recuperar contraseña",
          body: `Tu código de recuperación es ${code}. Vence en 15 minutos.`,
          url: "/clientes?tab=login",
          tag: "maat-password-reset",
        },
        ttlSeconds: 900,
      });
    }
    return { sent: true as const, devices: devices.length };
  },
});

export const consumeResetCode = internalMutation({
  args: { email: v.string(), codeHash: v.string() },
  handler: async (ctx, { email, codeHash }): Promise<{ ok: true; userId: Id<"users"> } | { ok: false }> => {
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
    if (!user) return { ok: false };
    const now = Date.now();

    // 1. Check active short-lived reset codes (push, admin, owner->staff).
    const resetRows = await ctx.db.query("passwordResetCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeResetRows = resetRows.filter(
      (row) => row.usedAt === undefined && row.expiresAt > now && row.attempts < MAX_RESET_ATTEMPTS,
    );
    const matchedReset = activeResetRows.find((row) => row.codeHash === codeHash);
    if (matchedReset) {
      await ctx.db.patch("passwordResetCodes", matchedReset._id, { usedAt: now });
      return { ok: true, userId: user._id };
    }

    // 2. Check unused backup recovery codes (from the user's recovery PDF).
    const backupRows = await ctx.db.query("recoveryCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const matchedBackup = backupRows.find((row) => row.usedAt === undefined && row.codeHash === codeHash);
    if (matchedBackup) {
      await ctx.db.patch("recoveryCodes", matchedBackup._id, { usedAt: now });
      return { ok: true, userId: user._id };
    }

    // Failed attempt: increment attempt counter on active short-lived reset codes to prevent brute force.
    for (const row of activeResetRows) {
      await ctx.db.patch("passwordResetCodes", row._id, { attempts: row.attempts + 1 });
    }
    return { ok: false };
  },
});

/**
 * Resets a user's password using ANY valid code:
 * - A 6-digit Push notification OTP
 * - A 6-digit Admin or Owner-issued one-time code
 * - An 8-character Backup recovery code from their recovery PDF
 */
export const resetPasswordWithCode = action({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email: rawEmail, code: rawCode, newPassword }): Promise<{ ok: true }> => {
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Escribe un correo electrónico válido.");
    }
    const normalized = normalizeRecoveryCode(rawCode);
    if (normalized.length < 6 || normalized.length > 12) {
      throw new ConvexError("Escribe un código de recuperación válido.");
    }
    if (newPassword.length < minimumPasswordLength || newPassword.length > maximumPasswordLength) {
      throw new ConvexError(`Usa entre ${minimumPasswordLength} y ${maximumPasswordLength} caracteres para la nueva contraseña.`);
    }

    const codeHash = await sha256Hex(normalized);
    const result = await ctx.runMutation(internal.account.consumeResetCode, { email, codeHash });
    if (!result.ok) {
      throw new ConvexError("El código es incorrecto, ya fue usado o venció.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });
    await invalidateSessions(ctx, { userId: result.userId });
    return { ok: true };
  },
});
