import { Platform } from "react-native";
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from "react-native-purchases";

const entitlementId = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
});

let configured = false;
let currentUserId: string | null = null;
let transition: Promise<void> = Promise.resolve();

export type NativeBillingPackage = PurchasesPackage;

export function isNativeBillingConfigured(): boolean {
  return Boolean(apiKey);
}

function hasPro(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[entitlementId]);
}

export function setNativeBillingUser(userId: string | null): Promise<void> {
  transition = transition.catch(() => undefined).then(async () => {
    if (!apiKey) return;
    if (!configured) {
      if (!userId) return;
      Purchases.configure({ apiKey, appUserID: userId });
      configured = true;
      currentUserId = userId;
      return;
    }
    if (userId === currentUserId) return;
    if (userId) await Purchases.logIn(userId);
    else if (currentUserId) await Purchases.logOut();
    currentUserId = userId;
  });
  return transition;
}

export async function loadNativePackages(userId: string): Promise<NativeBillingPackage[]> {
  await setNativeBillingUser(userId);
  const offering = (await Purchases.getOfferings()).current;
  return offering?.availablePackages ?? [];
}

export async function purchaseNativePackage(item: NativeBillingPackage): Promise<boolean> {
  try {
    return hasPro((await Purchases.purchasePackage(item)).customerInfo);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    throw error;
  }
}

export async function restoreNativePurchases(): Promise<boolean> {
  return hasPro(await Purchases.restorePurchases());
}

export async function manageNativeSubscription(): Promise<void> {
  await Purchases.showManageSubscriptions();
}
