export type ChartType = "candlestick" | "line" | "area" | "baseline" | "bars" | "heikin-ashi";

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y";

export type IndicatorId =
  | "sma20"
  | "sma50"
  | "sma100"
  | "sma200"
  | "ema20"
  | "vwap"
  | "bollinger"
  | "rsi"
  | "macd"
  | "atr"
  | "stoch";

export type Sector =
  | "Banque"
  | "Télécom"
  | "Agro-industrie"
  | "Industrie"
  | "Distribution"
  | "Services publics"
  /** Tickers réels sans code secteur dans le bulletin BRVM */
  | "Autre";

export type Country =
  | "Côte d'Ivoire"
  | "Sénégal"
  | "Burkina Faso"
  | "Togo"
  | "Bénin"
  | "Mali"
  | "Niger";

export interface OHLCV {
  /** 'YYYY-MM-DD' for daily+ bars, unix seconds for intraday */
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  /** Millions de FCFA */
  revenue: number;
  revenuePrev: number;
  revenueLabel: "CA" | "PNB";
  netIncome: number;
  netIncomePrev: number;
  /** Résultat des activités ordinaires (M FCFA) — clé pour détecter les bénéfices non durables */
  ordinaryIncome: number;
  pb: number;
  roe: number;
  roa: number;
  /** Dividende brut par action, FCFA. 0 si pas de dividende. */
  grossDividend: number;
  /** % du résultat distribué */
  payout: number;
  /** Banques uniquement */
  cir?: number;
  cirPrev?: number;
  loanGrowth?: number;
  costOfRiskChange?: number;
}

export interface SeriesProfile {
  /** dérive annualisée approx. (ex: 0.25 = +25%) */
  drift: number;
  /** volatilité journalière (ex: 0.014) */
  vol: number;
  /** multiple du volume moyen pour la séance du jour (défaut 1) */
  todayVolumeX?: number;
}

export interface Stock {
  ticker: string;
  name: string;
  market: "BRVM";
  sector: Sector;
  country: Country;
  currency: "FCFA";
  /** Millions d'actions en circulation */
  sharesM: number;
  lastPrice: number;
  avgVolume30d: number;
  description: string;
  profile: SeriesProfile;
  fundamentals: Fundamentals;
}

export interface Derived {
  marketCap: number;
  per: number;
  dayChange: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
  yearChange: number;
  dayVolume: number;
  volumeRatio: number;
  yieldGross: number;
  yieldNet: number;
  netDividend: number;
  netIncomeGrowth: number;
  revenueGrowth: number;
}

export interface Scores {
  quality: number;
  valuation: number;
  momentum: number;
  risk: number;
}

export type SignalTone = "positive" | "negative" | "warning" | "neutral";

export interface Signal {
  id: string;
  label: string;
  tone: SignalTone;
  detail: string;
}

export interface AIInsight {
  headline: string;
  summary: string;
  positives: string[];
  risks: string[];
  watchNext: string[];
}

export interface StockSnapshot extends Stock, Derived {
  scores: Scores;
  signals: Signal[];
  insight: AIInsight;
  /**
   * Présent si un vrai historique BRVM existe pour ce ticker (voir
   * lib/real-data.ts). Quand présent, les champs de prix/volume/PER/
   * dividende ci-dessus ont déjà été remplacés par les vraies valeurs.
   * L'analyse réelle est calculée séparément par real-analysis.ts afin de
   * ne jamais mélanger ces cotations aux anciennes données pédagogiques.
   */
  real?: RealQuote;
}

export interface DividendRecord {
  year: number;
  gross: number;
}

export interface DividendInfo {
  ticker: string;
  gross: number;
  net: number;
  exDate: string | null;
  payDate: string | null;
  history: DividendRecord[];
}

export type DocType =
  | "Résultats"
  | "États financiers"
  | "Dividende"
  | "AGO"
  | "IPO"
  | "Communiqué";

/**
 * "réel" : les chiffres cités (cours, dividende versé, date) sont
 * cohérents avec le pipeline scripts/boc/, vérifiés le 2026-07-08.
 * "illustratif" : scénario pédagogique signalé comme tel — repose sur des
 * fondamentaux (résultat net, ROE, PNB...) qu'aucun pipeline ne collecte
 * réellement. Voir DocumentCard/AlertCard pour le badge affiché.
 */
export type ContentBasis = "réel" | "illustratif";

export interface DocItem {
  id: string;
  ticker: string;
  title: string;
  type: DocType;
  date: string;
  /** 1 = info, 2 = important, 3 = critique */
  importance: 1 | 2 | 3;
  summary: string;
  keyPoints: string[];
  figures: { label: string; value: string }[];
  redFlags: string[];
  greenFlags: string[];
  basis: ContentBasis;
}

export type AlertType =
  | "prix"
  | "volume"
  | "dividende"
  | "document"
  | "fondamental"
  | "ia";

export interface AlertItem {
  id: string;
  type: AlertType;
  ticker: string | null;
  title: string;
  detail: string;
  time: string;
  severity: "info" | "warning" | "critical" | "positive";
  active: boolean;
  basis: ContentBasis;
  /** Lien primaire BRVM pour les alertes de publication. */
  sourceUrl?: string;
}

export interface IPOItem {
  id: string;
  name: string;
  ticker: string | null;
  kind: "IPO" | "Augmentation de capital" | "OPV" | "Split" | "Emprunt obligataire";
  status: "À venir" | "En cours" | "Clôturée" | "À l'étude";
  date: string;
  summary: string;
  metrics: { label: string; value: string }[];
  risk: string;
  opportunity: string;
}

export interface WatchlistDef {
  id: string;
  name: string;
  tickers: string[];
}

export interface SectorStats {
  sector: Sector;
  avgPer: number;
  avgRoe: number;
  avgYieldNet: number;
  avgNetIncomeGrowth: number;
  count: number;
}

/**
 * Cotation réelle BRVM (pipeline scripts/boc/). Les fondamentaux viennent
 * d'un registre séparé, extrait des publications financières officielles ;
 * real-analysis.ts rapproche les deux jeux sans inventer de valeur manquante.
 */
export interface RealQuote {
  ticker: string;
  name: string;
  sectorCode: string | null;
  asOfDate: string;
  /** Nature de la dernière valeur : clôture officielle BOC ou cours BRVM différé. */
  quoteStatus?: "official-close" | "delayed-live";
  /** Horodatage ISO du dernier point différé, quand quoteStatus=delayed-live. */
  asOfTimestamp?: string;
  /** Date de la clôture officielle servant de référence au cours différé. */
  officialCloseDate?: string;
  lastClose: number;
  prevClose: number;
  dayChangePct: number;
  weekChangePct: number;
  monthChangePct: number;
  quarterChangePct: number;
  halfYearChangePct: number;
  ytdChangePct: number;
  yearChangePct: number;
  /** Borné à l'historique disponible : « depuis l'introduction » si la série est plus courte. */
  fiveYearChangePct: number;
  dayVolume: number;
  avgVolume30d: number;
  volumeRatio: number;
  per: number | null;
  netYieldPct: number | null;
  lastDividendNet: number | null;
  lastDividendDate: string | null;
  /** Séance du jour : ouverture BOC, extrêmes (affinés par la collecte
   * intraday quand elle existe) et valeur échangée en FCFA. */
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  dayValueFcfa: number | null;
  /** Extrêmes de clôture sur ~252 séances (52 semaines), séries BOC réelles. */
  week52High: number;
  week52Low: number;
  /** Record de clôture de toute la série disponible (2019+). */
  allTimeHigh: number;
  allTimeHighDate: string;
  /** Derniers ~30 cours de clôture, pour les sparklines — évite un import dynamique juste pour un mini-graphe. */
  sparkline: number[];
}

export interface LiveQuotePoint {
  time: string;
  price: number;
}

export interface LiveQuoteRecord {
  open: number;
  high: number;
  low: number;
  close: number;
  samples: number;
  firstSeen: string;
  lastSeen: string;
  points: LiveQuotePoint[];
}

export interface LiveMarketPayload {
  asOfDate: string;
  updatedAt: string;
  source: string;
  delayMinutes: number;
  quotes: Record<string, LiveQuoteRecord>;
}

export interface IndexInfo {
  code: string;
  name: string;
  level: number;
  dayChange: number;
  ytdChange: number;
  spark: number[];
}
