# WARIBA ship readiness

Last reviewed: 2026-07-15

This is the release matrix for the Next.js web/API surface and the Expo iOS/Android app. WARIBA remains local-first and usable without an account; cloud sync and billing are optional capabilities.

## Product truth

- Public and real: sourced BRVM prices, indices, dividends, official documents, operations, news, factual alerts, verified fundamentals, risk statistics and local research tools.
- Private and implemented in code: Supabase email/password, OTP, Apple/Google OAuth, account deletion, RLS-isolated watchlists, portfolios, alerts, saved filters and preferences, plus explicit upload/download sync.
- Monetization implemented in code: multi-provider Free/Pro entitlements, Stripe Checkout/customer portal on web, RevenueCat App Store/Play offerings, purchase, restore and subscription management on mobile, server-side subscriber verification, and authenticated/idempotent webhooks.
- Notifications implemented in code: consented profile preferences, Expo device registration, atomic server evaluation of synced price alerts, idempotent push/email outbox, Expo receipt handling, Resend signed webhooks, bounded retries and two protected Vercel cron routes.
- Analytics implemented in code: explicit web/mobile consent, first-party pseudonymous events, HMAC identifiers, no raw IP storage, 90-day cleanup and protected aggregate operations metrics.
- Active infrastructure: the production Supabase schema/RLS and the Vercel Next.js runtime on `wariba.app`.
- Not active until external configuration exists: verified Supabase Auth redirects, Stripe product/webhook, RevenueCat project/webhook, Apple/Google OAuth credentials, App Store/Play products and signed EAS builds.
- Not delivered: broker/order routing, execution-grade real-time prices, SMS alerts, AI investment advice or official BRVM affiliation.

## Release gates

1. `npm ci`, `npm run lint`, `npm run typecheck`, Vitest, Python suites, Next build, Expo Doctor, Expo dependency check, iOS export, Android export and high+ production audit pass.
2. Production migrations are applied and a rollback-only two-user SQL role test proved profile/entitlement bootstrap, row isolation and cross-user write rejection. After active API keys are installed, repeat the proof through the public API and validate account deletion/cascade behavior before enabling accounts publicly.
3. Test email verification, OTP, password, Google and Apple flows on the production callback URLs. Apple login must be exercised in a signed native build.
4. Prove upload/download on web, iPhone and Android with the same account, including conflict timestamps, limits and malformed/oversized payload rejection.
5. Test Stripe Checkout, portal, renewal, cancellation, duplicate webhook and out-of-order webhook delivery in test mode.
6. Keep Stripe purchase CTAs out of native apps. Test App Store/Google Play purchase, cancellation, restore, cross-platform login, server refresh and RevenueCat webhook replay against the same entitlement records.
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
| Web accounts and sync | Implemented; production schema/RLS and both API keys installed | Create/sign-in/me/delete/cascade passed in production; OTP, verification e-mail and OAuth callback proof remain |
| Stripe web billing | Implemented | Blocked by Stripe product, keys and webhook |
| iOS app | Implemented, first release iPhone-only | Blocked by signed build, device QA and store metadata |
| Android app | Implemented with predictive back/adaptive orientation | Blocked by signed build, device QA and Play declarations |
| Native subscriptions | RevenueCat purchase/restore/manage + server verification implemented | Blocked by RevenueCat/App Store/Play configuration and sandbox validation |
| Server notifications | Expo/Resend outbox, receipts, webhook, cron and native registration implemented; local fallback retained | Blocked by provider keys, sending domain, EAS project and staging delivery proof |
| Product analytics | Consent-gated first-party web/mobile collection and protected metrics implemented | Supabase server key and Vercel hashing secrets configured; legal review and retention proof remain |

## Known external no-go items

- Supabase migrations `20260714113215` and `20260715115433` are applied remotely; all 15 application tables report RLS enabled and 32 ownership policies are present.
- Valid anon and `service_role` JWTs are active in production. Readiness, authenticated account read, guarded account deletion and database cascade cleanup passed against `wariba.app`; Auth site/redirect configuration still requires Dashboard verification for e-mail, OTP and OAuth callbacks.
- Vercel/runtime is active. Stripe, RevenueCat, EAS, Apple Developer, App Store Connect and Play Console credentials are not present.
- Le système d'icônes WARIBA (web, iOS 1024, Android adaptatif/monochrome),
  le splash natif et l'ouverture animée sont livrés. Physical iOS/Android
  home-screen testing and an optional iOS 26 Icon Composer variant remain.
- Expo/Resend delivery and consented analytics require production secrets, provider configuration and legal validation before paid acquisition.
