"""T4: RANSAC reference plane, depth below it and the d = 0 damage boundary (Pan et al. §3.1.2)."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

from .config import GeometryConfig


def mean_nnd(points: np.ndarray) -> float:
    tree = cKDTree(points)
    d, _ = tree.query(points, k=2)
    return float(d[:, 1].mean())


@dataclass(frozen=True)
class Plane:
    a: float
    b: float
    c: float
    d: float  # ax + by + cz = d, (a, b, c) unit normal with c > 0
    rms: float
    inlier_ratio: float

    def signed_distance(self, pts: np.ndarray) -> np.ndarray:
        """eq. 15 without the absolute value: positive above the plane."""
        return (pts @ np.array([self.a, self.b, self.c]) - self.d) / np.sqrt(self.a ** 2 + self.b ** 2 + self.c ** 2)


def fit_plane_ransac(points: np.ndarray, cfg: GeometryConfig = GeometryConfig(), threshold: float | None = None) -> Plane:
    p = np.asarray(points, dtype=float)
    thr = threshold if threshold is not None else cfg.plane_threshold_nnd_factor * mean_nnd(p)
    rng = np.random.default_rng(cfg.ransac_seed)
    best_inliers = None
    for _ in range(cfg.ransac_iterations):
        s = p[rng.choice(len(p), 3, replace=False)]
        nrm = np.cross(s[1] - s[0], s[2] - s[0])
        length = np.linalg.norm(nrm)
        if length < 1e-12:
            continue
        nrm /= length
        inl = np.abs((p - s[0]) @ nrm) < thr
        if best_inliers is None or inl.sum() > best_inliers.sum():
            best_inliers = inl
    q = p[best_inliers]
    centroid = q.mean(axis=0)
    _, _, vt = np.linalg.svd(q - centroid, full_matrices=False)  # least-squares refit on inliers
    nrm = vt[2] if vt[2, 2] > 0 else -vt[2]
    d = float(nrm @ centroid)
    resid = q @ nrm - d
    return Plane(float(nrm[0]), float(nrm[1]), float(nrm[2]), d, float(np.sqrt(np.mean(resid ** 2))), float(best_inliers.mean()))


def depth_below_plane(grid_z: np.ndarray, step: float, x0: float, y0: float, plane: Plane) -> np.ndarray:
    """Depth (positive down) of each grid cell centre below the plane, along the normal. NaN stays NaN."""
    n, m = grid_z.shape
    xs = x0 + (np.arange(m) + 0.5) * step
    ys = y0 + (np.arange(n) + 0.5) * step
    xx, yy = np.meshgrid(xs, ys)
    pts = np.stack([xx, yy, grid_z], axis=-1).reshape(-1, 3)
    return (-plane.signed_distance(pts)).reshape(n, m)


def damage_mask(depth: np.ndarray, noise_mm: float, cfg: GeometryConfig = GeometryConfig()) -> np.ndarray:
    """Largest connected region below the d = 0 boundary, ignoring cells within the plane noise."""
    below = np.nan_to_num(depth, nan=-np.inf) > max(cfg.damage_min_depth, noise_mm)
    labels, k = ndimage.label(below)
    if k == 0:
        return np.zeros_like(below)
    sizes = ndimage.sum(below, labels, range(1, k + 1))
    return labels == (int(np.argmax(sizes)) + 1)


def mask_contour(mask: np.ndarray, step: float) -> list[tuple[float, float]]:
    """Boundary of a mask as an ordered polygon (x, y) in grid units × step, ordered by angle."""
    edge = mask & ~ndimage.binary_erosion(mask)
    rows, cols = np.nonzero(edge)
    if rows.size == 0:
        return []
    xs, ys = (cols + 0.5) * step, (rows + 0.5) * step
    cx, cy = xs.mean(), ys.mean()
    order = np.argsort(np.arctan2(ys - cy, xs - cx))
    return [(float(xs[i]), float(ys[i])) for i in order]


def polygon_mask(polygon: list[tuple[float, float]], shape: tuple[int, int], step: float) -> np.ndarray:
    """Cells whose centres lie inside the polygon (even–odd rule)."""
    n, m = shape
    xs = (np.arange(m) + 0.5) * step
    ys = (np.arange(n) + 0.5) * step
    xx, yy = np.meshgrid(xs, ys)
    inside = np.zeros(shape, dtype=bool)
    poly = np.asarray(polygon, dtype=float)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        cross = ((yi > yy) != (yj > yy)) & (xx < (xj - xi) * (yy - yi) / ((yj - yi) + 1e-300) + xi)
        inside ^= cross
        j = i
    return inside
