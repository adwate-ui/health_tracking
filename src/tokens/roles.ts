/**
 * Layer 3 — Role tokens
 *
 * What components import. The only file that exposes colors to the component layer.
 *
 * Each token resolves to a stop of a Layer 2 brand alias. The component asks for
 * a role ("action-primary"); the alias decides which ramp; the primitive provides
 * the hex. A future rebrand changes Layer 2; this file regenerates; components
 * re-render with the new colors. No component code changes.
 *
 * For Tailwind consumption, see `tailwind.config.ts` which reads this file at
 * build time and emits the corresponding utility classes. CSS custom properties
 * are emitted into `index.css` for non-Tailwind consumers (charts, third-party).
 */

import { brand } from './brand';

export const roles = {
  // ─── Surfaces ─────────────────────────────────────────────────────────────
  'surface-canvas':    { light: brand.neutral[50],  dark: brand.neutral[900] },
  'surface-raised':    { light: '#FFFFFF',           dark: brand.neutral[800] },
  'surface-sunken':    { light: brand.neutral[100], dark: brand.neutral[900] },
  'surface-overlay':   { light: 'rgba(11,18,32,0.45)', dark: 'rgba(0,0,0,0.65)' },

  // ─── Text ─────────────────────────────────────────────────────────────────
  'text-primary':      { light: brand.neutral[800], dark: brand.neutral[50]  },
  'text-secondary':    { light: brand.neutral[600], dark: brand.neutral[200] },
  'text-tertiary':     { light: brand.neutral[400], dark: brand.neutral[400] },
  'text-on-brand':     { light: '#FFFFFF',           dark: brand.neutral[900] },
  'text-on-accent':    { light: '#FFFFFF',           dark: brand.neutral[900] },
  'text-on-positive':  { light: brand.primary[900], dark: brand.primary[50]  },
  'text-on-warning':   { light: brand.warning[900], dark: brand.warning[50]  },
  'text-on-negative':  { light: brand.negative[900], dark: brand.negative[50] },
  'text-on-info':      { light: brand.info[900],    dark: brand.info[50]     },

  // ─── Borders ──────────────────────────────────────────────────────────────
  'border-subtle':     { light: brand.neutral[200], dark: brand.neutral[600] },
  'border-strong':     { light: brand.neutral[400], dark: brand.neutral[400] },
  'border-brand':      { light: brand.primary[600], dark: brand.primary[400] },
  'border-accent':     { light: brand.accent[600],  dark: brand.accent[400]  },

  // ─── Action (interactive) ─────────────────────────────────────────────────
  'action-primary':       { light: brand.primary[600], dark: brand.primary[400] },
  'action-primary-hover': { light: brand.primary[800], dark: brand.primary[200] },
  'action-accent':        { light: brand.accent[600],  dark: brand.accent[400]  },
  'action-accent-hover':  { light: brand.accent[800],  dark: brand.accent[200]  },
  'action-danger':        { light: brand.negative[600], dark: brand.negative[400] },
  'action-danger-hover':  { light: brand.negative[800], dark: brand.negative[200] },

  // ─── Status (the five canonical states from §4.5) ─────────────────────────
  'status-on-track-bg':       { light: brand.primary[50], dark: brand.primary[900] },
  'status-on-track-text':     { light: brand.primary[900], dark: brand.primary[50]  },
  'status-approaching-bg':    { light: brand.warning[50], dark: brand.warning[900] },
  'status-approaching-text':  { light: brand.warning[900], dark: brand.warning[50]  },
  'status-below-bg':          { light: brand.negative[50], dark: brand.negative[900] },
  'status-below-text':        { light: brand.negative[900], dark: brand.negative[50] },
  'status-logged-bg':         { light: brand.info[50],    dark: brand.info[900]    },
  'status-logged-text':       { light: brand.info[900],   dark: brand.info[50]     },

  // ─── Focus ────────────────────────────────────────────────────────────────
  'focus-ring':        { light: brand.primary[600], dark: brand.primary[400] },
} as const;

export type RoleName = keyof typeof roles;

/**
 * Helper for runtime consumers (charts, JS-driven SVG) to get a color
 * matching the current theme. CSS-rendered components should prefer the
 * Tailwind utility classes generated from this file.
 */
export function getRole(name: RoleName, theme: 'light' | 'dark'): string {
  return roles[name][theme];
}
