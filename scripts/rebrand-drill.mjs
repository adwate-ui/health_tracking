#!/usr/bin/env node
/**
 * rebrand-drill.mjs
 *
 * Runs a literal test of the modularity contract from design system §11.4.
 *
 * Steps:
 *   1. Reads src/tokens/brand.ts
 *   2. Swaps `primary: ramps.forest` to `primary: ramps.coral`
 *      and `accent: ramps.coral` to `accent: ramps.forest`
 *   3. Regenerates the CSS variables
 *   4. Reverts the change (this is a drill, not a real rebrand)
 *   5. Reports the diff: a successful drill produces a single-file change
 *
 * To run a real rebrand, edit brand.ts directly and commit.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const brandFile = resolve(repoRoot, 'src/tokens/brand.ts');

console.log('🔄 Running rebrand drill...');
console.log('   Swapping primary ↔ accent in brand.ts');

const original = readFileSync(brandFile, 'utf8');

// Marker-based swap so we don't depend on whitespace
const swapped = original
  .replace('primary:  ramps.forest', 'primary:  ramps.coral_TEMP')
  .replace('accent:   ramps.coral', 'accent:   ramps.forest')
  .replace('primary:  ramps.coral_TEMP', 'primary:  ramps.coral');

if (swapped === original) {
  console.error('❌ Drill failed: could not find the brand assignments to swap.');
  console.error('   Has the brand.ts format changed? Update this script.');
  process.exit(1);
}

writeFileSync(brandFile, swapped);

try {
  console.log('   Regenerating CSS variables...');
  execSync('node scripts/generate-css-vars.mjs', { cwd: repoRoot, stdio: 'inherit' });

  // Diff against HEAD to count touched files (excluding the drill itself).
  // We expect exactly: brand.ts and _generated.css.
  const diffOutput = execSync('git diff --name-only', { cwd: repoRoot }).toString().trim();
  const changedFiles = diffOutput ? diffOutput.split('\n') : [];
  const expectedFiles = ['src/tokens/brand.ts', 'src/tokens/_generated.css'];

  const unexpected = changedFiles.filter((f) => !expectedFiles.includes(f));
  const missing = expectedFiles.filter((f) => !changedFiles.includes(f));

  console.log('');
  console.log('Files changed by drill:');
  changedFiles.forEach((f) => console.log(`   ${f}`));
  console.log('');

  if (unexpected.length > 0 || missing.length > 0) {
    if (unexpected.length > 0) {
      console.error('❌ Unexpected files changed (modularity leak):');
      unexpected.forEach((f) => console.error(`   ${f}`));
    }
    if (missing.length > 0) {
      console.error('❌ Expected files NOT changed:');
      missing.forEach((f) => console.error(`   ${f}`));
    }
    process.exit(1);
  }

  console.log('✓ Drill passed: only the expected two files changed.');
  console.log('  The modularity contract holds. A real rebrand is one PR.');
} finally {
  // Always revert
  writeFileSync(brandFile, original);
  execSync('node scripts/generate-css-vars.mjs', { cwd: repoRoot, stdio: 'pipe' });
  console.log('');
  console.log('🔁 Reverted brand.ts to original.');
}
