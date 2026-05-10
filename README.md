# TotalMacro

Honest, multi-metric fitness tracking. Free PWA, multi-tenant via Postgres RLS,
deployed on Cloudflare Pages.

This is iteration 1 of the project. See `docs/` for the full project plan and
design system documents.

---

## Quick start

```bash
git clone https://github.com/adwate-ui/health_tracking.git
cd health_tracking
npm install

cp .env.example .env
# Edit .env with values from https://supabase.com/dashboard/project/<your-project>/settings/api

npm run dev
```

Open http://localhost:5173.

The first time you run `npm run dev`, the `predev` script generates
`src/tokens/_generated.css` from the role-token definitions. This file is
gitignored — it's always regenerated from source.

---

## Architecture

### Multi-tenancy

Every table has a `user_id` column. Postgres row-level security policies enforce
`auth.uid() = user_id` on every read and write. There is no application-layer
authorisation logic; the database refuses to return cross-user data even if the
application code forgets to filter.

The RLS test suite (`supabase/tests/rls.test.mjs`) runs in CI and includes a
deliberately malicious-user simulation. If any query returns another user's row,
the build breaks.

### Three-layer token pipeline

```
src/tokens/
├── primitives.ts   (Layer 1: hex ramps. Components must NOT import this.)
├── brand.ts        (Layer 2: brand aliases. The rebrand surface.)
├── roles.ts        (Layer 3: role tokens. Components import from here.)
└── manifest.ts     (Brand asset paths. Components must NOT inline /brand/ paths.)
```

A future rebrand is a one-pull-request change: edit `brand.ts`, swap an asset,
deploy. Five ESLint rules block the merge if discipline slips. See
`eslint.config.js` and the design system document §11.

To verify the contract holds, run the rebrand drill quarterly:

```bash
npm run rebrand:drill
```

### Authentication

Magic-link only. Supabase handles the email; we handle the redirect at
`/auth/callback`. No passwords, no password reset flow, no credential storage.
Social sign-in deferred to a future iteration.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (regenerates tokens first) |
| `npm run build` | Production build (regenerates tokens first) |
| `npm run preview` | Preview the production build locally |
| `npm run tokens` | Regenerate CSS variables from role tokens |
| `npm run lint` | Run ESLint, including the modularity-contract rules |
| `npm run typecheck` | TypeScript strict-mode check, no emit |
| `npm run test:rls` | Run the RLS isolation test suite (requires service key in env) |
| `npm run rebrand:drill` | Verify a rebrand is still a one-file change |

---

## Deployment

### Cloudflare Pages

1. Connect this repo to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Environment variables (production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The `public/_redirects` file handles SPA routing (catch-all to `index.html`).

Preview deployments are created automatically per branch.

### Supabase

1. Apply the migration in `supabase/migrations/` to your project's database.
   Easiest path: paste it into the SQL Editor in the Supabase dashboard.
2. Enable the Email provider under Authentication → Providers.
3. Set Site URL and Redirect URLs under Authentication → URL Configuration.
   Include `http://localhost:5173/auth/callback` for local dev and your
   production URL with `/auth/callback` once deployed.

---

## Project structure

```
src/
├── components/      Reusable UI primitives (Button, Input, Card, ...)
├── hooks/           Data hooks built on Supabase + TanStack Query
├── lib/             Cross-cutting concerns (auth, theme, guards, supabase client)
├── pages/           Route-level components
├── tokens/          The three-layer design token pipeline
└── types/           TypeScript types matching the database schema

supabase/
├── migrations/      SQL schema migrations, applied in order
└── tests/           RLS isolation tests

public/
└── brand/           Brand assets (logo, favicon, og image, splash)
                    Read only via src/tokens/manifest.ts
```

---

## What's in this iteration

- Supabase project provisioned and connected (region: ap-southeast-1, Singapore)
- Schema with full RLS on nine tables
- Magic-link auth flow end to end
- Five-screen onboarding with calorie target calculation
- Today screen with metric tiles and quick-log form
- Design system page at `/design-system` showing every component
- Three-layer token pipeline with five lint rules enforcing modularity
- Quarterly rebrand drill script
- CI: typecheck, lint, build, RLS tests
- Cloudflare Pages SPA config

## What's next (iteration 2)

- Open Food Facts and USDA FoodData Central food search
- Meal templates and recent foods
- Hevy API integration as a per-user setting
- Web Push notifications
- Trends page (charts)
