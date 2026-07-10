import { ImageResponse } from "next/og";

// Export statique : l'image est générée au build, pas à la requête.
export const dynamic = "force-static";
import { LATEST_TRADING_DATE, REAL_INDICES } from "@/lib/real-data";
import { dateFr } from "@/lib/format";

export const alt = "AfriTerminal — La BRVM devient lisible";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage du site (générée au build, données réelles du jour). */
export default function OgImage() {
  const composite = REAL_INDICES.find((i) => i.code === "BRVMC");

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
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #e2a63d, #d2a13c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#fafafa" }}>
            AfriTerminal
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#fafafa", lineHeight: 1.1 }}>
            La BRVM devient lisible
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
            Cours officiels, dividendes, portefeuille et documents — 48 sociétés cotées
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 28,
          }}
        >
          {composite ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>BRVM Composite</div>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#fafafa" }}>
                {composite.level.toFixed(2)}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  color: composite.dayChange >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {composite.dayChange >= 0 ? "+" : "−"}
                {Math.abs(composite.dayChange).toFixed(2)} %
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>
            Séance du {dateFr(LATEST_TRADING_DATE)}
          </div>
        </div>
      </div>
    ),
    size
  );
}
