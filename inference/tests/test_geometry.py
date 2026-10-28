"""Geometry pipeline against synthetic surfaces with analytic answers (fixtures are SYNTHETIC)."""
import shutil

import numpy as np
import pytest

from geometry import GeometryConfig, StageBlocked
from geometry.grid import pca_align, vectorize
from geometry.pipeline import requantify, run_pothole
from geometry.quantify import crack_length, crack_widths, point_plane_distance, pothole_metrics
from geometry.scale import scale_from_marker
from geometry.sfm import run_sfm
from geometry.skeleton import crack_skeleton
from geometry.surface import Plane, fit_plane_ransac
from geometry.synthetic import gaussian_depression, v_groove


def test_vectorize_eq_11_12():
    pts = np.array([[0, 0, 1], [100, 0, 2], [0, 50, 3], [100, 50, 4]], dtype=float)
    g = vectorize(pts, GeometryConfig(grid_m=10, max_fill_gap_cells=0))
    assert g.step == pytest.approx(10.0)          # eq. 11
    assert g.z.shape == (5, 10)                   # eq. 12: N = 50 / 10
    assert g.z[0, 0] == 1 and g.z[-1, -1] == 4


def test_pca_removes_road_tilt():
    s = gaussian_depression(tilt=(0.03, -0.02))
    aligned, _, tilt = pca_align(s["points"])
    assert tilt > 1.0
    assert np.ptp(aligned[:, 2]) < np.ptp(s["points"][:, 2])


def test_eq15_point_plane_distance():
    assert point_plane_distance(np.array([1.0, 2.0, -5.0]), Plane(0, 0, 1, 0, 0, 1)) == pytest.approx(5.0)
    assert point_plane_distance(np.array([0.0, 0.0, 0.0]), Plane(0, 0, 2, 4, 0, 1)) == pytest.approx(2.0)


def test_plane_ransac_resists_outliers():
    rng = np.random.default_rng(1)
    xy = rng.uniform(0, 500, (2000, 2))
    z = 0.01 * xy[:, 0] + rng.normal(0, 0.3, 2000)
    out = rng.uniform(0, 500, (600, 3))  # 23 % gross outliers
    plane = fit_plane_ransac(np.vstack([np.c_[xy, z], out]), threshold=1.0)
    normal = np.array([plane.a, plane.b, plane.c])
    expected = np.array([-0.01, 0, 1]) / np.linalg.norm([-0.01, 0, 1])
    assert np.degrees(np.arccos(abs(normal @ expected))) < 0.5
    assert plane.rms < 0.6


def test_pothole_volume_matches_analytic_integral():
    s = gaussian_depression(size_mm=800, step_mm=4, depth_mm=38, sigma_mm=90)
    r = run_pothole(s["points"], mm_per_unit=1.0, cfg=GeometryConfig(grid_m=200))
    m = r["metrics"]
    assert m["depth_max_mm"] == pytest.approx(38, abs=1.0)
    # Inside the boundary where depth > t the analytic deficit is 2πσ²(D − t). Tolerance 5 %:
    # a Gaussian never flattens out, so the ring used for the plane still sits on its tail and
    # biases the plane by a fraction of a millimetre (documented, not tuned away).
    t = r["boundary_depth"]
    assert m["volume_l"] == pytest.approx(2 * np.pi * 90 ** 2 * (38 - t) / 1e6, rel=0.05)


def test_volume_is_not_bbox_times_depth():
    s = gaussian_depression()
    m = run_pothole(s["points"], 1.0, cfg=GeometryConfig(grid_m=200))["metrics"]
    bbox = m["length_mm"] * m["width_mm"] * m["depth_max_mm"] / 1e6
    assert m["volume_l"] < 0.5 * bbox


def test_no_scale_gives_relative_geometry_only():
    s = gaussian_depression()
    r = run_pothole(s["points"], mm_per_unit=None, cfg=GeometryConfig(grid_m=100))
    assert r["unit"] == "relative" and r["metrics"] is None


def test_requantify_with_contour_matches_disc_integral():
    step = 2.0
    n = 200
    c = n * step / 2
    ys, xs = np.mgrid[0:n, 0:n] * step + step / 2
    depth = np.where((xs - c) ** 2 + (ys - c) ** 2 <= 100 ** 2, 20.0, 0.0)  # flat-bottom disc, r = 100 mm, 20 mm deep
    contour = [(c + 101 * np.cos(t), c + 101 * np.sin(t)) for t in np.linspace(0, 2 * np.pi, 72, endpoint=False)]
    r = requantify(depth.tolist(), step, contour, metric=True, plane_rms=0.5)
    assert r["metrics"]["volume_l"] == pytest.approx(np.pi * 100 ** 2 * 20 / 1e6, rel=0.03)
    assert r["metrics"]["area_m2"] == pytest.approx(np.pi * 0.1 ** 2, rel=0.05)


def test_low_coverage_withholds_volume():
    d = np.full((20, 20), 5.0)
    d[:, :10] = np.nan
    m = pothole_metrics(d, np.ones((20, 20), bool), 1.0)
    assert m["volume"] is None and m["coverage_pct"] == pytest.approx(50)


def test_crack_eq13_eq14_on_v_groove():
    g = v_groove(length_mm=300, width_mm=12, depth_mm=8, step_mm=1.0)
    skel = crack_skeleton(g["depth_grid"])
    assert skel.is_crack
    assert crack_length(skel, g["step"]) == pytest.approx(g["length_mm"], rel=0.02)
    w = crack_widths(skel, g["depth_grid"], g["step"])
    assert np.median(w) == pytest.approx(g["width_mm"], abs=1.0)
    assert np.nanmax(g["depth_grid"]) == pytest.approx(g["depth_mm"], abs=0.5)


def test_noise_cancellation_removes_isolated_points():
    g = v_groove(length_mm=200, width_mm=10, depth_mm=6)
    d = g["depth_grid"].copy()
    d[100, 5] = 50.0  # isolated spike far from the crack
    skel = crack_skeleton(d)
    assert not any((p[0] == 100 and p[1] == 5) for p in skel.points)


def test_scale_from_card():
    s = scale_from_marker(85.6, [42.8, 42.7, 42.9], "card")
    assert s.mm_per_unit == pytest.approx(2.0, rel=0.01)
    with pytest.raises(StageBlocked):
        scale_from_marker(85.6, [], "card")


@pytest.mark.skipif(shutil.which("colmap") is not None, reason="COLMAP installed here")
def test_sfm_unavailable_is_blocked(tmp_path):
    with pytest.raises(StageBlocked) as e:
        run_sfm(tmp_path, tmp_path / "out")
    assert e.value.code == "SFM_UNAVAILABLE"


def test_refit_plane_removes_a_tilted_reference():
    step = 2.0
    n = 150
    ys, xs = np.mgrid[0:n, 0:n] * step + step / 2
    c = n * step / 2
    hole = np.where((xs - c) ** 2 + (ys - c) ** 2 <= 60 ** 2, 15.0, 0.0)
    tilted = hole + 0.02 * xs  # stored depth was taken against a wrong, tilted plane
    contour = [(c + 62 * np.cos(t), c + 62 * np.sin(t)) for t in np.linspace(0, 2 * np.pi, 48, endpoint=False)]
    wrong = requantify(tilted.tolist(), step, contour, metric=True, plane_rms=0.5)
    fixed = requantify(tilted.tolist(), step, contour, metric=True, plane_rms=0.5, refit_plane=True)
    truth = np.pi * 60 ** 2 * 15 / 1e6
    assert abs(fixed["metrics"]["volume_l"] - truth) < abs(wrong["metrics"]["volume_l"] - truth)
    assert fixed["metrics"]["volume_l"] == pytest.approx(truth, rel=0.06)


def test_crack_from_grid_on_v_groove_and_iou_against_analytic_map():
    from geometry.pipeline import crack_from_grid, crack_map_iou
    g = v_groove(length_mm=300, width_mm=12, depth_mm=8, step_mm=1.0)
    r = crack_from_grid(g["depth_grid"].tolist(), g["step"], metric=True, plane_rms=0.0)
    assert r["is_crack"]
    m = r["metrics"]
    assert m["length_mm"] == pytest.approx(300, rel=0.02)
    assert m["width_mean_mm"] == pytest.approx(12, abs=1.0)
    assert m["depth_max_mm"] == pytest.approx(8, abs=0.5)
    truth = g["depth_grid"] > 0
    assert crack_map_iou(np.array(r["crack_map"]), truth) > 0.85


def test_crack_without_scale_reports_relative_only():
    from geometry.pipeline import crack_from_grid
    g = v_groove(length_mm=200)
    r = crack_from_grid(g["depth_grid"].tolist(), 1.0, metric=False)
    assert r["unit"] == "relative" and r["metrics"] is None and r["is_crack"]


def test_flat_surface_is_not_a_crack():
    from geometry.pipeline import crack_from_grid
    flat = np.zeros((60, 40))
    flat[10, 7] = 3.0  # one isolated pit
    r = crack_from_grid(flat.tolist(), 1.0, metric=True)
    assert r["metrics"] is None or not r["is_crack"]
