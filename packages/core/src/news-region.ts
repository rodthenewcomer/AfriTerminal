export type NewsRegion = "brvm" | "uemoa" | "international";

export interface RegionClassifiableNews {
  title: string;
  summary: string;
  tickers: string[];
}

export function classifyNewsRegion(item: RegionClassifiableNews): NewsRegion {
  const text = `${item.title} ${item.summary}`;
  if (item.tickers.length > 0 || /\bBRVM\b/i.test(text)) return "brvm";
  if (/\b(UEMOA|WAEMU|BCEAO|C[ôo]te d.?Ivoire|S[ée]n[ée]gal|B[ée]nin|Togo|Burkina|Mali|Niger|Guin[ée]e-Bissau)\b/i.test(text)) {
    return "uemoa";
  }
  return "international";
}
