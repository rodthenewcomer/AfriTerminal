# WARIBA ship readiness

Last reviewed: 2026-07-20

This is the release matrix for the Next.js web/API surface and the Expo iOS/Android app. WARIBA is usable without an account for public market facts. Watchlists, portfolios, alerts, saved filters and preferences are private account data whose authoritative copy is stored in the cloud; they are never business sessions persisted in the browser or device.

The remaining account, store and EAS configuration is documented
step by step in [Lancement natif WARIBA — Côte d’Ivoire](./native-release-cote-ivoire.md).

## Product truth

- Public and real: sourced BRVM prices, indices, dividends, the unified Operations and documents hub, categorized news, verified fundamentals, risk statistics, screener and SGI directory.
- WARIBA Pro is entitlement-gated on web, iOS and Android: anonymous visitors receive a clear account gate, free accounts receive an upgrade gate, and only active/trialing Pro accounts or the `research_exports` entitlement receive Laboratory 48 rows, comparisons and exports.
- Private and implemented in code: Supabase email/password, OTP, Apple/Google OAuth, account deletion, RLS-isolated watchlists, portfolios, personalized alerts, saved filters, SGI requests and preferences, plus automatic non-destructive web/iOS/Android reconciliation. An authenticated in-memory optimistic copy improves responsiveness, but logout or account change clears it immediately.
- Monetization layers are active in product logic: web checkout appears only when Stripe secrets and the monthly price exist; native access accepts the same server entitlement, while new App Store/Google Play purchases remain unavailable until store products and RevenueCat are configured and validated.
- Notifications implemented in code: consented profile preferences, Expo device registration, atomic server evaluation of synced price alerts, idempotent push/email outbox, Expo receipt handling, Resend signed webhooks, bounded retries and two protected Vercel cron routes.
- Analytics implemented in code: explicit web/mobile consent, first-party pseudonymous events, HMAC identifiers, no raw IP storage, 90-day cleanup and protected aggregate operations metrics.
- Active infrastructure: the production Supabase schema/RLS and the Vercel Next.js runtime on `wariba.app`.
- Data delivery: 48/48 stock snapshots, fundamentals and publication pages are covered; documents/news/live quotes are checked every five minutes; new annual PDFs are parsed automatically with N-1 reconciliation and fail-closed OCR; Vercel publishes `/data`, and foreground web/mobile clients check for a new version every minute.
- Information surfaces: Actualités is a first-level destination on desktop, responsive web, iOS and Android and now contains only items matched to at least one BRVM-listed company, with source attribution and ticker deep links. Dividends separates last-paid net yield, historical seasonality and the factual payment journal; no recurring month is presented as a forecast. Operations, IPO notices and official documents now share one destination.
- Stock fundamentals: every available metric on every stock sheet carries definition/formula, period, source, annual/semestrial/TTM/BRVM type, accounts date, confidence and an explicit `Verified / Calculated / Estimated / N/D` evidence status. A fixed five-fiscal-year table is shared by responsive web, iOS and Android: currently verified N/N-1 values are displayed, earlier unavailable years remain N/D, and derived margins/EPS are marked Calculated. Capital/action ownership, payout and dividend detachment fields follow the same fail-closed rule. The shared engine never calls a reduced loss a profit increase, identifies exceptional non-recurring items, never calls negative operating cash flow cash-generating, suppresses misleading PER comparisons and explains a BRVM PER based on different accounts.
- Stock charts: all 48 web and native sheets use one calendar engine for 1D/1W/1M/3M/6M/YTD/1Y/3Y/5Y/MAX. Every selection recomputes exact dates, initial/final closes, price and annualized return, period high/low, volume, no-trade sessions, best/worst session, paid dividends and total return. If no intraday samples exist, 1D displays the last official session and measures it against the previous close instead of blocking the chart. Five years never aliases MAX. The publishing pipeline repairs and preserves the 151 isolated sessions affected by PDF thousand-separator ambiguity, rejects only invalid OHLCV that cannot be repaired and reports every persistent move above 50% for corporate-action review.
- Personalized retention: account alerts prioritize watchlist and portfolio events with importance, reason, possible consequence, document link and per-type masking. Portfolio views show total performance, received and announced income, concentration, sector exposure and factual risk warnings.
- SGI orientation: the questionnaire ranks only verified contact/channel facts from the official BRVM directory. Unknown fees, account-opening delays and minimum deposits remain explicitly unknown; a saved request is marked as a WARIBA account request, never falsely presented as transmitted to the SGI.
- Not active until external configuration exists: verified Supabase Auth redirects, Apple/Google OAuth credentials, signed EAS builds, native store products and RevenueCat sandbox proof.
- Not delivered: broker/order routing, execution-grade real-time prices, SMS alerts, AI investment advice or official BRVM affiliation.

## Release gates

1. `npm ci`, `npm run lint`, `npm run typecheck`, Vitest, Python suites, Next build, Expo Doctor, Expo dependency check, iOS export, Android export and high+ production audit pass.
2. Production migrations are applied and a rollback-only two-user SQL role test proved profile/entitlement bootstrap, row isolation and cross-user write rejection. After active API keys are installed, repeat the proof through the public API and validate account deletion/cascade behavior before enabling accounts publicly.
3. Test email verification, OTP, password, Google and Apple flows on the production callback URLs. Apple login must be exercised in a signed native build.
4. Prove automatic two-way reconciliation on web, iPhone and Android with the same account, including concurrent additions/deletions, conflict timestamps, limits and malformed/oversized payload rejection. Confirm that logout/account switching clears every in-memory private store. The shared merge regression suite passes; the signed-device proof remains external.
5. Prove Public / Compte / Pro behavior with three accounts on web, iPhone and Android; confirm that no protected Laboratory 48 data is serialized to anonymous or free-account responses.
6. Test Stripe and App Store/Google Play purchase, cancellation, restore and webhook replay before enabling the corresponding checkout or store offer.
7. Publish working privacy, terms and support URLs; complete Apple privacy, Google Data safety and Financial features declarations.
8. Confirm BRVM/news/document redistribution and AMF-UMOA advisory boundaries before charging or paid acquisition.
9. Validate VoiceOver/TalkBack, Reduce Motion, Dynamic Type/font scale, notification taps and chart gestures on physical iPhone and Android devices.
10. Run signed EAS preview builds before store submission; retain artifacts and review notes.
11. Configure Expo enhanced push security, Resend sending domain/webhook and Vercel cron secrets; prove push tickets/receipts, email delivery/bounce suppression and cron replay in staging.
12. Validate analytics accept/refuse/revoke on anonymous and authenticated web/iOS/Android sessions, then verify 90-day cleanup and aggregate-only operations access.

## Surface decision

| Surface | Code status | Production status |
| --- | --- | --- |
| Public web terminal | Implemented | Live on `wariba.app` / `www.wariba.app` |
| WARIBA Pro — Laboratory 48 | Implemented on responsive web and Expo; all 48 analyses, comparisons and exports are factual | Entitlement-gated; web checkout is conditional on Stripe configuration, native purchase still external |
| Web accounts and sync | Automatic, debounced, non-destructive reconciliation implemented; no local business persistence; legacy destructive `replace` uploads are rejected | Production schema/RLS and both API keys installed; create/sign-in/me/delete/cascade passed; cross-device signed-app proof, OTP, verification e-mail and OAuth callbacks remain |
| Stripe web billing | Adapter and protected Pro route implemented | Checkout shown only when production Stripe secret and monthly price are present |
| iOS app | Implemented, first release iPhone-only | Blocked by signed build, device QA and store metadata |
| Android app | Implemented with predictive back/adaptive orientation | Blocked by signed build, device QA and Play declarations |
| Native subscriptions | RevenueCat purchase/restore/manage + server verification implemented | Existing server entitlement unlocks Pro; new purchase blocked until products and sandbox proof exist |
| Server notifications | Expo/Resend outbox, receipts, webhook, cron and native registration implemented; authenticated server delivery is authoritative and no local background-alert fallback remains | Blocked by provider keys, sending domain, EAS project and staging delivery proof |
| Product analytics | Consent-gated first-party web/mobile collection and protected metrics implemented | Supabase server key and Vercel hashing secrets configured; legal review and retention proof remain |
| Public market data | 48-stock BOC universe, 48 fundamentals, 48 publication pages, factual home rankings and freshness watchdog | Live on `wariba.app/data`; quotes remain BRVM-delayed by 15 minutes and official volumes arrive after close |

## Known external no-go items

- Supabase migrations `20260714113215` and `20260715115433` are applied remotely; all 15 application tables report RLS enabled and 32 ownership policies are present. Alert-display preferences and SGI request tracking reuse the existing RLS-protected `settings` preference row, so this release requires no unproved production schema change.
- Valid anon and `service_role` JWTs are active in production. Readiness, authenticated account read, guarded account deletion and database cascade cleanup passed against `wariba.app`; Auth site/redirect configuration still requires Dashboard verification for e-mail, OTP and OAuth callbacks.
- Vercel/runtime is active. EAS, Apple Developer, App Store Connect and Play Console credentials are not present. Verify Stripe production variables before advertising web purchase; RevenueCat/store credentials remain required for native purchase.
- Le système d'icônes WARIBA (web, iOS 1024, Android adaptatif/monochrome),
  le splash natif et l'ouverture animée sont livrés. Physical iOS/Android
  home-screen testing and an optional iOS 26 Icon Composer variant remain.
- Expo/Resend delivery and consented analytics require production secrets, provider configuration and legal validation before paid acquisition.
