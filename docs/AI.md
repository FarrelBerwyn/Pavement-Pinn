# AI, Models and Evidence Status

Software readiness and scientific validation are reported separately. Nothing below is
"validated" unless an experiment with real data says so; today none is.

| Component | What runs today | Data status | Scientific status |
|---|---|---|---|
| Computer Vision | In-browser rule classifier (`src/engines/computer-vision/classification/cvDamageClasses.ts`) | `DEMO` | No trained weights in the repo; no local validation dataset (G-03) |
| Automated screening | `src/domain/workflow/screening.ts` | uses CV status | Only a `REAL` model may pass reports automatically; DEMO never does |
| Engineering translation | `translateSurfaceEvidence` (`src/domain/intelligence/assessment.ts`) | `CALIBRATION_REQUIRED` | No calibration from photos to structural parameters exists |
| Traffic → load / ESAL | `src/domain/intelligence/evidence.ts`, `esal.ts` | `INFERRED` (no WIM) | Illustrative axle spectrum; WIM data required (G-02, G-06) |
| Weather | `DEMO_WEATHER_PROVIDER` | `DEMO` | No weather API key configured |
| Pavement baseline | `pavementBaseline` | `SYNTHETIC` (REFERENCE BASELINE) | No Karawang survey data |
| PINN | **not present**; `assessSegment` runs the deterministic formula in `src/engines/pinn/core/pinnEngine.ts` | `RULE_BASED` | No trained model, no physics residual, no ablation (G-04) |
| OpenVINO | Export endpoints return illustrative IR/config text; telemetry in the simulator is simulated | `SIMULATED` / `NOT_CONFIGURED` | No runtime, no IR model, no benchmark (G-05) |
| Explanation | `explainAssessment` (deterministic) + optional Gemini narrative (legacy endpoint) | `DETERMINISTIC_RULES` | Restates computed results only |

## Computer Vision: the supplied notebook (audit)

File: `FILES/Docs/pothole-segmentation-for-road-damage-assessment.ipynb` (86 cells).

| Question | Finding |
|---|---|
| Architecture | Ultralytics **YOLOv8n-seg** (instance segmentation), fine-tuned from `yolov8n-seg.pt` |
| Task | Segmentation of a **single class: `Pothole`** (masks + boxes); not cracks, rutting or patching |
| Dataset | Roboflow "pothole_segmentation_yolov8" v1, **CC BY 4.0**, 720 train / 60 validation images at 640×640; not Indonesian, not Karawang |
| Environment | Kaggle, Python 3.10, torch 2.0, Ultralytics 8.0.236, Tesla P100; `!pip install ultralytics` |
| Weights | Produced under `/kaggle/working/runs/segment/train/`; **not included** with the notebook or this repository |
| Metrics | Printed training curves/metrics belong to that third-party Kaggle run; they are **not** a validation of this system and are not quoted anywhere in the product |
| Reproducibility | Requires the Kaggle dataset path, GPU and internet for pip/weights; not runnable on this machine (no Python) |

Conclusion: a usable *candidate* for the pothole class once weights are trained and
validated on local photos. The product keeps `MODEL_UNAVAILABLE`/`DEMO` until then.

### CV model-loading contract (for a real provider)

A real CV service replaces `DEMO_CV_PROVIDER` by implementing `CvScreeningProvider`
(`src/domain/workflow/screening.ts`):

- `status: 'REAL'`, `modelVersion` such as `yolov8n-seg-pothole@<git-sha|date>`.
- `classify(report)` → `{ detectedClass, confidence }` from the model, or `null` if the
  image could not be processed. Segmentation masks, when available, belong in
  `damage_detections.mask_geojson` (schema in `supabase/migrations/`).
- Inference should run server-side (FastAPI or ONNX Runtime/OpenVINO sidecar) on the
  stored photo; the browser never claims a REAL result.
- Each detection keeps report id, model version, class, confidence, timestamp and
  `model_status` (`REAL` | `DEMO` | `MODEL_UNAVAILABLE`).

## PINN

- Spec §16: loss `L_total = λ_data L_data + λ_physics L_physics + λ_boundary L_boundary +
  λ_reg L_reg` with multilayer elastic theory residuals. **Not implemented**: training
  needs Python/PyTorch and reference solutions (FEM/analytic) that are not in the repo.
- What exists: the formula engine (Burmister-inspired strain estimates, fourth-power load
  factor, moisture decay), its mathematical audit and regression tests
  (`tests/physics-validation/`), and the validation gap report
  (`docs/validation/PINN_VALIDATION_GAP.md`).
- The application pipeline (inputs with provenance → engine → uncertainty → explanation →
  recommendation snapshot) is executable now and would take a trained model behind the
  same `EngineeringAssessment` shape (`engine: 'PINN'`, real `modelVersion`,
  `physicsResidual`).
- Ablation design (spec §33): Model A data-only, Model B data + physics, Model C other λ
  weighting — **PLANNED**, not run.

## OpenVINO

- Intended path (spec §17): PyTorch → ONNX → OpenVINO IR → FP16/INT8 → CPU/iGPU/NPU
  benchmark. **Not executed**: no model, no runtime, no Intel device test here.
- Targets stay targets: "latency < 10 ms" is an engineering target, actual = VALIDATION
  REQUIRED. The `/api/openvino/export-*` endpoints and the simulator's telemetry are
  illustrative and labelled so in the UI.

## Explanation layer

`DATA → ENGINE → RESULT → RULES/EVIDENCE → EXPLANATION`. `explainAssessment` answers what,
why (qualitative factor levels), evidence, confidence (with reasons) and what a human may
consider next. It never states contribution percentages without a decomposition method
and never issues interventions. An LLM may rephrase the structure later; it must not
add conclusions.
