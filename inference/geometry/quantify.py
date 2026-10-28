"""T5 quantification.

Crack (Pan et al.): width eq. 13, length eq. 14, depth eq. 15.
Pothole (PAVEMENT-PINN): dimensions along the contour's principal axes, max/mean depth, and
volume as the integral of the deficit (plane − surface) over cells inside the contour.
Never bbox × max depth.
"""
from __future__ import annotations

import numpy as np

from .config import GeometryConfig
from .skeleton import Skeleton
from .surface import Plane


def point_plane_distance(pt: np.ndarray, plane: Plane) -> float:
    """eq. 15: |ax + by + cz − d| / sqrt(a² + b² + c²)."""
    return float(abs(plane.a * pt[0] + plane.b * pt[1] + plane.c * pt[2] - plane.d) / np.sqrt(plane.a ** 2 + plane.b ** 2 + plane.c ** 2))


def crack_length(skel: Skeleton, step: float) -> float:
    """eq. 14: sum of distances between consecutive skeleton points."""
    p = skel.points
    return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum() * step) if len(p) > 1 else 0.0


def crack_widths(skel: Skeleton, depth: np.ndarray, step: float, max_search: int = 50) -> np.ndarray:
    """eq. 13: Euclidean distance between the boundary points bl and br (depth crosses 0)
    on either side of each skeleton point, along the local normal (sub-cell by interpolation)."""
    p = skel.points
    widths = []
    for i, c in enumerate(p):
        a, b = p[max(0, i - 2)], p[min(len(p) - 1, i + 2)]
        t = b - a
        t = t / (np.linalg.norm(t) or 1.0)
        nrm = np.array([-t[1], t[0]])
        ends = []
        for sgn in (-1, 1):
            prev_d = depth[int(c[0]), int(c[1])]
            found = None
            for s in np.arange(0.25, max_search, 0.25):
                q = c + sgn * s * nrm
                r, k = int(round(q[0])), int(round(q[1]))
                if not (0 <= r < depth.shape[0] and 0 <= k < depth.shape[1]) or not np.isfinite(depth[r, k]):
                    break
                d = depth[r, k]
                if d <= 0:
                    frac = prev_d / (prev_d - d) if prev_d != d else 1.0
                    found = c + sgn * (s - 0.25 + 0.25 * frac) * nrm
                    break
                prev_d = d
            ends.append(found)
        if ends[0] is not None and ends[1] is not None:
            widths.append(np.linalg.norm(ends[1] - ends[0]) * step)
    return np.asarray(widths)


def pothole_metrics(depth: np.ndarray, mask: np.ndarray, step: float, cfg: GeometryConfig = GeometryConfig()) -> dict:
    """Depth grid positive down, in the same length unit as step. Returns metrics in that unit
    (area unit², volume unit³) plus coverage; volume is None when coverage is below the threshold."""
    inside = mask & np.isfinite(depth)
    n_mask = int(mask.sum())
    if n_mask == 0:
        return {"cells": 0, "coverage_pct": 0.0, "area": None, "depth_max": None, "depth_mean": None, "volume": None, "length": None, "width": None}
    coverage = 100.0 * inside.sum() / n_mask
    d = np.clip(depth[inside], 0, None)
    rows, cols = np.nonzero(mask)
    xy = np.stack([cols, rows], axis=1).astype(float) * step
    centred = xy - xy.mean(axis=0)
    _, _, vt = np.linalg.svd(centred, full_matrices=False) if len(xy) > 1 else (None, None, np.eye(2))
    proj = centred @ vt.T
    extent = proj.max(axis=0) - proj.min(axis=0) + step
    return {
        "cells": n_mask,
        "coverage_pct": float(coverage),
        "area": float(n_mask * step * step),
        "depth_max": float(d.max()) if d.size else None,
        "depth_mean": float(d.mean()) if d.size else None,
        # Integral of the deficit: sum of (plane − surface) × cell area, inside the contour only.
        "volume": float(d.sum() * step * step) if coverage >= cfg.min_coverage_pct else None,
        "length": float(extent[0]),
        "width": float(extent[1]),
    }
