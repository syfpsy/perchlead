# Roadmap — Perchlead

The MVP is intentionally narrow. This is the plan for what comes next, in the order I'd ship it.

## v0.1 — what's already in this repo

- Lead Inbox (search, saved views, filters, sort, bulk actions, export)
- Lead Profile (summary, score breakdown, timeline, notes, multi-product interests, tags, compliance)
- Import Center (CSV + paste, auto-map, normalize, dedupe preview, suppression preview, audit logs)
- Lists / segments (saved views with filter chips)
- Lead Finder (mock provider, multi-select save)
- Settings (products, tags, sources, compliance, data mode)
- Overview dashboard
- Neon-targeted Postgres schema (`db/schema.sql`) — full schema, tsvector, pgvector staged

## v0.2 — the real backend

- [ ] Stand up Neon project; apply `db/schema.sql`.
- [ ] Implement `lib/store/neon-store.ts` with the same API surface as `data-store.ts`.
- [ ] Gate by `NEXT_PUBLIC_DATA_MODE`. Keep the local store for dev/offline.
- [ ] Auth.js (NextAuth) on top of Neon — upsert into `public.users` on first sign-in.
- [ ] Server actions for the heavier mutations (commitImport, mergeLeadsOp).
- [ ] Move CSV export to a server action that streams.

## v0.3 — real enrichment

- [ ] `HunterEnrichmentProvider` — email verification + domain search.
- [ ] `ApolloEnrichmentProvider` or `PeopleDataLabsProvider` for contact enrichment.
- [ ] Wire `enrichment_jobs` table; per-lead "Enrich" button on the profile.
- [ ] Cost estimates + monthly budgets in Settings.

## v0.4 — real lead finder

- [ ] `GooglePlacesLeadFinderProvider` for local-business discovery.
- [ ] Niche presets ("animation studios", "restaurants in $city", "boutique branding").
- [ ] Save → automatically attach a `lead_finder` source.

## v0.5 — capture

- [ ] Public webhook endpoint per workspace.
- [ ] JS embed snippet for website forms.
- [ ] Gumroad / Lemon Squeezy / Paddle / AppSumo CSV presets that don't need column mapping.
- [ ] Google Sheets one-way sync.

## v0.6 — search & semantics

- [ ] Move filtering to a Neon-side query using the `tsvector` column.
- [ ] Embedding pipeline (Anthropic / OpenAI). Index `leads.embedding`.
- [ ] Semantic "find me leads like this one" on the profile.

## v0.7 — outreach hand-off (no spam!)

- [ ] CSV exports tuned per target tool (Smartlead / Instantly / HubSpot).
- [ ] One-click "open in mail" with a personalized draft.
- [ ] Outreach activity webhook (record sends/replies as `interactions`).

## v0.8 — automation, lightly

- [ ] Re-score job (pg_cron) for staleness.
- [ ] Optional weekly digest email of best leads.
- [ ] Simple "if status changes to qualified, create a task" rule, configurable.

## Things we are explicitly **not** building

- Cold email sequencer or warmup.
- LinkedIn scraping or auto-connect bots.
- Heavy CRM features (deal forecasting, multi-pipeline, quotas).
- Enterprise team permissions.
- Visual automation builder.
- Dashboard with 30 charts.
