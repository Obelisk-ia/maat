import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cardDetails } from "./cardModel";

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
    ),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_client_phone", ["account.phone"]),
  organizations: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    card: v.optional(v.object({
      details: cardDetails,
      logoId: v.optional(v.id("_storage")),
      backgroundId: v.optional(v.id("_storage")),
      stampLogoId: v.optional(v.id("_storage")),
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
});
