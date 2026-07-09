# AfriTerminal ship readiness

Last reviewed: 2026-07-09

This file turns the 22-role review into release gates. It keeps the product honest while the app is still a static public MVP.

## Product truth

- Real today: BRVM prices, indices, dividends, documents, news, generated factual alerts, watchlists and saved filters in local browser storage.
- Demo today: IPO/opérations, accounts, personalized notifications, billing, broker integrations, portfolio sync, advanced AI summaries.
- Never claim: investment advice, real-time execution-grade prices, paid Pro features, or official BRVM affiliation.

## Release gates by role

1. Founder / CEO: every release must sharpen the wedge: "make BRVM readable" for investors and analysts.
2. Product Manager: public UI must not expose controls that imply unavailable accounts, paid plans, or notification delivery.
3. Technical PM: static export remains acceptable until auth, billing, or user alerts are in scope; then move to a server-backed architecture.
4. Full-Stack Engineer: no "Pro" CTA ships without auth, persistence, pricing, and support path.
5. Senior Backend Engineer: generated JSON must be reproducible from scripts and protected by tests before deploy.
6. Senior Frontend Engineer: dashboard, stock page, screener, alerts, documents, and settings must pass desktop and mobile smoke checks.
7. Applied AI / LLM Engineer: AI copy must be grounded in real extracted data or explicitly marked unavailable/demo.
8. Data Engineer: no impossible dates, duplicate records, or future dividends in `data/real/snapshot.json`.
9. DevOps / Cloud Engineer: CI must pass TypeScript tests, Python pipeline tests, build, and high+ production audit.
10. Security & Compliance Advisor: financial disclaimers and data-source labels stay visible; secrets never enter repo/workflows.
11. Product Designer / UX/UI Designer: disabled or future features must look intentionally unavailable, not broken or clickable.
12. QA Automation Engineer: add regression tests when fixing any data/parser/UI truth issue.
13. Data / Growth Analyst: new growth experiments should define events before launch: search, ticker view, filter save, watchlist add, document click.
14. Growth / GTM Marketer: acquisition copy should sell clarity and monitoring, not trading advice.
15. Content / Social Media Manager: daily content should use factual outputs: movers, dividends, documents, market breadth, news links.
16. Paid Ads Specialist: do not scale paid ads before one measurable conversion target exists.
17. BD / Sales Manager: prioritize SGI, finance media, analyst desks, education partners, and investor communities.
18. Revenue / Pricing Strategist: paid packaging starts with custom alerts, saved research workflow, document summaries, and team dashboards.
19. Customer Success / Support Lead: support copy must explain data freshness, delayed prices, and why fundamentals can be missing.
20. Operations / Project Manager: live site, local build, generated data, and README must tell the same story before release.
21. Legal Advisor: verify BRVM data redistribution and AMF-UMOA advisory boundaries before monetization.
22. Partnerships / Integrations Manager: no broker/order-routing integration before legal, security, and support ownership are clear.

## Current no-go before monetization

- Account system and billing do not exist.
- Personalized alerts do not deliver email, push, SMS, or webhook notifications.
- Some fundamentals remain curated company by company, not universal.
- Real-time data rights and redistribution terms need legal/partnership review.
