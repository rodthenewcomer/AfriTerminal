import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSnapshot, getSnapshots } from "@/lib/data";
import { dateFr, fcfa, pct } from "@wariba/core/format";
import { StockView } from "@/components/stocks/stock-view";

export function generateStaticParams() {
  return getSnapshots().map((s) => ({ ticker: s.ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const stock = getSnapshot(ticker.toUpperCase());
  if (!stock) return { title: "Action introuvable" };
  // Description programmatique sur données réelles — le contenu SEO
  // (« cours SNTS BRVM », « dividende SGBC »...) vient du pipeline.
  const description = stock.real
    ? `Cours ${stock.ticker} (${stock.name}) : ${fcfa(stock.lastPrice)} au ${dateFr(stock.real.asOfDate)} (${pct(stock.dayChange)}). Graphique, volumes, PER, dividendes et historique BRVM depuis 2019.`
    : undefined;
  return {
    title: `${stock.ticker} — ${stock.name}`,
    description,
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const key = ticker.toUpperCase();
  if (!getSnapshot(key)) notFound();
  return <StockView ticker={key} />;
}
