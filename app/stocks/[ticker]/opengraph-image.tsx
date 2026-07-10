import { ImageResponse } from "next/og";

// Export statique : l'image est générée au build, pas à la requête.
export const dynamic = "force-static";
import { getAllRealQuotes, getRealQuote } from "@/lib/real-data";
import { dateFr } from "@/lib/format";

export const alt = "Cours BRVM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllRealQuotes().map((q) => ({ ticker: q.ticker }));
}

const PRICE_FMT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Points d'un sparkline SVG à partir des ~30 dernières clôtures. */
function sparkPoints(data: number[], w: number, h: number): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  return data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
}

/**
 * Image de partage par ticker — générée au build pour les 48 valeurs :
 * cours officiel, variation, sparkline 30 séances. Un lien SNTS partagé
 * sur WhatsApp/X montre le cours au lieu d'une vignette générique.
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const q = getRealQuote(ticker.toUpperCase());
  const up = (q?.dayChangePct ?? 0) >= 0;
  const color = up ? "#22c55e" : "#ef4444";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                padding: "10px 22px",
                borderRadius: 14,
                background: "rgba(226,166,61,0.15)",
                border: "1px solid rgba(226,166,61,0.4)",
                color: "#e2a63d",
                fontSize: 40,
                fontWeight: 800,
                display: "flex",
              }}
            >
              {q?.ticker ?? ticker.toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 600,
                color: "#fafafa",
                maxWidth: 640,
              }}
            >
              {q?.name ?? ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #e2a63d, #d2a13c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              A
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#a1a1aa" }}>
              AfriTerminal
            </div>
          </div>
        </div>

        {q ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#fafafa" }}>
                {PRICE_FMT.format(q.lastClose)} FCFA
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* +/− plutôt que ▲/▼ : satori télécharge une fonte
                    dédiée pour ces glyphes (réseau requis au build) */}
                <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color }}>
                  {up ? "+" : "−"}
                  {Math.abs(q.dayChangePct).toFixed(2)} % aujourd&apos;hui
                </div>
                <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
                  YTD {q.ytdChangePct >= 0 ? "+" : ""}
                  {q.ytdChangePct.toFixed(2)} %
                </div>
              </div>
            </div>
            <svg width="420" height="150" viewBox="0 0 420 150">
              <polyline
                points={sparkPoints(q.sparkline, 420, 140)}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 48, color: "#a1a1aa" }}>
            Action BRVM
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 24,
            fontSize: 24,
            color: "#71717a",
          }}
        >
          <div style={{ display: "flex" }}>
            Cours officiel BRVM{q ? ` · séance du ${dateFr(q.asOfDate)}` : ""}
          </div>
          <div style={{ display: "flex" }}>30 dernières séances</div>
        </div>
      </div>
    ),
    size
  );
}
