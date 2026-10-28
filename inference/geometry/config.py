"""Parameters of the geometry pipeline. Paper values are starting points (ACUAN PAPER), not
validated settings for this project's cameras (handoff spec/01 §T2–T5)."""
from __future__ import annotations

from dataclasses import dataclass


class StageBlocked(RuntimeError):
    """A prerequisite (tool, data, scale) is missing; the stage must be recorded as blocked."""

    def __init__(self, reason: str, code: str = "BLOCKED"):
        super().__init__(reason)
        self.reason = reason
        self.code = code


@dataclass(frozen=True)
class GeometryConfig:
    # T2 vectorisation (eq. 11–12): M columns; N follows from the extent.
    grid_m: int = 256
    max_fill_gap_cells: int = 2          # fill empty cells only from neighbours within this radius
    # T3 crack skeleton (§3.1.1)
    line_inlier_ratio: float = 0.80      # crack present when RANSAC-line inliers exceed this share
    ransac_iterations: int = 500
    ransac_seed: int = 7                 # fixed seed: identical input -> identical output
    knn_refine: int = 7                  # KD-tree neighbours for the local normal (SVD)
    noise_k: int = 5                     # neighbours checked by the noise filter
    noise_distance: float = 4.0          # remove a point when its k-NN distance >= this (cells) ...
    noise_min_neighbours: int = 3        # ... and it has <= this many third-order neighbours
    # T4 reference plane (§3.1.2)
    plane_threshold_nnd_factor: float = 1.0   # inlier threshold = factor x mean nearest-neighbour distance
    damage_min_depth: float = 0.0        # boundary d = 0 along the plane normal
    ring_margin_cells: int = 3           # gap between the damage and the ring used to refit the plane
    # Scale
    card_width_mm: float = 85.6          # ISO/IEC 7810 ID-1 card
    # Minimum coverage of the contour by valid cells before a volume is reported
    min_coverage_pct: float = 80.0
