# Walkthrough — Iteration 4: Predictive Analytics, Meal Templates & Native Shell

## What changed
We introduced predictive goal arrival calculations to the Trends page, estimating the exact date users will hit their target weight based on their personalized caloric deficit rate. We shipped a comprehensive Meal Template system with a bottom-sheet UI, allowing users to save their frequent meals and log them with one tap. Finally, we scaffolded a cross-platform Capacitor native shell and built a robust abstraction layer for auto-populating steps via Health Connect (Android) and HealthKit (iOS).

## Files touched
- `src/pages/TrendsPage.tsx` — Added `goalArrival` logic and rendered the new data-dense card.
- `supabase/migrations/20260511100000_meal_templates.sql` — Added `meal_templates` and `meal_template_items` tables with RLS.
- `src/types/database.ts` — Updated schema types for the new template tables.
- `src/hooks/useMealTemplates.ts` — New hook for fetching, creating, deleting, and logging templates.
- `src/components/MealTemplateSheet.tsx` — New bottom sheet for browsing and creating templates from today's foods.
- `src/pages/TodayPage.tsx` — Wired the Templates button, sheet, and native step auto-sync.
- `capacitor.config.ts` — New Capacitor configuration file.
- `src/lib/healthPlatform.ts` — New abstraction over native health APIs with web fallbacks.
- `package.json` — Added `@capacitor/core`, `@capacitor/cli`, and Cap scripts.
- `vite.config.ts` — Excluded optional native plugins from web rollup to prevent build failures.

## Verification
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` succeeds
- [x] `supabase db push` applied successfully
- [x] Manual smoke test: Evaluated exactOptionalPropertyTypes compliance and dynamic rollup exclusions.

## What I deferred and why
- I deferred the actual native plugin installation (`@capacitor/health-kit`, `@capacitor-community/health-connect`) since these require platform-specific SDKs (Xcode/Android Studio) to build. The `healthPlatform.ts` abstraction is written to dynamically load them when present, allowing the web PWA build to run cleanly without them.

## Open questions
- For Iteration 5, do we want to begin exploring the USDA API keys/integration, or focus on social components?
