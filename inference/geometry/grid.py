"""T2: PCA alignment and M×N vectorisation of a local point cloud (Pan et al. eq. 11–12)."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from .config import GeometryConfig


def pca_align(points: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """Rotate so the two largest principal directions span X–Y and the smallest is Z.
    Returns (aligned points, rotation matrix, tilt correction in degrees)."""
    p = np.asarray(points, dtype=float)
    centred = p - p.mean(axis=0)
    _, _, vt = np.linalg.svd(centred, full_matrices=False)
    r = vt.copy()
    if np.linalg.det(r) < 0:
        r[2] *= -1
    if r[2, 2] < 0:  # keep "up" pointing up
        r[[1, 2]] *= -1
    aligned = centred @ r.T
    tilt = float(np.degrees(np.arccos(np.clip(abs(r[2, 2]), -1, 1))))
    return aligned, r, tilt


@dataclass
class Grid:
    z: np.ndarray            # N x M, NaN = empty cell
    step: float              # cell size in cloud units (eq. 11)
    x0: float
    y0: float
    empty_pct_before_fill: float
    empty_pct: float

    def cell_centre(self, row: int, col: int) -> tuple[float, float]:
        return self.x0 + (col + 0.5) * self.step, self.y0 + (row + 0.5) * self.step


def vectorize(points: np.ndarray, cfg: GeometryConfig = GeometryConfig()) -> Grid:
    """eq. 11: step = (max x − min x) / M;  eq. 12: N = (max y − min y) / step;
    cell value = mean Z of the points in it. Empty cells are filled only from valid neighbours
    within cfg.max_fill_gap_cells; the rest stay NaN and are reported."""
    p = np.asarray(points, dtype=float)
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    m = cfg.grid_m
    step = (x.max() - x.min()) / m
    n = max(1, int(np.ceil((y.max() - y.min()) / step)))
    col = np.clip(((x - x.min()) / step).astype(int), 0, m - 1)
    row = np.clip(((y - y.min()) / step).astype(int), 0, n - 1)
    sums = np.zeros((n, m))
    counts = np.zeros((n, m))
    np.add.at(sums, (row, col), z)
    np.add.at(counts, (row, col), 1)
    with np.errstate(invalid="ignore"):
        grid = np.where(counts > 0, sums / np.maximum(counts, 1), np.nan)
    empty_before = float(np.isnan(grid).mean() * 100)
    if cfg.max_fill_gap_cells > 0 and np.isnan(grid).any():
        valid = ~np.isnan(grid)
        dist, (ri, ci) = ndimage.distance_transform_edt(~valid, return_indices=True)
        fill = (~valid) & (dist <= cfg.max_fill_gap_cells)
        grid = grid.copy()
        grid[fill] = grid[ri[fill], ci[fill]]
    return Grid(z=grid, step=float(step), x0=float(x.min()), y0=float(y.min()),
                empty_pct_before_fill=empty_before, empty_pct=float(np.isnan(grid).mean() * 100))
