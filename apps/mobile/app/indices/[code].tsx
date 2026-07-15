import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { OHLCV } from "@wariba/core/types";
import { pct } from "@wariba/core/format";
import { fetchDataFile } from "../../src/data/api";
import { indexSeriesSchema } from "../../src/data/validation";
import { WebChart, type WebChartPayload } from "../../src/components/chart/WebChart";
import { ChangePill, EmptyState, LoadingState, Metric, Page, SegmentedTabs } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { colors, tabular, type } from "../../src/theme";

type IndexPoint = { time: string; value: number };

const RANGES = [
  { id: "1m", label: "1M", bars: 22 },
  { id: "3m", label: "3M", bars: 66 },
  { id: "6m", label: "6M", bars: 132 },
  { id: "ytd", label: "YTD", bars: 0 },
  { id: "1y", label: "1A", bars: 264 },
  { id: "all", label: "Tout", bars: Number.POSITIVE_INFINITY },
] as const;

function slicePoints(points: IndexPoint[], rangeId: string): IndexPoint[] {
  if (rangeId === "ytd") {
    const lastTime = points[points.length - 1]?.time ?? "";
    return points.filter((point) => point.time >= `${lastTime.slice(0, 4)}-01-01`);
  }
  const bars = RANGES.find((item) => item.id === rangeId)?.bars ?? Number.POSITIVE_INFINITY;
  return Number.isFinite(bars) ? points.slice(-bars) : points;
}

export default function IndexScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = String(params.code ?? "BRVMC").toUpperCase();
  const market = useMarketData();
  const record = market.indices.find((index) => index.code === code);
  const [points, setPoints] = useState<IndexPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<string>("6m");

  useEffect(() => {
    let cancelled = false;
    fetchDataFile(`real/index-series/${code}.json`, indexSeriesSchema)
      .then((result) => { if (!cancelled) setPoints(result.data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [code]);

  const visible = useMemo(() => slicePoints(points ?? [], range), [points, range]);
  const payload = useMemo<WebChartPayload>(() => ({
    ticker: record?.name ?? code,
    chartType: "area",
    bars: visible.map((point): OHLCV => ({
      time: point.time, open: point.value, high: point.value, low: point.value, close: point.value, volume: 0,
    })),
    overlays: [], panes: {}, referenceLines: [], levels: [], markers: [],
    logarithmic: false, percentMode: false, levelMode: false, fit: true,
  }), [code, record?.name, visible]);

  const windowStats = useMemo(() => {
    if (!visible.length) return null;
    const values = visible.map((point) => point.value);
    const first = values[0];
    const last = values[values.length - 1];
    return {
      high: Math.max(...values),
      low: Math.min(...values),
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [visible]);

  return (
    <Page>
      <Stack.Screen options={{ title: record?.name ?? code }} />

      {record ? (
        <View style={styles.hero}>
          <View>
            <Text style={styles.label}>{record.name}</Text>
            <Text style={styles.level}>{record.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</Text>
            <Text style={styles.asOf}>Clôture du {record.asOfDate}</Text>
          </View>
          <View style={styles.pills}>
            <ChangePill value={record.dayChangePct} label={pct(record.dayChangePct, { signed: true, digits: 2 })} />
            <Text style={styles.ytd}>{pct(record.ytdChangePct, { signed: true, digits: 1 })} YTD</Text>
          </View>
        </View>
      ) : null}

      <SegmentedTabs tabs={RANGES} active={range} onChange={setRange} />

      {points === null && !failed ? <LoadingState label="Chargement de la série de l'indice…" /> : null}
      {failed ? <EmptyState icon="stats-chart-outline" title="Série indisponible" detail={`L'historique de ${code} n'a pas pu être chargé.`} /> : null}
      {points !== null && visible.length >= 2 ? <WebChart payload={payload} height={340} /> : null}

      {windowStats ? (
        <View style={styles.metrics}>
          <Metric label="Sur la période" value={pct(windowStats.changePct, { signed: true, digits: 2 })} tone={windowStats.changePct >= 0 ? "up" : "down"} detail={`${visible.length} séances`} />
          <Metric label="Plus haut" value={windowStats.high.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} />
          <Metric label="Plus bas" value={windowStats.low.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} />
        </View>
      ) : null}

      <Text style={styles.note}>
        Indice calculé et publié par la BRVM ; historique reconstitué depuis les bulletins officiels de cote.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  label: { ...type.label },
  level: { color: colors.ink, fontSize: 32, fontWeight: "800", letterSpacing: -0.7, marginTop: 5, fontVariant: tabular },
  asOf: { ...type.caption, marginTop: 4 },
  pills: { alignItems: "flex-end", gap: 6, paddingTop: 2 },
  ytd: { ...type.caption, fontVariant: tabular },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  note: { ...type.caption, textAlign: "center", paddingHorizontal: 8 },
});
