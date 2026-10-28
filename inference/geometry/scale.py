"""Metric scale from a marker of known size (ID-1 card 85.6 mm or an ArUco tag)."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .config import StageBlocked


@dataclass(frozen=True)
class Scale:
    mm_per_unit: float
    uncertainty_mm: float  # 1-sigma at the marker size
    method: str


def scale_from_marker(known_mm: float, measured_lengths_units: list[float], method: str) -> Scale:
    """Scale from repeated measurements of the marker edge in reconstruction units.
    Uncertainty = standard error of the repeated measurements, propagated to the marker size."""
    m = np.asarray(measured_lengths_units, dtype=float)
    m = m[np.isfinite(m) & (m > 0)]
    if m.size == 0:
        raise StageBlocked("Penanda skala tidak terdeteksi: hanya geometri relatif", "NO_SCALE")
    mean = float(m.mean())
    k = known_mm / mean
    se = float(m.std(ddof=1) / np.sqrt(m.size)) if m.size > 1 else mean * 0.01
    return Scale(mm_per_unit=k, uncertainty_mm=known_mm * se / mean, method=method)


def detect_aruco_edges(image: np.ndarray, dictionary: str = "DICT_4X4_50") -> list[float]:
    """Edge lengths (pixels) of ArUco markers in an image. Empty when none or OpenCV lacks aruco."""
    try:
        import cv2
    except ImportError:
        return []
    if not hasattr(cv2, "aruco"):
        return []
    det = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, dictionary)))
    corners, ids, _ = det.detectMarkers(image)
    edges: list[float] = []
    for c in corners or []:
        pts = c.reshape(-1, 2)
        edges += [float(np.linalg.norm(pts[i] - pts[(i + 1) % 4])) for i in range(4)]
    return edges
