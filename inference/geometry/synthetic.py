"""Synthetic surfaces with analytic answers, for tests and the labelled demo fixture only.
Everything produced here is SYNTHETIC and must be shown with the DATA CONTOH badge."""
from __future__ import annotations

import numpy as np


def gaussian_depression(size_mm: float = 800.0, step_mm: float = 4.0, depth_mm: float = 38.0, sigma_mm: float = 90.0,
                        tilt: tuple[float, float] = (0.0, 0.0), noise_mm: float = 0.0, seed: int = 0) -> dict:
    """z = tilt·xy − D·exp(−r²/2σ²). Analytic deficit volume over the whole plane = 2πσ²D."""
    xs = np.arange(0, size_mm, step_mm) + step_mm / 2
    xx, yy = np.meshgrid(xs, xs)
    c = size_mm / 2
    r2 = (xx - c) ** 2 + (yy - c) ** 2
    z = tilt[0] * xx + tilt[1] * yy - depth_mm * np.exp(-r2 / (2 * sigma_mm ** 2))
    if noise_mm:
        z = z + np.random.default_rng(seed).normal(0, noise_mm, z.shape)
    pts = np.stack([xx.ravel(), yy.ravel(), z.ravel()], axis=1)
    return {"points": pts, "depth_mm": depth_mm, "sigma_mm": sigma_mm, "volume_mm3_total": 2 * np.pi * sigma_mm ** 2 * depth_mm}


def v_groove(length_mm: float = 600.0, width_mm: float = 12.0, depth_mm: float = 8.0, step_mm: float = 1.0,
             span_mm: float = 120.0) -> dict:
    """Straight V-shaped crack along Y, centred in X: analytic width, length and depth."""
    xs = np.arange(0, span_mm, step_mm) + step_mm / 2
    ys = np.arange(0, length_mm, step_mm) + step_mm / 2
    xx, yy = np.meshgrid(xs, ys)
    half = width_mm / 2
    dist = np.abs(xx - xs[len(xs) // 2])  # centre on a cell centre so the sampled maximum is exact
    z = np.where(dist < half, -depth_mm * (1 - dist / half), 0.0)
    return {"depth_grid": -z, "step": step_mm, "width_mm": width_mm, "length_mm": length_mm, "depth_mm": depth_mm,
            "points": np.stack([xx.ravel(), yy.ravel(), z.ravel()], axis=1)}
