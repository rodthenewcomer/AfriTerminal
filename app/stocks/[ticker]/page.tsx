import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSnapshot, getSnapshots } from "@/lib/data";
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
  return {
    title: stock ? `${stock.ticker} — ${stock.name}` : "Action introuvable",
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
