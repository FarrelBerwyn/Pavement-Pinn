# PAVEMENT-PINN inference service

Python service for the physics and AI modules (Dokumen Induk v3 D-23). Express calls it through
`INFERENCE_URL` (default `http://127.0.0.1:8100`).

| Endpoint | Status |
|---|---|
| `GET /v1/health` | M1 |
| `POST /v1/assess` | M1: MLET strains (PyMastic), transfer function, life index from the traffic range. Surrogate + Monte Carlo: M2 |
| `/v1/screen`, `/v1/brief`, `/v1/measurements` | M3–M5, not built |

## Setup (Windows, Python 3.11)

```bash
uv venv inference/.venv --python 3.11
uv pip install --python inference/.venv/Scripts/python.exe -r inference/requirements.lock
```

## Run and test (from `inference/`)

```bash
.venv/Scripts/python -m uvicorn app.main:app --port 8100
.venv/Scripts/python -m pytest -q
```

`tests/test_mlet.py` is the M1 gate: the v3 reference strains (303/793 µε at 10 t, 274/663 µε at
8.16 t, 227/876 µε dual tyres) within 1 %, and elastic similarity.

PyMastic (Apache-2.0) is vendored unmodified in `vendor/pymastic` at commit `be301be`.
