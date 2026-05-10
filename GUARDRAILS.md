# GUARDRAILS.md

Patterns of agent failure observed during this build, with the
corrective response for each. Update this file when you (the agent) catch
yourself or another agent slipping into one of these failure modes.

## 1. Generating a literal hex value in component code

**Trigger:** designing a chart, an SVG, an inline style.
**Why it happens:** the path of least resistance is `color: '#0F6E56'`.
**Why it's wrong:** breaks the modularity contract; the rebrand drill fails;
the lint blocks the merge anyway.
**Correct response:** add a new role token in `src/tokens/roles.ts`,
referenced via Tailwind class. If the value is dynamic (a chart), use
`getRole('action-primary', resolvedTheme)` from `roles.ts`.

## 2. Writing "TotalMacro" as a string literal

**Trigger:** building a screen header, a meta tag, an email template.
**Why it's wrong:** breaks the rebrand contract.
**Correct response:** import `brandMeta.name` from `@/tokens/brand`.
The `index.html` and `manifest.webmanifest` are exceptions (the lint allows
them); everywhere else uses the constant.

## 3. Adding a new dependency to fix a small problem

**Trigger:** "I need a date library / state library / CSS library / animation
library."
**Why it's wrong:** dependency growth compounds. Bundle size matters on a PWA.
**Correct response:** before installing, ask: "Can I solve this in 30 lines
of TS using what's already here?" If yes, do that. If no, propose the
dependency in chat with the bundle-size impact.

## 4. Disabling a CHECK constraint or RLS policy because a test fails

**Trigger:** "the test failed; if I just remove this constraint it passes."
**Why it's wrong:** the constraint exists for a reason. The test is signalling
something real.
**Correct response:** read the migration to understand WHY the constraint
exists. Fix the test or the data model. Never weaken the schema to suit a
test.

## 5. Writing a `// TODO` and moving on

**Trigger:** the task is larger than expected; cutting scope feels good.
**Why it's wrong:** TODOs accumulate; nobody comes back to them.
**Correct response:** if you genuinely can't finish in this iteration, add it
to the iteration backlog in the Walkthrough's "What I deferred and why"
section. TODOs in code are forbidden except where there's an open issue
referenced (`// TODO(#42): explanation`).

## 6. Adding a feature that wasn't in the iteration scope

**Trigger:** "while I was here, I noticed X would be cool, so I added it."
**Why it's wrong:** scope creep destroys cadence. Each iteration is
deliberately narrow.
**Correct response:** add the idea to a `BACKLOG.md` file with one paragraph
of context. Do NOT implement it in this iteration.

## 7. Optimising prematurely

**Trigger:** "this query might be slow at 10K users."
**Why it's wrong:** we have zero users. The optimisation is speculative.
**Correct response:** write the simple version. Add a comment with the
hypothesised concern. Revisit if and when the concern materialises.

## 8. Modifying RLS policies without running the test suite

**Trigger:** "I need a different policy shape for this query."
**Why it's wrong:** RLS bugs are silent and catastrophic — they leak data
across users.
**Correct response:** if you change a policy, you must run `npm run test:rls`
locally and confirm green BEFORE pushing. The CI runs it too, but a leak in
production for the time between push and revert is unacceptable.

## 9. "It works on my machine" — skipping the build check

**Trigger:** dev server hot-reload is working; PR feels ready.
**Why it's wrong:** Vite dev mode is forgiving. Production build is strict.
TypeScript catches different things than the dev runtime.
**Correct response:** `npm run build` must pass before the PR opens. No
exceptions.

## 10. Asking for too many decisions at once

**Trigger:** halfway through a task, you realise three things are ambiguous.
**Why it's wrong:** the human can't context-switch four ways in one message.
**Correct response:** pick the highest-stakes decision; ask only that;
proceed with sensible defaults on the rest and flag them in the Walkthrough
under "Decisions I made unilaterally."
