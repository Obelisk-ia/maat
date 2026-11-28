import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cardDetails } from "./cardModel";
import { audience, reminderRule } from "./reminderModel";

export default defineSchema({
  ...authTables,
  users: defineTable({
    ...authTables.users.validator.fields,
    name: v.string(),
    email: v.string(),
    account: v.union(
      v.object({ role: v.literal("owner"), organizationId: v.id("organizations") }),
      v.object({ role: v.literal("staff"), organizationId: v.id("organizations") }),
      v.object({ role: v.literal("client"), phone: v.string() }),
      v.object({ role: v.literal("admin") }),
    ),
    // Last location voluntarily shared by a customer for proximity alerts & nearby campaigns.
    lastLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      updatedAt: v.number(),
    })),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_client_phone", ["account.phone"])
    .index("by_organization", ["account.organizationId"]),
  organizations: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    // Missing on organizations created before admin approval existed (treated as active).
    // New owner signups start inactive until an admin enables them.
    active: v.optional(v.boolean()),
    // Admin-only billing tracking (30-day cycles).
    lastPaidAt: v.optional(v.number()),
    nextPaymentDueAt: v.optional(v.number()),
    paymentCount: v.optional(v.number()),
    // Business physical location and proximity push alert configuration.
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      label: v.optional(v.string()),
    })),
    proximityAlert: v.optional(v.object({
      enabled: v.boolean(),
      radiusMeters: v.number(),
      cooldownDays: v.number(),
      message: v.string(),
    })),
    card: v.optional(v.object({
      details: cardDetails,
      logoId: v.optional(v.id("_storage")),
      backgroundId: v.optional(v.id("_storage")),
      stampLogoId: v.optional(v.id("_storage")),
      coverId: v.optional(v.id("_storage")),
    })),
    // Kept apart from the card, so saving the design never changes it. Missing means yes.
    restartAfterFinalPrize: v.optional(v.boolean()),
  }).index("by_invite_code", ["inviteCode"]),
  // A customer's card at one business.
  memberships: defineTable({
    clientId: v.id("users"),
    organizationId: v.id("organizations"),
    code: v.string(),
    stamps: v.number(),
    // Set while the customer isn't following the business. The card is kept, so following
    // again restores its stamps and can't be used to get a second stamp in one day.
    leftAt: v.optional(v.number()),
    // Visits are counted apart from stamps, which a future redemption may reset.
    visits: v.optional(v.number()),
    lastVisitAt: v.optional(v.number()),
    // Prizes delivered on the current card. A new card starts it empty.
    redeemedPrizes: v.optional(v.array(v.string())),
    completedCards: v.optional(v.number()),
    prizesRedeemed: v.optional(v.number()),
  })
    .index("by_client_and_organization", ["clientId", "organizationId"])
    .index("by_organization", ["organizationId"])
    .index("by_code", ["code"]),
  // Who added each stamp, and when (_creationTime).
  stampEvents: defineTable({
    membershipId: v.id("memberships"),
    organizationId: v.id("organizations"),
    staffId: v.id("users"),
  }).index("by_membership", ["membershipId"]),
  // Every prize delivered, and when (_creationTime). Names are copied, so history survives edits.
  redemptions: defineTable({
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
    staffId: v.id("users"),
    deliveredBy: v.string(),
    deliveredByRole: v.union(v.literal("owner"), v.literal("staff")),
    prizeId: v.string(),
    prizeName: v.string(),
    prizeStamps: v.number(),
    // Which of the customer's cards it was on, starting at 1.
    round: v.number(),
    restartedCard: v.boolean(),
  })
    .index("by_membership", ["membershipId"])
    .index("by_organization", ["organizationId"]),
  // A phone or browser that agreed to receive a customer's notifications.
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    lastTestAt: v.optional(v.number()),
    // How the push service answered the latest notification.
    lastResult: v.optional(v.object({ at: v.number(), ok: v.boolean(), status: v.optional(v.number()) })),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
  // Cards whose notifications the customer turned off. A table of its own, like the one above.
  mutedCards: defineTable({
    userId: v.id("users"),
    membershipId: v.id("memberships"),
  })
    .index("by_user", ["userId"])
    .index("by_membership", ["membershipId"]),
  // A business's automatic reminders.
  reminderPlans: defineTable({
    organizationId: v.id("organizations"),
    sendHour: v.number(),
    rules: v.array(reminderRule),
    // The last Mexico City day the reminders went out, so a day is never repeated.
    lastRunDay: v.optional(v.string()),
  }).index("by_organization", ["organizationId"]),
  // One-time messages the owner sends.
  campaigns: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    audience,
    message: v.string(),
    scheduledFor: v.number(),
    day: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("sending"), v.literal("sent"), v.literal("cancelled")),
    scheduledId: v.optional(v.id("_scheduled_functions")),
    // Filled in while it's sent.
    matched: v.number(),
    queued: v.number(),
  }).index("by_organization_and_day", ["organizationId", "day"]),
  // Every reminder or message sent to a customer's card, and when (_creationTime).
  notificationLog: defineTable({
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
    day: v.string(),
    ruleId: v.optional(v.string()),
    ruleType: v.optional(v.string()),
    ruleDays: v.optional(v.number()),
    // The visit the customer had last, so a reminder goes once until they come back.
    absence: v.optional(v.number()),
    campaignId: v.optional(v.id("campaigns")),
    // Set when triggered automatically because the customer was near the business.
    proximity: v.optional(v.boolean()),
    devices: v.number(),
    failures: v.number(),
    // Whether a push service took it. Missing while it's on its way.
    accepted: v.optional(v.boolean()),
    // Their next visit, if it came within a week.
    returnedAt: v.optional(v.number()),
  })
    .index("by_membership", ["membershipId"])
    .index("by_campaign", ["campaignId"])
    .index("by_organization", ["organizationId"]),
  // Each business's totals per Mexico City day, for the dashboard.
  dailyStats: defineTable({
    organizationId: v.id("organizations"),
    day: v.string(),
    newCustomers: v.number(),
    firstVisits: v.number(),
    returnVisits: v.number(),
    // Prizes delivered. Missing on days saved before redemption existed.
    rewards: v.optional(v.number()),
  }).index("by_organization_and_day", ["organizationId", "day"]),
  // Admin-only history of confirmed monthly payments per business.
  organizationPayments: defineTable({
    organizationId: v.id("organizations"),
    recordedBy: v.id("users"),
    paidAt: v.number(),
    nextDueAt: v.number(),
    note: v.optional(v.string()),
  }).index("by_organization", ["organizationId"]),
  // Short-lived (15 min) hashed one-time password reset codes (push OTP, admin, or owner->staff).
  passwordResetCodes: defineTable({
    userId: v.id("users"),
    codeHash: v.string(),
    source: v.union(v.literal("push"), v.literal("admin"), v.literal("owner")),
    issuedBy: v.optional(v.id("users")),
    expiresAt: v.number(),
    attempts: v.number(),
    usedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  // Single-use hashed backup recovery codes (6 per user) exported in their recovery PDF.
  recoveryCodes: defineTable({
    userId: v.id("users"),
    codeHash: v.string(),
    usedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
