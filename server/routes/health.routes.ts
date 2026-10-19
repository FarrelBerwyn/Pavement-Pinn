import type { Request, Response, Router } from "express";
import { API_PATHS } from "../../src/types";
import { getHealth } from "../controllers/healthController";
import { runtimeIdentity } from "../runtime/runtimeIdentity";

/** Liveness probe and runtime identity (which process, code and data store answer here). */
export function registerHealthRoutes(router: Router): void {
  router.get(API_PATHS.health, getHealth);
  router.get("/api/runtime", (req: Request, res: Response) => {
    // Alias ports forward the client's port in X-PINN-Via-Port; otherwise the socket's port.
    const via = Number(req.header("x-pinn-via-port"));
    res.setHeader("Cache-Control", "no-store");
    res.json(runtimeIdentity(Number.isInteger(via) && via > 0 ? via : req.socket.localPort ?? null));
  });
}
