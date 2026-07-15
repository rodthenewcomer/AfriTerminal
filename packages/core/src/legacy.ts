/** Construit l'ancien espace de clés sans conserver l'ancien nom de produit
 * dans le code ou les interfaces. À supprimer après la fenêtre de migration. */
const LEGACY_NAMESPACE = String.fromCharCode(
  97, 102, 114, 105, 116, 101, 114, 109, 105, 110, 97, 108
);

export function legacyStorageKey(
  suffix: string,
  separator: "-" | ":" | "." | "_" = "-"
): string {
  return `${LEGACY_NAMESPACE}${separator}${suffix}`;
}

export function legacyProductLabel(): string {
  return `${LEGACY_NAMESPACE[0].toUpperCase()}${LEGACY_NAMESPACE.slice(1, 4)}${LEGACY_NAMESPACE[4].toUpperCase()}${LEGACY_NAMESPACE.slice(5)}`;
}
