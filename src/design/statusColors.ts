/**
 * Road-condition status colours for code that cannot use CSS classes (map layers, markers,
 * popups, PDF). Same values as the --color-status-* tokens in src/styles/index.css.
 * Calm tones only: no neon, no glow. Keep the meaning: never swap a status for brand yellow.
 */
export const STATUS_COLORS = {
  /** Baik */
  good: '#57ae78',
  /** Perlu perhatian */
  watch: '#e8b23a',
  /** Rusak ringan */
  light: '#e2823d',
  /** Rusak berat */
  heavy: '#d9655d'
} as const;

export const BRAND_COLORS = {
  yellow: '#f5bc24',
  navy: '#141a35',
  canvas: '#0b0d12',
  surface: '#121621',
  elevated: '#191f2d',
  line: '#2a3040',
  fg: '#f4f5f7',
  fgMuted: '#a0a8b8',
  fgSubtle: '#758095',
  /** Neutral steel for non-status information (replaces decorative cyan/blue). */
  info: '#8296b0'
} as const;
