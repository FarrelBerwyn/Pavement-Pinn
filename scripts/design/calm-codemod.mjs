/**
 * One-off codemod that moves utility classes onto the PAVEMENT-PINN design system
 * (src/styles/index.css): no coloured glow, no gradients, no glass blur, one heavy weight,
 * radii <= 16 px, text >= 12 px, spacing on the 4 px grid, surface hexes -> tokens.
 * It only rewrites class tokens inside strings; run `npm run lint && npm test` after.
 *
 * Usage: node scripts/design/calm-codemod.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = 'src';
// A class token starts after whitespace, a quote, a backtick or a variant colon.
const B = '(^|[\\s"\'`:{(])';
const E = '(?=$|[\\s"\'`)}])';

const HUES = 'amber|yellow|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|emerald|green|teal|lime|red|rose|orange|slate|gray|zinc|black|white';
const SURFACE = {
  canvas: ['07090e', '0b0f19', '0b0f17', '0d1424', '0a0e17'],
  surface: ['0e1320', '0f1420', '11192e', '121622', '121724', '121826', '141a29', '0f172a', '141d33', '0b1f3a'],
  elevated: ['151b2b', '161c2d', '171d2e', '181e2f', '181f33', '1b2644', '1d253b', '1f273d', '20283e']
};

const rules = [
  // Coloured glow shadows and custom glow shadows/drop-shadows.
  [new RegExp(`${B}(?:[a-z0-9]+:)*shadow-(?:${HUES})-\\d{2,3}(?:/\\d+)?${E}`, 'g'), '$1'],
  [new RegExp(`${B}(?:[a-z0-9]+:)*(?:drop-)?shadow-\\[0_0_[^\\]\\s]+\\]${E}`, 'g'), '$1'],
  // Glassmorphism.
  [new RegExp(`${B}(?:[a-z0-9]+:)*backdrop-(?:blur|saturate)(?:-[a-z0-9]+)?${E}`, 'g'), '$1'],
  // Gradients -> solid start colour.
  [new RegExp(`${B}((?:[a-z0-9]+:)*)bg-(?:gradient|linear)-to-[a-z]+${E}`, 'g'), '$1'],
  [new RegExp(`${B}((?:[a-z0-9]+:)*)from-([a-z]+-\\d{2,3}(?:/\\d+)?|\\[[^\\]\\s]+\\])${E}`, 'g'), '$1$2bg-$3'],
  [new RegExp(`${B}(?:[a-z0-9]+:)*(?:via|to)-(?:[a-z]+-\\d{2,3}(?:/\\d+)?|transparent|\\[[^\\]\\s]+\\])${E}`, 'g'), '$1'],
  // Weights.
  [new RegExp(`${B}((?:[a-z0-9]+:)*)font-(?:black|extrabold)${E}`, 'g'), '$1$2font-semibold'],
  // Radii above 16 px.
  [new RegExp(`${B}((?:[a-z0-9]+:)*)rounded-((?:[trbl]{1,2}-)?)(?:3xl|\\[(?:1[7-9]|[2-9]\\d)px\\])(!?)${E}`, 'g'), '$1$2rounded-$3' + '2xl$4'],
  // Text below 12 px -> 12 px; 13-13.5 px -> 14 px.
  [new RegExp(`${B}((?:[a-z0-9]+:)*)text-\\[(?:[6-9]|1[01])(?:\\.5)?px\\]${E}`, 'g'), '$1$2text-xs'],
  [new RegExp(`${B}((?:[a-z0-9]+:)*)text-\\[12px\\]${E}`, 'g'), '$1$2text-xs'],
  [new RegExp(`${B}((?:[a-z0-9]+:)*)text-\\[13(?:\\.5)?px\\]${E}`, 'g'), '$1$2text-sm'],
  // Surface hexes -> tokens.
  ...Object.entries(SURFACE).map(([token, hexes]) => [
    new RegExp(`${B}((?:[a-z0-9]+:)*)(bg|border|from)-\\[#(?:${hexes.join('|')})\\](/\\d+)?${E}`, 'gi'),
    (_m, pre, variants, prop, alpha = '') => `${pre}${variants}${prop === 'border' ? 'border' : 'bg'}-${prop === 'border' ? 'line' : token}${alpha}`
  ])
];

// Spacing on the 4 px grid: .5 steps round to the next whole step (2 px -> 4 px, 6 -> 8, 10 -> 12, 14 -> 16).
const SPACING = '(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)';
const SIZE = '(?:w|h|size)';
const half = (n) => String(Number(n) + 1);
rules.push([
  new RegExp(`${B}((?:[a-z0-9]+:)*)(-?)(${SPACING})-(\\d)\\.5(!?)${E}`, 'g'),
  (_m, pre, v, neg, prop, n, imp) => `${pre}${v}${neg}${prop}-${half(n)}${imp}`
]);
// Icon and dot sizes: 14 px -> 16 px, 10 px -> 8 px, 6 px -> 8 px, 18 px -> 20 px.
rules.push([
  new RegExp(`${B}((?:[a-z0-9]+:)*)(${SIZE})-(\\d)\\.5${E}`, 'g'),
  (_m, pre, v, prop, n) => `${pre}${v}${prop}-${n === '3' ? '4' : n === '2' ? '2' : n === '1' ? '2' : n === '4' ? '5' : half(n)}`
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

let changedFiles = 0;
let total = 0;
for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [re, rep] of rules) {
    // Repeat: adjacent tokens share the boundary character.
    let prev;
    do {
      prev = after;
      after = after.replace(re, (...args) => {
        total++;
        return typeof rep === 'function' ? rep(...args) : args[0].replace(re, rep);
      });
    } while (after !== prev);
  }
  // Tidy double spaces left inside class strings.
  after = after.replace(/(className=["`][^"`]*?) {2,}/g, (m) => m.replace(/ {2,}/g, ' '));
  if (after !== before) {
    changedFiles++;
    if (!DRY) writeFileSync(file, after);
  }
}
console.log(`${DRY ? '[dry] ' : ''}${total} replacements in ${changedFiles} files`);

// Second pass (labels): in a class string that uses `uppercase`, drop the uppercase,
// the letter-spacing and the mono font, so small labels read as normal sans text.
if (process.argv.includes('--labels')) {
  let n = 0;
  for (const file of walk(ROOT)) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(/(["'`])([^"'`\n]*\buppercase\b[^"'`\n]*)\1/g, (m, q, body) => {
      if (!/\b(text|font|px|py|rounded|bg)-/.test(body)) return m; // only class strings
      n++;
      const cleaned = body
        .split(/\s+/)
        .filter((t) => !/^((?:[a-z0-9]+:)*)(uppercase|tracking-(?:wide|wider|widest|\[[^\]]+\])|font-mono)$/.test(t))
        .join(' ');
      return q + cleaned + q;
    });
    if (after !== before && !DRY) writeFileSync(file, after);
  }
  console.log(`labels: ${n} class strings`);
}
