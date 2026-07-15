/**
 * Signature WARIBA animée — le W-signal se trace puis son point-origine
 * apparaît. Même séquence que l'ouverture de l'app mobile,
 * en SVG + CSS pur (classes sig-* dans globals.css, ≤ 1 s,
 * prefers-reduced-motion respecté). Décorative : aria-hidden.
 */
export function BrandSignature({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 190 100" className={className} aria-hidden="true">
      <path
        d="M 18 22 L 54 82 L 94 42 L 134 82 L 172 22"
        className="sig-stroke"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="sig-candle" style={{ animationDelay: "0.55s" }} cx="172" cy="22" r="8" fill="#F4C96B" />
    </svg>
  );
}
