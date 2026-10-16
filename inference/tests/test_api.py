"""HTTP contract of /v1/health and /v1/assess (Dokumen Induk v3 §4.8)."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
BASE = {
    "segment_id": "NRG-TEST",
    "layers": [{"h_mm": 100, "E_mpa": 2500, "nu": 0.35, "source": "TEST"}, {"h_mm": 150, "E_mpa": 200, "nu": 0.35, "source": "TEST"}],
    "subgrade": {"cbr": 6},
    "traffic": {"esal_day_p10": 1000, "esal_day_p50": 1500, "esal_day_p90": 2930},
}


def test_health_reports_method_devices_and_model():
    body = client.get("/v1/health").json()
    assert body["status"] == "ok" and body["mlet_method"].startswith("PyMastic@")
    assert "CPU" in [d["id"] for d in body["available_devices"]]
    assert body["models_loaded"][0]["version"] == "pi-surrogate-v1"


def test_assess_default_standard_axle_dual_tyres():
    res = client.post("/v1/assess", json=BASE)
    assert res.status_code == 200
    body = res.json()
    assert abs(body["mlet"]["et_ue"] - 227) < 2.3 and abs(body["mlet"]["ev_ue"] - 876.4) < 8.8
    life = body["life_years"]
    assert life["p10"] <= life["p50"] <= life["p90"]
    assert body["status_label"] == "COMPUTED"
    mc = body["monte_carlo"]
    assert mc["status"] == "COMPUTED" and body["surrogate"]["version"] == "pi-surrogate-v1"
    for cond in ("dry", "wet"):
        ly = mc[cond]["life_years"]
        assert ly["p10"] <= ly["p50"] <= ly["p90"]
        assert mc[cond]["crosscheck"]["max_err_pct"] <= 10
    assert mc["wet"]["life_years"]["p50"] < mc["dry"]["life_years"]["p50"]


def test_wet_subgrade_shortens_life():
    dry = client.post("/v1/assess", json=BASE).json()
    wet = client.post("/v1/assess", json={**BASE, "subgrade": {"cbr": 6, "state": "wet"}}).json()
    assert wet["mlet"]["ev_ue"] > dry["mlet"]["ev_ue"]
    assert wet["life_years"]["p50"] < dry["life_years"]["p50"]


def test_assumptions_are_disclosed():
    body = client.post("/v1/assess", json=BASE).json()
    text = " ".join(body["assumptions"])
    assert "10 x CBR" in text and "Monte Carlo spreads (ASSUMED)" in text


def test_monte_carlo_is_deterministic_per_segment():
    a = client.post("/v1/assess", json=BASE).json()["monte_carlo"]["dry"]["life_years"]
    b = client.post("/v1/assess", json=BASE).json()["monte_carlo"]["dry"]["life_years"]
    assert a == b


def test_monte_carlo_states_why_it_did_not_run():
    no_traffic = {k: v for k, v in BASE.items() if k != "traffic"}
    assert client.post("/v1/assess", json=no_traffic).json()["monte_carlo"]["status"] == "NO_TRAFFIC"
    three = {**BASE, "layers": BASE["layers"] + [{"h_mm": 200, "E_mpa": 150, "nu": 0.35}]}
    assert client.post("/v1/assess", json=three).json()["monte_carlo"]["status"] == "OUTSIDE_SURROGATE_SCOPE"
    assert client.post("/v1/assess", json={**BASE, "n_mc": 0}).json()["monte_carlo"] is None


def test_out_of_range_inputs_are_422():
    for bad in (
        {**BASE, "subgrade": {"cbr": 0.5}},
        {**BASE, "layers": [{"h_mm": 10, "E_mpa": 2500, "nu": 0.35}]},
        {**BASE, "load": {"axle_t": 60}},
        {**BASE, "traffic": {"esal_day_p10": 3000, "esal_day_p50": 1500, "esal_day_p90": 1000}},
        {**BASE, "unknown_field": 1},
    ):
        assert client.post("/v1/assess", json=bad).status_code == 422
