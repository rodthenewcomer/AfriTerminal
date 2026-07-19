import type { Metadata } from "next";
import { REAL_ANALYSIS_VERSION } from "@wariba/core/real-analysis";
import { getSnapshots } from "@/lib/data";
import { getRealAnalysis } from "@/lib/real-analysis";
import { MARKET_DATA_LABEL } from "@/lib/real-data";
import { ProWorkspace, type ProResearchRow } from "@/components/pro/pro-workspace";
import { ProAccessGate } from "@/components/pro/pro-access-gate";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "WARIBA Pro — Laboratoire 48",
  description: "Classement factuel, comparaison multi-facteurs et fraîcheur des comptes pour les 48 actions de la BRVM.",
};

export const dynamic = "force-dynamic";

async function proAccess(): Promise<{ authenticated: boolean; pro: boolean }> {
  if (!hasSupabasePublicEnv()) return { authenticated: false, pro: false };
  const client = await createServerSupabaseClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return { authenticated: false, pro: false };

  const [{ data: entitlement }, { data: subscriptions }] = await Promise.all([
    client
      .from("entitlements")
      .select("enabled")
      .eq("user_id", auth.user.id)
      .eq("key", "research_exports")
      .maybeSingle(),
    client
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", auth.user.id)
      .in("status", ["active", "trialing"])
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  return {
    authenticated: true,
    pro:
      entitlement?.enabled === true ||
      subscriptions?.some((item) => item.plan === "pro") === true,
  };
}

export default async function ProPage() {
  const access = await proAccess();
  if (!access.pro) {
    return (
      <ProAccessGate
        authenticated={access.authenticated}
        checkoutAvailable={Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY)}
      />
    );
  }

  const rows: ProResearchRow[] = getSnapshots().flatMap((snapshot) => {
    const analysis = getRealAnalysis(snapshot.ticker);
    if (!analysis || !snapshot.real) return [];
    return [{
      ticker: snapshot.ticker,
      name: snapshot.name,
      sector: snapshot.sector,
      country: snapshot.country,
      price: snapshot.lastPrice,
      dayChange: snapshot.dayChange,
      ytdChange: snapshot.ytdChange,
      per: snapshot.real.per,
      yieldNet: snapshot.real.netYieldPct,
      volumeRatio: snapshot.real.volumeRatio,
      overallScore: analysis.overallScore,
      quality: analysis.scores.quality,
      valuation: analysis.scores.valuation,
      momentum: analysis.scores.momentum,
      risk: analysis.scores.risk,
      confidence: analysis.confidence.level,
      confidenceLabel: analysis.confidence.label,
      coveragePct: analysis.confidence.coveragePct,
      confidenceReasons: analysis.confidence.reasons,
      fiscalYear: analysis.fiscalYear,
      publishedOn: analysis.publishedOn,
      signals: analysis.signals.map(({ id, label, tone }) => ({ id, label, tone })),
    }];
  });

  return <ProWorkspace rows={rows} marketLabel={MARKET_DATA_LABEL} methodologyVersion={REAL_ANALYSIS_VERSION} />;
}
