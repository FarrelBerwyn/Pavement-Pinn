"""Pothole footprint from a detection photo, and a SYNTHETIC depth surface shaped by it.

The outline is traced from the photo (darker-than-pavement pixels inside the detection box), so the
3D demo follows the damage that was actually detected instead of a default circle. Depth is NOT
measured from a single photo: it is a synthetic profile inside that outline (distance from the edge,
modulated by photo darkness) and must be shown with the DATA CONTOH badge."""
from __future__ import annotations

import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

from .surface import polygon_mask


def load_gray(path: str | Path) -> np.ndarray:
    """Grayscale float image. Uses Pillow when installed, else macOS `sips` -> BMP (no extra deps)."""
    try:
        from PIL import Image  # type: ignore
        return np.asarray(Image.open(path).convert("L"), dtype=float)
    except ImportError:
        pass
    if not shutil.which("sips"):
        raise RuntimeError("Need Pillow or macOS sips to decode the detection photo")
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "f.bmp"
        subprocess.run(["sips", "-s", "format", "bmp", str(path), "--out", str(out)], check=True, capture_output=True)
        b = out.read_bytes()
    off = struct.unpack_from("<I", b, 10)[0]
    w, h = struct.unpack_from("<ii", b, 18)
    bpp = struct.unpack_from("<H", b, 28)[0] // 8
    row = (w * bpp + 3) // 4 * 4
    a = np.frombuffer(b, np.uint8, offset=off, count=row * abs(h)).reshape(abs(h), row)[:, : w * bpp].reshape(abs(h), w, bpp)
    if h > 0:
        a = a[::-1]
    return a[..., :3].mean(-1)


def segment_footprint(gray: np.ndarray, box: tuple[float, float, float, float], margin: int = 12,
                      n_rays: int = 96) -> dict:
    """Trace the dark damage region inside a detection box.
    Returns the polygon (image px, ordered), the binary mask and a 0..1 darkness map (both box+margin crop)."""
    g = ndi.gaussian_filter(gray, 3)
    x0, y0, x1, y1 = (int(round(v)) for v in box)
    ox, oy = max(0, x0 - margin), max(0, y0 - margin)
    roi = g[oy: y1 + margin, ox: x1 + margin]
    inner = np.zeros_like(roi, bool)
    inner[y0 - oy: y1 - oy, x0 - ox: x1 - ox] = True
    bg = float(np.median(roi[~inner]))  # intact pavement ring around the box
    dark = float(np.percentile(roi[inner], 5))
    mask = (roi < bg - 0.45 * (bg - dark)) & inner
    lab, n = ndi.label(mask)
    if n == 0:
        raise ValueError("no damage pixels inside the detection box")
    mask = lab == 1 + int(np.argmax(ndi.sum(mask, lab, range(1, n + 1))))
    mask = ndi.binary_opening(ndi.binary_fill_holes(ndi.binary_closing(mask, iterations=4)), iterations=2)

    # Ordered outline: farthest mask pixel along each ray from the centroid (radius smoothed lightly).
    cy, cx = ndi.center_of_mass(mask)
    ys, xs = np.nonzero(mask)
    ang = np.arctan2(ys - cy, xs - cx)
    rad = np.hypot(ys - cy, xs - cx)
    bins = np.linspace(-np.pi, np.pi, n_rays + 1)
    idx = np.clip(np.digitize(ang, bins) - 1, 0, n_rays - 1)
    r = np.zeros(n_rays)
    np.maximum.at(r, idx, rad + 0.5)
    r = np.where(r > 0, r, np.interp(np.arange(n_rays), np.flatnonzero(r > 0), r[r > 0], period=n_rays))
    r = ndi.uniform_filter1d(r, 3, mode="wrap")
    t = (bins[:-1] + bins[1:]) / 2
    poly = [(float(ox + cx + ri * np.cos(ti)), float(oy + cy + ri * np.sin(ti))) for ri, ti in zip(r, t)]
    darkness = np.clip((bg - roi) / max(bg - dark, 1e-6), 0, 1) * mask
    return {"polygon_px": poly, "mask": mask, "darkness": darkness, "origin_px": (ox, oy)}


def footprint_depression(polygon_px: list[tuple[float, float]], darkness: np.ndarray, origin_px: tuple[int, int],
                         mm_per_px: float, size_mm: float = 800.0, step_mm: float = 4.0, depth_mm: float = 38.0,
                         tilt: tuple[float, float] = (0.0, 0.0), noise_mm: float = 0.0, seed: int = 0) -> dict:
    """SYNTHETIC surface whose depression has the traced outline, centred on the grid.
    depth = D · (0.55·edge-distance^0.7 + 0.45·photo darkness), normalised so max = D."""
    n = int(round(size_mm / step_mm))
    poly = np.asarray(polygon_px, float)
    centre_px = (poly.min(0) + poly.max(0)) / 2
    shift = size_mm / 2 - centre_px * mm_per_px
    poly_mm = [(float(x * mm_per_px + shift[0]), float(y * mm_per_px + shift[1])) for x, y in poly]
    inside = polygon_mask(poly_mm, (n, n), step_mm)

    xs = (np.arange(n) + 0.5) * step_mm
    xx, yy = np.meshgrid(xs, xs)
    # Photo darkness sampled at each cell (cell -> photo px).
    px = np.clip(((xx - shift[0]) / mm_per_px - origin_px[0]).astype(int), 0, darkness.shape[1] - 1)
    py = np.clip(((yy - shift[1]) / mm_per_px - origin_px[1]).astype(int), 0, darkness.shape[0] - 1)
    dk = ndi.gaussian_filter(darkness, 2)[py, px]
    edge = ndi.distance_transform_edt(inside)
    prof = 0.55 * (edge / max(edge.max(), 1e-9)) ** 0.7 + 0.45 * dk / max(dk[inside].max(), 1e-9)
    prof = ndi.gaussian_filter(np.where(inside, prof, 0.0), 1.5)  # soft rim, no vertical wall artefacts
    depth = depth_mm * prof / prof.max()
    z = tilt[0] * xx + tilt[1] * yy - depth
    if noise_mm:
        z = z + np.random.default_rng(seed).normal(0, noise_mm, z.shape)
    pts = np.stack([xx.ravel(), yy.ravel(), z.ravel()], axis=1)
    return {"points": pts, "depth": depth, "step": step_mm, "contour_mm": poly_mm, "depth_mm": depth_mm, "mm_per_px": mm_per_px}
