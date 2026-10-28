"""M1 gate: MLET reference values from Dokumen Induk v3 §4.4, re-run in the team repo."""
import pytest

from app.mlet import allowable_reps, life_index_years, mlet_strains

DEFAULT = dict(h_mm=[100, 150], E_mpa=[2500, 200, 60], nu=[0.35, 0.35, 0.45])


def close(value, expected, rel=0.01):
    return abs(value - expected) <= rel * expected


def test_reference_10t_isolated_tyres():
    r = mlet_strains(10, **DEFAULT)
    assert close(r["et_ue"], 303) and close(r["ev_ue"], 793)


def test_reference_standard_axle_isolated_tyres():
    r = mlet_strains(8.16, **DEFAULT)
    assert close(r["et_ue"], 274) and close(r["ev_ue"], 663)


def test_reference_standard_axle_dual_tyres():
    r = mlet_strains(8.16, **DEFAULT, dual_spacing_mm=330)
    assert close(r["et_ue"], 227) and close(r["ev_ue"], 876.4)


def test_elastic_similarity_all_moduli_times_three():
    r1 = mlet_strains(10, **DEFAULT)
    r3 = mlet_strains(10, [100, 150], [7500, 600, 180], [0.35, 0.35, 0.45])
    assert r1["et_ue"] / r3["et_ue"] == pytest.approx(3, rel=1e-3)
    assert r1["ev_ue"] / r3["ev_ue"] == pytest.approx(3, rel=1e-3)


def test_strains_scale_linearly_with_pressure_at_fixed_contact_radius():
    # Doubling axle load and pressure keeps the contact radius, so strains double.
    r1 = mlet_strains(8, **DEFAULT, q_mpa=0.5)
    r2 = mlet_strains(16, **DEFAULT, q_mpa=1.0)
    assert r2["et_ue"] / r1["et_ue"] == pytest.approx(2, rel=1e-3)


def test_thicker_asphalt_lowers_subgrade_strain():
    thin = mlet_strains(8.16, **DEFAULT, dual_spacing_mm=330)
    thick = mlet_strains(8.16, [150, 150], [2500, 200, 60], [0.35, 0.35, 0.45], dual_spacing_mm=330)
    assert thick["ev_ue"] < thin["ev_ue"]


def test_invalid_inputs_are_rejected():
    with pytest.raises(ValueError):
        mlet_strains(8.16, [100, 150], [2500, 200], [0.35, 0.35])
    with pytest.raises(ValueError):
        mlet_strains(0, **DEFAULT)


def test_transfer_functions_match_reference_values():
    nf, nd = allowable_reps(227.0, 876.4, 2500, "AI")
    assert nf == pytest.approx(1.4e6, rel=0.01) and nd == pytest.approx(6.65e4, rel=0.01)
    nf2, nd2 = allowable_reps(227.0, 876.4, 2500, "AUS")
    assert nf2 == pytest.approx(2.56e6, rel=0.01) and nd2 == pytest.approx(1.51e7, rel=0.01)


def test_life_index_decreases_with_traffic():
    assert life_index_years(1e6, 2e5, 0.04, 0) > life_index_years(1e6, 4e5, 0.04, 0)
    assert life_index_years(1e6, 1e5, 0, 0) == pytest.approx(10)


def test_field_grid_matches_critical_strains_and_is_extent_independent():
    import numpy as np
    from app.mlet import mlet_field_grid, mlet_strains
    args = (8.16, [100, 250, 200], [3000, 300, 150, 60], [0.35, 0.35, 0.35, 0.45])
    crit = mlet_strains(*args, dual_spacing_mm=330)
    small = mlet_field_grid(*args, dual_spacing_mm=330, x_mm=[-165.0, 0.0], z_mm=[99.99, 550.01])
    wide = mlet_field_grid(*args, dual_spacing_mm=330, x_mm=[float(v) for v in np.arange(-800, 801, 50)] + [-165.0], z_mm=[99.99, 550.01])
    assert small["eps_xx"]["values"][0][0] == wide["eps_xx"]["values"][0][-1]
    assert abs(small["eps_xx"]["values"][0][0] - crit["et_ue"]) / crit["et_ue"] < 0.01
    # εv in mlet_strains is the max over wheel centre and mid-point; the field holds both.
    assert abs(max(small["eps_zz"]["values"][1]) - crit["ev_ue"]) / crit["ev_ue"] < 0.01


def test_field_grid_surface_stress_equals_tyre_pressure_under_single_wheel():
    from app.mlet import mlet_field_grid
    g = mlet_field_grid(8.16, [100, 250], [3000, 300, 60], [0.35, 0.35, 0.45], x_mm=[0.0], z_mm=[1.0])
    assert abs(g["sigma_zz"]["values"][0][0] - 0.55) / 0.55 < 0.15  # series truncation near the surface


def test_small_contact_on_thick_structure_converges_with_fewer_terms():
    """Motorcycle tyre (a ≈ 31 mm) on 570 mm of layers: 20 terms overflow; the fallback must
    return the converged value (identical for 3–6 terms), not NaN."""
    from app.mlet import mlet_strains
    r = mlet_strains(0.0796, [120, 250, 200], [3000, 300, 150, 50], [0.35, 0.35, 0.35, 0.45], q_mpa=0.25, tyres_per_axle=1)
    assert abs(r["et_ue"] - 10.8927) < 0.01 and abs(r["ev_ue"] - 8.8242) < 0.01
