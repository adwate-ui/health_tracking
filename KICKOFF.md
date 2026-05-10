# Antigravity kickoff prompt

This file is for the human, not the agent. Copy the body below into your
first Antigravity Manager-view session. Subsequent sessions just need a
short directive ("start iteration 2") because the agent reads `AGENTS.md`
on every session.

---

## First-session prompt (copy from here ↓)

You are taking over an in-progress build. The repository is a multi-user
fitness tracking PWA called TotalMacro. Iteration 1 is partially complete
and committed; your job is to finish it cleanly and then proceed to iteration
2 only after I approve.

### Step 1 — Read the brief, in this order:

1. `AGENTS.md` (the standing brief; read every session)
2. `GUARDRAILS.md` (failure modes to avoid)
3. `docs/PROJECT_PLAN.docx` sections 3 (scope), 9 (roadmap), 14 (locked decisions)
4. `docs/DESIGN_SYSTEM.docx` sections 1 (philosophy), 2 (tokens), 11 (modularity contract)
5. `README.md` (operational reference)

### Step 2 — Verify the iteration 1 baseline runs locally:

```bash
npm install
cp .env.example .env
# (I will fill in the Supabase keys; flag if .env is empty)
npm run typecheck
npm run lint
npm run build
```

If any of these fail, your first job is to make them pass. Open a draft PR
titled `iteration-1-completion` and commit fixes to it. Do not proceed to
iteration 2 work until iteration 1 builds clean.

### Step 3 — Apply the schema migration to the Supabase project.

The migration file is `supabase/migrations/20260510000000_initial_schema.sql`.
The Supabase project is `cjrujymnlphrzkkwqidf` in `ap-southeast-1`. I have
not yet applied this migration. Use the Supabase MCP server (if connected)
or generate a copy-pasteable SQL block I can run in the Supabase SQL Editor
manually.

### Step 4 — Verify RLS isolation works end to end:

Run `npm run test:rls`. The test creates two users, has each write data,
and verifies neither can see the other. This must pass. If it fails, the
multi-tenancy contract is broken and nothing else matters until it works.

### Step 5 — Walkthrough.

Produce `WALKTHROUGHS/2026-05-10-iteration-1-completion.md` per the format
in `AGENTS.md`. Include:
- The state of each baseline check (typecheck / lint / build / RLS test)
- Screenshots of the Today screen in light + dark mode
- Screenshots of the design system page (`/design-system`) in both modes
- Any deviations from `docs/PROJECT_PLAN.docx` you noticed and your
  recommendation

### Stop conditions

Stop and ask me before:
- Modifying any RLS policy or CHECK constraint
- Adding any dependency not already in `package.json`
- Touching `src/tokens/brand.ts` (the rebrand surface)
- Anything outside iteration 1 scope as defined in `docs/PROJECT_PLAN.docx` §14.3

### Communication

- Hard rule: every Walkthrough has a "What I deferred and why" section,
  even if empty.
- Hard rule: every PR description references the iteration number and the
  relevant `docs/PROJECT_PLAN.docx` section.
- Soft preference: write commit messages in the imperative mood ("add",
  "fix", "refactor"), not past tense.

Begin with Step 1. Confirm you've read each file with one sentence each
before proceeding.

---

## Subsequent-session prompts (after iteration 1 is sealed)

Once iteration 1 is merged, future sessions can be much shorter. Format:

> Start iteration N. Scope: [bullet list from `docs/PROJECT_PLAN.docx` §X.Y].
> Constraints: [anything specific to this iteration that AGENTS.md doesn't
> already cover].
> Stop and ask me about: [the 1-3 things you anticipate as ambiguous].

Example for iteration 2:

> Start iteration 2. Scope: Open Food Facts food search with
> search-as-you-type and barcode scan; USDA FoodData Central as secondary;
> meal templates and recent foods. See `docs/PROJECT_PLAN.docx` §3.2 row
> "Daily journal" Phase 2 column.
>
> Constraints: portion picker must show macro readout updating live as the
> user changes the portion; barcode scan uses the native `BarcodeDetector`
> Web API only — no third-party library; cache OFF responses for 7 days
> via the existing service worker pattern in `vite.config.ts`.
>
> Stop and ask me about: (1) the USDA FoodData Central API key — I need
> to generate one and tell you what it is; (2) the layout when both OFF
> and USDA return the same food — dedup heuristic.
