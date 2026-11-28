import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError, type Value } from "convex/values";
import { maximumPasswordLength, minimumPasswordLength } from "../lib/registration";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

const PasswordResetEmail = Email({
  id: "password-reset",
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(100000 + (bytes[0] % 900000));
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from = process.env.AUTH_EMAIL_FROM ?? "Maat <onboarding@resend.dev>";
    if (!apiKey) {
      // Dev fallback when Resend isn't configured yet: log the 6-digit code in Convex logs.
      console.info(`[Maat Password Reset] Código para ${email}: ${token}`);
      return;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Tu código para restablecer tu contraseña en Maat",
        html: `<p>Recibimos una solicitud para cambiar tu contraseña en <strong>Maat</strong>.</p><p>Tu código de verificación es:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px;">${token}</p><p>Este código vence en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
        text: `Tu código para restablecer tu contraseña en Maat es: ${token}\n\nVence en 15 minutos. Si no lo solicitaste, ignora este correo.`,
      }),
    });
    if (!response.ok) {
      throw new ConvexError("No pudimos enviar el correo de recuperación. Intenta de nuevo.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: PasswordResetEmail,
      profile(params): Record<string, Value> & { email: string } {
        const email = text(params.email).trim().toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError("Escribe un correo electrónico válido.");
        }
        if (params.flow !== "signUp") return { email };
        return {
          email,
          name: text(params.name),
          role: text(params.role),
          businessName: text(params.businessName),
          inviteCode: text(params.inviteCode),
          phone: text(params.phone),
        };
      },
      validatePasswordRequirements(password) {
        if (typeof password !== "string" || password.length < minimumPasswordLength ||
            password.length > maximumPasswordLength) {
          throw new ConvexError(`Usa entre ${minimumPasswordLength} y ${maximumPasswordLength} caracteres para la contraseña.`);
        }
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }): Promise<Id<"users">> {
      if (existingUserId) return existingUserId;
      // Password.profile never emits an `account` property, so this branch is only reachable
      // from internal server code (convex/admin.ts:createAdmin) calling createAccount directly.
      const account = profile.account;
      if (account && typeof account === "object" && "role" in account && account.role === "admin") {
        return await ctx.runMutation(internal.users.createAdminUser, {
          email: text(profile.email),
          name: text(profile.name),
        });
      }
      return await ctx.runMutation(internal.users.createUser, {
        email: text(profile.email),
        name: text(profile.name),
        role: text(profile.role),
        businessName: text(profile.businessName),
        inviteCode: text(profile.inviteCode),
        phone: text(profile.phone),
      });
    },
  },
});
