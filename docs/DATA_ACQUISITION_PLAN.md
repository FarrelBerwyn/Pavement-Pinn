# Data Acquisition Plan

Spec v2.2 Lampiran D categories: A available, B open source, C to acquire/validate,
D synthetic/reference. Every dataset is "Not yet acquired" unless stated. The software
already has the integration point listed, so a real dataset replaces an adapter, not the
application.

| Dataset | Purpose | Category | Candidate source | Access / legal | Status | Format & expected fields | Validation | Integration point |
|---|---|---|---|---|---|---|---|---|
| Corridor geometry Klari–Jatisari–Jomin | Map, segment matching, OUT_OF_SCOPE check | B → C | OpenStreetMap (ODbL), field check | Attribution required | Not yet acquired (G-01) | LineString per KRW segment, km posts | Overlay on imagery; field check | `road_segments.geom`; `karawangPilot.ts` |
| Pavement structure & material | Baseline for assessment | C | Bina Marga / BBPJN as-built, cores, DCP | Institutional request | Not yet acquired | surface type, layer thickness, CBR range, modulus range, date, source | Compare to design standards | `pavement_baselines`; `pavementBaseline()` |
| FWD deflection | Structural validation | C | BBPJN surveys | Institutional request | Not yet acquired (G-02) | station, D0..D1500, load, temperature | Back-calculation consistency | future `fwd_observations`; assessment inputs |
| WIM records | Observed axle loads | C | Kemenhub / Dishub WIM stations | Institutional request; no plates stored (spec §29) | Not yet acquired (G-02, G-06) | station, timestamp, axle loads, axle count, GVW, confidence | Plausibility ranges, station calibration | `WimProvider` → `wim_observations` |
| Traffic counts | Volume, heavy-vehicle share | B / C | Public traffic counts, LHR surveys | Terms of each source; no CCTV scraping (spec §9.5) | Not yet acquired | segment, period, class, count, source URL, method | Cross-check with LHR | `traffic_observations`; `estimateTrafficLoad()` |
| Weather | Rain/temperature context | B | BMKG or a weather API | API terms, key | Not yet acquired | point/grid, time, rain mm/h, 24 h accumulation, temperature | Station comparison | `WeatherProvider` → `weather_observations` |
| Distress photos (local) | CV fine-tuning and validation | C | Team field photos, citizen reports with consent | Consent, privacy (faces/plates blurred) | Not yet acquired (G-03) | image, polygon masks, class, severity, location, date | Held-out local test set; precision/recall/mAP | `CvScreeningProvider`; `damage_detections` |
| Public pothole dataset | CV pre-training | B | Roboflow pothole_segmentation_yolov8 (CC BY 4.0) | Attribution | Identified, not downloaded | YOLO seg labels, 640×640 | Not representative of Karawang | training pipeline (Python, not in repo) |
| Condition history | Road Story, deterioration trend | C | IRMS/PMS exports, survey archives | Institutional request | Not yet acquired | segment, date, PCI/IRI, treatment | Consistency over time | `buildRoadStory()` (currently starts with system records) |
| Reference elastic solutions | PINN training/validation (synthetic-to-real bridge) | D | Generated (analytic/FEM layered elastic) | Own | Not yet generated (G-04) | inputs, stresses/strains at depths | Compare with established solvers | PINN training (Python) |
| ODOL statistics | Load argument | C | Official enforcement statistics | Institutional request | Not found (G-06) | corridor, period, overload counts | Source verification | Not claimed until available |

Rules: no dataset is shown as OBSERVED unless it is a real observation; synthetic and
reference data keep their labels end to end (UI badges, API `dataStatus`, DB `data_status`).
