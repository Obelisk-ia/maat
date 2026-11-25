import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError, type Value } from "convex/values";
import { maximumPasswordLength, minimumPasswordLength } from "../lib/registration";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
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
