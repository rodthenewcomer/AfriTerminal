# WARIBA security best-practices report

Date: 2026-07-15  
Scope: Next.js web/API, Supabase Auth/Postgres/RLS, Stripe/RevenueCat billing, Expo/Resend notifications, consented first-party analytics, Expo/React Native, WebView chart, remote/cache data, CI/CD and dependencies.

## Executive summary

The architecture now includes authentication, private account data, server routes and web payments. No known Critical or High application-code issue was found in the implementation review, but production approval remains blocked until the database migration is applied to a dedicated staging project and its RLS policies are tested with multiple users.

## Controls implemented

- Supabase access tokens are validated server-side; the service secret is confined to admin/account/webhook routes and never uses a public prefix.
- Every user table enables RLS with ownership policies. Subscription and entitlement writes are server-only; webhook events have no authenticated-client access.
- Sync payloads use Zod schemas, bounded arrays/fields and a 2 MB request limit. SQL constraints mirror finance invariants and LWW triggers reject stale updates.
- Account deletion requires an authenticated Bearer token, an explicit confirmation header and a login less than 15 minutes old; active Stripe subscriptions are canceled first.
- Stripe Checkout derives customer/user/price data on the server, uses idempotency keys and never trusts a client customer ID. Webhooks verify the raw signed body, deduplicate events and re-fetch subscription truth.
- Native purchases use App Store/Play Billing through RevenueCat. Public SDK keys stay client-side; subscriber truth is revalidated server-side before entitlements change, webhook authorization uses a constant-time comparison, and events are deduplicated.
- Web responses add CSP, frame denial, `nosniff`, strict referrer, permissions and opener policies.
- Mobile auth refresh tokens use chunked SecureStore storage. Public market payloads are runtime-validated before use/cache, caches are versioned and invalid entries are removed.
- The chart WebView accepts only its local document; remote/file navigation, new windows and raw bridge errors are blocked.
- Remote mobile links require HTTPS and an approved BRVM/news/WARIBA host. Backup import is capped at 1 MB.
- CI now includes ESLint, root/mobile TypeScript, data-contract tests, Expo health/compatibility, iOS/Android Metro exports, Python suites, Next build and a high+ production dependency gate.
- A database-backed atomic fixed-window limiter protects sync, profile, device, analytics, billing and account-deletion routes. Bucket identifiers use keyed hashes, so raw IP addresses are not stored.
- Notification delivery uses atomic alert claims, unique outbox keys, bounded retries, provider receipt processing and automatic invalid-token/bounce suppression. Cron and operations routes compare dedicated 32+ character bearer secrets in constant time; Resend webhooks verify the raw signed body and deduplicate `svix-id`.
- Product analytics is disabled until explicit consent and a build flag are both present. Local identifiers are HMAC-hashed server-side, event names/properties are allowlisted and bounded, operations output is aggregate-only, and events are purged after 90 days.

## Remaining findings

### SEC-01 — RLS/migration not dynamically verified

Severity: High release risk, not a confirmed vulnerability. No dedicated WARIBA Supabase project or local Docker/Postgres runtime was available. Apply the migration to staging and test cross-user SELECT/INSERT/UPDATE/DELETE denial, webhook/admin access, cascade deletion, plan limits and stale-write behavior before production.

### SEC-02 — Notification providers require staging verification

Severity: High release risk, not a confirmed vulnerability. Expo push tickets/receipts and Resend signed delivery/bounce events are implemented, but no EAS/Expo/Resend production credentials or sending domain were available. Prove duplicate-cron safety, retry behavior, invalid-device suppression, bounce/complaint opt-out and secret rotation in staging.

### SEC-03 — Native billing requires sandbox verification

Severity: Compliance release blocker, not a confirmed vulnerability. The adapters, server refresh and webhook are implemented, but no RevenueCat/App Store/Play credentials or products were available. Validate purchase, restore, cancellation, billing issue, expiry, transfer policy and webhook replay in signed sandbox builds before production.

### SEC-04 — Build-tool dependency advisories

Severity: Moderate. Expo SDK 54 remains pinned by repository instructions; production audit reports no high/critical findings but moderate transitive build-tool advisories remain. Do not force an Expo downgrade. Re-evaluate with supported SDK/config-plugin updates and preserve locked CI installs.

### SEC-05 — External production controls

Severity: Release blocker. Configure separate staging/production Supabase, Stripe, RevenueCat, Expo and Resend resources, secret rotation, budget alerts, webhook/cron monitoring, database backups, incident contacts, audit retention, privacy/store declarations and data-redistribution approval.

## Verification still required

- `supabase db reset`/`db lint` or remote staging migration apply.
- Two-user RLS integration suite and deletion/cascade test.
- Stripe CLI/test-mode webhook replay, duplicates and out-of-order delivery.
- RevenueCat sandbox purchase/restore/cancel/expire and authenticated webhook replay on iOS and Android.
- OAuth callback abuse tests and signed-device SecureStore/Apple login tests.
- Dynamic API/DAST and physical-device WebView/link/notification tests.
- Consent accept/refuse/revoke tests and 90-day analytics retention verification on staging.
