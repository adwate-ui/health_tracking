#!/usr/bin/env node
/**
 * generate-css-vars.mjs
 *
 * Reads src/tokens/roles.ts at build time and emits src/tokens/_generated.css.
 * The output contains CSS custom properties for every role, scoped to light
 * (default) and dark (`.dark` class) themes.
 *
 * Tailwind consumes these variables via the `rgb(var(--color-X) / <alpha-value>)`
 * pattern in tailwind.config.ts. Non-Tailwind code (charts, raw SVG, anything
 * outside Tailwind's reach) reads the same variables directly.
 *
 * Run via `npm run tokens` (or automatically before `npm run dev`/`build`).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// We need the runtime values of `roles`. The cleanest path is to use tsx or
// a tiny TS transpile, but to keep the toolchain minimal we parse the literal
// values from primitives.ts and brand.ts directly. This works because both
// files are pure data with no logic.

function readPrimitives() {
  const src = readFileSync(resolve(repoRoot, 'src/tokens/primitives.ts'), 'utf8');
  const ramps = {};
  const rampPattern = /const\s+(\w+):\s*Ramp\s*=\s*\{([^}]+)\}/g;
  let match;
  while ((match = rampPattern.exec(src)) !== null) {
    const [, name, body] = match;
    const stops = {};
    const stopPattern = /(\d+):\s*'(#[0-9A-Fa-f]+)'/g;
    let stopMatch;
    while ((stopMatch = stopPattern.exec(body)) !== null) {
      stops[stopMatch[1]] = stopMatch[2];
    }
    ramps[name] = stops;
  }
  return ramps;
}

function readBrand(ramps) {
  const src = readFileSync(resolve(repoRoot, 'src/tokens/brand.ts'), 'utf8');
  const aliases = {};
  const aliasPattern = /(\w+):\s+ramps\.(\w+),/g;
  let match;
  // Find the brand block specifically
  const brandBlockMatch = src.match(/export const brand = \{([\s\S]*?)\} as const;/);
  if (!brandBlockMatch) throw new Error('Could not find brand block in brand.ts');
  const brandBlock = brandBlockMatch[1];
  while ((match = aliasPattern.exec(brandBlock)) !== null) {
    const [, role, rampName] = match;
    if (!ramps[rampName]) throw new Error(`brand.ts references unknown ramp: ${rampName}`);
    aliases[role] = ramps[rampName];
  }
  return aliases;
}

function readRoles(brand) {
  const src = readFileSync(resolve(repoRoot, 'src/tokens/roles.ts'), 'utf8');
  const out = {};

  // Match each role line. Captures:
  //   'role-name':  { light: <expr>, dark: <expr> }
  // Where each expr is either a hex string, an rgba string, or brand.<role>[<stop>]
  const linePattern = /'([a-z][a-z0-9-]*)':\s*\{\s*light:\s*([^,]+?),\s*dark:\s*([^}]+?)\s*\}/g;

  function resolveExpr(expr) {
    expr = expr.trim();
    // Quoted literal (hex or rgba)
    const literalMatch = expr.match(/^['"](.+)['"]$/);
    if (literalMatch) return literalMatch[1];
    // brand.role[stop]
    const brandRefMatch = expr.match(/^brand\.(\w+)\[(\d+)\]$/);
    if (brandRefMatch) {
      const [, role, stop] = brandRefMatch;
      if (!brand[role]) throw new Error(`roles.ts references unknown brand role: ${role}`);
      if (!brand[role][stop]) throw new Error(`brand.${role} has no stop ${stop}`);
      return brand[role][stop];
    }
    throw new Error(`Cannot resolve expression in roles.ts: ${expr}`);
  }

  let match;
  while ((match = linePattern.exec(src)) !== null) {
    const [, name, lightExpr, darkExpr] = match;
    out[name] = {
      light: resolveExpr(lightExpr),
      dark:  resolveExpr(darkExpr),
    };
  }
  return out;
}

function colorToRgbTriplet(color) {
  const trimmed = color.trim();

  // hex like #RGB, #RRGGBB
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) throw new Error(`Unsupported hex format: ${trimmed}`);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  }

  // rgba(r,g,b,a) — for surface-overlay; keep alpha in the value
  const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/);
  if (rgbaMatch) {
    // We can't fit alpha into the `rgb(var(--color-x) / <alpha-value>)` pattern
    // for translucent values, so emit as a full rgba and consumers use it
    // directly via var() rather than via Tailwind. This is acceptable for the
    // single overlay token.
    return null; // signal: emit as full color value
  }

  throw new Error(`Cannot parse color: ${trimmed}`);
}

function generate() {
  const ramps = readPrimitives();
  const brand = readBrand(ramps);
  const roles = readRoles(brand);

  const lightVars = [];
  const darkVars = [];
  const literalVars = []; // for rgba/non-RGB values

  for (const [name, pair] of Object.entries(roles)) {
    const lightTriplet = colorToRgbTriplet(pair.light);
    const darkTriplet  = colorToRgbTriplet(pair.dark);

    if (lightTriplet === null || darkTriplet === null) {
      // Emit the literal color directly (used for surface-overlay)
      literalVars.push(`  --color-${name}-raw: ${pair.light};`);
      // Also emit a dark variant
      // (the dark version is also literal)
    } else {
      lightVars.push(`  --color-${name}: ${lightTriplet};`);
      darkVars.push(`  --color-${name}: ${darkTriplet};`);
    }
  }

  // Special handling for the overlay (always rgba)
  const overlayRoles = Object.entries(roles).filter(([, pair]) => pair.light.startsWith('rgb'));
  const overlayLight = overlayRoles.map(([name, pair]) => `  --color-${name}: ${pair.light};`);
  const overlayDark  = overlayRoles.map(([name, pair]) => `  --color-${name}: ${pair.dark};`);

  const out = `/* AUTOGENERATED — do not edit. Run \`npm run tokens\` to regenerate. */
/* Source: src/tokens/roles.ts */

:root {
${lightVars.join('\n')}
${overlayLight.join('\n')}
}

.dark {
${darkVars.join('\n')}
${overlayDark.join('\n')}
}
`;

  const target = resolve(repoRoot, 'src/tokens/_generated.css');
  writeFileSync(target, out, 'utf8');
  console.log(`✓ Wrote ${Object.keys(roles).length} role tokens to src/tokens/_generated.css`);
}

generate();
