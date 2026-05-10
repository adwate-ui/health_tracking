/**
 * Layer 1 — Primitives
 *
 * Hex values, organised by ramp. This file defines what colors EXIST.
 * It does not define what they MEAN.
 *
 * RULE: Only `tokens/brand.ts` may import from this file.
 * Components must never import primitives directly. Enforced by ESLint.
 *
 * Every ramp has 7 stops, optimised for both light and dark mode usage.
 * Stops 50–200 are background fills.
 * Stops 400–600 are mid-tones for graphical elements.
 * Stops 800–900 are text on the matching 50–100 fill.
 */

export type RampStop = 50 | 100 | 200 | 400 | 600 | 800 | 900;
export type Ramp = Record<RampStop, string>;

const forest: Ramp = {
  50:  '#E1F5EE',
  100: '#9FE1CB',
  200: '#5DCAA5',
  400: '#1D9E75',
  600: '#0F6E56',
  800: '#085041',
  900: '#04342C',
};

const ink: Ramp = {
  50:  '#F6F7F9',
  100: '#EBEEF2',
  200: '#D5DAE2',
  400: '#7B8597',
  600: '#374151',
  800: '#1F2937',
  900: '#0B1220',
};

const coral: Ramp = {
  50:  '#FEF3F0',
  100: '#FCDBD0',
  200: '#F8B299',
  400: '#E36540',
  600: '#C04828',
  800: '#9A381F',
  900: '#732919',
};

const success: Ramp = {
  50:  '#EAF3DE',
  100: '#C0DD97',
  200: '#97C459',
  400: '#639922',
  600: '#3B6D11',
  800: '#27500A',
  900: '#173404',
};

const warning: Ramp = {
  50:  '#FAEEDA',
  100: '#FAC775',
  200: '#EF9F27',
  400: '#BA7517',
  600: '#854F0B',
  800: '#633806',
  900: '#412402',
};

const danger: Ramp = {
  50:  '#FCEBEB',
  100: '#F7C1C1',
  200: '#F09595',
  400: '#E24B4A',
  600: '#A32D2D',
  800: '#791F1F',
  900: '#501313',
};

const info: Ramp = {
  50:  '#E6F1FB',
  100: '#B5D4F4',
  200: '#85B7EB',
  400: '#378ADD',
  600: '#185FA5',
  800: '#0C447C',
  900: '#042C53',
};

export const ramps = {
  forest,
  ink,
  coral,
  success,
  warning,
  danger,
  info,
} as const;

export type RampName = keyof typeof ramps;
