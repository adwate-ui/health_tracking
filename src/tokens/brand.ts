/**
 * Layer 2 — Brand aliases (the rebrand surface)
 *
 * This file is the rebrand contract.
 * To recolor the entire product, change exactly this file. Nothing else.
 *
 * RULE: This is the ONLY file allowed to import from `tokens/primitives.ts`.
 * Components import from `tokens/roles.ts`, never from here.
 *
 * To rebrand the product:
 *   1. Change brandMeta.name and brandMeta.domain
 *   2. Swap the ramp assignments below (e.g. primary: ramps.coral)
 *   3. Replace files in `/public/brand/` per the manifest
 *   4. Run the rebrand drill: `npm run rebrand:drill`
 *
 * That's it. No other file changes.
 */

import { ramps } from './primitives';

export const brand = {
  /** The product's voice. CTAs, focused state, on-track affirmation, the trend line. */
  primary:  ramps.forest,

  /** Structural ramp. Surfaces, text, dividers. Carries hierarchy, not brand meaning. */
  neutral:  ramps.ink,

  /** Reserved for moments that matter. Active onboarding step, destructive confirm. Sparingly. */
  accent:   ramps.coral,

  /** Terminal completion state. Distinct from primary's "on track" mid-journey state. */
  positive: ramps.success,

  /** Approaching a boundary. Calorie limit at 90%, weigh-in skipped. */
  warning:  ramps.warning,

  /** Missed, error, destructive. Used for state, never for branding. */
  negative: ramps.danger,

  /** Informational. Logged-but-not-judged. Help, links. */
  info:     ramps.info,
} as const;

export const brandMeta = {
  name: 'TotalMacro',
  tagline: 'Honest, multi-metric tracking.',
  domain: 'totalmacro.app',

  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",

  radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 999 },
} as const;

export type BrandRole = keyof typeof brand;
