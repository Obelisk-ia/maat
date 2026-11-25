/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cardModel from "../cardModel.js";
import type * as clients_businesses from "../clients/businesses.js";
import type * as clients_currentClient from "../clients/currentClient.js";
import type * as clients_memberships from "../clients/memberships.js";
import type * as clients_notifications from "../clients/notifications.js";
import type * as crons from "../crons.js";
import type * as dailyStats from "../dailyStats.js";
import type * as http from "../http.js";
import type * as media from "../media.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as owners_businessCards from "../owners/businessCards.js";
import type * as owners_campaigns from "../owners/campaigns.js";
import type * as owners_dashboard from "../owners/dashboard.js";
import type * as owners_settings from "../owners/settings.js";
import type * as pushSender from "../pushSender.js";
import type * as redemptions from "../redemptions.js";
import type * as reminderModel from "../reminderModel.js";
import type * as reminderSend from "../reminderSend.js";
import type * as reminders from "../reminders.js";
import type * as staff_currentStamper from "../staff/currentStamper.js";
import type * as staff_prizes from "../staff/prizes.js";
import type * as staff_stamps from "../staff/stamps.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cardModel: typeof cardModel;
  "clients/businesses": typeof clients_businesses;
  "clients/currentClient": typeof clients_currentClient;
  "clients/memberships": typeof clients_memberships;
  "clients/notifications": typeof clients_notifications;
  crons: typeof crons;
  dailyStats: typeof dailyStats;
  http: typeof http;
  media: typeof media;
  migrations: typeof migrations;
  notifications: typeof notifications;
  organizations: typeof organizations;
  "owners/businessCards": typeof owners_businessCards;
  "owners/campaigns": typeof owners_campaigns;
  "owners/dashboard": typeof owners_dashboard;
  "owners/settings": typeof owners_settings;
  pushSender: typeof pushSender;
  redemptions: typeof redemptions;
  reminderModel: typeof reminderModel;
  reminderSend: typeof reminderSend;
  reminders: typeof reminders;
  "staff/currentStamper": typeof staff_currentStamper;
  "staff/prizes": typeof staff_prizes;
  "staff/stamps": typeof staff_stamps;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
