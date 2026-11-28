import { ConvexError, v } from "convex/values";
import { cardProgress } from "../../lib/card-progress";
import { distanceMeters, isValidCoordinates } from "../../lib/geo";
import { arePushKeys, isPushServiceUrl } from "../../lib/push-subscription";
import { messageValues, renderMessage } from "../../lib/reminders";
import { dayKey, daysBetween } from "../../lib/stamp-day";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { isMuted } from "../notifications";
import { cardOf, isOrganizationActive } from "../organizations";
import { dailyLimitsOff, devicesFor, recentLog, sendToCard } from "../reminderSend";
import { currentClient } from "./currentClient";

// A customer's phones, tablets and computers. Past this, the oldest is dropped.
const deviceLimit = 10;
const testWaitMs = 20_000;
// Long enough to close the app and see the notification arrive.
const testDelayMs = 6_000;

async function deviceAt(ctx: QueryCtx, endpoint: string) {
  return ctx.db.query("pushSubscriptions").withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint)).unique();
}

async function ownCard(ctx: QueryCtx, userId: Id<"users">, membershipId: Id<"memberships">) {
  const membership = await ctx.db.get("memberships", membershipId);
  if (!membership || membership.clientId !== userId || membership.leftAt !== undefined) {
    throw new ConvexError("Esa tarjeta no es tuya.");
  }
  return membership;
}

/** This device's notifications, and which of the customer's cards are turned off. */
export const status = query({
  args: { endpoint: v.optional(v.string()) },
  handler: async (ctx, { endpoint }) => {
    const user = await currentClient(ctx);
    const device = endpoint ? await deviceAt(ctx, endpoint) : null;
    const mine = device?.userId === user._id ? device : null;
    const muted = await ctx.db.query("mutedCards").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    return {
      userKey: user._id,
      subscribed: mine !== null,
      lastResult: mine?.lastResult ?? null,
      mutedCards: muted.map((row) => row.membershipId),
      hasLocation: user.lastLocation !== undefined,
    };
  },
});

export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const user = await currentClient(ctx);
    if (!isPushServiceUrl(endpoint) || !arePushKeys(p256dh, auth)) {
      throw new ConvexError("Este navegador usa un servicio de avisos que no reconocemos.");
    }
    // A device belongs to whoever turned notifications on last, so a shared phone gets only theirs.
    const existing = await deviceAt(ctx, endpoint);
    if (existing?.userId === user._id) {
      await ctx.db.patch("pushSubscriptions", existing._id, { p256dh, auth });
      return null;
    }
    if (existing) await ctx.db.delete("pushSubscriptions", existing._id);
    const devices = await ctx.db.query("pushSubscriptions").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const device of devices.slice(0, Math.max(0, devices.length - deviceLimit + 1))) {
      await ctx.db.delete("pushSubscriptions", device._id);
    }
    await ctx.db.insert("pushSubscriptions", { userId: user._id, endpoint, p256dh, auth });
    return null;
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const user = await currentClient(ctx);
    const device = await deviceAt(ctx, endpoint);
    if (device?.userId === user._id) await ctx.db.delete("pushSubscriptions", device._id);
    return null;
  },
});

export const setCardMuted = mutation({
  args: { membershipId: v.id("memberships"), muted: v.boolean() },
  handler: async (ctx, { membershipId, muted }) => {
    const user = await currentClient(ctx);
    await ownCard(ctx, user._id, membershipId);
    const rows = await ctx.db.query("mutedCards")
      .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
      .collect();
    if (muted && rows.length === 0) await ctx.db.insert("mutedCards", { userId: user._id, membershipId });
    if (!muted) for (const row of rows) await ctx.db.delete("mutedCards", row._id);
    return null;
  },
});

/**
 * Sends the customer a notification on this device, so they can see that it arrives. With
 * notifications switched off, nothing is sent and the answer says why.
 */
export const sendTest = mutation({
  args: { endpoint: v.optional(v.string()), membershipId: v.optional(v.id("memberships")) },
  handler: async (ctx, { endpoint, membershipId }) => {
    const user = await currentClient(ctx);
    const membership = membershipId ? await ownCard(ctx, user._id, membershipId) : null;
    const device = endpoint ? await deviceAt(ctx, endpoint) : null;
    if (!device || device.userId !== user._id) return { sent: false as const, reason: "off" as const };
    if (membership && await isMuted(ctx, membership._id)) return { sent: false as const, reason: "muted" as const };
    if (device.lastTestAt !== undefined && Date.now() - device.lastTestAt < testWaitMs) {
      throw new ConvexError("Espera unos segundos antes de pedir otro aviso.");
    }

    let message = { title: "Maat", body: "Aviso de prueba: así te llegarán los avisos.", url: "/cuenta", tag: "maat-test" };
    if (membership) {
      const organization = await ctx.db.get("organizations", membership.organizationId);
      if (!organization) throw new ConvexError("No se encontró el negocio.");
      const name = cardOf(organization).displayName;
      message = {
        title: name,
        body: `Aviso de prueba: así te llegarán los avisos de ${name}.`,
        url: `/cuenta?tarjeta=${membership._id}`,
        tag: `maat-test-${membership._id}`,
      };
    }

    await ctx.db.patch("pushSubscriptions", device._id, { lastTestAt: Date.now(), lastResult: undefined });
    await ctx.scheduler.runAfter(testDelayMs, internal.pushSender.deliver, {
      subscriptionId: device._id, membershipId: membership?._id, message, ttlSeconds: 300,
    });
    return { sent: true as const };
  },
});

/**
 * Updates the customer's last known location and sends any eligible proximity push notification
 * for businesses they follow whose radius they are currently inside.
 */
export const reportLocation = mutation({
  args: { lat: v.number(), lng: v.number() },
  handler: async (ctx, { lat, lng }) => {
    const user = await currentClient(ctx);
    if (!isValidCoordinates(lat, lng)) {
      throw new ConvexError("Ubicación no válida.");
    }
    const now = Date.now();
    const coords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    await ctx.db.patch("users", user._id, {
      lastLocation: { ...coords, updatedAt: now },
    });

    if (!process.env.VAPID_PRIVATE_KEY) {
      return { checked: 0, triggered: [] as string[] };
    }

    const memberships = await ctx.db.query("memberships")
      .withIndex("by_client_and_organization", (q) => q.eq("clientId", user._id))
      .collect();
    const followed = memberships.filter((membership) => membership.leftAt === undefined);
    const today = dayKey(now);
    const triggered: string[] = [];

    for (const membership of followed) {
      const organization = await ctx.db.get("organizations", membership.organizationId);
      if (!organization || !isOrganizationActive(organization)) continue;
      if (!organization.location || !organization.proximityAlert?.enabled) continue;

      const { radiusMeters, cooldownDays, message } = organization.proximityAlert;
      if (!message.trim()) continue;
      if (distanceMeters(organization.location, coords) > radiusMeters) continue;

      const devices = await devicesFor(ctx, membership);
      if (devices.length === 0) continue;

      const log = await recentLog(ctx, membership._id);
      if (!dailyLimitsOff()) {
        const recentProximity = log.find(
          (entry) => entry.proximity === true && entry.accepted !== false && daysBetween(entry.day, today) < cooldownDays,
        );
        if (recentProximity) continue;
      }

      const card = cardOf(organization);
      const progress = cardProgress(card, membership.stamps, membership.redeemedPrizes);
      const sent = await sendToCard(
        ctx,
        membership,
        {
          title: card.displayName,
          body: renderMessage(message, messageValues("nearby", progress, user.name, card.displayName)),
        },
        { proximity: true },
        log,
        devices,
      );
      if (sent) triggered.push(card.displayName);
    }

    return { checked: followed.length, triggered };
  },
});

/** Stops sharing the customer's location and deletes their last stored coordinates. */
export const clearLocation = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentClient(ctx);
    if (user.lastLocation !== undefined) {
      await ctx.db.patch("users", user._id, { lastLocation: undefined });
    }
    return null;
  },
});
