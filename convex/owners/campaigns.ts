import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { cardProgress } from "../../lib/card-progress";
import {
  defaultProximityCooldownDays, defaultProximityRadiusMeters, distanceMeters, isValidCoordinates,
  maxProximityCooldownDays, maxProximityRadiusMeters, minProximityCooldownDays, minProximityRadiusMeters,
} from "../../lib/geo";
import { isPrizeId, randomPrizeId } from "../../lib/prizes";
import {
  audienceProblem, defaultSendHour, firstSendHour, inAudience, lastSendHour, maxRules,
  messageProblem, ruleProblem, scheduleLimitDays, type Rule,
} from "../../lib/reminders";
import { dayKey, daysBetween, hourOf, timeAt } from "../../lib/stamp-day";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { cardOf, isOrganizationActive } from "../organizations";
import { audience, reminderRule } from "../reminderModel";
import { batchSize, dailyLimitsOff, daysAway, devicesFor } from "../reminderSend";

// A query may only look up so much; past this, counts say they're partial.
const countLimit = 1500;
const statsDays = 30;

async function ownedBusiness(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && await ctx.db.get("users", userId);
  if (!user || user.account.role !== "owner") throw new ConvexError("Solo el dueño puede manejar los avisos.");
  const organization = await ctx.db.get("organizations", user.account.organizationId);
  if (!organization) throw new ConvexError("No se encontró el negocio de tu cuenta.");
  if (!isOrganizationActive(organization)) {
    throw new ConvexError("Tu cuenta de negocio está desactivada.");
  }
  return { userId: user._id, organization };
}

const planOf = (ctx: QueryCtx, organizationId: Id<"organizations">) =>
  ctx.db.query("reminderPlans").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).unique();

async function followedCards(ctx: QueryCtx, organizationId: Id<"organizations">) {
  const cards = await ctx.db.query("memberships")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .take(countLimit + 1);
  return { partial: cards.length > countLimit, followed: cards.slice(0, countLimit).filter((card) => card.leftAt === undefined) };
}

/** Sent and came back, for a set of notifications. */
function tally(entries: Doc<"notificationLog">[]) {
  return {
    sent: entries.filter((entry) => entry.accepted === true).length,
    pending: entries.filter((entry) => entry.accepted === undefined).length,
    failed: entries.filter((entry) => entry.accepted === false).length,
    returned: entries.filter((entry) => entry.accepted !== false && entry.returnedAt !== undefined).length,
  };
}

/** The owner's notification page: reminders, one-time messages and how they went. */
export const overview = query({
  args: {
    // The viewer sends the time, so "today" moves on while the page stays open.
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    const { organization } = await ownedBusiness(ctx);
    const plan = await planOf(ctx, organization._id);
    const card = cardOf(organization);

    const { followed, partial } = await followedCards(ctx, organization._id);
    let reachable = 0;
    let sharedLocation = 0;
    let nearbyNow = 0;
    const activeRadius = organization.proximityAlert?.radiusMeters ?? defaultProximityRadiusMeters;
    for (const membership of followed) {
      if ((await devicesFor(ctx, membership)).length) reachable++;
      const customer = await ctx.db.get("users", membership.clientId);
      if (customer?.lastLocation) {
        sharedLocation++;
        if (organization.location && distanceMeters(organization.location, customer.lastLocation) <= activeRadius) {
          nearbyNow++;
        }
      }
    }

    const since = now - statsDays * 86_400_000;
    const recent = await ctx.db.query("notificationLog")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id).gte("_creationTime", since))
      .order("desc")
      .take(5000);

    const campaigns = (await ctx.db.query("campaigns")
      .withIndex("by_organization_and_day", (q) => q.eq("organizationId", organization._id))
      .order("desc")
      .take(15));

    return {
      businessName: card.displayName,
      card,
      dailyLimitsOff: dailyLimitsOff(),
      location: organization.location ?? null,
      proximityAlert: organization.proximityAlert ?? null,
      locationReach: { shared: sharedLocation, nearby: nearbyNow },
      proximityStats: tally(recent.filter((entry) => entry.proximity === true)),
      sendHour: plan?.sendHour ?? defaultSendHour,
      rules: (plan?.rules ?? []).map((rule) => ({
        ...rule, stats: tally(recent.filter((entry) => entry.ruleId === rule.id)),
      })),
      // Whether today's reminders already went, or the hour passed when they were saved.
      doneForToday: plan?.lastRunDay === dayKey(now),
      reach: { customers: followed.length, reachable, partial },
      campaigns: await Promise.all(campaigns.map(async (campaign) => ({
        id: campaign._id,
        message: campaign.message,
        audience: campaign.audience,
        scheduledFor: campaign.scheduledFor,
        day: campaign.day,
        status: campaign.status,
        matched: campaign.matched,
        ...tally(await ctx.db.query("notificationLog")
          .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
          .take(countLimit)),
      }))),
    };
  },
});

/** How many customers an audience or reminder covers today, and how many can be reached. */
export const preview = query({
  args: {
    audience,
    // For a reminder: the days without a visit it waits for.
    reminderDays: v.optional(v.number()),
    now: v.number(),
  },
  handler: async (ctx, { audience, reminderDays, now }) => {
    const { organization } = await ownedBusiness(ctx);
    const card = cardOf(organization);
    const { followed, partial } = await followedCards(ctx, organization._id);
    const today = dayKey(now);
    const nearbyRadius = audience.radiusMeters ?? organization.proximityAlert?.radiusMeters ?? defaultProximityRadiusMeters;
    let matched = 0;
    let reachable = 0;
    for (const membership of followed) {
      if (audience.type === "nearby") {
        if (!organization.location) continue;
        const customer = await ctx.db.get("users", membership.clientId);
        if (!customer?.lastLocation) continue;
        if (distanceMeters(organization.location, customer.lastLocation) > nearbyRadius) continue;
      } else {
        const progress = cardProgress(card, membership.stamps, membership.redeemedPrizes);
        const away = daysAway(membership, today);
        if (!inAudience(audience, progress, away)) continue;
        if (reminderDays !== undefined && (away === null || away < reminderDays)) continue;
      }
      matched++;
      if ((await devicesFor(ctx, membership)).length) reachable++;
    }
    return { matched, reachable, partial };
  },
});

/** Saves the business location and automatic proximity notification configuration. */
export const saveProximitySettings = mutation({
  args: {
    location: v.optional(v.union(
      v.object({
        lat: v.number(),
        lng: v.number(),
        label: v.optional(v.string()),
      }),
      v.null(),
    )),
    proximityAlert: v.object({
      enabled: v.boolean(),
      radiusMeters: v.number(),
      cooldownDays: v.number(),
      message: v.string(),
    }),
  },
  handler: async (ctx, { location, proximityAlert }) => {
    const { organization } = await ownedBusiness(ctx);

    let nextLocation = organization.location;
    if (location === null) {
      nextLocation = undefined;
    } else if (location !== undefined) {
      if (!isValidCoordinates(location.lat, location.lng)) {
        throw new ConvexError("Las coordenadas de ubicación no son válidas.");
      }
      const trimmedLabel = location.label?.trim();
      if (trimmedLabel && trimmedLabel.length > 120) {
        throw new ConvexError("El nombre de la ubicación puede tener máximo 120 caracteres.");
      }
      nextLocation = {
        lat: Number(location.lat.toFixed(6)),
        lng: Number(location.lng.toFixed(6)),
        ...(trimmedLabel ? { label: trimmedLabel } : {}),
      };
    }

    const radiusMeters = Math.round(proximityAlert.radiusMeters);
    if (!Number.isInteger(radiusMeters) || radiusMeters < minProximityRadiusMeters || radiusMeters > maxProximityRadiusMeters) {
      throw new ConvexError(`El radio va de ${minProximityRadiusMeters} m a ${maxProximityRadiusMeters} m.`);
    }
    const cooldownDays = Math.round(proximityAlert.cooldownDays);
    if (!Number.isInteger(cooldownDays) || cooldownDays < minProximityCooldownDays || cooldownDays > maxProximityCooldownDays) {
      throw new ConvexError(`La espera entre avisos va de ${minProximityCooldownDays} a ${maxProximityCooldownDays} días.`);
    }

    const trimmedMessage = proximityAlert.message.trim();
    if (proximityAlert.enabled) {
      if (!nextLocation) {
        throw new ConvexError("Primero guarda la ubicación de tu negocio para activar los avisos por cercanía.");
      }
      const problem = messageProblem(trimmedMessage, "nearby");
      if (problem) throw new ConvexError(problem);
    } else if (trimmedMessage) {
      const problem = messageProblem(trimmedMessage, "nearby");
      if (problem) throw new ConvexError(problem);
    }

    await ctx.db.patch("organizations", organization._id, {
      location: nextLocation,
      proximityAlert: {
        enabled: proximityAlert.enabled,
        radiusMeters: radiusMeters || defaultProximityRadiusMeters,
        cooldownDays: cooldownDays || defaultProximityCooldownDays,
        message: trimmedMessage,
      },
    });
    return null;
  },
});

export const savePlan = mutation({
  args: { sendHour: v.number(), rules: v.array(reminderRule) },
  handler: async (ctx, { sendHour, rules }) => {
    const { organization } = await ownedBusiness(ctx);
    if (!Number.isInteger(sendHour) || sendHour < firstSendHour || sendHour > lastSendHour) {
      throw new ConvexError(`Elige una hora entre las ${firstSendHour}:00 y las ${lastSendHour}:00.`);
    }
    if (rules.length > maxRules) throw new ConvexError(`Puedes tener hasta ${maxRules} recordatorios.`);
    const used = new Set<string>();
    const clean: Rule[] = rules.map((rule) => {
      const problem = ruleProblem(rule);
      if (problem) throw new ConvexError(problem);
      // The ID is how a reminder already sent is recognised, so it must be its own.
      const id = isPrizeId(rule.id) && !used.has(rule.id) ? rule.id : randomPrizeId();
      used.add(id);
      const { repeatEveryDays, maxTimes, ...rest } = rule;
      return {
        ...rest, id, message: rule.message.trim(),
        // A limit only means something on a reminder that repeats.
        ...(repeatEveryDays === undefined ? {} : { repeatEveryDays, ...(maxTimes === undefined ? {} : { maxTimes }) }),
      };
    });

    const plan = await planOf(ctx, organization._id);
    const now = Date.now();
    // If today's hour has already come, these start tomorrow instead of going out unexpectedly.
    const lastRunDay = hourOf(now) >= sendHour ? dayKey(now) : plan?.lastRunDay;
    const values = { sendHour, rules: clean, ...(lastRunDay ? { lastRunDay } : {}) };
    if (plan) await ctx.db.patch("reminderPlans", plan._id, values);
    else await ctx.db.insert("reminderPlans", { organizationId: organization._id, ...values });
    return null;
  },
});

/** A one-time message, now or later. One per day, so customers aren't flooded. */
export const sendCampaign = mutation({
  args: {
    audience,
    message: v.string(),
    // Left out to send now.
    schedule: v.optional(v.object({ day: v.string(), hour: v.number() })),
  },
  handler: async (ctx, { audience, message, schedule }) => {
    const { userId, organization } = await ownedBusiness(ctx);
    const problem = audienceProblem(audience) ?? messageProblem(message, audience.type);
    if (problem) throw new ConvexError(problem);
    if (audience.type === "nearby" && !organization.location) {
      throw new ConvexError("Primero guarda la ubicación de tu negocio para avisar a clientes cercanos.");
    }
    if (!process.env.VAPID_PRIVATE_KEY) throw new ConvexError("Los avisos todavía no están configurados.");

    const now = Date.now();
    let scheduledFor = now;
    if (schedule) {
      const { day, hour } = schedule;
      const ahead = /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? daysBetween(dayKey(now), day) : -1;
      if (ahead < 0 || ahead > scheduleLimitDays) throw new ConvexError(`Elige una fecha de hoy a ${scheduleLimitDays} días.`);
      if (!Number.isInteger(hour) || hour < firstSendHour || hour > lastSendHour) {
        throw new ConvexError(`Elige una hora entre las ${firstSendHour}:00 y las ${lastSendHour}:00.`);
      }
      scheduledFor = timeAt(day, hour);
      if (scheduledFor <= now) throw new ConvexError("Esa hora ya pasó. Elige una más tarde.");
    }
    // Sending now works at any hour: the owner decides it, after the page warns them at night.

    const day = dayKey(scheduledFor);
    // Convex mutations are transactions, so two taps can't create two messages for one day.
    const sameDay = await ctx.db.query("campaigns")
      .withIndex("by_organization_and_day", (q) => q.eq("organizationId", organization._id).eq("day", day))
      .collect();
    if (!dailyLimitsOff() && sameDay.some((campaign) => campaign.status !== "cancelled")) {
      throw new ConvexError("Ya hay un aviso para ese día. Puedes enviar uno por día.");
    }

    const campaignId = await ctx.db.insert("campaigns", {
      organizationId: organization._id, createdBy: userId, audience, message: message.trim(),
      scheduledFor, day, status: "scheduled", matched: 0, queued: 0,
    });
    const scheduledId = await ctx.scheduler.runAt(scheduledFor, internal.reminders.runCampaign, {
      campaignId, paginationOpts: { numItems: batchSize, cursor: null },
    });
    await ctx.db.patch("campaigns", campaignId, { scheduledId });
    return null;
  },
});

export const cancelCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const { organization } = await ownedBusiness(ctx);
    const campaign = await ctx.db.get("campaigns", campaignId);
    if (!campaign || campaign.organizationId !== organization._id) throw new ConvexError("Ese aviso no es de tu negocio.");
    if (campaign.status !== "scheduled") throw new ConvexError("Ese aviso ya no se puede cancelar.");
    if (campaign.scheduledId) await ctx.scheduler.cancel(campaign.scheduledId);
    await ctx.db.patch("campaigns", campaignId, { status: "cancelled" });
    return null;
  },
});
