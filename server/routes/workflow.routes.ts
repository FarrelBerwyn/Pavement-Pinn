import type { Request, Response, Router } from "express";
import { WORKFLOW_API_PATHS } from "../../src/types";
import { USER_ACCOUNTS } from "../../src/data/reference/demoAccounts";
import { canEditReport, isOfficialRole } from "../../src/domain/access";
import type { Actor, ReportCase } from "../../src/domain/workflow/model";
import { WORKFLOW_ACTIONS, WORKFLOW_STATES } from "../../src/domain/workflow/model";
import { availableActions, type WorkflowCommand } from "../../src/domain/workflow/stateMachine";
import { toPublicView } from "../../src/domain/workflow/projections";
import type { ServiceResult } from "../../src/domain/workflow/service";
import type { ReportDraft } from "../../src/domain/reports/reportFactory";
import { hashClaimToken, newClaimToken } from "../auth/sessionTokens";
import { rateLimit } from "../middleware/rateLimit";
import { checkPhotoReference } from "../services/photoValidation";
import type { WorkflowRuntime } from "../services/workflowRuntime";
import { actorFrom } from "../auth/actor";
import { segmentById } from "../services/segments";
import { assessSegment, snapshotOf } from "../../src/domain/intelligence/assessment";

/**
 * Workflow API (docs/api/WORKFLOW_API.md). The server decides the actor from its own
 * signed session token; request bodies never carry identity. Official roles see full
 * report cases; everyone else gets the public projection.
 */

type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "VERSION_CONFLICT" | "INVALID_TRANSITION" | "STORAGE" | "DISABLED";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION: 400,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 422,
  STORAGE: 503,
  DISABLED: 403
};

/** Endpoint paths named in spec v2.2 Lampiran L, served as aliases of the workflow routes. */
export const SPEC_PATHS = { reports: "/api/reports", login: "/api/auth/login" } as const;

function sendError(res: Response, code: ErrorCode, message: string): void {
  res.status(STATUS[code]).json({ success: false, error: { code, message } });
}

function sendResult(res: Response, result: ServiceResult<ReportCase>, actor: Actor, status = 200): void {
  if (result.ok === false) {
    const failure = result as Extract<ServiceResult<ReportCase>, { ok: false }>;
    sendError(res, failure.code as ErrorCode, failure.message);
    return;
  }
  res.status(status).json({ success: true, report: viewFor(result.value, actor) });
}

function isOfficial(actor: Actor | null): boolean {
  return !!actor && actor.role !== "SYSTEM" && isOfficialRole(actor.role);
}

/** Full case for staff, public projection for everyone else; plus what this actor may do. */
function viewFor(c: ReportCase, actor: Actor | null) {
  const canEdit = !!actor && canEditReport(actor, c.report);
  if (isOfficial(actor)) {
    return { audience: "STAFF" as const, case: c, availableActions: availableActions(c, actor!), canEdit };
  }
  return {
    audience: "PUBLIC" as const,
    case: toPublicView(c),
    availableActions: [],
    canEdit,
    isMine: !!actor && c.createdBy.id === actor.id
  };
}

function parsePaging(req: Request): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 200);
  const offset = Math.max(Number.parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
  return { limit, offset };
}

function parseVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

export function registerWorkflowRoutes(router: Router, runtime: WorkflowRuntime): void {
  const { service, signer } = runtime;
  const writeLimit = rateLimit("workflow-write", 120, 60_000);
  // Spec Lampiran L / §20.2: 10 reports per hour per client.
  const submitLimit = rateLimit("report-submit", 10, 60 * 60_000);
  const sessionLimit = rateLimit("session", 60, 60_000);

  // --- Identity -------------------------------------------------------------------
  const demoSessionHandler = (req: Request, res: Response) => {
    if (!runtime.demoAuthEnabled) return sendError(res, "DISABLED", "Demo sessions are disabled on this server.");
    const account = USER_ACCOUNTS.find((a) => a.id === req.body?.accountId);
    if (!account) return sendError(res, "VALIDATION", "Unknown demo account.");
    const actor: Actor = { id: account.id, role: account.role, kind: "DEMO_ACCOUNT" };
    const { token, expiresAt } = signer.issue(actor);
    res.json({ success: true, token, expiresAt, actor, authentication: "DEMO (no credentials checked)" });
  };
  router.post(WORKFLOW_API_PATHS.demoSession, sessionLimit, demoSessionHandler);
  // Spec path (Lampiran L). Demo mode only: it is the account picker, not a credential check.
  router.post(SPEC_PATHS.login, sessionLimit, demoSessionHandler);

  router.post(WORKFLOW_API_PATHS.anonymousSession, sessionLimit, (_req: Request, res: Response) => {
    // The id is chosen by the server, so a browser cannot pick (or reuse) someone else's.
    const actor: Actor = { id: `anon-${newClaimToken().token.slice(0, 12)}`, role: "PUBLIC_VIEWER", kind: "ANONYMOUS" };
    const { token, expiresAt } = signer.issue(actor);
    res.json({ success: true, token, expiresAt, actor, authentication: "ANONYMOUS" });
  });

  router.get(WORKFLOW_API_PATHS.me, (req: Request, res: Response) => {
    const actor = actorFrom(req, runtime);
    if (!actor) return sendError(res, "UNAUTHENTICATED", "No valid session.");
    res.json({ success: true, actor });
  });

  // --- Reports --------------------------------------------------------------------
  router.get(WORKFLOW_API_PATHS.reports, async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    const { limit, offset } = parsePaging(req);
    const state = typeof req.query.state === "string" ? req.query.state : null;
    if (state && !(WORKFLOW_STATES as readonly string[]).includes(state)) return sendError(res, "VALIDATION", "Unknown state filter.");
    const segmentId = typeof req.query.segmentId === "string" ? req.query.segmentId : null;
    const all = (await service.listCases()).filter((c) => (!state || c.state === state) && (!segmentId || c.segmentId === segmentId));
    res.json({ success: true, total: all.length, limit, offset, items: all.slice(offset, offset + limit).map((c) => viewFor(c, actor)) });
  });

  router.get(WORKFLOW_API_PATHS.report, async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    const c = await service.getCase(req.params.id);
    if (!c) return sendError(res, "NOT_FOUND", "Report not found.");
    // An anonymous reporter can prove ownership on a fresh session with the claim token.
    const claim = typeof req.headers["x-claim-token"] === "string" ? req.headers["x-claim-token"] : null;
    const view = viewFor(c, actor) as ReturnType<typeof viewFor> & { isMine?: boolean };
    if (claim && c.claimTokenHash && hashClaimToken(claim) === c.claimTokenHash) view.isMine = true;
    res.json({ success: true, report: view });
  });

  const submitHandler = async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    if (!actor) return sendError(res, "UNAUTHENTICATED", "Start a session first (anonymous sessions are allowed).");
    const draft = req.body?.report as ReportDraft | undefined;
    if (!draft || typeof draft !== "object") return sendError(res, "VALIDATION", "Body must be { report }.");
    const photo = checkPhotoReference(draft.photoUrl);
    if (photo.ok === false) return sendError(res, "VALIDATION", (photo as { message: string }).message);
    if (typeof draft.description !== "string" || draft.description.length > 2000) return sendError(res, "VALIDATION", "description must be text up to 2000 characters.");
    const claim = actor.kind === "ANONYMOUS" ? newClaimToken() : null;
    const result = await service.submitReport(draft, actor, claim ? claim.hash : null);
    if (result.ok && claim) {
      // The claim token is shown once; only its hash is stored.
      res.status(201).json({ success: true, report: viewFor(result.value, actor), claimToken: claim.token });
      return;
    }
    sendResult(res, result, actor, 201);
  };
  router.post(WORKFLOW_API_PATHS.reports, submitLimit, submitHandler);
  // Spec path (Lampiran L): same handler and limits.
  router.post(SPEC_PATHS.reports, submitLimit, submitHandler);

  router.post(WORKFLOW_API_PATHS.transitions, writeLimit, async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    if (!actor) return sendError(res, "UNAUTHENTICATED", "No valid session.");
    const command = req.body?.command as WorkflowCommand | undefined;
    const expectedVersion = parseVersion(req.body?.expectedVersion);
    if (!command || typeof command !== "object" || !(WORKFLOW_ACTIONS as readonly string[]).includes(command.action)) {
      return sendError(res, "VALIDATION", "Body must be { command: { action, ... }, expectedVersion }.");
    }
    if (expectedVersion === null) return sendError(res, "VALIDATION", "expectedVersion must be a positive integer.");
    if (command.action === "RECOMMEND_ACTION") {
      // The assessment behind a recommendation is computed here, never taken from the client.
      const current = await service.getCase(req.params.id);
      const segment = current ? segmentById(current.segmentId) : undefined;
      if (segment) {
        const assessment = assessSegment(segment, { now: new Date().toISOString(), cases: await service.listCases() });
        command.assessmentId = assessment.id;
        command.assessment = snapshotOf(assessment);
      } else {
        command.assessmentId = null;
        command.assessment = null;
      }
    }
    sendResult(res, await service.transition(req.params.id, command, actor, expectedVersion), actor);
  });

  router.patch(WORKFLOW_API_PATHS.content, writeLimit, async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    if (!actor) return sendError(res, "UNAUTHENTICATED", "No valid session.");
    const expectedVersion = parseVersion(req.body?.expectedVersion);
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object" || expectedVersion === null) {
      return sendError(res, "VALIDATION", "Body must be { patch, expectedVersion }.");
    }
    if (patch.photoUrl !== undefined) {
      const photo = checkPhotoReference(patch.photoUrl);
      if (photo.ok === false) return sendError(res, "VALIDATION", (photo as { message: string }).message);
    }
    sendResult(res, await service.editContent(req.params.id, patch, actor, expectedVersion), actor);
  });

  // --- Staff-only reads -----------------------------------------------------------
  router.get(WORKFLOW_API_PATHS.audit, async (req: Request, res: Response) => {
    await runtime.ready;
    const actor = actorFrom(req, runtime);
    if (!actor) return sendError(res, "UNAUTHENTICATED", "No valid session.");
    if (!isOfficial(actor)) return sendError(res, "FORBIDDEN", "The audit trail is limited to official roles.");
    const { limit, offset } = parsePaging(req);
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    res.json({ success: true, ...(await service.listAudit({ entityId, limit, offset })), limit, offset });
  });

  router.get(WORKFLOW_API_PATHS.engineers, (req: Request, res: Response) => {
    const actor = actorFrom(req, runtime);
    if (!isOfficial(actor)) return sendError(res, actor ? "FORBIDDEN" : "UNAUTHENTICATED", "Official session required.");
    res.json({
      success: true,
      items: USER_ACCOUNTS.filter((a) => a.role === "FIELD_ENGINEER").map((a) => ({ id: a.id, name: a.name, title: a.title, agencyCode: a.agencyCode }))
    });
  });
}
