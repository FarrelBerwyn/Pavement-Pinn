"""Damage geometry pipeline T1–T5 (handoff spec/01; Pan et al. 2023 §2.3, §3.1–3.2, eq. 11–15).

Every tunable lives in GeometryConfig. Nothing here invents data: a stage whose
prerequisite is missing raises StageBlocked with the reason, and the caller records the
stage as `blocked`.
"""
from .config import GeometryConfig, StageBlocked

__all__ = ["GeometryConfig", "StageBlocked"]
