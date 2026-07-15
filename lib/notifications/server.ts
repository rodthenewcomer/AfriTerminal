import { Expo, type ExpoPushMessage, type ExpoPushReceiptId } from "expo-server-sdk";
import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAllRealQuotes } from "@/lib/real-data";
import { SITE_URL } from "@/lib/site";

interface AlertRow {
  user_id: string;
  id: string;
  ticker: string;
  direction: "above" | "below";
  target: number | string;
  channels: ("in_app" | "push" | "email")[];
}

interface DeliveryAlert {
  ticker: string;
  direction: "above" | "below";
  target: number | string;
}

interface DeliveryRow {
  id: string;
  user_id: string;
  alert_id: string;
  channel: "push" | "email";
  recipient_key: string;
  attempts: number;
  price_alerts: DeliveryAlert | DeliveryAlert[];
}

function alertFromDelivery(delivery: DeliveryRow): DeliveryAlert | null {
  return Array.isArray(delivery.price_alerts) ? delivery.price_alerts[0] ?? null : delivery.price_alerts;
}

function matches(alert: AlertRow, price: number): boolean {
  const target = Number(alert.target);
  return alert.direction === "above" ? price >= target : price <= target;
}

function retryAt(attempts: number): string {
  const seconds = Math.min(21_600, 60 * 2 ** Math.max(0, attempts));
  return new Date(Date.now() + seconds * 1_000).toISOString();
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ").slice(0, 500);
}

function fcfa(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value).replace(/\u202f/g, " ") + " FCFA";
}

function emailHtml(alert: DeliveryAlert): string {
  const ticker = alert.ticker.replace(/[^A-Z0-9]/g, "");
  const target = fcfa(Number(alert.target));
  const direction = alert.direction === "above" ? "au-dessus de" : "en dessous de";
  const href = `${SITE_URL}/stocks/${encodeURIComponent(ticker)}`;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><p style="color:#e2a63d;font-weight:700">WARIBA</p><h1 style="font-size:22px">Seuil franchi · ${ticker}</h1><p style="line-height:1.6;color:#d4d4d8">Le dernier cours officiel disponible a franchi votre seuil ${direction} <strong>${target}</strong>.</p><p><a href="${href}" style="display:inline-block;background:#e2a63d;color:#09090b;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Voir la fiche action</a></p><p style="margin-top:28px;color:#71717a;font-size:12px;line-height:1.5">Information descriptive fondée sur les publications BRVM. Ceci ne constitue pas un conseil en investissement. Gérez vos notifications dans Réglages.</p></div></body></html>`;
}

async function failDelivery(delivery: DeliveryRow, error: unknown) {
  const attempts = delivery.attempts + 1;
  const terminal = attempts >= 5;
  const { error: updateError } = await createAdminSupabaseClient().from("notification_deliveries").update({
    status: terminal ? "suppressed" : "failed",
    attempts,
    next_attempt_at: retryAt(attempts),
    last_error: safeError(error),
  }).eq("id", delivery.id);
  if (updateError) throw updateError;
}

async function disablePushDevice(userId: string, deviceId: string) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("device_push_tokens").update({ disabled: true })
    .eq("user_id", userId).eq("device_id", deviceId);
  if (error) throw error;
  const { count, error: countError } = await admin.from("device_push_tokens")
    .select("device_id", { count: "exact", head: true }).eq("user_id", userId).eq("disabled", false);
  if (countError) throw countError;
  if (!count) {
    const { error: profileError } = await admin.from("profiles").update({ push_notifications: false }).eq("id", userId);
    if (profileError) throw profileError;
  }
}

export async function evaluatePriceAlerts(): Promise<number> {
  const admin = createAdminSupabaseClient();
  const quotes = new Map(getAllRealQuotes().map((quote) => [quote.ticker, quote.lastClose]));
  const { data, error } = await admin.from("price_alerts")
    .select("user_id,id,ticker,direction,target,channels")
    .eq("enabled", true).is("triggered_at", null).is("deleted_at", null).limit(1_000);
  if (error) throw error;
  const candidates = (data ?? []) as AlertRow[];
  const triggeredAt = new Date().toISOString();
  const claimed: AlertRow[] = [];
  for (const alert of candidates) {
    const price = quotes.get(alert.ticker);
    if (price === undefined || !matches(alert, price)) continue;
    const { data: row, error: claimError } = await admin.from("price_alerts").update({
      triggered_at: triggeredAt,
      enabled: false,
      updated_at: triggeredAt,
    }).eq("user_id", alert.user_id).eq("id", alert.id).eq("enabled", true).is("triggered_at", null)
      .select("user_id,id,ticker,direction,target,channels").maybeSingle();
    if (claimError) throw claimError;
    if (row) claimed.push(row as AlertRow);
  }
  if (!claimed.length) return 0;

  const userIds = [...new Set(claimed.map((alert) => alert.user_id))];
  const [profilesResult, tokensResult] = await Promise.all([
    admin.from("profiles").select("id,email_notifications,push_notifications").in("id", userIds),
    admin.from("device_push_tokens").select("user_id,device_id").in("user_id", userIds).eq("disabled", false),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (tokensResult.error) throw tokensResult.error;
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const tokensByUser = new Map<string, { device_id: string }[]>();
  for (const token of tokensResult.data ?? []) {
    const entries = tokensByUser.get(token.user_id) ?? [];
    entries.push(token);
    tokensByUser.set(token.user_id, entries);
  }
  const deliveries: Record<string, unknown>[] = [];
  for (const alert of claimed) {
    const profile = profiles.get(alert.user_id);
    if (alert.channels.includes("email") && profile?.email_notifications) {
      deliveries.push({ user_id: alert.user_id, alert_id: alert.id, channel: "email", recipient_key: "email", triggered_at: triggeredAt });
    }
    if (alert.channels.includes("push") && profile?.push_notifications) {
      for (const token of tokensByUser.get(alert.user_id) ?? []) {
        deliveries.push({ user_id: alert.user_id, alert_id: alert.id, channel: "push", recipient_key: token.device_id, triggered_at: triggeredAt });
      }
    }
  }
  if (deliveries.length) {
    const { error: deliveryError } = await admin.from("notification_deliveries").upsert(deliveries, {
      onConflict: "user_id,alert_id,channel,recipient_key,triggered_at",
      ignoreDuplicates: true,
    });
    if (deliveryError) throw deliveryError;
  }
  return claimed.length;
}

export async function dispatchPendingDeliveries(): Promise<{ push: number; email: number }> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("notification_deliveries")
    .select("id,user_id,alert_id,channel,recipient_key,attempts,price_alerts(ticker,direction,target)")
    .in("status", ["pending", "failed"]).lt("attempts", 5)
    .lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(200);
  if (error) throw error;
  const deliveries = (data ?? []) as unknown as DeliveryRow[];
  const pushDeliveries = deliveries.filter((delivery) => delivery.channel === "push");
  const emailDeliveries = deliveries.filter((delivery) => delivery.channel === "email");
  let sentPush = 0;
  let sentEmail = 0;

  if (pushDeliveries.length) {
    const userIds = [...new Set(pushDeliveries.map((delivery) => delivery.user_id))];
    const { data: tokens, error: tokenError } = await admin.from("device_push_tokens")
      .select("user_id,device_id,token,disabled").in("user_id", userIds);
    if (tokenError) throw tokenError;
    const byDevice = new Map((tokens ?? []).map((token) => [`${token.user_id}:${token.device_id}`, token]));
    const expo = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined);
    const ready: { delivery: DeliveryRow; message: ExpoPushMessage }[] = [];
    for (const delivery of pushDeliveries) {
      const token = byDevice.get(`${delivery.user_id}:${delivery.recipient_key}`);
      const alert = alertFromDelivery(delivery);
      if (!token || token.disabled || !Expo.isExpoPushToken(token.token) || !alert) {
        await admin.from("notification_deliveries").update({ status: "suppressed", last_error: "Push token unavailable" }).eq("id", delivery.id);
        continue;
      }
      ready.push({ delivery, message: {
        to: token.token,
        title: `${alert.ticker} · seuil franchi`,
        body: `${alert.direction === "above" ? "Au-dessus de" : "En dessous de"} ${fcfa(Number(alert.target))}`,
        data: { ticker: alert.ticker, alertId: delivery.alert_id },
        sound: "default",
        channelId: "price-alerts",
        collapseId: `price-alert-${delivery.alert_id}`.slice(0, 64),
        tag: `price-alert-${delivery.alert_id}`.slice(0, 64),
      } });
    }
    for (const chunk of expo.chunkPushNotifications(ready.map((entry) => entry.message))) {
      const start = ready.findIndex((entry) => entry.message === chunk[0]);
      const entries = ready.slice(start, start + chunk.length);
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (let index = 0; index < tickets.length; index += 1) {
          const ticket = tickets[index];
          const delivery = entries[index]?.delivery;
          if (!delivery) continue;
          if (ticket.status === "ok") {
            const { error: updateError } = await admin.from("notification_deliveries").update({
              status: "sent", provider_id: ticket.id, attempts: delivery.attempts + 1, last_error: null,
            }).eq("id", delivery.id);
            if (updateError) throw updateError;
            sentPush += 1;
          } else {
            if (ticket.details?.error === "DeviceNotRegistered") {
              await disablePushDevice(delivery.user_id, delivery.recipient_key);
            }
            await failDelivery(delivery, ticket.message);
          }
        }
      } catch (pushError) {
        for (const entry of entries) await failDelivery(entry.delivery, pushError);
      }
    }
  }

  if (emailDeliveries.length) {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!resendKey || !from) {
      for (const delivery of emailDeliveries) await failDelivery(delivery, "Resend is not configured");
    } else {
      const resend = new Resend(resendKey);
      for (const delivery of emailDeliveries) {
        const alert = alertFromDelivery(delivery);
        try {
          if (!alert) throw new Error("Alert not found");
          const [{ data: profile, error: profileError }, { data: authData, error: authError }] = await Promise.all([
            admin.from("profiles").select("email_notifications").eq("id", delivery.user_id).single(),
            admin.auth.admin.getUserById(delivery.user_id),
          ]);
          if (profileError) throw profileError;
          if (authError) throw authError;
          const email = authData.user?.email;
          if (!profile?.email_notifications || !email) {
            await admin.from("notification_deliveries").update({ status: "suppressed", last_error: "Email notifications disabled" }).eq("id", delivery.id);
            continue;
          }
          const result = await resend.emails.send({
            from,
            to: email,
            subject: `${alert.ticker} a franchi votre seuil`,
            html: emailHtml(alert),
          }, { idempotencyKey: `afriterminal-alert-${delivery.id}-${delivery.attempts + 1}` });
          if (result.error || !result.data?.id) throw new Error(result.error?.message ?? "Resend rejected message");
          const { error: updateError } = await admin.from("notification_deliveries").update({
            status: "sent", provider_id: result.data.id, attempts: delivery.attempts + 1, last_error: null,
          }).eq("id", delivery.id);
          if (updateError) throw updateError;
          sentEmail += 1;
        } catch (emailError) {
          await failDelivery(delivery, emailError);
        }
      }
    }
  }
  return { push: sentPush, email: sentEmail };
}

export async function processPushReceipts(): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("notification_deliveries")
    .select("id,user_id,alert_id,channel,recipient_key,attempts,provider_id,price_alerts(ticker,direction,target)")
    .eq("channel", "push").eq("status", "sent").not("provider_id", "is", null)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()).limit(1_000);
  if (error) throw error;
  const deliveries = (data ?? []) as unknown as (DeliveryRow & { provider_id: string })[];
  if (!deliveries.length) return 0;
  const expo = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined);
  const byReceipt = new Map(deliveries.map((delivery) => [delivery.provider_id, delivery]));
  let processed = 0;
  for (const chunk of expo.chunkPushNotificationReceiptIds([...byReceipt.keys()] as ExpoPushReceiptId[])) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    for (const [receiptId, receipt] of Object.entries(receipts)) {
      const delivery = byReceipt.get(receiptId);
      if (!delivery) continue;
      if (receipt.status === "ok") {
        const { error: updateError } = await admin.from("notification_deliveries").update({ status: "delivered", last_error: null }).eq("id", delivery.id);
        if (updateError) throw updateError;
      } else if (receipt.details?.error === "DeviceNotRegistered") {
        const { error: updateError } = await admin.from("notification_deliveries")
          .update({ status: "suppressed", last_error: safeError(receipt.message) }).eq("id", delivery.id);
        if (updateError) throw updateError;
        await disablePushDevice(delivery.user_id, delivery.recipient_key);
      } else {
        await failDelivery(delivery, receipt.message);
      }
      processed += 1;
    }
  }
  return processed;
}

export async function cleanOperationalData(): Promise<void> {
  const admin = createAdminSupabaseClient();
  const [events, limits, providerEvents] = await Promise.all([
    admin.from("product_events").delete().lt("received_at", new Date(Date.now() - 90 * 86_400_000).toISOString()),
    admin.from("api_rate_limits").delete().lt("updated_at", new Date(Date.now() - 2 * 86_400_000).toISOString()),
    admin.from("notification_provider_events").delete().lt("processed_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);
  const error = events.error ?? limits.error ?? providerEvents.error;
  if (error) throw error;
}
