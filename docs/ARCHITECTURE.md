# Architecture — Perchlead

A snapshot of how the app is wired today and where it's going. Keep it terse.

## Layers

```
┌────────────────────────────────────────────────────────────────────┐
│  app/(dashboard)/*  — Next.js App Router screens (client)         │
├────────────────────────────────────────────────────────────────────┤
│  components/         leads · imports · ui · layout · empty-states │
├────────────────────────────────────────────────────────────────────┤
│  lib/services/       lead · import · dedupe · scoring · search    │
│                      · export · compliance                         │
│  lib/validators/     zod                                          │
├────────────────────────────────────────────────────────────────────┤
│  lib/store/          data-store.ts (in-memory + localStorage)     │
│                      use-snapshot.ts (useSyncExternalStore hook)  │
├────────────────────────────────────────────────────────────────────┤
│  lib/providers/      enrichment · lead-finder (mock today)        │
│  lib/seed/           demo-data.ts                                  │
└────────────────────────────────────────────────────────────────────┘
```

The contract between the UI and the data layer is **the snapshot shape** in `lib/store/data-store.ts`. Pages render off `useSnapshot()`; they call services to mutate; services call `store.update()`; the snapshot is replayed everywhere via `useSyncExternalStore`.

## Why this shape

- **One snapshot, many derived views.** Pure functions like `buildLeadRows`, `applyFilters`, `sortRows`, and `findDuplicates` derive UI state from the snapshot. No state-management library — just `useSyncExternalStore`.
- **Pure services.** Most services don't depend on the store at all; they take inputs and return outputs. Only `lead-service` and `import-service` write through the store.
- **Drop-in Neon.** Replace `lib/store/data-store.ts` with a Neon-backed module that exposes the same API surface (`store.get()`, `store.update()`, `store.subscribe()`). The pages don't care.

## Lead lifecycle

1. **Capture** — manual create / paste / CSV upload / Lead Finder.
2. **Normalize** — `normalizeRow()` titles names, lowercases emails, builds a website URL when needed.
3. **Dedupe** — `findDuplicates()` runs against the existing snapshot in preview, and again on the lead profile.
4. **Suppress check** — emails or domains on the suppression list are flagged before write.
5. **Score** — `scoreLead()` returns `{ score, reasons[], warnings[], next_action }`. Suppressed → 0.
6. **Persist + audit** — every mutation writes to `interactions` and/or `audit_logs`.
7. **Surface** — the Inbox renders rows; the Profile shows the breakdown; the Dashboard rolls up counts.

## Compliance model

- Suppression entries can match by **email** or **domain**.
- Suppressed leads cannot be exported for outreach by default; `downloadCsv` excludes them and logs the export.
- `consent_basis` lives on the lead and is editable from the profile.
- Audit log writes for: `import`, `merge`, `export`, `suppress`, `unsuppress`, `update`, `delete`.

## Search

- Today: client-side `applyFilters` over `LeadRow[]`. Tokenized substring match across name, email, company, domain, source, tags, product names, and notes.
- Schema is ready: a `tsvector` column + GIN index + trigger lives in `db/schema.sql`. When Neon comes online, swap the local matcher for a `to_tsquery`-driven query inside `lib/store/data-store.ts`.
- Semantic search: the `vector(1536)` column is staged behind `pgvector`. Adding it is a job, not a refactor.

## Routing

```
/                    → redirects to /leads
/dashboard           → overview cards
/leads               → inbox with saved view tabs, filters, sort, bulk
/leads/[id]          → profile
/imports             → stepper (source → map → review → done)
/lists               → list cards
/finder              → mock provider search
/settings            → products / tags / sources / compliance / data
```

Layout is a single `(dashboard)/layout.tsx` group; the topbar/sidebar are shared.

## Services API (cheat sheet)

```ts
// lead-service.ts
createLead(draft) -> { lead, company, source }
updateLead(id, patch)
setLeadStatus(id, status)
suppressLead(id, reason?)
unsuppressLead(id)
deleteLead(id)
addInteraction({ leadId, type, note })
addTagToLead(leadId, tagId) / removeTagFromLead(...)
setLeadProductInterest({ leadId, productId, level, reason? })
removeLeadProductInterest(leadId, productId)
mergeLeadsOp(winnerId, loserId)
rescoreLead(id)

// import-service.ts
parseCsvText(text) -> ParsedTable
parsePastedTable(text) -> ParsedTable
autoMapColumns(headers) -> ColumnMapping
previewImport({ rows, mapping }) -> NormalizedRow[]
commitImport({ filename, source_type, mapping, preview, ... })

// dedupe-service.ts
findDuplicates(input, ctx) -> DuplicateCandidate[]
mergeLeads(winner, loser) -> Lead

// scoring-service.ts
scoreLead({ lead, company, source, interests, hasInteractions }) -> ScoreResult

// search-service.ts
buildLeadRows(snapshot) -> LeadRow[]
applyFilters(rows, filters) -> LeadRow[]
sortRows(rows, key, dir) -> LeadRow[]

// compliance-service.ts
isSuppressed(lead, suppressions)
buildSuppression({ ownerId, email?, domain?, reason? })
reviewLeadsForExport(leads, snapshot)

// export-service.ts
rowsToCsv(rows, opts) -> string
downloadCsv(rows, opts) -> void  // also writes audit log
```

## What to look at first

- `types/index.ts` — domain shapes
- `lib/services/scoring-service.ts` — what's scored and why
- `app/(dashboard)/leads/page.tsx` — how the inbox composes everything
- `db/schema.sql` — the production schema target (Neon)
