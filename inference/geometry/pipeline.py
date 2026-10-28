"""T2→T5 for one object from a local point cloud, and T4–T6 reruns from a stored depth grid.

Units: with a metric scale the cloud is converted to mm first and results are in mm / m² / L.
Without one, results carry unit "relative" and no metric field is filled (contract §3).
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage

from .config import GeometryConfig
from .grid import pca_align, vectorize
from .quantify import pothole_metrics
from .surface import damage_mask, depth_below_plane, fit_plane_ransac, mask_contour, polygon_mask


def run_pothole(points: np.ndarray, mm_per_unit: float | None, scale_uncertainty_mm: float | None = None,
                cfg: GeometryConfig = GeometryConfig()) -> dict:
    pts = np.asarray(points, dtype=float) * (mm_per_unit or 1.0)
    aligned, _, tilt = pca_align(pts)
    grid = vectorize(aligned, cfg)
    n, m = grid.z.shape
    xs = grid.x0 + (np.arange(m) + 0.5) * grid.step
    ys = grid.y0 + (np.arange(n) + 0.5) * grid.step
    xx, yy = np.meshgrid(xs, ys)
    cells = np.stack([xx, yy, grid.z], axis=-1).reshape(-1, 3)
    cells = cells[np.isfinite(cells[:, 2])]
    plane = fit_plane_ransac(cells, cfg)
    depth = depth_below_plane(grid.z, grid.step, grid.x0, grid.y0, plane)
    boundary = max(cfg.damage_min_depth, 2 * plane.rms)
    mask = damage_mask(depth, noise_mm=boundary, cfg=cfg)
    # Second pass (spec/01 T4: "gunakan cincin di sekitar lubang"): refit the plane on the
    # surroundings only, so shallow cells of the depression do not pull the plane down.
    if mask.any():
        outside = ~ndimage.binary_dilation(mask, iterations=cfg.ring_margin_cells) & np.isfinite(grid.z)
        if outside.sum() >= 3:
            ring = np.stack([xx[outside], yy[outside], grid.z[outside]], axis=1)
            plane = fit_plane_ransac(ring, cfg)
            depth = depth_below_plane(grid.z, grid.step, grid.x0, grid.y0, plane)
            boundary = max(cfg.damage_min_depth, 2 * plane.rms)
            mask = damage_mask(depth, noise_mm=boundary, cfg=cfg)
    metrics = pothole_metrics(depth, mask, grid.step, cfg)
    return _package(depth, mask, grid.step, metrics, plane.rms, mm_per_unit is not None, scale_uncertainty_mm,
                    extra={"boundary_depth": boundary, "tilt_deg": tilt, "plane_inlier_ratio": plane.inlier_ratio, "grid_empty_pct": grid.empty_pct,
                           "grid_empty_pct_before_fill": grid.empty_pct_before_fill})


def refit_reference_plane(depth: np.ndarray, mask: np.ndarray, step: float, cfg: GeometryConfig = GeometryConfig()) -> tuple[np.ndarray, float]:
    """Refit the reference plane on the ring outside the (dilated) damage and re-express the
    stored depth relative to it (F.E action "ganti bidang referensi")."""
    n, m = depth.shape
    yy, xx = np.mgrid[0:n, 0:m].astype(float) * step + step / 2
    ring = ~ndimage.binary_dilation(mask, iterations=cfg.ring_margin_cells) & np.isfinite(depth)
    pts = np.stack([xx[ring], yy[ring], -depth[ring]], axis=1)  # surface height = −depth
    plane = fit_plane_ransac(pts, cfg)
    surf = np.stack([xx, yy, -depth], axis=-1).reshape(-1, 3)
    new_depth = (-plane.signed_distance(surf)).reshape(n, m)
    new_depth[~np.isfinite(depth)] = np.nan
    return new_depth, plane.rms


def requantify(depth: list[list[float | None]], step: float, contour: list[tuple[float, float]] | None, metric: bool,
               plane_rms: float | None = None, scale_uncertainty_mm: float | None = None,
               cfg: GeometryConfig = GeometryConfig(), refit_plane: bool = False) -> dict:
    """Rerun T4–T5 on a stored depth grid after an F.E edits the contour (or keeps the auto one)."""
    d = np.array([[np.nan if v is None else v for v in row] for row in depth], dtype=float)
    mask = polygon_mask(contour, d.shape, step) if contour and len(contour) >= 3 else damage_mask(d, noise_mm=2 * (plane_rms or 0.0), cfg=cfg)
    if refit_plane and mask.any():
        d, plane_rms = refit_reference_plane(d, mask, step, cfg)
    metrics = pothole_metrics(d, mask, step, cfg)
    return _package(d, mask, step, metrics, plane_rms, metric, scale_uncertainty_mm, contour_override=contour)


def _package(depth, mask, step, metrics, plane_rms, metric, scale_unc, extra=None, contour_override=None) -> dict:
    def unc(value):
        if value is None or not metric:
            return None
        rel = (scale_unc or 0.0) / 85.6  # relative scale error, marker-size based
        return float(np.hypot(plane_rms or 0.0, rel * value))

    m = metrics
    out = {
        "unit": "mm" if metric else "relative",
        "step": step,
        "coverage_pct": m["coverage_pct"],
        "plane_rms": plane_rms,
        "contour": contour_override if contour_override else mask_contour(mask, step),
        "depth_grid": [[None if not np.isfinite(v) else round(float(v), 3) for v in row] for row in depth],
        "metrics": None,
    }
    if metric:
        out["metrics"] = {
            "length_mm": m["length"], "width_mm": m["width"],
            "depth_max_mm": m["depth_max"], "depth_max_unc_mm": unc(m["depth_max"]),
            "depth_mean_mm": m["depth_mean"], "depth_mean_unc_mm": unc(m["depth_mean"]),
            "area_m2": None if m["area"] is None else m["area"] / 1e6,
            "volume_l": None if m["volume"] is None else m["volume"] / 1e6,
            "volume_unavailable_reason": None if m["volume"] is not None else f"Cakupan {m['coverage_pct']:.0f} % di bawah ambang",
        }
    else:
        out["relative"] = {k: m[k] for k in ("length", "width", "depth_max", "depth_mean")}
    if extra:
        out.update(extra)
    return out


def crack_from_grid(depth: list[list[float | None]], step: float, metric: bool, plane_rms: float | None = None,
                    cfg: GeometryConfig = GeometryConfig()) -> dict:
    """Pan et al. (2023) one-stage crack quantification on a stored depth grid (rows ≈ along
    the profile direction). Skeleton -> boundaries bl/br along the local normal (eq. 13) ->
    binary crack map from the cells between them -> length (eq. 14) and visible depth below
    the reference plane (eq. 15 is the plane distance already stored in the grid).
    Visible depth only: this is the depth the camera sees, not the internal crack depth."""
    from .quantify import crack_length, crack_widths
    from .skeleton import crack_skeleton

    d = np.array([[np.nan if v is None else v for v in row] for row in depth], dtype=float)
    skel = crack_skeleton(np.nan_to_num(d, nan=0.0), cfg, min_depth=max(cfg.damage_min_depth, 2 * (plane_rms or 0.0)))
    widths = crack_widths(skel, np.nan_to_num(d, nan=0.0), step)
    crack_map = np.zeros(d.shape, dtype=bool)
    for p in skel.points:
        r, c = int(p[0]), int(p[1])
        if not (0 <= r < d.shape[0] and 0 <= c < d.shape[1]):
            continue
        # Cells of this row that are below the reference plane and connected to the skeleton cell.
        row = np.nan_to_num(d[r], nan=0.0) > max(cfg.damage_min_depth, 2 * (plane_rms or 0.0))
        lo = c
        while lo - 1 >= 0 and row[lo - 1]:
            lo -= 1
        hi = c
        while hi + 1 < d.shape[1] and row[hi + 1]:
            hi += 1
        crack_map[r, lo:hi + 1] = row[lo:hi + 1] | (np.arange(lo, hi + 1) == c)
    depth_along = np.array([d[int(p[0]), int(p[1])] for p in skel.points], dtype=float) if len(skel.points) else np.array([])
    depth_along = depth_along[np.isfinite(depth_along)]
    coverage = float(np.isfinite(d[crack_map]).mean() * 100) if crack_map.any() else 0.0
    out = {
        "unit": "mm" if metric else "relative",
        "is_crack": bool(skel.is_crack),
        "inlier_ratio": skel.inlier_ratio,
        "skeleton_points": int(len(skel.points)),
        "noise_removed": skel.removed_as_noise,
        "width_samples": int(widths.size),
        "coverage_pct": coverage,
        "crack_map": crack_map.astype(int).tolist(),
        "skeleton": [[float(p[1] + 0.5) * step, float(p[0] + 0.5) * step] for p in skel.points],
        "metrics": None,
    }
    if metric and skel.is_crack:
        unc = plane_rms or 0.0
        out["metrics"] = {
            "length_mm": crack_length(skel, step),
            "width_mean_mm": float(widths.mean()) if widths.size else None,
            "width_max_mm": float(widths.max()) if widths.size else None,
            "width_unc_mm": step / 2,  # boundary located to half a cell
            "depth_max_mm": float(depth_along.max()) if depth_along.size else None,
            "depth_mean_mm": float(depth_along.mean()) if depth_along.size else None,
            "depth_unc_mm": unc,
            "area_m2": float(crack_map.sum() * step * step / 1e6),
        }
    return out


def crack_map_iou(pred: np.ndarray, truth: np.ndarray) -> float | None:
    """Intersection over union of two binary crack maps on the same grid; None when both are empty."""
    p, t = np.asarray(pred, bool), np.asarray(truth, bool)
    union = (p | t).sum()
    return None if union == 0 else float((p & t).sum() / union)
