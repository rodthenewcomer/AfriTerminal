export const colors = {
  background: "#06110D",
  surface: "#0A1812",
  surface2: "#10241A",
  elevated: "#142C20",
  line: "rgba(190,255,219,0.09)",
  lineStrong: "rgba(190,255,219,0.16)",
  ink: "#F3FAF6",
  ink2: "#A5BAAF",
  ink3: "#718B7E",
  accent: "#34D98F",
  accentSoft: "rgba(52,217,143,0.14)",
  gold: "#F4C96B",
  up: "#22c55e",
  upSoft: "rgba(34,197,94,0.14)",
  down: "#ef4444",
  downSoft: "rgba(239,68,68,0.14)",
  warn: "#fb923c",
  violet: "#8b5cf6",
} as const;

export const radius = { sm: 7, md: 9, lg: 12, xl: 16, full: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const tabular: ("tabular-nums")[] = ["tabular-nums"];

/** Échelle typographique unique — même hiérarchie visuelle que le site web. */
export const type = {
  /** Grand titre d'écran (onglets). */
  display: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, color: colors.ink } as const,
  /** Titre de section. */
  title: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, color: colors.ink } as const,
  /** Texte principal (lignes, boutons). */
  body: { fontSize: 14.5, fontWeight: "600", color: colors.ink } as const,
  /** Texte secondaire. */
  sub: { fontSize: 12.5, fontWeight: "400", color: colors.ink2, lineHeight: 18 } as const,
  /** Micro-libellé en capitales (métriques, axes). */
  label: {
    fontSize: 10.5, fontWeight: "700", letterSpacing: 0.8,
    textTransform: "uppercase", color: colors.ink3,
  } as const,
  /** Légendes et notes. */
  caption: { fontSize: 11.5, fontWeight: "400", color: colors.ink3, lineHeight: 16 } as const,
} as const;
