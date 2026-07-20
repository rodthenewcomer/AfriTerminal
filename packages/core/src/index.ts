/**
 * Point d'entrée du package — la plupart des consommateurs importent un
 * module précis (`@wariba/core/portfolio`, `.../risk`...) pour garder
 * les mêmes chemins d'import qu'avant l'extraction (`@/lib/portfolio`).
 * Ce barrel existe pour les cas où l'ensemble est utile d'un coup.
 */
export * from "./types";
export * from "./live-market";
export * from "./alerts";
export * from "./format";
export * from "./portfolio";
export * from "./risk";
export * from "./indicators";
export * from "./glossary";
export * from "./company-profiles";
export * from "./treemap";
export * from "./utils";
export * from "./sync";
export * from "./legacy";
export * from "./real-analysis";
export * from "./financial-language";
export * from "./financial-history";
export * from "./company-metadata";
export * from "./sgi";
export * from "./news-region";
export * from "./market-series";
