"use server";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { refresh } from "next/cache";
import { api } from "@/convex/_generated/api";
import { cardImageSlots, type CardDetails, type CardImageSlot } from "@/lib/business-card";
import { compressCardImage } from "@/lib/card-images.server";

export async function rotateAccountInvite() {
  const token = await convexAuthNextjsToken();
  if (!token) throw new Error("Missing session");

  await fetchMutation(api.owners.settings.rotateInviteCode, {}, { token });
  refresh();
}

export async function saveAccountCard(details: CardDetails, form: FormData) {
  const token = await convexAuthNextjsToken();
  if (!token) return "Inicia sesión para guardar la tarjeta.";

  const assets: Partial<Record<CardImageSlot, ArrayBuffer | null>> = {};

  try {
    if (cardImageSlots.some((slot) => form.get(slot) instanceof File)) {
      const viewer = await fetchQuery(api.users.viewer, {}, { token });
      if (viewer?.role !== "owner") return "Solo el dueño puede editar la tarjeta.";
      if (!viewer.active) return "Tu cuenta de negocio está desactivada.";
    }
    for (const slot of cardImageSlots) {
      const value = form.get(slot);
      if (value === "remove") assets[slot] = null;
      if (value instanceof File) {
        try {
          assets[slot] = await compressCardImage(value, slot);
        } catch (error) {
          return error instanceof Error ? error.message : "No pudimos procesar la imagen.";
        }
      }
    }
    await fetchAction(api.owners.businessCards.save, { details, assets }, { token });
  } catch (error) {
    return error instanceof ConvexError && typeof error.data === "string"
      ? error.data : "No pudimos guardar la tarjeta. Intenta de nuevo.";
  }
  refresh();
  return null;
}
