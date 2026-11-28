// The sending that runs on its own: no one's screen calls these. They stay here, outside the
// role folders, and keep these names: Convex stores a scheduled job under its function's name.
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { cardProgress } from "../lib/card-progress";
import { defaultProximityRadiusMeters, distanceMeters } from "../lib/geo";
import {
  byPriority, dueAgain, inAudience, lastSendHour, messageValues, renderMessage, ruleApplies, type Audience,
} from "../lib/reminders";
import { dayKey, hourOf } from "../lib/stamp-day";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { cardOf, isOrganizationActive } from "./organizations";
import { batchSize, daysAway, devicesFor, recentLog, sendToCard } from "./reminderSend";

/** Runs every hour: starts each business's reminders once its hour has come. */
export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Without keys nothing could be sent, and recording it would use up the reminder.
    if (!process.env.VAPID_PRIVATE_KEY) return null;
    const now = Date.now();
    const today = dayKey(now);
    const hour = hourOf(now);
    if (hour > lastSendHour) return null;
    // One row per business with reminders.
    for (const plan of await ctx.db.query("reminderPlans").collect()) {
      if (hour < plan.sendHour || plan.lastRunDay === today || !plan.rules.some((rule) => rule.enabled)) continue;
      const organization = await ctx.db.get("organizations", plan.organizationId);
      if (!organization || !isOrganizationActive(organization)) continue;
      await ctx.db.patch("reminderPlans", plan._id, { lastRunDay: today });
      await ctx.scheduler.runAfter(0, internal.reminders.runPlan, {
        planId: plan._id, paginationOpts: { numItems: batchSize, cursor: null },
      });
    }
    return null;
  },
});

export const runPlan = internalMutation({
  args: { planId: v.id("reminderPlans"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { planId, paginationOpts }) => {
    const plan = await ctx.db.get("reminderPlans", planId);
    const organization = plan && await ctx.db.get("organizations", plan.organizationId);
    if (!plan || !organization || !isOrganizationActive(organization)) return null;
    const card = cardOf(organization);
    const rules = plan.rules.filter((rule) => rule.enabled).sort(byPriority);
    const today = dayKey(Date.now());
    const page = await ctx.db.query("memberships")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .paginate(paginationOpts);

    for (const membership of page.page) {
      const progress = cardProgress(card, membership.stamps, membership.redeemedPrizes);
      const away = daysAway(membership, today);
      const due = rules.filter((rule) => ruleApplies(rule, progress, away));
      if (due.length === 0) continue;
      const devices = await devicesFor(ctx, membership);
      if (devices.length === 0) continue;
      const log = await recentLog(ctx, membership._id);
      const absence = membership.lastVisitAt!;
      const sinceVisit = log.filter((entry) => entry.absence === absence);
      const rule = due.find((candidate) => dueAgain(candidate, sinceVisit, today));
      if (!rule) continue;
      const name = (await ctx.db.get("users", membership.clientId))?.name ?? "";
      await sendToCard(ctx, membership, {
        title: card.displayName,
        body: renderMessage(rule.message, messageValues(rule.type, progress, name, card.displayName)),
      }, { ruleId: rule.id, ruleType: rule.type, ruleDays: rule.days, absence }, log, devices);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.reminders.runPlan, {
        planId, paginationOpts: { numItems: batchSize, cursor: page.continueCursor },
      });
    }
    return null;
  },
});

export const runCampaign = internalMutation({
  args: { campaignId: v.id("campaigns"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { campaignId, paginationOpts }) => {
    const campaign = await ctx.db.get("campaigns", campaignId);
    if (!campaign || campaign.status === "cancelled" || campaign.status === "sent") return null;
    const organization = await ctx.db.get("organizations", campaign.organizationId);
    if (!organization || !isOrganizationActive(organization)) return null;
    const card = cardOf(organization);
    // Who's included is decided now, at the time of sending.
    const today = dayKey(Date.now());
    const target: Audience = campaign.audience;
    const page = await ctx.db.query("memberships")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .paginate(paginationOpts);

    let { matched, queued } = campaign;
    const nearbyRadius = target.radiusMeters ?? organization.proximityAlert?.radiusMeters ?? defaultProximityRadiusMeters;
    for (const membership of page.page) {
      if (membership.leftAt !== undefined) continue;
      const progress = cardProgress(card, membership.stamps, membership.redeemedPrizes);
      const customer = await ctx.db.get("users", membership.clientId);
      if (target.type === "nearby") {
        if (!organization.location || !customer?.lastLocation) continue;
        if (distanceMeters(organization.location, customer.lastLocation) > nearbyRadius) continue;
      } else if (!inAudience(target, progress, daysAway(membership, today))) {
        continue;
      }
      matched++;
      const devices = await devicesFor(ctx, membership);
      if (devices.length === 0) continue;
      const name = customer?.name ?? "";
      const sent = await sendToCard(ctx, membership, {
        title: card.displayName,
        body: renderMessage(campaign.message, messageValues(target.type, progress, name, card.displayName)),
      }, { campaignId }, await recentLog(ctx, membership._id), devices);
      if (sent) queued++;
    }

    await ctx.db.patch("campaigns", campaignId, { matched, queued, status: page.isDone ? "sent" : "sending" });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.reminders.runCampaign, {
        campaignId, paginationOpts: { numItems: batchSize, cursor: page.continueCursor },
      });
    }
    return null;
  },
});
