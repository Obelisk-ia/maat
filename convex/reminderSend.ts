// Sending to a customer's card, shared by automatic reminders and one-time messages.
import { dayKey, daysBetween, timeAt } from "../lib/stamp-day";
import { returnWindowDays } from "../lib/reminders";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const deviceLimit = 10;
const hourMs = 3_600_000;

// Customers handled per step while sending; each step is its own transaction.
export const batchSize = 50;

/** Whole days since the customer's last visit, or null before the first one. */
export const daysAway = (membership: Doc<"memberships">, today: string) =>
  membership.lastVisitAt === undefined ? null : daysBetween(dayKey(membership.lastVisitAt), today);

/**
 * For testing only: lets a business send any number of messages a day, and a card receive them all.
 * It's on only where this variable is set on the Convex deployment.
 *
 *   npx convex env set PUSH_TEST_NO_DAILY_LIMIT true     (on)
 *   npx convex env remove PUSH_TEST_NO_DAILY_LIMIT       (off)
 */
export const dailyLimitsOff = () => process.env.PUSH_TEST_NO_DAILY_LIMIT === "true";

/** The phones that would get this card's notifications now: none if the customer switched them off. */
export async function devicesFor(ctx: QueryCtx, membership: Doc<"memberships">) {
  if (membership.leftAt !== undefined) return [];
  const muted = await ctx.db.query("mutedCards")
    .withIndex("by_membership", (q) => q.eq("membershipId", membership._id))
    .first();
  if (muted) return [];
  const devices = await ctx.db.query("pushSubscriptions").withIndex("by_user", (q) => q.eq("userId", membership.clientId)).take(deviceLimit);
  return devices.filter((device) => device.signedOutAt === undefined);
}

/** The card's latest notifications, newest first. */
export function recentLog(ctx: QueryCtx, membershipId: Id<"memberships">) {
  return ctx.db.query("notificationLog")
    .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
    .order("desc")
    // Enough to count a repeating reminder's sends, with one-time messages in between.
    .take(120);
}

/** How long a push service keeps trying: until 9 at night, so nothing arrives late at night. */
function secondsToDeliver(now: number) {
  return Math.round(Math.min(12 * hourMs, Math.max(hourMs, timeAt(dayKey(now), 21) - now)) / 1000);
}

/**
 * Sends one notification to a card's phones and records it, unless the card already got one from
 * this business today. Recorded in the same transaction that decides, so it can't be sent twice.
 */
export async function sendToCard(
  ctx: MutationCtx,
  membership: Doc<"memberships">,
  message: { title: string; body: string },
  reason: Partial<Pick<Doc<"notificationLog">, "ruleId" | "ruleType" | "ruleDays" | "absence" | "campaignId" | "proximity">>,
  log: Doc<"notificationLog">[],
  devices: Doc<"pushSubscriptions">[],
) {
  const now = Date.now();
  const day = dayKey(now);
  if (devices.length === 0 || (!dailyLimitsOff() && log.some((entry) => entry.day === day))) return false;
  const logId = await ctx.db.insert("notificationLog", {
    organizationId: membership.organizationId, membershipId: membership._id, day,
    ...reason, devices: devices.length, failures: 0,
  });
  for (const device of devices) {
    await ctx.scheduler.runAfter(0, internal.pushSender.deliver, {
      subscriptionId: device._id, membershipId: membership._id, logId,
      message: {
        ...message, url: `/cuenta?tarjeta=${membership._id}`,
        // A newer notification from the same card replaces the older one on the phone. While
        // testing without limits, each one stays, so they can all be seen.
        tag: dailyLimitsOff() ? `maat-${logId}` : `maat-${membership._id}`,
      },
      ttlSeconds: secondsToDeliver(now),
    });
  }
  return true;
}

/** A visit soon after a notification is counted for the latest one. */
export async function markReturned(ctx: MutationCtx, membershipId: Id<"memberships">) {
  const [latest] = await recentLog(ctx, membershipId);
  if (latest && latest.accepted !== false && latest.returnedAt === undefined &&
      Date.now() - latest._creationTime <= returnWindowDays * 24 * hourMs) {
    await ctx.db.patch("notificationLog", latest._id, { returnedAt: Date.now() });
  }
}
