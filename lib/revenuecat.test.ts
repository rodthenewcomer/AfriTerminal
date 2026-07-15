import { describe, expect, it } from "vitest";
import { parseRevenueCatBillingState, revenueCatProvider } from "./revenuecat";

const now = Date.parse("2026-07-14T12:00:00.000Z");

describe("RevenueCat billing state", () => {
  it("maps active App Store subscriptions", () => {
    expect(parseRevenueCatBillingState({ subscriber: {
      entitlements: { pro: { expires_date: "2026-08-14T12:00:00.000Z", product_identifier: "afriterminal.pro.monthly" } },
      subscriptions: { "afriterminal.pro.monthly": { expires_date: "2026-08-14T12:00:00.000Z", period_type: "NORMAL", store: "app_store", unsubscribe_detected_at: null } },
    } }, now)).toMatchObject({ provider: "apple", status: "active", paid: true, cancelAtPeriodEnd: false });
  });

  it("fails closed for expired subscriptions", () => {
    expect(parseRevenueCatBillingState({ subscriber: {
      entitlements: { pro: { expires_date: "2026-06-14T12:00:00.000Z", product_identifier: "afriterminal.pro.monthly" } },
      subscriptions: { "afriterminal.pro.monthly": { expires_date: "2026-06-14T12:00:00.000Z", store: "play_store" } },
    } }, now)).toMatchObject({ provider: "google", status: "canceled", paid: false });
  });

  it("does not accept unsupported stores", () => {
    expect(revenueCatProvider("stripe")).toBeNull();
  });
});
