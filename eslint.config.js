/**
 * ESLint config — enforces the modularity contract from
 * the design system, section 11.3.
 *
 * Five rules block the merge if discipline slips:
 *   1. no-hex-literals       — no /#[0-9a-fA-F]{3,8}/ outside tokens/{primitives,brand}.ts
 *   2. no-primitive-imports  — only tokens/brand.ts may import from tokens/primitives.ts
 *   3. no-tailwind-arbitrary-colors — no bg-[#hex] or text-[rgb(...)] in component code
 *   4. no-direct-asset-paths — only tokens/manifest.ts may reference /brand/
 *   5. no-product-name-strings — only tokens/brand.ts may contain literal "TotalMacro"
 *
 * NOTE on flat config: rules OVERRIDE rather than merge across config blocks.
 * For each file pattern we emit a single block with ALL applicable selectors
 * combined into one no-restricted-syntax rule.
 */

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const HEX_LITERAL = {
  selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
  message:
    'Hex color literals are forbidden outside src/tokens/. Use a role token via Tailwind classes (e.g. bg-action-primary, text-text-on-brand).',
};

const HEX_TEMPLATE = {
  selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
  message: 'Hex color literals in template strings are forbidden outside src/tokens/.',
};

const TAILWIND_ARBITRARY_HEX = {
  selector:
    "JSXAttribute[name.name='className'] > Literal[value=/(bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|caret|accent|decoration|shadow)-\\[#[0-9a-fA-F]/]",
  message:
    'Tailwind arbitrary color values (e.g. bg-[#0F6E56]) are forbidden. Use a named role class like bg-action-primary.',
};

const TAILWIND_ARBITRARY_RGB = {
  selector:
    "JSXAttribute[name.name='className'] > Literal[value=/(bg|text|border|ring|fill|stroke)-\\[(rgb|hsl|rgba|hsla)\\(/]",
  message:
    'Tailwind arbitrary color values with rgb()/hsl() are forbidden. Use a named role class.',
};

const ASSET_LITERAL = {
  selector: "Literal[value=/\\/brand\\//]",
  message: 'Brand asset paths are forbidden outside src/tokens/manifest.ts. Read from brandManifest.',
};

const ASSET_TEMPLATE = {
  selector: "TemplateElement[value.raw=/\\/brand\\//]",
  message: 'Brand asset paths in template strings are forbidden outside src/tokens/manifest.ts.',
};

const ASSET_JSX = {
  selector: "JSXText[value=/\\/brand\\//]",
  message: 'Brand asset paths in JSX content are forbidden outside src/tokens/manifest.ts.',
};

const NAME_LITERAL = {
  selector: "Literal[value=/\\bTotalMacro\\b/]",
  message: 'Hard-coded product name is forbidden outside src/tokens/brand.ts. Use brandMeta.name.',
};

const NAME_TEMPLATE = {
  selector: "TemplateElement[value.raw=/\\bTotalMacro\\b/]",
  message: 'Hard-coded product name is forbidden in template strings outside src/tokens/brand.ts.',
};

const NAME_JSX = {
  selector: "JSXText[value=/\\bTotalMacro\\b/]",
  message: 'Hard-coded product name in JSX content is forbidden outside src/tokens/brand.ts.',
};

const TAILWIND_RULES = [TAILWIND_ARBITRARY_HEX, TAILWIND_ARBITRARY_RGB];
const HEX_RULES = [HEX_LITERAL, HEX_TEMPLATE];
const ASSET_RULES = [ASSET_LITERAL, ASSET_TEMPLATE, ASSET_JSX];
const NAME_RULES = [NAME_LITERAL, NAME_TEMPLATE, NAME_JSX];

export default [
  // ─── Base config ─────────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },

  // ─── Tokens layer 1 (primitives): only Tailwind rules apply ──────────────
  {
    files: ['src/tokens/primitives.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...TAILWIND_RULES],
    },
  },

  // ─── Tokens layer 2 (brand): may use hex (it imports primitives) ─────────
  {
    files: ['src/tokens/brand.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...TAILWIND_RULES],
    },
  },

  // ─── Tokens layer 3 (roles): may use hex for special values like #FFFFFF
  {
    files: ['src/tokens/roles.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...TAILWIND_RULES],
    },
  },

  // ─── Brand manifest: may reference /brand/ paths ─────────────────────────
  {
    files: ['src/tokens/manifest.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...HEX_RULES, ...TAILWIND_RULES, ...NAME_RULES],
    },
  },

  // ─── Design system showcase: imports primitives for display ──────────────
  {
    files: ['src/pages/DesignSystemPage.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...TAILWIND_RULES, ...ASSET_RULES, ...NAME_RULES],
      'no-restricted-imports': 'off',
    },
  },

  // ─── Everything else in src/: ALL rules apply ────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/tokens/primitives.ts',
      'src/tokens/brand.ts',
      'src/tokens/roles.ts',
      'src/tokens/manifest.ts',
      'src/pages/DesignSystemPage.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...HEX_RULES,
        ...TAILWIND_RULES,
        ...ASSET_RULES,
        ...NAME_RULES,
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/tokens/primitives', '@/tokens/primitives'],
              message:
                'Only src/tokens/brand.ts may import primitives. Import from @/tokens/roles or @/tokens/brand instead.',
            },
          ],
        },
      ],
    },
  },

  {
    ignores: [
      'dist',
      'node_modules',
      'src/tokens/_generated.css',
      'eslint.config.js',
      'tailwind.config.ts',
      'vite.config.ts',
      'postcss.config.js',
    ],
  },
];
