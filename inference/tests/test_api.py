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


def test_health_reports_method_and_no_unmeasured_devices():
    body = client.get("/v1/health").json()
    assert body["status"] == "ok" and body["mlet_method"].startswith("PyMastic@")
    assert body["available_devices"] == [] and body["openvino_version"] is None


def test_assess_default_standard_axle_dual_tyres():
    res = client.post("/v1/assess", json=BASE)
    assert res.status_code == 200
    body = res.json()
    assert abs(body["mlet"]["et_ue"] - 227) < 2.3 and abs(body["mlet"]["ev_ue"] - 876.4) < 8.8
    life = body["life_years"]
    assert life["p10"] <= life["p50"] <= life["p90"]
    assert body["status_label"] == "COMPUTED" and body["surrogate"] is None


def test_wet_subgrade_shortens_life():
    dry = client.post("/v1/assess", json=BASE).json()
    wet = client.post("/v1/assess", json={**BASE, "subgrade": {"cbr": 6, "state": "wet"}}).json()
    assert wet["mlet"]["ev_ue"] > dry["mlet"]["ev_ue"]
    assert wet["life_years"]["p50"] < dry["life_years"]["p50"]


def test_assumptions_are_disclosed():
    body = client.post("/v1/assess", json={**BASE, "n_mc": 2000}).json()
    text = " ".join(body["assumptions"])
    assert "10 x CBR" in text and "M2" in text


def test_out_of_range_inputs_are_422():
    for bad in (
        {**BASE, "subgrade": {"cbr": 0.5}},
        {**BASE, "layers": [{"h_mm": 10, "E_mpa": 2500, "nu": 0.35}]},
        {**BASE, "load": {"axle_t": 60}},
        {**BASE, "traffic": {"esal_day_p10": 3000, "esal_day_p50": 1500, "esal_day_p90": 1000}},
        {**BASE, "unknown_field": 1},
    ):
        assert client.post("/v1/assess", json=bad).status_code == 422
