"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/** Sends one notification to one device through its push service. */
export const deliver = internalAction({
  args: {
    subscriptionId: v.id("pushSubscriptions"),
    // The card it's about, if any: nothing is sent once its notifications are off.
    membershipId: v.optional(v.id("memberships")),
    // The record of a reminder or message, to note whether it got out.
    logId: v.optional(v.id("notificationLog")),
    message: v.object({ title: v.string(), body: v.string(), url: v.string(), tag: v.string() }),
    // How long the push service keeps trying while the phone is off or offline.
    ttlSeconds: v.number(),
  },
  handler: async (ctx, { subscriptionId, membershipId, logId, message, ttlSeconds }): Promise<null> => {
    const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
    const device = await ctx.runQuery(internal.notifications.device, { subscriptionId, membershipId });
    if (!device) {
      // Switched off while it waited.
      if (logId) await ctx.runMutation(internal.notifications.recordResult, { subscriptionId, logId, ok: false });
      return null;
    }

    let status: number | undefined;
    try {
      if (!publicKey || !privateKey || !subject) throw new Error("Web push keys are not set");
      const request = webpush.generateRequestDetails(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify(message),
        { vapidDetails: { subject, publicKey, privateKey }, TTL: ttlSeconds },
      );
      const headers = Object.fromEntries(Object.entries(request.headers)
        .filter(([name]) => name.toLowerCase() !== "content-length")
        .map(([name, value]) => [name, String(value)]));
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers,
        body: new Uint8Array(request.body!),
        // A push service never redirects, and following one could reach another address.
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      status = response.status;
      if (!response.ok) console.warn(`Push service answered ${status}: ${(await response.text()).slice(0, 200)}`);
    } catch (error) {
      console.warn("Notification not sent:", error instanceof Error ? error.message : error);
    }
    await ctx.runMutation(internal.notifications.recordResult, {
      subscriptionId, logId, status, ok: status !== undefined && status >= 200 && status < 300,
    });
    return null;
  },
});
