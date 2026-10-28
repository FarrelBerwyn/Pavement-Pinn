"""T3 crack skeleton on a depth grid (Pan et al. §3.1.1).

lowest point per row -> RANSAC line (threshold = mean NND, crack if inliers > ratio)
-> refinement (KD-tree k-NN, local direction by SVD, move to the lowest cell along the normal)
-> noise cancellation (k-NN distance >= limit and few third-order neighbours).
Grid convention: depth[r, c] positive below the reference plane; coordinates in cells.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.spatial import cKDTree

from .config import GeometryConfig
from .surface import mean_nnd


@dataclass
class Skeleton:
    points: np.ndarray        # K x 2 (row, col), float
    inlier_ratio: float
    is_crack: bool
    removed_as_noise: int


def primary_skeleton(depth: np.ndarray, min_depth: float = 0.0) -> np.ndarray:
    """Lowest point of each row — only for rows that actually go below the reference surface
    by more than min_depth; a flat row has no low point (otherwise argmax picks column 0 and a
    flat surface turns into a perfect straight "crack")."""
    rows = [r for r in range(depth.shape[0]) if np.isfinite(depth[r]).any() and np.nanmax(depth[r]) > min_depth]
    return np.array([[r, int(np.nanargmax(depth[r]))] for r in rows], dtype=float)


def ransac_line(pts: np.ndarray, cfg: GeometryConfig) -> tuple[np.ndarray, float]:
    thr = mean_nnd(pts) if len(pts) > 2 else 1.0
    rng = np.random.default_rng(cfg.ransac_seed)
    best = np.zeros(len(pts), dtype=bool)
    for _ in range(cfg.ransac_iterations):
        i, j = rng.choice(len(pts), 2, replace=False)
        d = pts[j] - pts[i]
        L = np.linalg.norm(d)
        if L < 1e-9:
            continue
        nrm = np.array([-d[1], d[0]]) / L
        inl = np.abs((pts - pts[i]) @ nrm) <= thr
        if inl.sum() > best.sum():
            best = inl
    return best, float(best.mean())


def refine(pts: np.ndarray, depth: np.ndarray, cfg: GeometryConfig, search: int = 3) -> np.ndarray:
    tree = cKDTree(pts)
    k = min(cfg.knn_refine, len(pts))
    out = pts.copy()
    for idx, p in enumerate(pts):
        _, nb = tree.query(p, k=k)
        q = pts[np.atleast_1d(nb)]
        _, _, vt = np.linalg.svd(q - q.mean(axis=0), full_matrices=False)
        tangent = vt[0]
        normal = np.array([-tangent[1], tangent[0]])
        best, best_d = p, -np.inf
        for s in range(-search, search + 1):
            c = np.rint(p + s * normal).astype(int)
            if 0 <= c[0] < depth.shape[0] and 0 <= c[1] < depth.shape[1] and np.isfinite(depth[c[0], c[1]]) and depth[c[0], c[1]] > best_d:
                best, best_d = c.astype(float), depth[c[0], c[1]]
        out[idx] = best
    return out


def denoise(pts: np.ndarray, cfg: GeometryConfig) -> tuple[np.ndarray, int]:
    if len(pts) <= cfg.noise_k:
        return pts, 0
    tree = cKDTree(pts)
    d, _ = tree.query(pts, k=cfg.noise_k + 1)
    far = d[:, 1:].max(axis=1) >= cfg.noise_distance
    near_counts = np.array([len(tree.query_ball_point(p, r=3.0)) - 1 for p in pts])
    noisy = far & (near_counts <= cfg.noise_min_neighbours)
    return pts[~noisy], int(noisy.sum())


def crack_skeleton(depth: np.ndarray, cfg: GeometryConfig = GeometryConfig(), min_depth: float = 0.0) -> Skeleton:
    prim = primary_skeleton(depth, min_depth)
    if len(prim) < 3:
        return Skeleton(prim, 0.0, False, 0)
    inliers, ratio = ransac_line(prim, cfg)
    refined = refine(prim, depth, cfg)
    cleaned, removed = denoise(refined, cfg)
    order = np.argsort(cleaned[:, 0])
    return Skeleton(cleaned[order], ratio, ratio > cfg.line_inlier_ratio, removed)
