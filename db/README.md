# Database (Neon)

Perchlead targets **Neon** for production Postgres. Today the live app runs on a local mock store (`lib/store/data-store.ts`) so it works offline; this folder defines the schema you'll apply when wiring up the real DB.

## Setup

1. **Create a Neon project.**
   - Sign in at [neon.tech](https://neon.tech) and create a project (we recommend the same region you deploy Vercel to).
   - Grab the pooled connection string from the Neon console — it's the one labeled "Pooled connection" with `-pooler` in the host. Use this for serverless functions.

2. **Set environment variables.** In Vercel → Project → Settings → Environment Variables (or in your local `.env.local` for dev):

   ```
   DATABASE_URL=postgres://USER:PASS@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require
   DATABASE_URL_UNPOOLED=postgres://USER:PASS@HOST.REGION.aws.neon.tech/DB?sslmode=require
   NEXT_PUBLIC_DATA_MODE=neon
   ```

   - `DATABASE_URL` — pooled, for runtime queries.
   - `DATABASE_URL_UNPOOLED` — direct connection, for migrations and long-lived sessions.

3. **Apply the schema.** From a shell with `psql`:

   ```bash
   psql "$DATABASE_URL_UNPOOLED" -f db/schema.sql
   ```

   Re-running is safe — every `create` is `if not exists`.

4. **Pick a driver.** Recommended: `@neondatabase/serverless` (HTTP driver, no connection pool needed in Vercel functions):

   ```bash
   npm i @neondatabase/serverless
   ```

5. **Swap the data store.** Rewrite `lib/store/data-store.ts` to read/write through Neon while keeping the existing API surface (`store.get()`, `store.update()`, `store.subscribe()`). Pages and services don't need to change.

## Auth

Neon does not bundle auth (unlike Supabase). Pair with one of:

- **Auth.js / NextAuth** — easy to wire, handles email-magic-link, OAuth providers.
- **Clerk** — managed, good DX, costs money.
- **Lucia** — bring-your-own session, fully owned.

Pattern: on first sign-in, upsert into `public.users`. Use that user's `id` as `owner_id` everywhere downstream.

## RLS — defense in depth

The schema deliberately ships **without** RLS so the first deploy is simple. Ownership is enforced in app code (`where owner_id = $1` on every query).

When you want belt-and-suspenders, layer RLS with a session variable:

```sql
alter table public.leads enable row level security;
create policy leads_owner on public.leads
  for all
  using (owner_id::text = current_setting('app.user_id', true))
  with check (owner_id::text = current_setting('app.user_id', true));
```

Then on every request:

```ts
await sql`SET LOCAL app.user_id = ${userId}`;
```

## Background jobs

Perchlead's services are sync today. When you need recurring work (re-scoring, suppression sweeps, weekly digests), pick one:

- **Vercel Cron** + a route handler — simplest if the job is light.
- **Inngest** or **Trigger.dev** — better for retries, observability.
- **Neon scheduled queries** (preview) — good for pure-SQL maintenance jobs.
