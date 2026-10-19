"""Video adapter: frame sampling, IoU tracking and temporal aggregation on top of the shared
engine. Detection itself is `engine.analyze_frame`, the same code path as a photo."""
from __future__ import annotations

import os
import tempfile
import time

import cv2

from .engine import CvError, analyze_frame

MAX_VIDEO_BYTES = 50 * 1024 * 1024
MAX_FRAMES = 30


def iou(a: list[float], b: list[float]) -> float:
    ix1, iy1, ix2, iy2 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def sample_frames(path: str, fps: float, max_frames: int = MAX_FRAMES):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise CvError("INVALID_VIDEO", "Video could not be opened.")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, round(src_fps / fps))
    idx, taken = 0, 0
    try:
        while taken < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % step == 0:
                yield idx, idx / src_fps, frame
                taken += 1
            idx += 1
    finally:
        cap.release()


def track(frames: list[dict], iou_thr: float = 0.3) -> list[dict]:
    """Greedy IoU association of same-taxonomy detections in consecutive sampled frames."""
    tracks: list[dict] = []
    for f in frames:
        for d in f["detections"]:
            best, best_iou = None, iou_thr
            for t in tracks:
                if t["taxonomyCode"] != d["taxonomyCode"] or t["lastFrame"] != f["frameIndexSampled"] - 1:
                    continue
                v = iou(t["lastBbox"], d["bbox"])
                if v >= best_iou:
                    best, best_iou = t, v
            if best is None:
                best = {"trackId": len(tracks) + 1, "taxonomyCode": d["taxonomyCode"], "label": d["label"], "observations": []}
                tracks.append(best)
            best["observations"].append({"timestampS": f["timestampS"], "confidence": d["confidence"], "bbox": d["bbox"],
                                         "severity": d["severity"]["level"]})
            best["lastBbox"], best["lastFrame"] = d["bbox"], f["frameIndexSampled"]
    for t in tracks:
        obs = t["observations"]
        t["frames"] = len(obs)
        t["maxConfidence"] = max(o["confidence"] for o in obs)
        t["bestTimestampS"] = max(obs, key=lambda o: o["confidence"])["timestampS"]
        t.pop("lastBbox"), t.pop("lastFrame")
    return tracks


def analyze_video(data: bytes, fps: float = 1.0, stage=None) -> dict:
    if not data:
        raise CvError("INVALID_VIDEO", "No video bytes received.")
    if len(data) > MAX_VIDEO_BYTES:
        raise CvError("INVALID_VIDEO", "Video is larger than 50 MB.")
    t0 = time.perf_counter()
    fd, path = tempfile.mkstemp(suffix=".mp4")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        frames = []
        for n, (idx, ts, frame) in enumerate(sample_frames(path, fps)):
            if stage:
                stage(f"frame_{n + 1}")
            r = analyze_frame(frame, f"frame:{idx}@{ts:.2f}s")
            r.pop("overlayJpegBase64", None)
            if r.get("segmentation"):
                r["segmentation"].pop("maskPngBase64", None)
            frames.append({"frameIndex": idx, "frameIndexSampled": n, "timestampS": round(ts, 3), "status": r["status"],
                           "detections": r["detections"], "timings": r["timings"], "model": r.get("model")})
    finally:
        os.unlink(path)
    if not frames:
        raise CvError("INVALID_VIDEO", "No frames could be decoded.")
    tracks = track(frames)
    return {"sourceType": "video", "framesAnalyzed": len(frames), "sampleFps": fps, "frames": frames, "tracks": tracks,
            "status": "completed" if tracks else "inconclusive", "totalMs": round((time.perf_counter() - t0) * 1000, 1)}
