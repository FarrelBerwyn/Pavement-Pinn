import type { Request, Response } from "express";
import { buildOpenvinoConfigExport, buildOpenvinoIrExport } from "../services/openvinoExportService";

/** GET /api/openvino/export-ir?device=&precision= — XML attachment. */
export function exportIr(req: Request, res: Response): void {
  const device = (req.query.device as string) || "NPU";
  const precision = (req.query.precision as string) || "INT8_NNCF";
  const download = buildOpenvinoIrExport(device, precision);

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Content-Disposition", `attachment; filename="${download.filename}"`);
  res.send(download.body);
}

/** GET /api/openvino/export-config?device=&precision=&streams= — JSON attachment. */
export function exportConfig(req: Request, res: Response): void {
  const device = (req.query.device as string) || "NPU";
  const precision = (req.query.precision as string) || "INT8_NNCF";
  const streams = (req.query.streams as string) || "2";
  const download = buildOpenvinoConfigExport(device, precision, streams);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${download.filename}"`);
  res.send(download.body);
}
