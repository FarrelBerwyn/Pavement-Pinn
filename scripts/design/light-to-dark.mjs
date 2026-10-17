/**
 * Moves light-only screens onto the dark design system (exact class tokens only).
 * Usage: node scripts/design/light-to-dark.mjs <file...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MAP = {
  'bg-white': 'bg-surface',
  'bg-slate-50': 'bg-canvas',
  'bg-slate-100': 'bg-elevated',
  'bg-slate-200': 'bg-slate-700',
  'hover:bg-slate-50': 'hover:bg-elevated',
  'hover:bg-slate-100': 'hover:bg-elevated',
  'hover:bg-white': 'hover:bg-elevated',
  'border-slate-100': 'border-line',
  'border-slate-200': 'border-line',
  'border-slate-300': 'border-line',
  'divide-slate-100': 'divide-line',
  'divide-slate-200': 'divide-line',
  'text-slate-950': 'text-white',
  'text-slate-900': 'text-white',
  'text-slate-800': 'text-slate-100',
  'text-slate-700': 'text-slate-200',
  'text-slate-600': 'text-slate-300',
  'text-slate-500': 'text-slate-400',
  'hover:text-slate-900': 'hover:text-white',
  'bg-amber-50': 'bg-amber-400/10', 'bg-amber-100': 'bg-amber-400/15',
  'text-amber-900': 'text-amber-200', 'text-amber-800': 'text-amber-300', 'text-amber-700': 'text-amber-300', 'text-amber-600': 'text-amber-400',
  'border-amber-200': 'border-amber-400/30', 'border-amber-300': 'border-amber-400/40',
  'bg-rose-50': 'bg-rose-500/10', 'bg-rose-100': 'bg-rose-500/15', 'text-rose-800': 'text-rose-300', 'text-rose-700': 'text-rose-300', 'text-rose-600': 'text-rose-400',
  'border-rose-200': 'border-rose-500/30', 'border-rose-300': 'border-rose-500/40',
  'bg-red-50': 'bg-red-500/10', 'text-red-800': 'text-red-300', 'text-red-700': 'text-red-300', 'border-red-200': 'border-red-500/30',
  'bg-emerald-50': 'bg-emerald-500/10', 'bg-emerald-100': 'bg-emerald-500/15', 'text-emerald-800': 'text-emerald-300', 'text-emerald-700': 'text-emerald-300', 'text-emerald-600': 'text-emerald-400',
  'border-emerald-200': 'border-emerald-500/30', 'border-emerald-300': 'border-emerald-500/40',
  'bg-orange-50': 'bg-orange-500/10', 'text-orange-800': 'text-orange-300', 'text-orange-700': 'text-orange-300', 'border-orange-200': 'border-orange-500/30',
  'bg-sky-50': 'bg-elevated', 'bg-blue-50': 'bg-elevated', 'bg-indigo-50': 'bg-elevated',
  'text-sky-800': 'text-slate-200', 'text-blue-800': 'text-slate-200', 'text-indigo-800': 'text-slate-200', 'text-blue-700': 'text-slate-300', 'text-sky-700': 'text-slate-300', 'text-indigo-700': 'text-slate-300',
  'border-sky-200': 'border-line', 'border-blue-200': 'border-line', 'border-indigo-200': 'border-line'
};

for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, 'utf8');
  let n = 0;
  const after = before.replace(/(?<=^|[\s"'`{(])((?:[a-z0-9]+:)*)([a-z]+(?::[a-z]+)?-[a-z]+(?:-\d{2,3})?|bg-white|hover:bg-white)(?=$|[\s"'`)}])/g, (m, variants, token) => {
    const key = token;
    if (!(key in MAP)) return m;
    n++;
    return variants + MAP[key];
  });
  if (after !== before) writeFileSync(file, after);
  console.log(file, n);
}
