/**
 * Road-condition status colours for code that cannot use CSS classes (map layers, markers,
 * popups, PDF). Same values as the --color-status-* tokens in src/styles/index.css.
 * Calm tones only: no neon, no glow. Keep the meaning: never swap a status for brand yellow.
 */
export const STATUS_COLORS = {
  /** Normal / Baik */
  good: '#50A878',
  /** Waspada / Perlu perhatian */
  watch: '#D7A84B',
  /** Siaga / Rusak ringan */
  light: '#D88A45',
  /** Kritis / Rusak berat */
  heavy: '#D96B5F'
} as const;

export const BRAND_COLORS = {
  yellow: '#E8B52B',
  navy: '#1C1C1A',
  canvas: '#11110F',
  surface: '#191918',
  elevated: '#222220',
  line: '#343430',
  fg: '#F0F0EA',
  fgMuted: '#B0AFA7',
  fgSubtle: '#85847D',
  /** Neutral steel for non-status information (replaces decorative cyan/blue). */
  info: '#8296b0'
} as const;
