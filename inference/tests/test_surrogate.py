"""PI-surrogate on OpenVINO (M2 gate): physics by construction, accuracy vs PyMastic, Monte Carlo rules."""
import numpy as np
import pytest

from app.mlet import mlet_strains
from app.surrogate import features, life_monte_carlo, load_surrogate

S = load_surrogate()
pytestmark = pytest.mark.skipif(S is None, reason="no trained surrogate in models/")
MC = dict(segment_id="T", seed=7, n=2000, h1=100, h2=150, E1=2500, E2=200, cbr=6, soaked_factor=0.5,
          axle_t=8.16, q=0.55, d=330, esal_year=(2.5e5, 3.6e5, 5.3e5), growth=0.04, damage_used=0.0, criterion="AI")


def strains(P, q, h1, h2, E1, E2, E3, d):
    F = features(*(np.array([v], float) for v in (P, q, h1, h2, E1, E2, E3, d)))
    y = S.predict(F)[0]
    return np.exp(y[0]) * q / E3 * 1e6, np.exp(y[1]) * q / E3 * 1e6


def test_elastic_similarity_holds_exactly():
    a = strains(8.16, 0.55, 100, 150, 2500, 200, 60, 330)
    b = strains(8.16, 0.55, 100, 150, 7500, 600, 180, 330)
    assert a[0] / b[0] == pytest.approx(3, rel=1e-5) and a[1] / b[1] == pytest.approx(3, rel=1e-5)


def test_matches_pymastic_on_reference_structure():
    et, ev = strains(8.16, 0.55, 100, 150, 2500, 200, 60, 330)
    ref = mlet_strains(8.16, [100, 150], [2500, 200, 60], [0.35, 0.35, 0.45], dual_spacing_mm=330)
    assert et == pytest.approx(ref["et_ue"], rel=0.05) and ev == pytest.approx(ref["ev_ue"], rel=0.05)


def test_monte_carlo_percentiles_ordered_and_wet_is_shorter():
    dry = life_monte_carlo(S, wet=False, **MC)
    wet = life_monte_carlo(S, wet=True, **MC)
    for r in (dry, wet):
        assert r["status"] == "COMPUTED"
        ly = r["life_years"]
        assert ly["p10"] <= ly["p50"] <= ly["p90"]
    assert wet["life_years"]["p50"] < dry["life_years"]["p50"]


def test_thicker_asphalt_never_shortens_life():
    thin = life_monte_carlo(S, wet=False, **MC)
    thick = life_monte_carlo(S, wet=False, **{**MC, "h1": 150})
    assert thick["life_years"]["p50"] >= thin["life_years"]["p50"]


def test_out_of_domain_inputs_are_refused():
    r = life_monte_carlo(S, wet=False, **{**MC, "h1": 400, "E1": 9000})
    assert r["status"] == "OUT_OF_DOMAIN"
