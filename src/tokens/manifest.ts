/**
 * Brand asset manifest
 *
 * Single source of truth for non-color brand surfaces.
 * Every component reading a brand asset reads from here.
 *
 * To rebrand:
 *   1. Drop new files into /public/brand/
 *   2. Ensure the keys below match the new filenames
 *   3. Deploy
 *
 * The lint rule `no-direct-asset-paths` (see eslint config) forbids any
 * string matching /\/brand\// outside this file.
 */

export const brandManifest = {
  logo: {
    light: '/brand/logo-light.svg',
    dark:  '/brand/logo-dark.svg',
  },
  appIcon:         '/brand/app-icon.png',
  appIconMaskable: '/brand/app-icon-maskable.png',
  ogImage:         '/brand/og.png',
  favicon:         '/brand/favicon.svg',
  splash:          '/brand/splash.png',
} as const;

export type BrandAsset = keyof typeof brandManifest;
