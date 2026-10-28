/**
 * workspaceStore (contract §6): reportId, activeObjectId, activeTab, version, layers,
 * sectionAxis — one source for all six tabs. Selection lives in the URL (?obj=&tab=&v=), so a
 * refresh or a shared link keeps the active object. Tabs never copy the object; they read it here.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Actor } from '../../domain/workflow/model';
import type { DamageObject, Workspace, WorkspaceTab } from '../../domain/workspace/types';
import { parseSelection, serializeSelection, type WorkspaceSelection } from '../../domain/workspace/url';
import { WorkspaceApiError, type WorkspaceGateway } from './api';

export type LayerKey = 'original' | 'mask' | 'overlay' | 'tracking' | 'mesh' | 'cloud' | 'elevation' | 'depth' | 'contour' | 'section';

export interface WorkspaceStore {
  reportId: string;
  workspace: Workspace | null;
  error: WorkspaceApiError | null;
  loading: boolean;
  selection: WorkspaceSelection;
  activeObject: DamageObject | null;
  setActiveObject: (objectId: string | null) => void;
  setTab: (tab: WorkspaceTab) => void;
  layers: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey, exclusive?: LayerKey[]) => void;
  sectionAxis: 'x' | 'y';
  sectionIndex: number | null;
  setSection: (axis: 'x' | 'y', index: number | null) => void;
  gateway: WorkspaceGateway;
  actor: Actor;
  isFieldEngineer: boolean;
  isOpsManager: boolean;
  /** Run a gateway command and replace the workspace with the server's answer. */
  run: (fn: (g: WorkspaceGateway) => Promise<Workspace>) => Promise<{ ok: true } | { ok: false; message: string }>;
  reload: () => void;
  /** Where the active object was first chosen (shown on the object card). */
  selectedInTab: WorkspaceTab | null;
}

const Ctx = createContext<WorkspaceStore | null>(null);

export function useWorkspace(): WorkspaceStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorkspace outside WorkspaceProvider');
  return v;
}

/** What the route layer hands the workspace (the feature does not import app/). */
export interface WorkspaceDeps {
  gateway: WorkspaceGateway;
  actor: Actor;
  location: { path: string; search: string; hash: string };
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  original: false,
  mask: false,
  overlay: true,
  tracking: false,
  mesh: true,
  cloud: false,
  elevation: false,
  depth: true,
  contour: true,
  section: true
};

export const WorkspaceProvider: React.FC<{ reportId: string; deps: WorkspaceDeps; children: React.ReactNode }> = ({ reportId, deps, children }) => {
  const { location, navigate, gateway, actor } = deps;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<WorkspaceApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [section, setSectionState] = useState<{ axis: 'x' | 'y'; index: number | null }>({ axis: 'x', index: null });
  const [selectedInTab, setSelectedInTab] = useState<WorkspaceTab | null>(null);
  const [tick, setTick] = useState(0);

  const selection = useMemo(() => parseSelection(location.search), [location.search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    gateway
      .get(reportId)
      .then((ws) => alive && (setWorkspace(ws), setError(null)))
      .catch((e) => alive && setError(e instanceof WorkspaceApiError ? e : new WorkspaceApiError(0, 'ERROR', String(e))))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [gateway, reportId, tick, actor.id]);

  // Live stage/object/version changes (SSE on the server, listeners offline).
  useEffect(() => gateway.subscribe(reportId, () => setTick((t) => t + 1)), [gateway, reportId]);

  const write = useCallback(
    (next: WorkspaceSelection) => navigate(`${location.path}${serializeSelection(next, location.search)}${location.hash}`, { replace: true }),
    [navigate, location.path, location.search, location.hash]
  );

  // First load without ?obj: select the first object so every tab has the same target.
  useEffect(() => {
    if (workspace && !selection.objectId && workspace.objects[0]) write({ ...selection, objectId: workspace.objects[0].objectId });
  }, [workspace, selection, write]);

  const activeObject = useMemo(() => workspace?.objects.find((o) => o.objectId === selection.objectId) ?? null, [workspace, selection.objectId]);

  const value: WorkspaceStore = {
    reportId,
    workspace,
    error,
    loading,
    selection,
    activeObject,
    setActiveObject: (objectId) => {
      setSelectedInTab(selection.tab);
      write({ ...selection, objectId });
    },
    setTab: (tab) => write({ ...selection, tab }),
    layers,
    toggleLayer: (key, exclusive) =>
      setLayers((prev) => {
        const next = { ...prev };
        if (exclusive) for (const k of exclusive) next[k] = false;
        next[key] = exclusive ? true : !prev[key];
        return next;
      }),
    sectionAxis: section.axis,
    sectionIndex: section.index,
    setSection: (axis, index) => setSectionState({ axis, index }),
    gateway,
    actor,
    isFieldEngineer: actor.role === 'FIELD_ENGINEER',
    isOpsManager: actor.role === 'OPERATIONS_MANAGER',
    run: async (fn) => {
      try {
        setWorkspace(await fn(gateway));
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },
    reload: () => setTick((t) => t + 1),
    selectedInTab
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
