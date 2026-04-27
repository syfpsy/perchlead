# Perchlead

A calm, fast, premium **lead memory system** for solo founders, indie hackers, agencies, and small SaaS builders.

> Throw messy leads in. Perchlead cleans, dedupes, scores, organizes, and tells you who to follow up with next.

It is **not** a full CRM, **not** a cold email spam tool, and **not** a LinkedIn scraper. It is a beautiful inbox + lightweight CRM + enrichment-ready surface — built for builders who manage *multiple products* and want to know which lead fits which product.

Hosted on **Vercel**. Production database target: **Neon** (Postgres, serverless).

---

## What's in this repo

```
app/
  (dashboard)/         dashboard | leads | leads/[id] | imports | lists | finder | tasks | settings
components/            ui · layout · leads · imports · empty-states (incl. Cmd+K palette)
lib/
  store/               in-memory + localStorage data layer (the demo backend)
  services/            lead · import · dedupe · scoring · search · export · compliance · task
  providers/           enrichment + lead-finder provider abstractions (mock today)
  utils/               id · string normalization · format
  validators/          zod schemas
  seed/                rich demo dataset
types/                 Lead · Company · Source · Product · ScoreResult · …
db/                    Postgres schema for Neon + setup notes
docs/                  AGENT_NOTES · ARCHITECTURE · ROADMAP · HEROUI_PRO_SETUP
```

---

## Run it

```bash
# 1. install
npm install

# 2. start the dev server
npm run dev
# open http://localhost:3000

# 3. typecheck / lint / build
npm run typecheck
npm run lint
npm run build
```

The first time you load it, Perchlead seeds a demo workspace — products, tags, sources, companies, ~12 leads, saved lists, a suppression entry, demo tasks, audit log entries, recent imports. Everything works offline.

To clear or reset, go to **Settings → Data & Neon**, or run "Restore demo data" from the Cmd+K palette.

---

## What you can do today

- **Lead Inbox** — saved view tabs (All / New / Qualified / Follow up / Suppressed / your saved lists), search, filters drawer (status, tags, products, source, score, compliance), sort by score / updated / created / name, bulk select → status / suppress / export / delete, polished score badges with breakdown tooltips, status chips, click-through to profile, **save current filters as a list**.
- **Lead Profile** — header with avatar, score badge, status switcher, summary card, *Why this score* card with reason+delta breakdown and next action, timeline, notes editor, **tasks card** (add, due dates, complete, overdue), contact card, company card, tags, *multi-product interest* (low/medium/high per product), compliance panel with one-click suppression, duplicate detection with one-click merge.
- **Tasks** — `/tasks` page across every lead with Open / Overdue / Due ≤ 3d / Done / All tabs, click-through to leads.
- **Cmd+K command palette** — global Cmd/Ctrl+K (or `?`) overlay to navigate, jump to any lead, run commands. Arrow keys + Enter, Esc to close.
- **Duplicate detection** — exact email, normalized email (gmail dots / +tags), same domain + similar name, same website, fuzzy name+company. Live on the profile and during import preview.
- **Import Center** — CSV upload (with sample CSV button), paste-from-sheet (auto-detects TSV vs. CSV), auto column mapping with manual overrides, normalization, dedupe preview, suppression preview, consent basis selector, "skip likely duplicates" toggle, confirm step, audit logging, recent-imports panel.
- **Lead Finder** — query / location / niche fields with a mock provider. Multi-select → save selected as leads with `public_directory` consent and a `lead_finder` source.
- **Lists** — create, browse, see top leads in each list, delete. Demo seeds three lists.
- **Settings** — products CRUD, tags CRUD, sources view, suppression list with email/domain entries and reasons, data mode panel (download snapshot, reset to demo, clear all, Neon setup checklist).
- **Dashboard / overview** — at-a-glance counts incl. open tasks, top sources, best leads this week, recent imports, keyboard shortcut hints.
- **Compliance everywhere** — every lead has a source. Every export excludes suppressed leads by default. Every status change, import, merge, suppress, export, delete writes to `audit_logs`.

---

## Environment

Real secrets are not required to run the MVP. See `.env.example` for the shape:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_DATA_MODE` | `local` (default) or `neon` |
| `DATABASE_URL` | Pooled Neon connection — for runtime queries from Vercel functions |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection — for migrations |
| `AUTH_SECRET` / `AUTH_GITHUB_*` | When you wire Auth.js |
| `HUNTER_API_KEY` / `APOLLO_API_KEY` / `PEOPLE_DATA_LABS_API_KEY` / `GOOGLE_PLACES_API_KEY` | Future enrichment + lead-finder providers |
| `HEROUI_PRO_KEY` / `HEROUI_LICENSE_KEY` | Stored locally only — see `docs/HEROUI_PRO_SETUP.md` |

Never commit a real `.env`.

---

## What is real vs. mocked

| Area | Today | Production path |
| --- | --- | --- |
| Auth | A demo user is hard-coded | Auth.js (NextAuth) on top of Neon — see `db/README.md` |
| Database | In-memory + `localStorage` | Postgres on Neon (full schema in `/db/schema.sql`) |
| Search | Local JS filter on a built `LeadRow[]` | `tsvector` GIN index already in the schema |
| Semantic search | Type field + column reserved | `pgvector` extension is enabled in the schema; embed pipeline is left to a future job |
| Enrichment | `mockEnrichmentProvider` | Drop-in `EnrichmentProvider` interface |
| Lead Finder | `mockLeadFinderProvider` | Drop-in `LeadFinderProvider` interface |
| HeroUI Pro | Open-source `@heroui/react` | Pro v3 stack migration — see `docs/HEROUI_PRO_SETUP.md` |
| Background jobs | Sync, in-process | Vercel Cron / Inngest / Trigger.dev — wire from any service |

---

## Deploy

This repo is set up to deploy directly to **Vercel** with no backend wiring required (the local mock store works in the browser).

```bash
# from the repo root
vercel link        # one-time, links to the perchlead Vercel project
vercel --prod      # deploys
```

When you're ready to add Neon, see [`db/README.md`](db/README.md) for the schema-apply + driver-swap steps.

---

## Next recommended tasks

1. Stand up a Neon project and apply `db/schema.sql`.
2. Replace `lib/store/data-store.ts` with a Neon-backed equivalent that preserves the same shape — the rest of the app does not care.
3. Wire Auth.js and upsert into `public.users` on first login.
4. Replace mock providers (start with Hunter for email verification + Google Places for the Finder).
5. Move filtering to a Postgres function using the `tsvector` index; add the embedding job for semantic search.
6. Generic webhook + JS form-embed for capture.

---

## License / status

Internal MVP. The deployed app calls no external services from the browser — everything runs locally on the visitor's machine until you wire Neon up.
