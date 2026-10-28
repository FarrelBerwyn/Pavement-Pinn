/**
 * URL <-> workspace selection (`?obj=&tab=&v=`), so refresh and shared links keep the
 * active object. Pure: works on URLSearchParams only.
 */
import { WORKSPACE_TABS, type WorkspaceTab } from './types';

export interface WorkspaceSelection {
  objectId: string | null;
  tab: WorkspaceTab;
  version: number | null;
}

export function parseSelection(search: string | URLSearchParams): WorkspaceSelection {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  const tab = q.get('tab');
  const v = Number(q.get('v'));
  const obj = q.get('obj');
  return {
    objectId: obj && /^[A-Za-z0-9_.-]{1,64}$/.test(obj) ? obj : null,
    tab: (WORKSPACE_TABS as readonly string[]).includes(tab ?? '') ? (tab as WorkspaceTab) : 'overview',
    version: Number.isInteger(v) && v > 0 ? v : null
  };
}

/** Merge the selection into an existing query string, keeping unrelated parameters. */
export function serializeSelection(sel: WorkspaceSelection, base: string | URLSearchParams = ''): string {
  const q = new URLSearchParams(typeof base === 'string' ? base : base.toString());
  if (sel.objectId) q.set('obj', sel.objectId);
  else q.delete('obj');
  if (sel.tab !== 'overview') q.set('tab', sel.tab);
  else q.delete('tab');
  if (sel.version !== null) q.set('v', String(sel.version));
  else q.delete('v');
  const s = q.toString();
  return s ? `?${s}` : '';
}
