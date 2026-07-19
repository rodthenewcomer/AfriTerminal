# WARIBA senior audit — web, iOS and Android

Baseline audit: 2026-07-14  
Implementation update: 2026-07-16
Access/fundamentals update: 2026-07-19
Scope: product, code, data, auth, API, billing, native UX, security,
operations, release and commercial readiness.

## Executive decision

| Surface | Current decision | Evidence |
| --- | --- | --- |
| Public web | **Live** | Next.js runtime and sourced BRVM terminal available on `wariba.app` and `www.wariba.app` |
| Web account | **Implemented; callback QA pending** | Visible login/register entry points, Supabase password flow, OTP, OAuth callback, RLS sync, account deletion |
| Shared Expo app | **Release-candidate code** | Native iOS/Android routes, local-first data, auth, sync, billing adapter, notifications, analytics and exports |
| iOS store release | **External no-go** | Signed EAS build, physical-device QA, Apple/OAuth/store setup and declarations remain |
| Android store release | **External no-go** | Signed EAS build, physical-device QA, Play organization/app setup and declarations remain; RevenueCat is post-launch |
| WARIBA Pro | **Entitlement-gated** | Laboratory 48 is protected on responsive web and native; public facts remain open |
| Monetization | **Layered activation** | Stripe checkout is conditional on production variables; native purchases wait for store/RevenueCat proof |

## Product identity delivered

WARIBA is the only product name on customer-facing surfaces, metadata and
documentation. Persisted namespaces are now WARIBA-native; compatibility
with older local exports is handled without exposing the former brand.

- Actualités is a first-level destination on every navigation, with a lead story, search, listed-company/regional filters, original-source links and ticker deep links.
- Dividends now separates verified last-paid net yields, historical seasonality and the factual payment journal on web, iOS and Android.
- Every stock fundamental now exposes its definition/formula, and all verified N/N-1 fields are presented in a visual comparison block rather than only as small percentage text.
- WARIBA Pro exposes the 48-stock factual universe with search, factor sorting, three-stock web comparison, two-stock native comparison, CSV export, publication date, confidence, coverage and score reasons. The spreadsheet's prescriptive buy/avoid labels were not imported.

- Visual thesis: obsidian market intelligence with a luminous jade W-signal
  and a restrained gold origin point.
- Web: new favicon/PWA/Apple assets, metadata, manifest, wordmark and explicit
  Connexion / Créer un compte actions.
- iOS: opaque 1024 px icon, dark launch screen, animated reduced-motion-aware
  opening, premium onboarding and Apple sign-in support.
- Android: adaptive foreground/background, monochrome icon, dark launch
  screen, predictive back and the same onboarding/auth hierarchy.
- Native identifiers: `wariba://`, `app.wariba.mobile`.

## Login, registration and onboarding

The previous discoverability failure is fixed:

1. Web guests see labelled **Connexion** and **S'inscrire** actions in the
   terminal top bar, plus labelled actions in public/auth headers.
2. Mobile first launch ends with **Créer mon compte**, **Se connecter** and
   **Explorer sans compte**.
3. Returning mobile guests see account actions on the home screen and at the
   top of the Plus screen.
4. Dedicated web and native sign-in/sign-up/OTP routes call Supabase Auth;
   guest market access remains available.
5. Signed-in users get automatic, non-destructive cross-device reconciliation with a manual retry, manage billing
   and delete the account.

## 22-role current readout

| Role | Current state / next gate |
| --- | --- |
| Founder / CEO | Clear WARIBA identity and `wariba.app`; store release still needs owner accounts |
| Product Manager | Public / Compte / Pro boundary implemented without reducing the homepage |
| Technical PM | Web/API/mobile boundaries, env matrix and release gates documented |
| Full-Stack Engineer | Next.js, Expo and shared core integrated |
| Senior Backend Engineer | Supabase schema, RLS, sync API, deletion and operations routes implemented |
| Senior Frontend Engineer | Responsive web shell, auth routes and PWA metadata implemented |
| Applied AI / LLM Engineer | No investment-advice AI shipped; intentionally out of scope |
| Data Engineer | Official BRVM ingestion and freshness automation remain product foundation |
| Market Data QA | 48/48 actions, fundamentals and publication pages covered; stale suspended values excluded from session rankings |
| DevOps / Cloud Engineer | Vercel/Supabase active; EAS and provider secrets remain |
| Security & Compliance | RLS, security headers, protected secrets and deletion flow implemented; legal/store declarations remain |
| Product Designer | WARIBA brand, icon system, splash, onboarding and auth hierarchy delivered |
| QA Automation | Web/native static gates exist; signed-device journey automation remains |
| Data / Growth Analyst | Consent-first event layer implemented; production retention proof remains |
| Growth / GTM | Brand/domain ready; paid acquisition waits for store/provider/legal gates |
| Content / Social | Product language is consistent; launch kit is separate work |
| Paid Ads | Hold until activation measurement and native releases |
| BD / Sales | B2B/team entitlement foundation exists; commercial collateral remains |
| Revenue / Pricing | Pro target set at 3,000 FCFA/month; annual target 30,000 FCFA; provider activation remains gated by QA |
| Customer Success | Support, privacy, terms and account deletion routes exist |
| Operations / PM | `docs/ship-readiness.md` is the source of truth |
| Legal Advisor | Financial-services boundaries and distribution rights need counsel sign-off |
| Partnerships / Integrations | Supabase, Stripe, RevenueCat, Expo and Resend adapters exist; credentials/contracts remain |

## Release evidence already obtained

- Production Supabase migrations applied; 15 application tables have RLS and
  32 policies.
- Disposable production lifecycle passed: create, password sign-in,
  authenticated `/api/v1/me`, guarded delete and cascade cleanup.
- Vercel production is live with security headers.
- Web and native TypeScript/tests/build/export gates are defined in CI.

## Remaining external release gates

1. Confirm Supabase production site URL and all web/mobile redirect URLs.
2. Prove OTP, e-mail verification, Apple and Google on production callbacks.
3. Produce signed EAS preview builds and validate on physical iPhone/Android.
4. Complete Apple privacy, Google Data safety, financial-feature and legal
   declarations.
5. Prove push/e-mail delivery, analytics consent/revocation and retention.
6. After launch only: configure and validate Stripe/RevenueCat before introducing any paywall.

Current status details live in [ship-readiness.md](ship-readiness.md).
