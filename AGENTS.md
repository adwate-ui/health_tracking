# AGENTS.md — TotalMacro

You are an autonomous agent working on TotalMacro, a privacy-first, multi-user
fitness tracking PWA. This file is the standing brief. Read it at the start of
every session.

When in doubt about scope, naming, or priority, **prefer this file over your
own intuition**. When this file conflicts with chat instructions in the same
session, prefer chat instructions and propose updating this file.

---

## What this product is

A Progressive Web App where any user can sign up, set personal targets for
calories / protein / fibre / water / steps / weight / blood markers, and use
the app as the system of record for their daily journal, weekly weigh-in, body
measurements, and biomarkers. Each user is a private tenant of one — their
data is isolated by Postgres row-level security and never visible to anyone
else.

Free to build, free to run at the relevant scale. Hosted on Cloudflare Pages,
backend on Supabase. Source: `https://github.com/adwate-ui/health_tracking`.

The product is positioned **against** MyFitnessPal's gamification and
paywalls. Tone is calm, data-dense, honest. No emoji, no streak fireworks, no
"great job" copy. Treat the user as an adult.

The design system document (`docs/DESIGN_SYSTEM.docx`) and the project plan
(`docs/PROJECT_PLAN.docx`) are the contract. Read both before any non-trivial
change.

---

## How to work

### Hard rules (non-negotiable, blocking)

1. **Never check `.env` into git.** The `.gitignore` already excludes it. If
   you find a `.env` file staged, unstage it and warn loudly.

2. **Never paste a `service_role` key anywhere except a Supabase Edge Function
   secret.** It bypasses every RLS policy. The application code uses only the
   anon key. The RLS test suite uses the service key from environment, never
   from a literal.

3. **Never disable an RLS policy or weaken a CHECK constraint** without
   explicit human approval in chat. RLS is the multi-tenancy contract; CHECKs
   are validation. Both must hold.

4. **Never bypass the modularity contract** (see Design System §11). Concretely:

   - No hex literals outside `src/tokens/primitives.ts`, `brand.ts`, `roles.ts`
   - No `import` from `tokens/primitives` outside `tokens/brand.ts` and
     `pages/DesignSystemPage.tsx`
   - No Tailwind arbitrary color values like `bg-[#0F6E56]` anywhere
   - No `/brand/` paths outside `tokens/manifest.ts`
   - No literal "TotalMacro" strings outside `tokens/brand.ts`

   Five ESLint rules enforce these. If lint fails, **fix the violation**, do
   not add an `// eslint-disable` and don't ignore the file. If you genuinely
   need an exception, propose it in chat with reasoning.

5. **Never break the type-check.** `npm run typecheck` must pass on every
   commit. Strict mode is on; `noUncheckedIndexedAccess` is on;
   `exactOptionalPropertyTypes` is on. These catch real bugs.

6. **Never commit secrets.** API keys, JWTs, passwords, OAuth tokens — none of
   them in source. The lint catches some of these; you are the safety net for
   the rest.

7. **Never push to `main` directly.** Branch, PR, review, merge. Even if you
   are working alone.

### Soft rules (preferences, can be overridden by good reasoning)

- Prefer existing components over new ones. The Design System §11.5 has the
  three-question test.
- Prefer composition over inheritance.
- Prefer pure functions over classes.
- Prefer typed errors (`Result<T, E>`) over thrown exceptions in domain logic.
- Prefer `maybeSingle()` over `single()` when a missing row is acceptable.
- Prefer `upsert` over `insert + on conflict` for idempotent writes.
- Prefer integer columns for grams when 1g precision is enough; numeric only
  where decimals matter (weight, body fat %).

### Style

- Sentence case for everything: labels, buttons, headings, toasts.
- Em dashes (`—`) for clarification, no spaces.
- Curly quotes (`'`, `"`).
- Numbers with units use a non-breaking space: `1\u00a0743 kcal`.
- All numerals are tabular by default (`.tabular` class).

### Cadence

- One iteration per week.
- Each iteration ends with a deployed Cloudflare Pages preview URL and a
  **Walkthrough** artifact: short summary, list of changed files, screenshots
  of any UI changes in both light and dark mode.
- Open a draft PR on day one of the iteration; convert to ready-for-review
  when the iteration is complete.
- Never ship to `main` without the human approving the Walkthrough.

---

## Where things live

```
src/
├── components/      Reusable UI primitives (Button, Input, Card, MetricCard, Pill)
├── hooks/           Data hooks built on Supabase + TanStack Query
├── lib/             Cross-cutting concerns (auth, theme, guards, supabase client)
├── pages/           Route-level components
├── tokens/          The three-layer design token pipeline
└── types/           TypeScript types matching the database schema

supabase/
├── migrations/      SQL schema, applied in order
└── tests/           RLS isolation tests (the safety net)

scripts/
├── generate-css-vars.mjs   Reads roles.ts, writes _generated.css
└── rebrand-drill.mjs       Quarterly modularity-contract verification

docs/
├── PROJECT_PLAN.docx       The strategic plan (read before scope changes)
└── DESIGN_SYSTEM.docx      The visual contract (read before UI changes)

public/brand/      Brand assets — only readable via tokens/manifest.ts
```

---

## Build, lint, test, ship

```bash
npm install                  # one time
npm run dev                  # local dev (regenerates tokens first)
npm run build                # production build
npm run typecheck            # strict TS check
npm run lint                 # ESLint with the modularity rules
npm run test:rls             # RLS isolation tests (requires env vars)
npm run rebrand:drill        # quarterly: verify a rebrand is still 1 file
npm run tokens               # regenerate _generated.css from roles.ts
```

Before opening a PR, all of these must pass locally:
`npm run typecheck && npm run lint && npm run build`.

---

## What's done (iteration 1 baseline)

- Three-layer token pipeline with five ESLint rules enforcing modularity
- Schema with full RLS on nine tables; RLS test suite with malicious-user sim
- Magic-link auth + auth context + theme context (light/dark/system)
- Five-screen onboarding with Mifflin-St Jeor calorie calculation
- Today screen with metric tiles and quick-log form
- Design system showcase page at `/design-system`
- Cloudflare Pages SPA config; GitHub Actions CI workflow

---

## What's next (iteration 2)

In order of priority:

1. **Open Food Facts food search** — search-as-you-type, barcode scan via
   `BarcodeDetector` Web API, portion picker. No API key needed.
2. **USDA FoodData Central as secondary** — for foods OFF doesn't have well.
   Free API key required (committed to repo as a public env var; rate limit
   3.6K/hour is plenty).
3. **Meal templates and recent foods** — power users repeat 70% of their
   meals; cache them aggressively.
4. **Weekly check-in flow** — Monday-only primary CTA on the Body page;
   persists to `weekly_checkins` table; shows trailing 12-week sparkline.
5. **Trends page** — three Recharts charts: weight rolling average, calories
   vs target, protein vs target. One-sentence narrative summary above each.
6. **Web Push notifications** — Service Worker + VAPID keys (already
   scaffolded); evening close-out reminder; missed-weigh-in nudge.

Out of scope for iteration 2: Hevy integration, native shell, social sign-in,
email infrastructure. See `docs/PROJECT_PLAN.docx` §3.3 for the full
anti-scope.

---

## How to ask me (the human) for input

You will hit decisions where you genuinely don't have enough context. When
that happens, **stop and ask** rather than guessing. Format:

> **Decision needed:** [one-sentence framing]
> **Options:** [2–4 numbered options]
> **My lean:** [what you'd pick if forced; one sentence why]

Don't ask for permission on routine work. Do ask for:
- Schema changes affecting multiple tables
- New external dependencies (libraries, services, APIs)
- Anything that touches authentication or RLS
- Anything that costs money
- Significant deviations from the project plan

---

## How to deliver work (the Walkthrough format)

At the end of each iteration, produce a Markdown file at `WALKTHROUGHS/<date>-<slug>.md`:

```markdown
# Walkthrough — Iteration N: [title]

## What changed
[Three sentences max]

## Files touched
- path/to/file.ts — [one-line description]
- ...

## Screenshots
[Light mode + dark mode of every UI change. Embed via standard Markdown.]

## Verification
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:rls` passes (or skipped with reason)
- [ ] Manual smoke test: [list]

## What I deferred and why
[If anything in the iteration scope didn't ship, explain.]

## Open questions
[For the human to decide before next iteration.]
```

---

## Technical specifications you can rely on

- **Supabase project:** `cjrujymnlphrzkkwqidf` in `ap-southeast-1` (Singapore)
- **Auth:** magic link only. No passwords. No social sign-in until Phase 3.
- **Notifications:** Web Push only. No email infrastructure.
- **Brand:** Forest primary (#0F6E56), Coral accent (#C04828), Ink chrome.
  See `src/tokens/brand.ts`.
- **Region for `Asia South` users:** Singapore Supabase region delivers ~30ms.
- **Free tier headroom:** Supabase 500 MB DB, 50K MAU; Cloudflare unlimited
  bandwidth. Upgrade trigger documented in `docs/PROJECT_PLAN.docx` §11.2.

---

End of brief. The next file you should read is `docs/PROJECT_PLAN.docx`,
section 3 (scope) and section 14 (locked decisions). Then `docs/DESIGN_SYSTEM.docx`,
section 11 (the modularity contract). Then start work.
