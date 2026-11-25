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
import type * as businessCards from "../businessCards.js";
import type * as cardModel from "../cardModel.js";
import type * as dailyStats from "../dailyStats.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as memberships from "../memberships.js";
import type * as migrations from "../migrations.js";
import type * as organizations from "../organizations.js";
import type * as prizes from "../prizes.js";
import type * as stamper from "../stamper.js";
import type * as stamps from "../stamps.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  businessCards: typeof businessCards;
  cardModel: typeof cardModel;
  dailyStats: typeof dailyStats;
  dashboard: typeof dashboard;
  http: typeof http;
  memberships: typeof memberships;
  migrations: typeof migrations;
  organizations: typeof organizations;
  prizes: typeof prizes;
  stamper: typeof stamper;
  stamps: typeof stamps;
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
