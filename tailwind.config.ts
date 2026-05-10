import type { Config } from 'tailwindcss';
import { roles } from './src/tokens/roles';
import { brandMeta } from './src/tokens/brand';

/**
 * Tailwind config — generated from the role tokens.
 *
 * Components should NEVER use arbitrary color values like `bg-[#0F6E56]` or
 * `text-[var(--color-text)]`. The lint rule `no-tailwind-arbitrary-colors`
 * blocks those. Use the named role classes only.
 */

// Convert each role into the Tailwind colors map. Each role becomes a CSS
// variable reference; the variable is defined per-theme in index.css.
const colorTokens = Object.fromEntries(
  Object.keys(roles).map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
);

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: brandMeta.fontSans,
      mono: brandMeta.fontMono,
    },
    extend: {
      colors: colorTokens,
      borderRadius: {
        xs:   `${brandMeta.radius.xs}px`,
        sm:   `${brandMeta.radius.sm}px`,
        md:   `${brandMeta.radius.md}px`,
        lg:   `${brandMeta.radius.lg}px`,
        xl:   `${brandMeta.radius.xl}px`,
        pill: `${brandMeta.radius.pill}px`,
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '500' }],
        small:   ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'body-sm': ['13px', { lineHeight: '1.5' }],
        body:    ['14px', { lineHeight: '1.5' }],
        h3:      ['16px', { lineHeight: '1.4',  fontWeight: '500' }],
        h2:      ['18px', { lineHeight: '1.3',  fontWeight: '500' }],
        h1:      ['22px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '500' }],
        display: ['32px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '500' }],
      },
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '24px',
        '6':   '32px',
        '7':   '48px',
        '8':   '64px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphatic: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--color-focus-ring) / 1)',
      },
      ringOffsetColor: {
        DEFAULT: 'rgb(var(--color-surface-canvas) / 1)',
      },
      ringWidth: {
        DEFAULT: '2px',
      },
      ringOffsetWidth: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
