# Appendix D — Blueprint Traceability Matrix (Artifact D)

Reference: *Master Blueprint & Kanvas Arsitektur Lengkap PAVEMENT-PINN (Versi Final Terbaru)*, 25 pages, chapters BAB 1–10 (read from the PDF text layer). Implementation: commit `4a9b4fc` plus working tree, 2026-10-14. Status vocabulary: [VERIFIED] implemented and demonstrated; [PARTIALLY VERIFIED] partly implemented or demonstrated; [NOT IMPLEMENTED]; [NOT VERIFIED]; [BLOCKED]; [DIVERGENT] implemented differently from the blueprint by a recorded or apparent design decision; [N/A] narrative content with no software obligation. A planned capability, a UI depiction or a formula that produces a number is not counted as implemented.

<!-- landscape-start -->

Table D.1 — Requirement-by-requirement traceability

| Req. ID | Blueprint ref. | Expected behaviour | Implementation location | Evidence | Status | Gap |
|---|---|---|---|---|---|---|
| BP-1.1 | BAB 1.1 | National road-condition, budget and ODOL statistics | — (narrative) | Figures not re-verified by the audit; some reappear as constants in policy views | [N/A] | Cite sources wherever figures are shown in the UI (F-22) |
| BP-1.2a | BAB 1.2 Fase 1 | Pilot corridor Jalan Raya Narogong, Bekasi–Bogor | `src/data/reference/karawangPilot.ts` (Karawang KRW-001..004); `screening.ts:40` | No "Narogong" in `src/`; Narogong-area report → OUT_OF_SCOPE (edge test) | [DIVERGENT] | Governing document undecided (F-15) |
| BP-1.2b | BAB 1.2 Fase 2 | Regional expansion (Klari–Simpang Jomin, Kaligawe) and toll WIM | Karawang data used as the pilot | Code comment cites spec v2.2 §6 | [DIVERGENT] | Phase order inverted relative to blueprint |
| BP-1.3 | BAB 1.3 | SDG 9, 11, 12, 13, 17 alignment | — | Narrative | [N/A] | — |
| BP-2.1 | BAB 2.1 | FWD data as Data Loss; FEM-equivalent solutions in < 10 ms | — | No FWD data, no FEM, no model | [NOT IMPLEMENTED] | F-01, F-14, F-16 |
| BP-2.2-N1 | Novelty 1 | Predictive-preventive paradigm via continuous physics simulation | `pinnEngine.ts`; `assessment.ts` | Formula engine, not continuous simulation | [PARTIALLY VERIFIED] | F-03, F-07 |
| BP-2.2-N2 | Novelty 2 | Data Loss + Physics Loss PINN | — | No training code | [NOT IMPLEMENTED] | F-01 |
| BP-2.2-N3 | Novelty 3 | εt, εv and pore-water pressure computed instantly | `pinnEngine.ts:58-69` | εt, εv by fitted formulas (1-2 orders below elastic reference); no pore pressure | [PARTIALLY VERIFIED] | F-03, F-10 |
| BP-2.2-N4 | Novelty 4 | Virtual WIM + anti-spoofing CV | `evidence.ts` (illustrative spectrum) | No traffic API, no regression, no anti-spoofing | [NOT IMPLEMENTED] | F-17, F-25 |
| BP-2.2-N5 | Novelty 5 | Material recommender + quality audit | `pinnEngine.ts:115-125` | PCI look-up; no audit logic | [NOT IMPLEMENTED] | F-18, F-26 |
| BP-2.2-N6 | Novelty 6 | One inference → three role outputs | `pinnEngine.ts` `roleOutputs` | One function returns three role blocks | [VERIFIED] (software) | Outputs inherit F-03/F-07 |
| BP-2.2-N7 | Novelty 7 | RBAC as information translation layer | `domain/workflow`, `features/rbac`, `routeAccess.ts` | RBAC tests pass (226/226 suite) | [VERIFIED] (demo identity) | Real IdP [BLOCKED] |
| BP-2.2-N8 | Novelty 8 | Heterogeneous CPU + Arc iGPU + NPU execution | — | Simulated telemetry only | [NOT IMPLEMENTED] | F-02, F-14 |
| BP-2.2-N9 | Novelty 9 | NNCF INT8/FP16 quantisation preserving PDE precision | — | No model, no NNCF | [NOT IMPLEMENTED] | F-14 |
| BP-2.2-N10 | Novelty 10 | On-device SLM (Phi-3/Llama-3.2) on NPU, no third-party data flow | `narrativeService.ts:9` (cloud Gemini) + template fallback | Cloud API, not on-device | [DIVERGENT] | F-15 |
| BP-3.F1a | BAB 3 Fase 1 | YOLOv8 trained on GRDDC + Indonesian data | — (`docs/AI.md` audits an external Kaggle notebook, single class, no weights) | No weights in repository | [NOT IMPLEMENTED] | F-05, F-16 |
| BP-3.F1b | BAB 3 Fase 1 | PINN trained with FWD/FEM data loss + Burmister physics loss | — | — | [NOT IMPLEMENTED] | F-01 |
| BP-3.F1c | BAB 3 Fase 1 | PyTorch → ONNX → OpenVINO IR → INT8/FP16 (NNCF) | `openvinoExportService.ts` (hand-written XML) | Illustrative artifacts only | [NOT IMPLEMENTED] | F-13, F-14 |
| BP-3.F1d | BAB 3 Fase 1 | Auto-fill baseline (SNI Bina Marga) per segment in Supabase | `evidence.ts:165-181` `pavementBaseline`; `pavement_baselines` table | Synthetic baseline in code; DB not connected | [PARTIALLY VERIFIED] | F-24; SNI source not cited |
| BP-3.F2a | BAB 3 Fase 2 | Zero-install PWA, WebRTC camera, Geolocation < 15 s, no registration | `ReportRoadIssueCard.tsx`, `ModernAppLayout.tsx` (getUserMedia/geolocation); anonymous session | Anonymous reporting tested; camera/GPS not exercised on a device; no PWA manifest/QR verified | [PARTIALLY VERIFIED] | Device test; PWA manifest |
| BP-3.F2b | BAB 3 Fase 2 | Automatic weather pull (BMKG/OpenWeather) by report GPS | `evidence.ts:128-153` | Deterministic DEMO provider | [NOT IMPLEMENTED] | F-25 |
| BP-3.F2c | BAB 3 Fase 2 | Virtual WIM from traffic API speeds + regression to axle load/ESAL | `evidence.ts:60-110`, `esal.ts` | ESAL arithmetic correct; inputs illustrative; no speed-based inference | [PARTIALLY VERIFIED] | F-25; speed ≠ weight (blueprint assumption unvalidated) |
| BP-3.F3a | BAB 3 Fase 3 | Anti-spoofing auto-reject | — | Format/size checks only | [NOT IMPLEMENTED] | F-17 |
| BP-3.F3b | BAB 3 Fase 3 | Damage class + severity + confidence (Bina Marga classes) | `cvDamageClasses.ts` | Keyword match, constant confidence | [NOT IMPLEMENTED] | F-05 |
| BP-3.F3c | BAB 3 Fase 3 | Visual label → E₁ penalty (e.g. 40-60 %) | `assessment.ts:238-257` refuses mapping | Deliberately not implemented (calibration required) | [NOT IMPLEMENTED] | Correct pending calibration data |
| BP-3.F3d | BAB 3 Fase 3 | Rain → pore pressure, E₁ penalty 20-30 %, CBR 6 → 2.5 % | `pinnEngine.ts:37-43` | Linear CBR decay, no pore pressure, no bitumen penalty | [PARTIALLY VERIFIED] | F-10 |
| BP-3.F4a | BAB 3 Fase 4 | εt (bottom AC), εv (top subgrade) from PINN on OpenVINO | `pinnEngine.ts:58-69` | Formula outputs; no OpenVINO | [PARTIALLY VERIFIED] | F-03, F-14 |
| BP-3.F4b | BAB 3 Fase 4 | RUL / pothole horizon in days | `pinnEngine.ts:103-112` | Heuristic; non-finite at zero load | [PARTIALLY VERIFIED] | F-07 |
| BP-3.F4c | BAB 3 Fase 4 | PCI projection 0-100 | `pinnEngine.ts:92-100,173-186` | Heuristic | [PARTIALLY VERIFIED] | F-07 |
| BP-3.F4d | BAB 3 Fase 4 | Inference < 10 ms | `simulatedBenchmark.ts` | Not measured | [NOT VERIFIED] | F-14 |
| BP-3.F5 | BAB 3 Fase 5 | Rule engine + local SLM → role recommendations | `pinnEngine.ts` rules; `explain.ts`; `narrativeService.ts` | Rule engine present; SLM absent | [PARTIALLY VERIFIED] | F-15 |
| BP-4.1 | BAB 4.1 | Material catalogue (AC-WC, AC-BC, AC-Base, PMA, SMA, HRS) with E ranges | `TechnicalReferenceView.tsx` (static text) | Not used by any computation | [PARTIALLY VERIFIED] | Engine has one asphalt layer only |
| BP-4.2 | BAB 4.2 | Ageing curve from last installation year | — | No installation-year input | [NOT IMPLEMENTED] | F-26 |
| BP-4.3 | BAB 4.3 | AC-WC vs PMA cross-simulation; overlay ≥ 8.5 cm directive | `pinnEngine.ts:115-125` | Not implemented; "8.5 cm" appears as a UI constant | [NOT IMPLEMENTED] | F-18 |
| BP-4.4 | BAB 4.4 | Sub-standard material anomaly alert (no "korupsi" wording) | — | No logic; wording rule respected in code searched | [NOT IMPLEMENTED] | F-26 |
| BP-5.1a | BAB 5.1 | Inputs: coordinates, thickness, modulus, CBR, axle load, precipitation | `types/simulation.ts:6-19` | No spatial coordinates input; scalars only | [PARTIALLY VERIFIED] | F-09 |
| BP-5.1b | BAB 5.1 | Four-term loss; Burmister PDE residual at collocation points | — | — | [NOT IMPLEMENTED] | F-01 |
| BP-5.1c | BAB 5.1 | Adaptive weighting, Adam + L-BFGS | — | Only text "Konvergensi Adam Optimizer epoch 1500" (constant) | [NOT IMPLEMENTED] | F-02 |
| BP-5.2 | BAB 5.2 | OpenVINO multi-device; YOLO on CPU/iGPU, PINN on iGPU/CPU, SLM on NPU | `deviceDetector.ts`, `simulatedBenchmark.ts` | Simulated; false NPU inference | [NOT IMPLEMENTED] | F-12, F-14 |
| BP-6.0 | BAB 6 | Citizen (no login) + Field Engineer + Operations Manager + Policy Maker | `PUBLIC_REPORTER/VIEWER`, `FIELD_ENGINEER`, `OPERATIONS_MANAGER`, `POLICY_MAKER` | RBAC tests; server enforcement | [VERIFIED] (demo identity) | Supabase Auth [BLOCKED] |
| BP-6.1 | BAB 6 role 1 | Engineer one-click approve + SPK | Engineer recommends; Operations Manager approves; internal work order "bukan SPK" | Separation-of-duty tests | [DIVERGENT] | Deliberate (safer) — record against blueprint |
| BP-6.2 | BAB 6 role 2 | Alert widget, dynamic tonnage, Mobile WIM deployment | `pinnEngine.ts:135-170`; WIM views (SIMULASI) | Heuristic thresholds; simulated plates | [PARTIALLY VERIFIED] | F-06; enforcement wording |
| BP-6.3 | BAB 6 role 3 | 5-year PCI chart, APBN savings, anomaly alert, official PDF | Policy views (ILUSTRATIF); `pdfGenerator.ts` | Illustrative figures; PDF without disclaimer | [PARTIALLY VERIFIED] | F-19, F-22 |
| BP-7.1 | BAB 7.1 | Dark mode, glassmorphism, semantic colours | `src/styles`, components | Visual only; not audited in depth | [NOT VERIFIED] | — |
| BP-7.2a | BAB 7.2 | Isometric 3D map (pitch 45-60°) of the corridor | `MapLibreMap.tsx`, `LeafletMap.tsx` | No pitch setting found | [NOT IMPLEMENTED] | F-15 |
| BP-7.2b | BAB 7.2 | Pulsing pin on new report via Supabase Realtime | Map markers; no realtime channel | No EventSource/WebSocket/realtime code | [PARTIALLY VERIFIED] | F-24 |
| BP-7.2c | BAB 7.2 | Smart pop-up with YOLO evidence, live context, Intel telemetry badge | Report sheets, map popups | Constants / simulated values | [PARTIALLY VERIFIED] | F-02, F-05 |
| BP-7.2d | BAB 7.2 | Holographic 3D cross-section (Three.js), stress wave, pore-pressure particles | `SimulationPanel.tsx:460-517` (2D divs) | No Three.js dependency | [NOT IMPLEMENTED] | F-15, F-29 |
| BP-7.2e | BAB 7.2 | GenAI narrative box per role | `narrativeService.ts`; `explain.ts` | Cloud LLM or template; deterministic explanation on new surfaces | [PARTIALLY VERIFIED] | F-15 |
| BP-7.2f | BAB 7.2 | Route navigation buttons | "Lihat di peta" only (G-SW-07) | — | [NOT IMPLEMENTED] | — |
| BP-7.2g | BAB 7.2 | Approve & send SPK in real time | Workflow transitions persisted | Golden path test | [PARTIALLY VERIFIED] | Real-time push absent; SPK replaced by internal order |
| BP-7.2h | BAB 7.2 | Export PDF / JSON | `pdfGenerator.ts` (jsPDF) | Generates PDF | [PARTIALLY VERIFIED] | F-19 |
| BP-7.2i | BAB 7.2 | What-If sliders auto-filled; real-time update of cross-section, strains, RUL | `whatIf.ts`, `SimulationPanel.tsx`, road detail | Implemented over the rule engine; persisted | [PARTIALLY VERIFIED] | Outputs inherit F-03/F-07 |
| BP-8.1 | BAB 8.1 | Next.js 14/15, Tailwind, Framer Motion, react-leaflet/mapbox, three/r3f, Supabase, FastAPI + PyTorch + Ultralytics + OpenVINO | Vite 6 + React 19 + Express + Tailwind 4 + motion + Leaflet/MapLibre; no three, no Python | `package.json` | [DIVERGENT] | F-15 |
| BP-8.2a | BAB 8.2 | `road_segments` with asphalt type, thickness, modulus, CBR, WIM load, rainfall, PCI | `road_segments` + `pavement_baselines` + observation tables (migration, not applied) | Schema normalised differently | [DIVERGENT] | F-24 |
| BP-8.2b | BAB 8.2 | `damage_reports` incl. `is_spoofed`, strains, RUL, pore pressure, sub-standard flag, role recommendations | `report_cases`, `damage_detections`, `pinn_predictions` (jsonb outputs) | No `is_spoofed`, no pore pressure, no sub-standard flag | [DIVERGENT] | F-17, F-24, F-26 |
| BP-8.2c | BAB 8.2 | `what_if_simulations` incl. `inference_latency_ms` | `simulations` table; file store records | Persisted (test); no latency field | [PARTIALLY VERIFIED] | Latency must not be stored until measured |
| BP-9 | BAB 9 | Integrated flow Citizen → AI pipeline → OpenVINO → GenAI → RBAC dashboards | Workflow + rule engine + dashboards | Workflow verified; AI stages absent | [PARTIALLY VERIFIED] | Figure 2.2 |
| BP-10.1a | BAB 10.1 | RMSE, MAE, MAPE, R² > 0.90 vs FWD/FEM; mAP for YOLO | — | No evaluation code or data | [NOT IMPLEMENTED] | F-16, F-27 |
| BP-10.1b | BAB 10.1 | Latency < 10 ms, throughput, power on CPU/iGPU/NPU | — | — | [NOT IMPLEMENTED] | F-14 |
| BP-10.1c | BAB 10.1 | PCI prediction error, overlay accuracy, alert TP > 95 %, SUS > 80 | — | — | [NOT IMPLEMENTED] | Requires field data and user study |
| BP-10.2 | BAB 10.2 | Roadmap 2026-2030 | — | Narrative | [N/A] | — |
| BP-10.3a | BAB 10.3 | Mitigation: virtual WIM + synthetic baseline + physics loss accurate with little data | Synthetic baseline only | "Accurate with little data" untestable without a PINN | [NOT VERIFIED] | F-01 |
| BP-10.3b | BAB 10.3 | Mitigation: anti-spoofing at the edge | — | — | [NOT IMPLEMENTED] | F-17 |
| BP-10.3c | BAB 10.3 | Mitigation: 100 % offline inference | Offline static-host mode for the UI | No offline model inference exists | [NOT VERIFIED] | F-14 |
| BP-10.3d | BAB 10.3 | Mitigation: slider ranges locked to physical values | `assessment.ts` ranges; `intelligence.routes.ts` 422 | Implemented on new API; legacy `/api/simulate` unvalidated | [PARTIALLY VERIFIED] | F-11 |
| BP-10.3e | BAB 10.3 | Mitigation: neutral "anomaly" wording | Wording respected where searched | Sub-standard alert itself absent | [PARTIALLY VERIFIED] | F-26 |

<!-- landscape-end -->

Table D.2 — Traceability totals (67 rows, counted from Table D.1)

| Status | Count |
|---|---|
| [VERIFIED] (software, demo identity) | 3 |
| [PARTIALLY VERIFIED] | 24 |
| [DIVERGENT] | 7 |
| [NOT IMPLEMENTED] | 26 |
| [NOT VERIFIED] | 4 |
| [N/A] | 3 |
