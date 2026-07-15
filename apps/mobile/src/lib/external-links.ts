import { Alert, Linking } from "react-native";

const ALLOWED_HOSTS = [
  "brvm.org",
  "sikafinance.com",
  "financialafrik.com",
] as const;

function allowedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

export async function openTrustedExternalUrl(value: string): Promise<boolean> {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !allowedHost(url.hostname)) throw new Error("untrusted");
    if (!await Linking.canOpenURL(url.toString())) throw new Error("unsupported");
    await Linking.openURL(url.toString());
    return true;
  } catch {
    Alert.alert("Lien bloqué", "WARIBA n'ouvre que les sources HTTPS reconnues.");
    return false;
  }
}
