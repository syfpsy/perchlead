# HeroUI Pro setup

The repo currently builds against the open-source `@heroui/react` v2.x with **Tailwind CSS 3**. The HeroUI Pro package (`@heroui-pro/react@1.0.0-beta.2`) is **installed and authenticated** in this project, but it is **not yet active** — it requires a different runtime stack than v2 and importing it today breaks the build. This doc explains why and lays out the migration.

## TL;DR

| | Today (working) | What Pro v1 beta needs |
| --- | --- | --- |
| Component lib | `@heroui/react` ^2.6 | `@heroui/react` ≥ 3.0.3 (alpha as of writing) |
| React | 18.3 | ≥ 19.0 |
| Tailwind | 3.4 | ≥ 4.0 |
| Animation | `framer-motion` 11 | `motion` ≥ 12 |
| Charts | none | `recharts` ≥ 2 |
| Misc | — | `tailwind-merge` ≥ 3, `tailwind-variants` ≥ 3, `react-aria-components` ≥ 1.17, `@number-flow/react` ≥ 0.5 |

`@heroui-pro/react` is in `package.json` so the dep + auth are tested. Importing it from any source file currently fails the build with `Module not found: 'recharts'` and `'ProgressBar' is not exported from '@heroui/react'` — those exports landed in HeroUI v3.

## Why we hit this

I tried to do a small swap (Dashboard stat cards → Pro `KPI`). Two errors surfaced:

1. **JS-level peer-dep skew.** `@heroui-pro/react/dist/components/kpi/kpi.js` imports `ProgressBar`, `Separator` from `@heroui/react` and `recharts` from the registry. Those don't exist in our v2.6 install.
2. **CSS-level skew.** `@heroui-pro/react/css` is pre-built against **Tailwind 4** and uses syntax (`@layer properties { @supports ... }`) that Tailwind 3's PostCSS pipeline cannot parse. Importing it as a side effect fails the build.

The package is real, the auth works, the install is good — Pro v1 just isn't the same generation as the rest of our stack.

## Migration plan (when you're ready)

This is a single, coordinated upgrade — partial migration won't compile. Plan it as a sprint, not a sneak-in.

1. **Bump React to 19.**
   ```bash
   npm i react@^19 react-dom@^19
   npm i -D @types/react@^19 @types/react-dom@^19
   ```
   Audit for the [React 19 breaking changes](https://react.dev/blog/2024/12/05/react-19) we touch — Suspense semantics, `forwardRef` deprecation paths, Strict-Mode side effects.

2. **Bump HeroUI to v3 (alpha).**
   ```bash
   npm i @heroui/react@^3 @heroui/styles@^3
   ```
   v3 reorganized exports — review every `@heroui/react` import in the repo. Many components dropped slots/classNames and moved to compound APIs.

3. **Migrate Tailwind to 4.**
   ```bash
   npm i -D tailwindcss@^4 @tailwindcss/postcss@^4
   ```
   - Delete `tailwind.config.ts`. Tailwind 4 is CSS-first.
   - Move theme to `@theme { ... }` directives in `app/globals.css`.
   - Replace `@tailwind base; @tailwind components; @tailwind utilities;` with `@import "tailwindcss";`.
   - Update `postcss.config.mjs` to use `@tailwindcss/postcss` instead of the v3 `tailwindcss` plugin.

4. **Add Pro's runtime peers.**
   ```bash
   npm i recharts react-aria-components tailwind-merge@^3 tailwind-variants@^3 @number-flow/react motion embla-carousel embla-carousel-react react-resizable-panels
   npm rm framer-motion
   ```
   Replace any `framer-motion` imports with `motion`.

5. **Wire the Pro CSS.**
   In `app/globals.css` (after Tailwind 4 is in place):
   ```css
   @import "tailwindcss";
   @import "@heroui-pro/react/css";
   /* optional themes */
   /* @import "@heroui-pro/react/themes/glass"; */
   ```

6. **Smoke-test, then start swapping in Pro components.**
   Strong candidates, in priority order:
   - `KPI` for the dashboard stat cards.
   - `EmptyState` to replace `components/ui/empty-state.tsx`.
   - `Command` for a Cmd+K palette in the topbar.
   - `DataGrid` for the Lead Inbox table.
   - `Sidebar` / `Navbar` / `AppLayout` for the shell.
   - `Sheet` / `HoverCard` for richer profile interactions.

## What to do *today*

Until the migration above is done, treat Pro as installed-but-dormant:

- Do **not** import from `@heroui-pro/react` in any source file (any subpath — `kpi`, `empty-state`, etc.). Each one drags in incompatible peers and breaks the build.
- Do **not** import `@heroui-pro/react/css` from `app/layout.tsx` or `globals.css` — the CSS is Tailwind 4.
- Keep building with `@heroui/react` v2 components. The component layout in this repo (compound primitives, no exotic slot APIs) is already shaped for Pro — the swap will be code-level renames, not architecture changes.

## Auth + registry

Already configured on this machine. For reference:

```bash
# ~/.npmrc (DO NOT commit if this lives in the repo)
@heroui-pro:registry=https://registry.heroui.pro/
//registry.heroui.pro/:_authToken=YOUR_TOKEN
```

If you set up a fresh machine or CI, populate the token from `HEROUI_PRO_KEY` (env var, never committed) into `.npmrc` before `npm install`.
