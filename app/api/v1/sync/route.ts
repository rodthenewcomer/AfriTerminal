import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CloudSyncPayload } from "@wariba/core/sync";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { cloudSyncSchema } from "@wariba/core/sync-schema";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
const MAX_SYNC_BYTES = 2_000_000;

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function readCloudState(client: SupabaseClient, userId: string): Promise<CloudSyncPayload> {
  const [watchlists, items, transactions, alerts, savedFilters, preferences] = await Promise.all([
    client.from("watchlists").select("id,name,is_active,updated_at,deleted_at").eq("user_id", userId),
    client.from("watchlist_items").select("watchlist_id,ticker,deleted_at").eq("user_id", userId),
    client.from("portfolio_transactions").select("id,ticker,side,trade_date,quantity,price,fees,updated_at,deleted_at").eq("user_id", userId),
    client.from("price_alerts").select("id,ticker,direction,target,enabled,triggered_at,channels,updated_at,deleted_at").eq("user_id", userId),
    client.from("saved_filters").select("id,name,filters,updated_at,deleted_at").eq("user_id", userId),
    client.from("user_preferences").select("key,value,updated_at").eq("user_id", userId),
  ]);
  [watchlists, items, transactions, alerts, savedFilters, preferences].forEach(({ error }) => assertNoError(error));

  return {
    watchlists: (watchlists.data ?? []).map((list) => ({
      id: list.id,
      name: list.name,
      isActive: list.is_active,
      tickers: (items.data ?? [])
        .filter((item) => item.watchlist_id === list.id && !item.deleted_at)
        .map((item) => item.ticker),
      updatedAt: list.updated_at,
      ...(list.deleted_at ? { deletedAt: list.deleted_at } : {}),
    })),
    transactions: (transactions.data ?? []).map((item) => ({
      id: item.id,
      ticker: item.ticker,
      side: item.side,
      date: item.trade_date,
      quantity: Number(item.quantity),
      price: Number(item.price),
      fees: Number(item.fees),
      updatedAt: item.updated_at,
      ...(item.deleted_at ? { deletedAt: item.deleted_at } : {}),
    })),
    alerts: (alerts.data ?? []).map((item) => ({
      id: item.id,
      ticker: item.ticker,
      direction: item.direction,
      target: Number(item.target),
      enabled: item.enabled,
      channels: item.channels,
      updatedAt: item.updated_at,
      ...(item.triggered_at ? { triggeredAt: item.triggered_at } : {}),
      ...(item.deleted_at ? { deletedAt: item.deleted_at } : {}),
    })),
    savedFilters: (savedFilters.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      filters: item.filters,
      updatedAt: item.updated_at,
      ...(item.deleted_at ? { deletedAt: item.deleted_at } : {}),
    })),
    preferences: (preferences.data ?? []).map((item) => ({
      key: item.key,
      value: item.value,
      updatedAt: item.updated_at,
    })),
  } as CloudSyncPayload;
}

async function enforcePlanLimits(client: SupabaseClient, userId: string, payload: CloudSyncPayload) {
  const { data, error } = await client
    .from("entitlements")
    .select("key,numeric_limit")
    .eq("user_id", userId)
    .in("key", ["watchlists", "price_alerts", "saved_filters"]);
  assertNoError(error);
  const limits = new Map((data ?? []).map((item) => [item.key, item.numeric_limit]));
  const counts = new Map([
    ["watchlists", payload.watchlists.filter((item) => !item.deletedAt).length],
    ["price_alerts", payload.alerts.filter((item) => !item.deletedAt && item.enabled).length],
    ["saved_filters", payload.savedFilters.filter((item) => !item.deletedAt).length],
  ]);
  for (const [key, count] of counts) {
    const limit = limits.get(key);
    if (typeof limit === "number" && count > limit) {
      return NextResponse.json(
        { error: "Limite du forfait atteinte", entitlement: key, limit },
        { status: 402 }
      );
    }
  }
  return null;
}

async function tombstoneMissing(
  client: SupabaseClient,
  table: "watchlists" | "portfolio_transactions" | "price_alerts" | "saved_filters",
  userId: string,
  incomingIds: Set<string>,
  knownIds?: string[]
) {
  const currentIds = knownIds ?? [];
  if (!knownIds) {
    for (let from = 0; ; from += 1_000) {
      const { data, error } = await client
        .from(table)
        .select("id")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .range(from, from + 999);
      assertNoError(error);
      const page = (data ?? []).map((item) => item.id as string);
      currentIds.push(...page);
      if (page.length < 1_000) break;
    }
  }
  const missing = currentIds.filter((id) => !incomingIds.has(id));
  const deletedAt = new Date().toISOString();
  for (let index = 0; index < missing.length; index += 100) {
    const { error } = await client
      .from(table)
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("user_id", userId)
      .in("id", missing.slice(index, index + 100));
    assertNoError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("sync-read", user.id, 60, 60)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    return NextResponse.json(await readCloudState(client, user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("sync-write", user.id, 12, 60)) {
      return NextResponse.json({ error: "Trop de synchronisations" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SYNC_BYTES) {
      return NextResponse.json({ error: "La synchronisation dépasse la limite de 2 Mo." }, { status: 413 });
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_SYNC_BYTES) {
      return NextResponse.json({ error: "La synchronisation dépasse la limite de 2 Mo." }, { status: 413 });
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }
    const parsed = cloudSyncSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données de synchronisation invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const payload = parsed.data as CloudSyncPayload;
    const limitResponse = await enforcePlanLimits(client, user.id, payload);
    if (limitResponse) return limitResponse;

    const { data: currentLists, error: listReadError } = await client
      .from("watchlists")
      .select("id,updated_at")
      .eq("user_id", user.id);
    assertNoError(listReadError);
    if (request.headers.get("x-sync-mode") === "replace") {
      await Promise.all([
        tombstoneMissing(client, "watchlists", user.id, new Set(payload.watchlists.map((item) => item.id)), (currentLists ?? []).map((item) => item.id)),
        tombstoneMissing(client, "portfolio_transactions", user.id, new Set(payload.transactions.map((item) => item.id))),
        tombstoneMissing(client, "price_alerts", user.id, new Set(payload.alerts.map((item) => item.id))),
        tombstoneMissing(client, "saved_filters", user.id, new Set(payload.savedFilters.map((item) => item.id))),
      ]);
    }
    const currentById = new Map((currentLists ?? []).map((item) => [item.id, item.updated_at]));
    const acceptedLists = payload.watchlists.filter((item) => {
      const current = currentById.get(item.id);
      return !current || Date.parse(item.updatedAt) >= Date.parse(current);
    });

    if (acceptedLists.length) {
      const { error } = await client.from("watchlists").upsert(
        acceptedLists.map((item) => ({
          user_id: user.id,
          id: item.id,
          name: item.name,
          is_active: item.isActive,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt ?? null,
        })),
        { onConflict: "user_id,id" }
      );
      assertNoError(error);

      for (const list of acceptedLists) {
        const { error: deleteError } = await client
          .from("watchlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("watchlist_id", list.id);
        assertNoError(deleteError);
        if (!list.deletedAt && list.tickers.length) {
          const { error: insertError } = await client.from("watchlist_items").insert(
            list.tickers.map((ticker) => ({
              user_id: user.id,
              watchlist_id: list.id,
              ticker,
              updated_at: list.updatedAt,
            }))
          );
          assertNoError(insertError);
        }
      }
    }

    if (payload.transactions.length) {
      const { error } = await client.from("portfolio_transactions").upsert(
        payload.transactions.map((item) => ({
          user_id: user.id,
          id: item.id,
          ticker: item.ticker,
          side: item.side,
          trade_date: item.date,
          quantity: item.quantity,
          price: item.price,
          fees: item.fees ?? 0,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt ?? null,
        })),
        { onConflict: "user_id,id" }
      );
      assertNoError(error);
    }

    if (payload.alerts.length) {
      const { error } = await client.from("price_alerts").upsert(
        payload.alerts.map((item) => ({
          user_id: user.id,
          id: item.id,
          ticker: item.ticker,
          direction: item.direction,
          target: item.target,
          enabled: item.enabled,
          triggered_at: item.triggeredAt ?? null,
          channels: item.channels,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt ?? null,
        })),
        { onConflict: "user_id,id" }
      );
      assertNoError(error);
    }

    if (payload.savedFilters.length) {
      const { error } = await client.from("saved_filters").upsert(
        payload.savedFilters.map((item) => ({
          user_id: user.id,
          id: item.id,
          name: item.name,
          filters: item.filters,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt ?? null,
        })),
        { onConflict: "user_id,id" }
      );
      assertNoError(error);
    }

    if (payload.preferences.length) {
      const { error } = await client.from("user_preferences").upsert(
        payload.preferences.map((item) => ({
          user_id: user.id,
          key: item.key,
          value: item.value,
          updated_at: item.updatedAt,
        })),
        { onConflict: "user_id,key" }
      );
      assertNoError(error);
    }

    return NextResponse.json(await readCloudState(client, user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
