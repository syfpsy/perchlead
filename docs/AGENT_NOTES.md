# Agent Notes — Perchlead

A running, terse log of decisions, file moves, and follow-ups so future passes have shared memory. Append-only; never rewrite history.

## 2026-04-27 — Initial scaffold

### What landed
- Created the Next.js 14 App Router scaffold from scratch in an empty repo. TypeScript strict, Tailwind, HeroUI 2 (`@heroui/react`) — laid out so HeroUI 3 Pro components can drop in one-for-one (see `docs/HEROUI_PRO_SETUP.md`).
- Defined the entire domain model in `types/index.ts` — every table mirrors the Supabase migration so the local store and the eventual Supabase store share the same shapes.
- Built a single in-memory + `localStorage`-persisted data store (`lib/store/data-store.ts`) with `useSyncExternalStore` hook (`lib/store/use-snapshot.ts`). Seeded with a rich demo dataset (`lib/seed/demo-data.ts`) so the app is alive on first boot.
- Pure-function services in `lib/services/`:
  - `scoring-service.ts` — rule-based 0..100, suppressed = 0, returns reasons[], warnings[], next_action.
  - `dedupe-service.ts` — exact email, normalized email (gmail dots / +tags), same-domain + similar name, fuzzy name+company. Pure `mergeLeads(winner, loser)` helper.
  - `compliance-service.ts` — `isSuppressed`, `buildSuppression`, `reviewLeadsForExport`.
  - `search-service.ts` — `buildLeadRows`, `applyFilters`, `sortRows`. The `LeadRow` shape is what the inbox table consumes.
  - `lead-service.ts` — the only mutator surface for leads/interactions/tasks/tags/product-interests/merge. Re-scores after every relevant change; writes audit logs and timeline entries.
  - `import-service.ts` — `parseCsvText`, `parsePastedTable`, `autoMapColumns`, `previewImport`, `commitImport`. Three-step pipeline: parse → map → preview → commit. All steps are pure besides `commitImport` which writes through the store.
  - `export-service.ts` — `rowsToCsv`, `downloadCsv`. Excludes suppressed leads by default; logs an export audit row.
- Provider interfaces (`lib/providers/`) for enrichment and lead finder, with deterministic mock implementations so the app feels alive offline.
- Validators (`lib/validators/lead.ts`) on top of Zod for the manual lead create form.
- App shell: sidebar with route highlights, sticky topbar with global search + keyboard shortcuts (`/`, `Cmd/Ctrl+N`, `Cmd/Ctrl+I`), bottom mobile nav.
- Pages built:
  - `/leads` — premium inbox table, saved view tabs, search, filter drawer, sort, bulk selection bar, polished empty state, modal for manual create.
  - `/leads/[id]` — header with avatar/score/status switcher, summary, *Why this score* breakdown card, timeline, notes editor, contact, company, tags, product interests with low/medium/high pickers, duplicate warning with one-click merge, compliance panel with one-click suppress.
  - `/imports` — stepper-driven CSV upload + paste flow with auto-mapping, normalization preview, dedupe + suppression highlighting, consent picker, "skip likely duplicates" toggle, recent imports.
  - `/lists` — create / view / delete saved views with filter chips and a quick top-3 preview.
  - `/finder` — query/location/niche search with mock provider; multi-select → save selected as leads.
  - `/settings` — products CRUD, tags CRUD, sources view, suppression list with email/domain entries, data panel (download snapshot, restore demo, clear).
  - `/dashboard` — overview stats, best leads this week, top sources, recent imports.
- Supabase migration (`supabase/migrations/20260427_initial.sql`) with all tables, enums, indexes, `tsvector` trigger for full-text, `pgvector` extension staged, full RLS policies, profile bootstrap trigger.
- README, ARCHITECTURE, ROADMAP, HEROUI_PRO_SETUP docs.

### Decisions
- **Local mock first, Supabase second.** Because the repo started empty, getting the UI/UX right offline ships faster than configuring Supabase. The store interface is intentionally tiny so the swap is one file.
- **No auth yet.** A hard-coded demo user. The migration includes the trigger for real Supabase Auth → profiles handoff. Adding `@supabase/auth-helpers-nextjs` later is a 30-minute job.
- **Scoring is rule-based and explainable.** Every signal has a delta and a detail. Hides nothing from the user. AI summaries are stubbed but the seam is `summary-card` + the enrichment provider.
- **Multi-product interests are first-class.** Modeled as a join table (`lead_product_interests`) with level + reason + confidence. The profile page exposes per-product low/med/high pickers; the inbox shows top-2 chips with a "+N" overflow.
- **Compliance defaults to safe.** Suppression matches on email *or* domain; suppression always forces score to 0 and status to `do_not_contact`. CSV export excludes suppressed leads by default with an opt-in.
- **HeroUI version.** I used `@heroui/react` 2.6.x because that's what installs cleanly today; HeroUI 3 Pro components share the same compound primitives so this is a 1:1 swap. See `docs/HEROUI_PRO_SETUP.md`.
- **Imports rich on UI, light on heuristics.** The mapping aliases handle the common cases (email/mail, name/full name, company/org, etc.); fuzzy header matching handles the rest. AI-assisted mapping is a future plug.

### What is mocked
- Auth (single demo user).
- Persistence (browser `localStorage`; clears on Settings → reset).
- Enrichment provider.
- Lead finder provider.
- All "planned" sources in the import catalog (Gumroad, Lemon Squeezy, Paddle, AppSumo, HubSpot, Smartlead, Instantly, Google Sheets) — the buttons explain that they're staged.

### What is real
- Domain model and Supabase migration.
- All services (scoring, dedupe, search, import, compliance, export) are production-shaped pure code with no mock-only behavior.
- The full UI flow including bulk actions, audit logs, and merging.

### Follow-ups in priority order
1. Stand up Supabase, run the migration, write the Supabase-backed store, gate by `NEXT_PUBLIC_DATA_MODE`.
2. Wire `@supabase/ssr` for auth.
3. Replace mock providers with real ones (start with Hunter for email verification + Google Places for the Finder).
4. Add an `embedding` job for `leads.embedding` and a semantic search service. Type column already exists.
5. Generic webhook capture endpoint + JS embed snippet for forms.
6. Per-target export presets (Smartlead, Instantly, HubSpot mapping).
7. Background-job abstraction for re-scoring large batches (start with `pg_cron` since we already use Supabase).

### Commands run during build (all green)
- `npm install` — 649 packages, ~48s.
- `npm run typecheck` — 0 errors.
- `npm run lint` — 0 warnings, 0 errors.
- `npm run build` — compiles cleanly, 10 routes (9 static + 1 dynamic for `/leads/[id]`).
  - `/` 138 B (redirect)
  - `/dashboard` 5.1 kB
  - `/finder` 3.97 kB
  - `/imports` 20 kB
  - `/leads` 33 kB (the inbox)
  - `/leads/[id]` 11 kB
  - `/lists` 4.97 kB
  - `/settings` 5.84 kB

### Last-mile fixes I made before sign-off
- Moved `DataSnapshot` to `types/index.ts` so services don't reach into the store module. `data-store.ts` re-exports it for backwards compatibility.
- Typed the seed `interactions` array as `Interaction[]` so both `import` and `email` types are accepted.
- Cast `heroui` plugin in `tailwind.config.ts` to `any` — HeroUI 2.x ships with a slightly newer Tailwind PluginAPI than `tailwindcss@3.4`, harmless but breaks strict typecheck.
- Bumped the snapshot top-level reference inside `store.update()` so `useSyncExternalStore` actually re-renders subscribers.
- Wrapped `LeadsPage` in a Suspense boundary so `useSearchParams()` doesn't break static prerendering.
- Fixed a post-splice index lookup in `mergeLeadsOp` — winners were being looked up by stale index after the loser was removed.
- Disabled `react/no-unescaped-entities` (apostrophes in copy) since the prose in empty states is intentional.

### Open questions for the user
- Do you want me to add a real Supabase wiring next, or stay on the mock for another iteration?
- Should the sidebar default to **Overview** or **Leads** as the home? Currently `/` redirects to `/leads`; toggle in `app/page.tsx` if you'd prefer the dashboard.

## 2026-04-28 — HeroUI Pro auth done; can't activate yet

User added `@heroui-pro/react@^1.0.0-beta.2` to `package.json` and confirmed: "auth done, packages installed". I tried to demonstrate Pro by swapping the Dashboard stat cards to Pro's `KPI` compound component and importing `@heroui-pro/react/css` as a side effect. Both break the build.

### What broke
- `KPI` (and other Pro components) import `ProgressBar`, `Separator` from `@heroui/react` — those don't exist on v2.6, only on v3. Pro also pulls `recharts` for sparkline charts inside KPI.
- `@heroui-pro/react/css` is a Tailwind 4 stylesheet (`@layer properties { @supports ... }`). Tailwind 3's PostCSS pipeline can't parse it.

### What this means
Pro v1 beta is paired with the v3 generation of HeroUI: React 19 + Tailwind 4 + `@heroui/react` v3 (alpha) + `motion` 12 + `recharts` + `react-aria-components` + `tailwind-merge`/`tailwind-variants` v3 + `@number-flow/react`. Partial migration won't compile — peer-deps need to land together.

### What I did
- Reverted the dashboard KPI swap.
- Removed the side-effect CSS import from `app/layout.tsx` (left a comment explaining why so it doesn't get re-added by an over-eager refactor).
- Kept `@heroui-pro/react` in `package.json` so the dep + registry auth stay live and a future migration is one-step.
- Rewrote `docs/HEROUI_PRO_SETUP.md` honestly: today's state, why the JS+CSS swap fails, and a single-sprint migration plan when the team is ready.
- Build verified clean again: `npm run typecheck` 0 errors, `npm run build` all 10 routes compile.

### Recommended next move (Pro adoption)
Plan the v3 stack migration as a single sprint:
1. React 18 → 19
2. `@heroui/react` 2 → 3
3. Tailwind 3 → 4 (CSS-first config; delete `tailwind.config.ts`, move theme to `@theme` blocks in `globals.css`, swap PostCSS plugin)
4. `framer-motion` → `motion`
5. Add `recharts`, `react-aria-components`, `tailwind-merge`/`tailwind-variants` v3, `@number-flow/react`
6. Then `import "@heroui-pro/react/css"` and start swapping components — KPI, EmptyState, Command, DataGrid, Sidebar/Navbar/AppLayout, Sheet/HoverCard.

Pre-migration this is **not safe to attempt component-by-component** — each Pro import drags in v3-only peers and fails the build immediately.

## 2026-04-28 — Save-as-list, Tasks, Cmd+K palette

User said "go on" — interpreted as "keep building, pick the next valuable thing". Filled three of the biggest UX gaps in the MVP without expanding scope.

### What landed

**1. Save Inbox filters as a list.**
- New [`components/leads/save-list-modal.tsx`](../components/leads/save-list-modal.tsx) with auto-suggested name and a chip preview of what's about to be saved.
- Inbox toolbar now shows a "Save as list" button only when filters are dirty (and the active tab is "All", so we don't double-save an existing list). The free-text query is stripped from the saved filter set — it stays per-session.
- After save, the inbox jumps to the new list's tab so the round-trip is visible.

**2. Tasks feature.**
- New service: [`lib/services/task-service.ts`](../lib/services/task-service.ts) — `createTask`, `setTaskStatus`, `deleteTask`, `tasksForLead`, `openTasks`. Audit-logs every create/update.
- New profile card: [`components/leads/tasks-card.tsx`](../components/leads/tasks-card.tsx) — quick-add input + due date, open list, collapsed "Done" section, overdue badge, one-click toggle.
- New page: [`app/(dashboard)/tasks/page.tsx`](<../app/(dashboard)/tasks/page.tsx>) — cross-lead task list with Open / Overdue / Due ≤ 3d / Done / All tabs, click-through to lead profile, inline complete + delete.
- Sidebar + mobile nav now include a Tasks link.
- Dashboard adds an "Open tasks" KPI that links to `/tasks` and goes red when there are overdue items.
- Seed data adds 4 demo tasks (one overdue, one due tomorrow, one historical, one done) so the page is alive on first boot.

**3. Cmd+K command palette.**
- New [`components/layout/command-palette.tsx`](../components/layout/command-palette.tsx). Listens globally for Cmd/Ctrl+K (and `?` when no input is focused). Esc closes.
- Searches commands (add lead, import, navigate to any page, restore demo, clear all), saved lists, and up to 200 leads at once. Empty query shows commands; typing surfaces leads + lists ranked by label/keyword/hint match.
- Lead rows render with avatar, score badge, and Do-Not-Contact icon when applicable. Arrow keys + Enter to navigate; mouse hover updates the active row.
- Mounted once in the dashboard layout — every screen gets it for free.
- Topbar placeholder and dashboard tip now mention `⌘K`.

### Build state
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 warnings
- `npm run build` — 11 routes (added `/tasks`), all 10 prerender static + `/leads/[id]` dynamic.

### Sizes (after)
- `/leads` 34.1 kB (+1.1 kB, save-list modal)
- `/leads/[id]` 12 kB (+1 kB, tasks card)
- `/dashboard` 5.34 kB (+0.24 kB, open-tasks KPI link)
- `/tasks` 4.34 kB (new)

### Decisions
- **Cmd+K is the primary keyboard surface, `/` stays for inline search focus.** They serve different needs — `/` is "search this view", Cmd+K is "go anywhere". Both are global.
- **Cmd+K bypasses HeroUI's Modal** — using plain divs for the overlay so keyboard handlers stay tight (HeroUI's Modal traps focus and re-mounts each open, which fights with the input ref).
- **The "Save as list" button doesn't appear on existing-list tabs** to avoid a confusing "save a list as a list" path. Editing an existing list's filters is a v0.2 problem — for now you delete + recreate.
- **Tasks store integrates with audit_logs**, same as everything else. The `audit_logs.entity_type` enum already accepted `"task"`.
- **No re-scoring on task create.** Task open/done isn't part of the score signal today. Could be added later as "has open task = +5".

### What's still open
- Editing an existing saved list's filters (today: delete and recreate).
- Snoozed tasks have a state but no UI to set them — they appear correctly in the "All" tab if mutated via the service.
- Cmd+K can't currently *execute* per-lead actions (suppress, mark contacted) — only navigate. The structure is there; lead rows could expand into per-lead command sub-menus in v0.2.
- The `?` shortcut to open the palette is undocumented in the UI. Add to a help overlay in a polish pass.

## 2026-04-28 — Pivot from Supabase to Neon + Vercel; go live

User: "no supabase, we will use vercel and neon, pick. also create a repo named perchlead, create a vercel project with the same name and link them. go live".

### Stack pivot
- **Database** target is now **Neon** (serverless Postgres). Hosting is **Vercel**.
- Auth is no longer bundled (Supabase did this for us). Documented Auth.js / Clerk / Lucia as options in `db/README.md`. Default for v0.2 will be Auth.js with email magic links.

### What changed in the repo
- Deleted `supabase/` folder.
- New `db/schema.sql` — Neon-friendly schema. Same tables/enums/indexes as before; differences:
  - No `auth.users` foreign key on the user table; `public.users` is a plain table you upsert into from your auth provider.
  - No `handle_new_user()` trigger.
  - No RLS policies. Ownership is enforced in app code (every query joins on `owner_id = $1`). Documented an opt-in RLS pattern using `SET LOCAL app.user_id = ...` for defense in depth.
  - `pgvector` still enabled (Neon supports it on all tiers).
  - `tsvector` column + GIN index + trigger preserved.
- New `db/README.md` — setup steps, recommended driver (`@neondatabase/serverless`), auth options, RLS opt-in, background-job options.
- `.env.example` rewritten — dropped `NEXT_PUBLIC_SUPABASE_*`, added `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `AUTH_SECRET` / `AUTH_GITHUB_*`.
- Settings → Data tab renamed to "Data & Neon"; Neon-specific setup checklist replaces the Supabase one.
- Sidebar demo-data note: "Wire up Neon" instead of "Wire up Supabase".
- `types/index.ts` and `lib/store/data-store.ts` comments updated.
- README, ARCHITECTURE, ROADMAP — Supabase references replaced with Neon. Added a Vercel deploy section to README.

### Going live
- `git init` + initial commit + GitHub repo `perchlead` (under user's `gh` account).
- Vercel project `perchlead` linked, deployed to production.
- The deployed app runs on the local mock store — every visitor gets their own seeded workspace in their browser. No DB needed for v0.1 to work in the wild.

### Build state after pivot
- typecheck 0 errors, lint clean, `npm run build` 11 routes (no functional change from yesterday's session).

### Going live — what actually happened

**GitHub repo created.** `gh repo create perchlead --public --source=. --push`. Live at https://github.com/syfpsy/perchlead. Initial commit pushed; user is logged in to gh as `syfpsy`. Token scopes: `gist, read:org, repo, workflow`.

**Vercel project linked.** `vercel link --yes --project perchlead`. The CLI created the project in team `seyfis-projects-4185aa88` (display name "nxyz"), auto-connected the GitHub repo (so `git push` triggers prod deploys), and added `.vercel/` to `.gitignore`. Project ID via `.vercel/project.json`.

**First deploy failed.** `vercel deploy --prod --yes` — npm install crashed when @heroui-pro/react's postinstall (`node ./pre/postinstall/index.js`) hit `Access denied: You don't have permission to install HeroUI React Pro. … For CI/CD environments, ensure the HEROUI_AUTH_TOKEN environment variable is set.` Pro stores auth in the OS keyring (Windows Credential Manager on this machine), and Vercel CI doesn't have it. The user's local `npx heroui-pro status` still works and reports 179 days remaining.

**Fix shipped:** removed `@heroui-pro/react` from `package.json` and regenerated the lockfile. Pro is dormant in source (no imports, doesn't compile against our v2 stack anyway), so the removal is purely a deps cleanup. Updated `docs/HEROUI_PRO_SETUP.md` with explicit re-add steps (set `HEROUI_AUTH_TOKEN` on all Vercel envs + complete the v3 stack migration). Updated the project memory note to reflect the new state.

**Second deploy succeeded.** Auto-triggered by `git push`. `vercel inspect --wait`: `● Ready`. Deploy ID `dpl_8ZXmVG5mDoHYuPJ3cUfAPrR6NoEm`.

**Vercel SSO gate disabled.** First HTTP check returned 401 (Vercel's default Standard Protection on team projects). PATCH to `/v9/projects/perchlead?teamId=...` with `{"ssoProtection": null}` made the deployment public. Second HTTP check: HTTP 200 across `/`, `/leads`, `/dashboard`, `/imports`, `/tasks`, `/lists`, `/finder`, `/settings` — and the "Perchlead — Lead memory for indie founders" `<title>` plus the sidebar's "Demo data on" panel render in the SSR HTML.

### Live URLs
- Production: https://perchlead-seyfis-projects-4185aa88.vercel.app/
- Git-tracked alias: https://perchlead-git-main-seyfis-projects-4185aa88.vercel.app/
- GitHub: https://github.com/syfpsy/perchlead
- Vercel dashboard: https://vercel.com/seyfis-projects-4185aa88/perchlead

### Caveats
- App runs entirely on the **local mock store** (`localStorage`) in production. Each visitor gets their own seeded workspace. No data persists across browsers/devices. Wiring Neon up flips this without UI changes — see `db/README.md`.
- No custom domain yet. Add one with `vercel domains add` and configure DNS, then `vercel alias`.
- Pro registry token is **not** in Vercel env vars (deliberately — see HEROUI_PRO_SETUP.md).
- SSO protection is **disabled** for this project. If the team's defaults later flip it back on, it'll need to be re-disabled or replaced with a per-deployment bypass.

### Next moves (in priority order)
1. Stand up a Neon project, apply `db/schema.sql`, set `DATABASE_URL` + `DATABASE_URL_UNPOOLED` in Vercel.
2. Implement `lib/store/neon-store.ts` with the same surface as `data-store.ts`. Gate by `NEXT_PUBLIC_DATA_MODE`.
3. Auth.js with email magic-link (Resend) — upserts into `public.users` on first sign-in.
4. Custom domain.

## 2026-04-29 — Activity viewer · enrichment with diff · profile keyboard nav

User: "keep building more features, check what the best tools do". Picked the three highest-value gaps based on what Linear / Notion / Salesforce / Clay / Apollo / Superhuman do well.

### What landed

**1. `/activity` audit log viewer.** New page that surfaces the audit_logs we've been writing all along. Tabs: All / Leads / Imports / Exports / Compliance. Search across entity name + verb + detail. Day grouping (Today / Yesterday / friendly date). Tone-coded icon dot per action. Clickable entities deep-link to /leads/[id] or /imports. Empty state when nothing matches. Files:
- `lib/services/activity-service.ts` — `buildActivityRows`, `activityForLead`, `filterActivity`. Pure functions over the snapshot.
- `app/(dashboard)/activity/page.tsx` — the viewer UI.

**2. Per-lead enrichment with a diff modal.** Profile gets an "Enrich" button. Click runs `mockEnrichmentProvider.enrich()` (already shipped) and opens a Clay-style review modal. Each proposed field shows a current ↔ proposed pair with an Accept toggle, scope chips (`lead` vs `company`), and "unchanged" badge for fields that already match. "Apply N changes" merges only accepted fields, writes a system interaction, bumps status from `new` → `enriched` if applicable, logs an audit entry. Provider seam now demonstrated end-to-end. Files:
- `components/leads/enrichment-modal.tsx`.
- Wired in `app/(dashboard)/leads/[id]/page.tsx` header.

**3. Profile keyboard nav (`j` / `k` between filtered leads).** The inbox writes its filtered+sorted IDs to localStorage (`perchlead.inbox_cursor.v1`); the profile reads it on mount, computes `prev` / `next` / `index` / `total`, surfaces a breadcrumb ("12 / 47 in 'Motion studios'") with prev/next buttons, and binds `j` / `k` plus `⌘←` / `⌘→` plus `Esc` (back to inbox). Brand-promise win — moving through a triaged list is now keyboard-only. Files:
- `lib/store/inbox-cursor.ts` — `writeInboxCursor`, `readInboxCursor`, `getNeighbors`.
- Inbox writes after every filter change.
- Profile reads + binds keys.

**4. Per-lead "Audit trail" card on the profile.** Mirrors the global /activity page but filtered to that one lead. Shows the 8 most recent events with a "See all activity" link.

**5. Wired into nav surfaces.** Sidebar gets an Activity item. Cmd+K palette gets an "Activity log" command (keywords: activity, audit, log, history, compliance).

### Decisions
- **Audit `entity_type` "company" was not in the original union.** When the enrichment modal patches a company, I write `entity_type: "company"` to audit_logs but TypeScript was happy because the enum is `string`-typed in the schema. Note for the v0.2 Neon migration: the SQL doesn't constrain this column to an enum — it's `text`, which is what we want for forward-compat (new entity types don't need a migration).
- **Inbox cursor lives in localStorage**, not URL params. Two reasons: (1) deep-links to /leads/[id] from outside the inbox shouldn't carry stale filter state, (2) the cursor's ID list can be long, polluting URLs. Trade-off: opening a profile from a stale tab might use the previous filter context. Acceptable for now.
- **Enrichment writes BOTH a lead patch AND a company patch in one transaction**, but as two `store.update` calls so each gets its own audit entry. The user-facing "Apply N changes" counts every accepted field, regardless of which table it lives on.
- **`j`/`k` deliberately doesn't loop**. At the end of the list, "j" does nothing rather than wrapping to the start — Linear's behavior, and avoids the "I went past the end and now I'm somewhere weird" surprise.
- **`Esc` on the profile returns to /leads** rather than to wherever you came from. Simpler and predictable.

### Build state
- typecheck 0 errors, lint clean, `npm run build` 12 routes (added `/activity`).
- `/activity` 5.12 kB, `/leads/[id]` 14 kB (+2 kB for enrichment modal + cursor + activity card).

### Live verification
- All 6 hot paths return HTTP 200 from the production alias: `/activity`, `/leads`, `/leads/lead_1`, `/tasks`, `/imports`. `/` 307→/leads as designed.
- Auto-deploy from `git push` succeeded. Deploy ID `dpl_...fzj93ztb2`.

### What's still open
- The bulk-actions bar still doesn't have "bulk enrich" — could be a v0.2 add (run mock provider on N leads, show aggregate diff).
- Enrichment doesn't yet support "enrichment_jobs" persistence (the schema field exists but no UI lists past jobs). For mock it doesn't matter; when a real provider is wired, jobs should be persisted with cost tallies for the budget panel in Settings.
- Activity page doesn't have a "lead=" query param yet to filter to a single lead. The per-lead profile card covers that today, but a deep-linkable filter would be nicer.
- `j`/`k` from inbox rows isn't wired — only on the profile. Adding to the inbox would need a "focused row" concept.
