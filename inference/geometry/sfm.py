"""T1 structure-from-motion adapter.

Runs COLMAP (and OpenMVS for dense clouds when present) as external tools. When the
binaries are not installed the stage is BLOCKED with that reason — this module never
returns a placeholder cloud.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from .config import StageBlocked


def sfm_available() -> dict:
    colmap = shutil.which("colmap")
    openmvs = shutil.which("DensifyPointCloud")
    return {"colmap": colmap is not None, "openmvs": openmvs is not None}


def run_sfm(image_dir: str | Path, work_dir: str | Path, min_images: int = 8) -> Path:
    """Sparse reconstruction with COLMAP's automatic reconstructor. Returns the model folder."""
    if shutil.which("colmap") is None:
        raise StageBlocked("COLMAP tidak terpasang di server inference; T1 tidak dapat dijalankan", "SFM_UNAVAILABLE")
    images = [p for p in Path(image_dir).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    if len(images) < min_images:
        raise StageBlocked(f"Sekuens hanya {len(images)} foto; butuh minimal {min_images} foto overlap", "TOO_FEW_IMAGES")
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(["colmap", "automatic_reconstructor", "--workspace_path", str(work), "--image_path", str(image_dir)],
                          capture_output=True, text=True, timeout=3600)
    if proc.returncode != 0:
        raise RuntimeError(f"COLMAP gagal: {proc.stderr[-500:]}")
    return work / "sparse" / "0"
