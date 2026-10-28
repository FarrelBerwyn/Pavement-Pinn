import type { Request, Response, Router } from "express";
import express from "express";
import type { Actor } from "../../src/domain/workflow/model";
import { canViewWorkspace } from "../../src/domain/workspace/access";
import { sectionProfile } from "../../src/domain/workspace/section";
import type { CommandOutcome } from "../../src/domain/workspace/commands";
import { actorFrom } from "../auth/actor";
import { rateLimit } from "../middleware/rateLimit";
import type { WorkflowRuntime } from "../services/workflowRuntime";

/**
 * Analysis Workspace API (handoff spec/03 §4). Reads need VIEW_PINN_WORKSPACE (M.O, F.E);
 * corrections are F.E only; approval is M.O only and never by the corrector (approvalGuard).
 * The public tracking projection is the only unauthenticated read and carries no personal data.
 */
export const WORKSPACE_PATHS = {
  index: "/api/v3/workspaces",
  workspace: "/api/v3/reports/:reportId/workspace",
  stream: "/api/v3/reports/:reportId/stream",
  object: "/api/v3/reports/:reportId/objects/:objectId",
  frames: "/api/v3/reports/:reportId/frames",
  section: "/api/v3/reports/:reportId/objects/:objectId/section",
  corrections: "/api/v3/reports/:reportId/corrections",
  groundTruth: "/api/v3/reports/:reportId/ground-truth",
  submit: "/api/v3/reports/:reportId/versions/submit",
  approve: "/api/v3/reports/:reportId/versions/:v/approve",
  reject: "/api/v3/reports/:reportId/versions/:v/reject",
  photoRequest: "/api/v3/reports/:reportId/photo-requests",
  vehicleScenario: "/api/v3/reports/:reportId/vehicle-scenario",
  publicTrack: "/api/public/track/:code",
  publicConfirm: "/api/public/track/:code/confirm"
} as const;

const json = express.json({ limit: "512kb" });

function viewer(req: Request, res: Response, runtime: WorkflowRuntime): Actor | null {
  const actor = actorFrom(req, runtime);
  if (!actor || !canViewWorkspace(actor.role)) {
    res.status(403).json({ success: false, code: "FORBIDDEN", error: "Workspace analisis hanya untuk Operations Manager dan Field Engineer." });
    return null;
  }
  return actor;
}

function reply(res: Response, out: CommandOutcome) {
  if ("status" in out) return res.status(out.status).json({ success: false, code: out.code, error: out.message });
  return res.json({ success: true, workspace: out.workspace, detail: out.detail ?? null });
}

export function registerWorkspaceRoutes(router: Router, runtime: WorkflowRuntime): void {
  const svc = runtime.workspaces;
  const writeLimit = rateLimit("workspace-write", 60, 60_000);

  router.get(WORKSPACE_PATHS.index, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    res.json({ success: true, ...(await svc.list()) });
  });

  router.get(WORKSPACE_PATHS.workspace, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const ws = await svc.get(req.params.reportId);
    if (!ws) return res.status(404).json({ success: false, code: "NOT_FOUND", error: "Laporan tidak ditemukan." });
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, workspace: ws });
  });

  router.get(WORKSPACE_PATHS.object, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const ws = await svc.get(req.params.reportId);
    const object = ws?.objects.find((o) => o.objectId === req.params.objectId);
    if (!ws || !object) return res.status(404).json({ success: false, code: "NOT_FOUND", error: "Objek tidak ditemukan." });
    res.json({ success: true, object, groundTruth: ws.groundTruth.filter((p) => p.objectId === object.objectId) });
  });

  router.get(WORKSPACE_PATHS.frames, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const ws = await svc.get(req.params.reportId);
    if (!ws) return res.status(404).json({ success: false, code: "NOT_FOUND", error: "Laporan tidak ditemukan." });
    res.json({ success: true, frames: ws.frames });
  });

  router.get(WORKSPACE_PATHS.section, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const ws = await svc.get(req.params.reportId);
    const surface = ws?.surfaces.find((s) => s.objectId === req.params.objectId);
    if (!surface) return res.status(404).json({ success: false, code: "NO_SURFACE", error: "Belum ada permukaan 3D untuk objek ini." });
    const axis = req.query.axis === "y" ? "y" : "x";
    const at = req.query.index === undefined ? undefined : Number(req.query.index);
    res.json({ success: true, section: sectionProfile(surface, axis, Number.isFinite(at) ? at : undefined) });
  });

  router.get(WORKSPACE_PATHS.stream, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const reportId = req.params.reportId;
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(`event: hello\ndata: ${JSON.stringify({ reportId })}\n\n`);
    const onEvent = (e: { type: string }) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
    svc.events.on(reportId, onEvent);
    const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
      clearInterval(ping);
      svc.events.off(reportId, onEvent);
    });
  });

  router.post(WORKSPACE_PATHS.corrections, writeLimit, json, async (req, res) => {
    await runtime.ready;
    const actor = viewer(req, res, runtime);
    if (!actor) return;
    reply(res, await svc.correct(req.params.reportId, req.body, actor));
  });

  router.post(WORKSPACE_PATHS.groundTruth, writeLimit, json, async (req, res) => {
    await runtime.ready;
    const actor = viewer(req, res, runtime);
    if (!actor) return;
    reply(res, await svc.groundTruth(req.params.reportId, req.body, actor));
  });

  router.post(WORKSPACE_PATHS.submit, writeLimit, json, async (req, res) => {
    await runtime.ready;
    const actor = viewer(req, res, runtime);
    if (!actor) return;
    reply(res, await svc.submit(req.params.reportId, req.body ?? {}, actor));
  });

  for (const [path, decision] of [[WORKSPACE_PATHS.approve, "approve"], [WORKSPACE_PATHS.reject, "reject"]] as const) {
    router.post(path, writeLimit, json, async (req, res) => {
      await runtime.ready;
      const actor = viewer(req, res, runtime);
      if (!actor) return;
      const v = Number(req.params.v);
      if (!Number.isInteger(v) || v < 1) return res.status(400).json({ success: false, code: "INVALID", error: "Nomor versi tidak valid." });
      reply(res, await svc.decide(req.params.reportId, v, decision, typeof req.body?.reason === "string" ? req.body.reason : undefined, actor));
    });
  }

  router.post(WORKSPACE_PATHS.photoRequest, writeLimit, json, async (req, res) => {
    await runtime.ready;
    const actor = viewer(req, res, runtime);
    if (!actor) return;
    reply(res, await svc.requestPhotos(req.params.reportId, req.body ?? {}, actor));
  });

  router.post(WORKSPACE_PATHS.vehicleScenario, rateLimit("vehicle-scenario", 30, 60_000), json, async (req, res) => {
    await runtime.ready;
    if (!viewer(req, res, runtime)) return;
    const out = await svc.vehicleScenario(req.params.reportId, req.body?.vehicle);
    if (!out.ok) return res.status(out.status).json({ success: false, code: out.code, error: out.message });
    res.json({ success: true, scenario: out.scenario });
  });

  router.get(WORKSPACE_PATHS.publicTrack, async (req, res) => {
    await runtime.ready;
    const view = await svc.publicTrack(String(req.params.code).toUpperCase());
    if (!view) return res.status(404).json({ success: false, code: "NOT_FOUND", error: "Kode lacak tidak ditemukan." });
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, track: view });
  });

  router.post(WORKSPACE_PATHS.publicConfirm, rateLimit("track-confirm", 10, 60_000), json, async (req, res) => {
    await runtime.ready;
    const out = await svc.confirmRepair(String(req.params.code).toUpperCase(), req.body?.repaired === true);
    if (out === null) return res.status(404).json({ success: false, code: "NOT_FOUND", error: "Kode lacak tidak ditemukan." });
    if (out === "NOT_ALLOWED") return res.status(409).json({ success: false, code: "NOT_ALLOWED", error: "Konfirmasi hanya setelah foto sesudah perbaikan diterbitkan." });
    res.json({ success: true, track: out });
  });
}
