/**
 * Moteur de calcul du portefeuille — fonctions pures, testées.
 *
 * Méthode du coût moyen (PRU, prix de revient unitaire) : chaque achat
 * fait évoluer le PRU ; une vente réalise la plus/moins-value contre le
 * PRU courant sans le modifier (standard de la comptabilité des
 * particuliers, cohérent avec ce que pratiquent les SGI).
 */

export interface PortfolioTransaction {
  id: string;
  ticker: string;
  side: "achat" | "vente";
  /** AAAA-MM-JJ */
  date: string;
  quantity: number;
  /** FCFA par action */
  price: number;
  /** Frais SGI/courtage en FCFA, optionnels */
  fees?: number;
}

export interface Position {
  ticker: string;
  quantity: number;
  /** Prix de revient unitaire (coût moyen), FCFA */
  averageCost: number;
  /** Montant investi restant = quantity × averageCost */
  invested: number;
  /** Plus/moins-value réalisée cumulée sur ce titre (ventes), FCFA */
  realizedPnl: number;
  /** true si une vente a dépassé la quantité détenue (saisie à vérifier) */
  oversold: boolean;
}

export interface PositionValue extends Position {
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  /** Part de la valeur totale du portefeuille, 0-100 */
  weightPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  totalRealizedPnl: number;
  positions: PositionValue[];
}

/** Positions par ticker à partir des transactions (triées par date puis
 * ordre de saisie — deux opérations le même jour gardent leur ordre). */
export function computePositions(
  transactions: PortfolioTransaction[]
): Position[] {
  const byTicker = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    const arr = byTicker.get(tx.ticker) ?? [];
    arr.push(tx);
    byTicker.set(tx.ticker, arr);
  }

  const out: Position[] = [];
  for (const [ticker, txs] of byTicker) {
    const ordered = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    let quantity = 0;
    let totalCost = 0;
    let realizedPnl = 0;
    let oversold = false;

    for (const tx of ordered) {
      const fees = tx.fees ?? 0;
      if (tx.side === "achat") {
        totalCost += tx.quantity * tx.price + fees;
        quantity += tx.quantity;
      } else {
        const sellable = Math.min(tx.quantity, quantity);
        if (tx.quantity > quantity) oversold = true;
        const avg = quantity > 0 ? totalCost / quantity : 0;
        realizedPnl += sellable * (tx.price - avg) - fees;
        totalCost -= sellable * avg;
        quantity -= sellable;
      }
    }

    out.push({
      ticker,
      quantity,
      averageCost: quantity > 0 ? totalCost / quantity : 0,
      invested: quantity > 0 ? totalCost : 0,
      realizedPnl,
      oversold,
    });
  }
  return out;
}

/** Valorise les positions au dernier cours connu et agrège le total.
 * Les positions soldées (quantité 0) sont exclues de la valorisation
 * mais leur résultat réalisé reste compté dans le total. */
export function valuePortfolio(
  positions: Position[],
  lastPriceOf: (ticker: string) => number | undefined
): PortfolioSummary {
  const totalRealizedPnl = positions.reduce((a, p) => a + p.realizedPnl, 0);
  const held = positions.filter((p) => p.quantity > 0);

  const valued = held.map((p) => {
    const lastPrice = lastPriceOf(p.ticker) ?? p.averageCost;
    const marketValue = p.quantity * lastPrice;
    const unrealizedPnl = marketValue - p.invested;
    return {
      ...p,
      lastPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct: p.invested > 0 ? (unrealizedPnl / p.invested) * 100 : 0,
      weightPct: 0, // rempli après le total
    };
  });

  const totalValue = valued.reduce((a, p) => a + p.marketValue, 0);
  const totalInvested = valued.reduce((a, p) => a + p.invested, 0);
  for (const p of valued) {
    p.weightPct = totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0;
  }
  valued.sort((a, b) => b.marketValue - a.marketValue);

  const totalUnrealizedPnl = totalValue - totalInvested;
  return {
    totalValue,
    totalInvested,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct:
      totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0,
    totalRealizedPnl,
    positions: valued,
  };
}

export interface ValuePoint {
  time: string;
  /** Valeur de marché du portefeuille ce jour-là, FCFA */
  value: number;
  /** Montant net investi cumulé à cette date (apports − retraits), FCFA */
  invested: number;
}

/**
 * Reconstruit la valeur du portefeuille séance par séance à partir des
 * transactions et des clôtures quotidiennes réelles. Les cours sont
 * reportés (forward-fill) les jours sans cotation d'un titre. Les achats
 * apparaissent comme des « marches » d'apport — c'est voulu et honnête,
 * la courbe montre le patrimoine, pas un rendement pondéré du temps.
 */
export function portfolioValueSeries(
  transactions: PortfolioTransaction[],
  closesByTicker: Record<string, { time: string; close: number }[]>
): ValuePoint[] {
  if (transactions.length === 0) return [];
  const txs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = txs[0].date;

  // union des dates de séance ≥ première transaction
  const dateSet = new Set<string>();
  for (const closes of Object.values(closesByTicker)) {
    for (const c of closes) if (c.time >= firstDate) dateSet.add(c.time);
  }
  const dates = [...dateSet].sort();
  if (dates.length === 0) return [];

  // pointeurs de forward-fill par ticker
  const pointers: Record<string, { i: number; last: number | null }> = {};
  for (const t of Object.keys(closesByTicker)) pointers[t] = { i: 0, last: null };

  let txIdx = 0;
  const qty: Record<string, number> = {};
  let invested = 0;

  const out: ValuePoint[] = [];
  for (const date of dates) {
    // applique les transactions jusqu'à cette date incluse
    while (txIdx < txs.length && txs[txIdx].date <= date) {
      const tx = txs[txIdx++];
      const fees = tx.fees ?? 0;
      if (tx.side === "achat") {
        qty[tx.ticker] = (qty[tx.ticker] ?? 0) + tx.quantity;
        invested += tx.quantity * tx.price + fees;
      } else {
        const sellable = Math.min(tx.quantity, qty[tx.ticker] ?? 0);
        qty[tx.ticker] = (qty[tx.ticker] ?? 0) - sellable;
        invested -= sellable * tx.price - fees;
      }
    }
    // avance les cours
    let value = 0;
    for (const [ticker, closes] of Object.entries(closesByTicker)) {
      const ptr = pointers[ticker];
      while (ptr.i < closes.length && closes[ptr.i].time <= date) {
        ptr.last = closes[ptr.i].close;
        ptr.i++;
      }
      const q = qty[ticker] ?? 0;
      if (q > 0 && ptr.last !== null) value += q * ptr.last;
    }
    out.push({ time: date, value, invested });
  }
  return out;
}

export interface DividendIncomeEvent {
  ticker: string;
  /** Date de paiement publiée au bulletin */
  date: string;
  /** Dividende net par action, FCFA */
  netPerShare: number;
  /** Titres détenus à la veille du paiement */
  quantityHeld: number;
  /** netPerShare × quantityHeld, FCFA */
  amount: number;
}

/**
 * Dividendes nets perçus, estimés : pour chaque versement d'une valeur
 * détenue, quantité détenue AVANT la date de paiement × dividende net
 * par action. Approximation assumée : le bulletin publie la date de
 * PAIEMENT, pas la date de détachement qui fixe l'éligibilité réelle —
 * un achat entre détachement et paiement serait compté à tort (cas
 * rare, fenêtre courte). À afficher avec la mention « estimation ».
 */
export function dividendIncome(
  transactions: PortfolioTransaction[],
  historyOf: (ticker: string) => { date: string; net: number }[]
): { events: DividendIncomeEvent[]; total: number } {
  const byTicker = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    const arr = byTicker.get(tx.ticker) ?? [];
    arr.push(tx);
    byTicker.set(tx.ticker, arr);
  }

  const events: DividendIncomeEvent[] = [];
  for (const [ticker, txs] of byTicker) {
    const ordered = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    for (const div of historyOf(ticker)) {
      let qty = 0;
      for (const tx of ordered) {
        if (tx.date >= div.date) break;
        qty += tx.side === "achat" ? tx.quantity : -tx.quantity;
      }
      qty = Math.max(0, qty);
      if (qty > 0) {
        events.push({
          ticker,
          date: div.date,
          netPerShare: div.net,
          quantityHeld: qty,
          amount: qty * div.net,
        });
      }
    }
  }
  events.sort((a, b) => b.date.localeCompare(a.date));
  return { events, total: events.reduce((a, e) => a + e.amount, 0) };
}

export interface IncomeProjection {
  ticker: string;
  /** Dernier dividende net par action, FCFA */
  netPerShare: number;
  /** Revenu annuel projeté = quantité × dernier net, FCFA */
  annual: number;
  /** Rendement sur PRU : dernier net / coût moyen, % */
  yieldOnCost: number;
}

/**
 * Revenu annuel projeté et rendement sur PRU par position — hypothèse
 * explicite : chaque société reconduit son DERNIER dividende net. Ce
 * n'est pas une prévision, c'est une projection à dividende constant,
 * à étiqueter comme telle dans l'UI. Le rendement sur PRU est le
 * rendement « personnel » du détenteur (dividende / prix payé), souvent
 * supérieur au rendement affiché du marché pour un ancien actionnaire.
 */
export function projectedIncome(
  positions: Position[],
  lastDividendOf: (ticker: string) => number | null | undefined
): {
  perPosition: IncomeProjection[];
  totalAnnual: number;
  /** Rendement sur PRU du portefeuille : revenu projeté / investi total, % */
  portfolioYieldOnCost: number;
} {
  const held = positions.filter((p) => p.quantity > 0);
  const perPosition: IncomeProjection[] = [];
  for (const p of held) {
    const net = lastDividendOf(p.ticker);
    if (!net || net <= 0) continue;
    perPosition.push({
      ticker: p.ticker,
      netPerShare: net,
      annual: p.quantity * net,
      yieldOnCost: p.averageCost > 0 ? (net / p.averageCost) * 100 : 0,
    });
  }
  const totalAnnual = perPosition.reduce((a, x) => a + x.annual, 0);
  const totalInvested = held.reduce((a, p) => a + p.invested, 0);
  return {
    perPosition,
    totalAnnual,
    portfolioYieldOnCost: totalInvested > 0 ? (totalAnnual / totalInvested) * 100 : 0,
  };
}
