# Appendix A — Findings Register (Artifact B)

Document PAVEMENT-PINN-AUDIT-001 · Version 1.0 · Audit date 2026-10-14 · Commit `4a9b4fc` (branch `feature/m1-report-ownership`, working tree with uncommitted demo-authentication changes from another session; see Document Control).

Severity: [P0] critical, [P1] high, [P2] medium, [P3] low. Evidence classes: [VERIFIED], [PARTIALLY VERIFIED], [NOT IMPLEMENTED], [NOT VERIFIED], [FAILED], [BLOCKED]. Line numbers refer to the working tree at the audit date. "Reference solver" means the audit's independent multilayer linear-elastic solver (`evidence/mlet.mjs`), itself verified only against closed-form limits (Appendix B).

## A.1 Summary register

<!-- landscape-start -->

Table A.1 — Findings register summary (31 findings: 5 P0, 15 P1, 8 P2, 3 P3)

| ID | Sev. | Title | Component | Evidence | Acceptance criterion (abridged) |
|---|---|---|---|---|---|
| F-01 | [P0] | Deterministic closed-form engine presented as a trained PINN | `src/engines/pinn/core/pinnEngine.ts`; UI titles; README | [VERIFIED] | Every user-facing "PINN"/"neural" claim either backed by a trained model artifact or replaced by "rule-based formula engine" |
| F-02 | [P0] | Fabricated model and runtime telemetry (losses, latency, power, NPU use) | `pinnEngine.ts:203-240`; `FieldEngineerTools.tsx:563-583`; `Navbar.tsx:225-229`; `PavementPinnDashboard.tsx:186-189`; `pdfGenerator.ts:90` | [VERIFIED] | No numeric loss, latency, power or utilisation shown unless measured; random generators removed from result payloads |
| F-03 | [P0] | Engine strains one to two orders of magnitude below layered-elastic theory; "safe" verdicts unsupported | `pinnEngine.ts:58-76,127-132` | [VERIFIED] | Engine within an agreed tolerance (e.g. ±15 %) of a verified multilayer reference over the stated input domain, or engine withdrawn from engineering verdicts |
| F-04 | [P0] | Simulated "Bina Marga WIM scraping + PINN training" with synthetic epoch-loss curve | `BinaMargaWimPipelineModal.tsx`; `binaMargaWimScraper.ts:70-155` | [VERIFIED] | Modal removed, or relabelled as a mock-up inside the modal itself, with no epochs, losses or official-source wording |
| F-05 | [P0] | "YOLOv8 Edge AI" damage class and confidence are keyword matches and constants | `cvDamageClasses.ts:24-244`; `ReportRoadIssueCard.tsx:1051-1093` | [VERIFIED] | No model name or confidence shown to citizens unless produced by a versioned model run |
| F-06 | [P1] | Strain limits 180/200/250/350 µε untraceable, mutually inconsistent, and partly hard-coded as "exceeded" | `pinnEngine.ts:128-132`; `FieldEngineerTools.tsx:193-209,397`; `pdfGenerator.ts:111` | [VERIFIED] | One cited criterion per quantity, tied to load repetitions, used consistently in engine, UI and PDF |
| F-07 | [P1] | RUL, pothole horizon and PCI projection are heuristics decoupled from structural response and mutually inconsistent | `pinnEngine.ts:90-112,173-186` | [VERIFIED] | Single documented deterioration model; thickness, modulus and CBR affect life; one time-to-failure definition |
| F-08 | [P1] | Two different fourth-power reference axles (10 t vs 8.16 t) in one application | `pinnEngine.ts:54`; `esal.ts:12` | [VERIFIED] | One standard axle used throughout, with cited source |
| F-09 | [P1] | Load model lacks contact pressure, radius, wheel configuration and Poisson ratios; dimensionally inhomogeneous fits | `pinnEngine.ts:56-80`; `types/simulation.ts` | [VERIFIED] | Load defined as wheel load + contact pressure (or radius) + configuration; all inputs with units; dimension check documented |
| F-10 | [P1] | Moisture, temperature and subgrade relations are undocumented linear heuristics; no pore-water pressure anywhere | `pinnEngine.ts:35-50` | [VERIFIED] | Each relation cited or calibrated, with stated validity range and uncertainty |
| F-11 | [P1] | Legacy `/api/simulate` accepts any input; returns non-finite, negative or coerced results | `simulationController.ts`; `pinnEngine.ts` | [VERIFIED] (function level) | Schema validation with ranges; 400/422 for invalid input; no non-finite value in any response |
| F-12 | [P1] | Hardware detector defaults to "Intel Core Ultra with NPU" and infers an NPU from core count | `deviceDetector.ts:14-15,46` | [VERIFIED] | Unknown hardware reported as unknown; NPU only from a positive device query |
| F-13 | [P1] | "OpenVINO IR export" is a hand-written XML with a custom op and no weights | `openvinoExportService.ts:15-42,53` | [VERIFIED] | Endpoint removed or relabelled as a template; real IR only from a converted trained model |
| F-14 | [P1] | No OpenVINO runtime, model, quantisation or benchmark; "< 10 ms" and "8.4 ms" unsupported | repository-wide; `simulatedBenchmark.ts` | [NOT IMPLEMENTED] | Measured latency distribution and accuracy deltas on named hardware, reproducible script |
| F-15 | [P1] | Blueprint vs implementation source-of-truth conflict (pilot corridor, stack, 3D twin, on-device SLM) | `karawangPilot.ts`; `screening.ts:40,83`; `package.json`; `narrativeService.ts:9` | [VERIFIED] | Written decision on which document governs; blueprint or code updated so they agree |
| F-16 | [P1] | No empirical dataset in the repository; contradictory provenance badges ("FWD Validated", WIM stations) | `indonesianRoads.ts`; `LeafletMap.tsx:757,988`; `karawangPilot.ts` | [VERIFIED] | Data inventory with source, licence, status per dataset; badges removed where no data exists |
| F-17 | [P1] | Anti-spoofing (photo authenticity) not implemented | repository-wide | [NOT IMPLEMENTED] | Implemented check with measured false-accept/false-reject rates on a held-out set |
| F-18 | [P1] | Overlay thickness and material type are PCI look-ups, not structural designs | `pinnEngine.ts:115-125` | [VERIFIED] | Recommendation derived from a design method with traffic, structure and material constraints, labelled advisory |
| F-19 | [P1] | Exported "official" PDF carries simulated telemetry and heuristic verdicts without a disclaimer | `pdfGenerator.ts:78-163` | [VERIFIED] | PDF states engine status, data status and "not for construction" on every page |
| F-20 | [P1] | Random "PINN contribution" percentages attributed to damage causes | `CommunityReportsDashboard.tsx:259-261`; `LeafletMap.tsx:360-361` | [VERIFIED] | No attribution percentage without a decomposition method; random calls removed |
| F-21 | [P2] | Non-deterministic result payloads (same input, different output) | `pinnEngine.ts:217,238-239,284` | [VERIFIED] | Identical inputs give identical outputs (except explicit ids/timestamps) |
| F-22 | [P2] | Economic loss, savings, Zero-ODOL impact and life-extension figures are invented constants | `pinnEngine.ts:188-201`; policy views | [VERIFIED] | Each figure tied to a cost model and data source, or removed |
| F-23 | [P2] | Simulation/illustration labels missing on several pages and the classic layout | pages listed in A.2 | [VERIFIED] | Every page showing engine, CV or telemetry output carries an adjacent status label |
| F-24 | [P2] | Shared persistence not connected; schema diverges from blueprint | `supabase/migrations/…sql`; `fileCaseStore.ts` | [BLOCKED] | Migration applied to a project; integration tests against it; schema decision recorded |
| F-25 | [P2] | Weather and traffic inputs are deterministic demo providers | `evidence.ts:56-153` | [VERIFIED] | Live provider with provenance, or demo label retained everywhere it appears |
| F-26 | [P2] | Ageing curve, sub-standard material alert and AC-WC/PMA cross-simulation not implemented | repository-wide | [NOT IMPLEMENTED] | Implemented with documented logic; alert framed as investigation trigger |
| F-27 | [P2] | Test suite has no independent-reference, empirical, CV or browser E2E tests | `tests/` | [VERIFIED] | Reference-comparison test in CI; E2E golden path automated |
| F-28 | [P2] | `assessSegment` clamps out-of-range inputs and reports outputs for the clamped inputs | `assessment.ts:120-141` | [VERIFIED] | Out-of-range request refused, or outputs explicitly tagged as computed for the clamped values |
| F-29 | [P3] | 2D cross-section shows a base layer (15 cm, 300 MPa) that the engine never uses; total thickness label inconsistent | `SimulationPanel.tsx:468,495` | [VERIFIED] | Drawing reflects engine inputs exactly |
| F-30 | [P3] | Stale or contradictory documentation and labels | `README.md:1,262`; `SimulationPanel.tsx:704`; `package.json` | [VERIFIED] | README test count, title and model names match the code |
| F-31 | [P3] | Export filename built from an unsanitised query parameter | `openvinoController.ts` | [NOT VERIFIED] | Parameter whitelisted to known devices/precisions |

<!-- landscape-end -->

## A.2 Detailed findings

### F-01 — Deterministic closed-form engine presented as a trained PINN

| Field | Content |
|---|---|
| Severity / class | [P0] · [VERIFIED] |
| Affected | `src/engines/pinn/core/pinnEngine.ts` (`runPinnSimulation`, 296 lines; doc comment l.14-18 "Runs the Physics-Informed Neural Network (PINN) simulation"); `src/pages/engine/SimulationPage.tsx:23`; `src/app/layouts/Navbar.tsx:91`; `src/components/simulation-viewer/SimulationPanel.tsx:154,164,452,516`; `README.md:1` |
| Blueprint requirement | BAB 3 Fase 1 and BAB 5.1: neural network trained with $\mathcal{L}_{total}$ (data, physics, boundary, initial-condition loss), Adam + L-BFGS |
| Observed | One pure function of 9 scalars. No network definition, no weights, no optimiser, no automatic differentiation, no residual, no dataset, no checkpoint. `package.json` has no ML dependency; no Python in the repository. The newer domain layer labels it honestly (`assessment.ts:17` "deterministic, no trained weights"; `pages/engine/PinnPage.tsx:35-37` "PLANNED"), but legacy screens still present it as a PINN/OpenVINO solver. |
| Explanation | A PINN is a parameterised function $u_\theta$ trained so that a PDE residual evaluated by differentiation of $u_\theta$ is small. None of these elements exists; the outputs are power-law expressions with literal coefficients (EQ-4 to EQ-6). |
| Impact | Competition and stakeholder claims of a "PINN" would be factually false for the current build. |
| Corrective action | Rename the engine in all user-facing text ("formula-based screening engine"), keep the PINN as roadmap; or build and train a real model (Chapter 13, R-P3-03). |
| Acceptance criteria | (1) grep of `src/` and README for "Physics-Informed Neural Network", "PINN Solver", "neural" returns only roadmap or labelled-status text; or (2) a versioned model artifact, training script, data split and held-out metrics exist and the UI loads that model. |
| Dependencies | Product decision (F-15). |
| Verification | Code inspection; `npm test` suite `pinn-mathematical-audit.test.ts` (code equals closed-form formulas). |

### F-02 — Fabricated model and runtime telemetry

| Field | Content |
|---|---|
| Severity / class | [P0] · [VERIFIED] |
| Affected | `pinnEngine.ts:204-239` (latency = per-device constant × precision factor + `Math.random()*0.8-0.4`; power, CPU/NPU utilisation constants; `physicsLossValue = 0.0018 + Math.random()*0.0006`; `dataLossValue = 0.0011 + Math.random()*0.0004`). Displays: `FieldEngineerTools.tsx:563-583` ("Loss Fisika PDE (Burmister)", "Konvergensi Adam Optimizer epoch 1500.", "Kesesuaian dengan sensor regangan WIM & FWD"); `Navbar.tsx:225-229`; `PavementPinnDashboard.tsx:186-189` (hard-coded "Intel NPU • 8.4 ms", comment "From PDF"); `OperationsHomeView.tsx:615`, `OperationsManagerAppView.tsx:480-484` ("6.2 ms"); `OpenVINOModelDiagnosticsModal.tsx:257-277` ("Hasil Benchmark 50-Pass Inference Pada Perangkat Ini", "Akurasi Quantization NNCF" 99.4 %); `runtime/openvino/simulatedBenchmark.ts:29-76`; `pdfGenerator.ts:78,90` |
| Blueprint requirement | BAB 5.2, BAB 7.2 telemetry badge "Intel OpenVINO INT8 · NPU + iGPU · Latency 8.4 ms" — described in the blueprint as a benchmark result of a model that does not exist yet |
| Observed | Loss values and latencies change between identical calls (edge test: 34.1 vs 34.2 ms; physics loss 0.00185 vs 0.00227). The diagnostics modal reports a "benchmark on this device" computed from a lookup table blended with a JavaScript `tanh` loop. |
| Explanation | These are not measurements of any model or device. A loss value implies a training or residual evaluation; none occurs. |
| Impact | Directly misrepresents AI behaviour and Intel hardware performance — the two claims most visible to competition judges. |
| Corrective action | Remove random generators from result payloads; show "not measured" until real measurements exist; label the diagnostics modal as a mock-up inside the modal. |
| Acceptance criteria | No `Math.random` in any engine or telemetry path (`grep -rn "Math.random" src server` returns none in these files); every latency/loss figure in the UI traces to a stored measurement record with device, runtime version and date. |
| Dependencies | F-14 for real measurements. |
| Verification | Code inspection; `evidence/edge.mjs` (non-determinism); subagent UI sweep spot-checked at the cited lines. |

### F-03 — Strain responses inconsistent with layered-elastic theory; unsafe "STABIL" verdicts

| Field | Content |
|---|---|
| Severity / class | [P0] · [VERIFIED] (against the audit reference solver; the solver itself is verified against Boussinesq and Burmister two-layer chart values only) |
| Affected | `pinnEngine.ts:58-76` (EQ-4 to EQ-6), `pinnEngine.ts:127-132` (engineering notes "STABIL … dalam batas elastis aman") |
| Blueprint requirement | BAB 5.1: responses governed by Burmister multilayer elastic theory |
| Observed | Over 144 in-range dry cases (P 10-25 t, h 5-25 cm, E₁ 1200-3500 MPa, CBR 3-10), engine/reference ratios: εt median 0.047 (two-layer) and 0.067 (three-layer with 15 cm base), maximum 0.79; εv median 0.019 and 0.025, maximum 0.063. Blueprint default segment (AC 10 cm, 2500 MPa, CBR 6) at 10 t: engine εt = 20 µε, εv = 17 µε; reference 303-435 µε and 793-1174 µε. Elastic similarity fails (engine exponents −0.4/−0.75/−0.6 instead of −1); local sensitivities differ in sign pattern (engine εt independent of CBR, εv independent of E₁). |
| Explanation | Any linear-elastic layered solution scales as $1/k$ when every modulus is multiplied by $k$ (EQ-14) and couples all layers. The engine's independent power laws cannot satisfy either condition. Under any plausible single-axle loading, the responses are far below elastic predictions, so the engine labels typical structures as safe. |
| Impact | Engineering verdicts and every downstream quantity that uses the strains are not physically meaningful; a "safe" message can be produced for a structure that elastic theory places well above common fatigue limits. |
| Corrective action | Replace the response formulas with a verified multilayer elastic computation (or a surrogate trained on one), with full layer inputs; until then remove verdict language. |
| Acceptance criteria | Automated comparison test: engine vs verified reference on a documented grid, relative error ≤ 15 % (or a tolerance agreed and justified by the team) for εt, εv and w₀; elastic-similarity test passes with exponent −1 ± 0.01. |
| Dependencies | F-09 (load definition), F-16 (structure data). |
| Verification | `evidence/compare.mjs`, `evidence/evidence-run.log`; Appendix B.4. |

### F-04 — Simulated WIM scraping and "PINN training"

| Field | Content |
|---|---|
| Severity / class | [P0] · [VERIFIED] |
| Affected | `src/features/wim/BinaMargaWimPipelineModal.tsx` (buttons l.155-159 "Jalankan Scraper & PINN Training"; l.245 "…untuk melatih Physics-Informed Neural Network (PINN)"; l.313-331 "Progres Minimisasi Loss Jaringan (100 Epochs)"); `src/services/wim/binaMargaWimScraper.ts:70-115` (28 records from `Math.random`), `:121-155` (losses are fixed multiples of a mean, epoch history = total loss × 4.2/2.8/1.9/1.3/1.0) |
| Blueprint requirement | BAB 3 Fase 1-2 (training, WIM data) |
| Observed | No HTTP request is made to `binamarga.pu.go.id`; no training occurs; the "loss curve" is a fixed geometric pattern. The modal offers a download named `BinaMarga_WIM_PINN_Training_Dataset.json` (l.81). Status label exists only on `PinnPage.tsx:45-47,114`, not inside the modal or on the Navbar entry. |
| Impact | Presents fabricated official data and a fabricated training run. Also implies scraping of a government portal, which the blueprint itself does not specify. |
| Corrective action | Remove, or replace with a clearly labelled design mock-up without numbers. |
| Acceptance criteria | Modal contains no epoch counts, losses, record counts or official-source wording unless backed by a real run log. |
| Verification | Code inspection (spot-checked lines 121-155 and 238-246). |

### F-05 — CV classification is a keyword match with constant confidence

| Field | Content |
|---|---|
| Severity / class | [P0] · [VERIFIED] |
| Affected | `src/engines/computer-vision/classification/cvDamageClasses.ts:216-244` (`analyzeImageDamageClass`: substring tests on the image URL/filename such as `'alligator'`, `'retak'`, Unsplash photo ids; default `pothole`), constants `defaultConfidence` 87-95 (l.38-200); display `ReportRoadIssueCard.tsx:1051,1068,1093` ("Model Engine: YOLOv8 Edge AI", "Confidence: 94%") |
| Blueprint requirement | BAB 3 Fase 3 (YOLOv8 classification with confidence and severity) |
| Observed | For an uploaded camera photo (a `data:` URL) the function matches substrings against base64 text — almost always the default "Pothole, 94 %". Mitigation that works: the server-side screening treats the classifier as `DEMO` and always routes to human review (`screening.ts:27-34,88-97`; test "the DEMO classifier always routes to human review" passes). |
| Impact | Citizens see a model name and a confidence that no model produced. |
| Corrective action | Show "classification not available (demo)" until a versioned model runs server-side. |
| Acceptance criteria | Confidence shown only when `modelStatus = REAL` with `modelVersion`; mAP and per-class metrics on a held-out local set documented. |
| Dependencies | F-16 (dataset), F-17. |
| Verification | Code inspection; unit tests in `tests/unit/workflow.test.ts`. |

### F-06 — Strain thresholds untraceable and inconsistent

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:128-132` (KRITIS if εt > 250, text cites "batas ijin Bina Marga (200 µε)"; WASPADA if > 180); `FieldEngineerTools.tsx:193-209` (`BatasIjinAashto` 200 and 350, fallback values 245 and 380), `:397` (hard-coded "MELEBIHI AMBANG BATAS (+22.5%)"), legends "Batas Ijin AASHTO" (l.391) vs "Batas Ijin Bina Marga" (`FieldEngineerDashboard.tsx:199`) for the same field; `SimulationPanel.tsx:563-571`; `pdfGenerator.ts:111` ("AMBANG LELEH (>200 µε)") |
| Blueprint requirement | BAB 3 Fase 4, BAB 4.3 (failure prediction from εt, εv) |
| Observed | No document, clause, table or calibration is cited for any value. Engine output exceeds 200 µε in 3 of 144 grid points and never exceeds 350 µε; the reference solver exceeds them in 77-85 % and 88-93 % of the same points (Appendix B.5). The "+22.5 %" banner is displayed whatever the result. "Ambang leleh" (yield threshold) is not a concept of linear-elastic fatigue design. |
| Explanation | Mechanistic-empirical criteria relate an allowable strain to a number of load repetitions through a transfer function (EQ-16 form); a single fixed strain presupposes an unstated design traffic. |
| Impact | Exceedance messages are both unreachable (engine scale) and, where shown, partly hard-coded. |
| Corrective action | Choose one criterion per failure mode (fatigue: εt at bottom of asphalt; rutting: εv at top of subgrade), cite it, and evaluate it with design traffic. |
| Acceptance criteria | Threshold register (Appendix B.5) has a source for each value; one constant module used by engine, UI and PDF; test asserts consistency. |
| Verification | Code inspection; `compare.mjs` reachability counts. |

### F-07 — RUL, pothole horizon and PCI projection decoupled from structure and mutually inconsistent

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:90-112` (annual drop, predicted PCI, remaining years, pothole horizon), `:173-186` (5-year projection) |
| Observed | At 18 t (dry): predicted PCI 59, remaining life 1.9 years, pothole horizon 171 days, no-action PCI reaching the floor of 10 in 2028 — for every asphalt thickness 5-25 cm, modulus 1200-3500 MPa, CBR 3-10 and temperature (edge test). "Preventive" PCI in the first year is 5 points below "no action". Zero load gives remaining life and pothole horizon = ∞ (serialised as `null`). |
| Explanation | PCI (ASTM D6433 sense) is a distress-survey index; a projection needs an observed deterioration model. Here life depends only on load factor and rain, not on any structural response. |
| Impact | Life and horizon numbers presented to engineers and policy makers have no structural basis and contradict each other. |
| Corrective action | Define one deterioration model (e.g. damage accumulation from strain-based transfer functions with traffic growth, or a calibrated PCI curve), with time unit and horizon stated. |
| Acceptance criteria | Life metrics respond monotonically to structural inputs in documented directions; one definition of "failure"; finite outputs for all valid inputs; calibration evidence or explicit ILLUSTRATIVE label. |
| Verification | `evidence/edge.mjs` output. |

### F-08 — Inconsistent fourth-power reference axle

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:54` (`(axle/10)^4`, comment "legal single axle load = 10 Ton"); `src/domain/intelligence/esal.ts:12` (`STANDARD_AXLE_TON = 8.16`, 80 kN) |
| Observed | The same axle has load factors differing by $(10/8.16)^4 = 2.255$ between the two modules; UI text "mempercepat kerusakan N× lipat" uses the 10 t base. |
| Acceptance criteria | Single constant, cited; tests assert both modules agree. |

### F-09 — Load model and dimensional homogeneity

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:56-80`; `src/types/simulation.ts:6-19` |
| Observed | Load enters only as axle tonnes; no tyre pressure, contact radius, wheel/axle configuration, Poisson ratio, base or sub-base layer. `stressTopMpa = 0.65 × P/10` makes contact pressure proportional to axle load (physically, contact pressure ≈ tyre pressure and the contact area grows with load). Strains are linear in P (exponent 1) where the reference gives 0.56 (εt) and 0.64 (εv) at the blueprint point. Coefficients 120, 210, 45 carry hidden units (µε·cm^1.75/t etc.). |
| Acceptance criteria | Input contract lists wheel load (kN), contact pressure (kPa) or radius (mm), configuration, layer E (MPa), ν, h (mm); dimensional analysis note in the repository. |

### F-10 — Undocumented moisture, temperature and subgrade relations; no pore-water pressure

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:37-50` |
| Observed | CBR multiplied by $\max(0.4, 1 - 0.004 R - 0.015 t_f)$ with rain intensity R (mm/h) as a direct proxy for saturation; $E_s = 10\,\mathrm{CBR}$; asphalt modulus reduced 1.2 %/°C above 25 °C (floor 0.5). No pore-water-pressure quantity exists in code (blueprint BAB 3 Fase 3, BAB 8.2 `pore_water_pressure_kpa`). Blueprint's own mappings (modulus penalty 40-60 % for high-severity alligator cracking, CBR 6 → 2.5 % when saturated) are not implemented, and the newer translation layer deliberately refuses photo → modulus mapping (`assessment.ts:238-257`), which the audit regards as correct. |
| Explanation | Rain intensity is not soil moisture; saturation depends on drainage, duration, permeability and groundwater. Temperature effects on asphalt modulus are mix-specific and non-linear. |
| Acceptance criteria | Each relation documented with source or calibration data and validity range; outputs labelled INFERRED with uncertainty. |

### F-11 — Unvalidated legacy simulation endpoint

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] at function level; HTTP path [NOT VERIFIED] (the user's server on port 3000 was not called) |
| Affected | `server/controllers/simulationController.ts` (comment: "No input validation is performed"); `server/services/simulationService.ts` |
| Observed | Direct calls: zero load → remaining life ∞, pothole horizon ∞, Zero-ODOL −∞; negative load → negative strains (−10 µε) and a pothole horizon of 28 800 days; thickness 0 or modulus 0 → infinite strain; CBR ≤ 0 → infinite subgrade strain; `NaN` → `NaN` throughout; string `"12"` silently coerced. JSON serialises non-finite values as `null`. |
| Acceptance criteria | Validation mirroring the intelligence routes (`intelligence.routes.ts:95-110`); contract tests for each invalid class. |

### F-12 — Hardware detector asserts Intel NPU by default

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `src/runtime/intel-hardware/deviceDetector.ts:14-15` (defaults `'Intel Corporation'`, `'Intel® Core™ Ultra Processor with NPU & Intel® Graphics'` when WebGL renderer info is unavailable), `:46` (`hasNpuAccelerator` true for WebNN presence or any Intel renderer with ≥ 12 logical cores) |
| Acceptance criteria | Unknown hardware reported as unknown; NPU claimed only from an OpenVINO `available_devices` query on the host. |

### F-13 — Illustrative IR export

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] (content); loadability [BLOCKED] (no OpenVINO runtime available to attempt loading) |
| Affected | `server/services/openvinoExportService.ts:15-42` (hand-written `<net>` with `type="PhysicsPDEOp" version="custom"`, no `.bin`), `:53` (`openvino_version: "2024.5.0"`) |
| Observed | The file header comment states the artifacts are illustrative; the UI download does not. A MatMul layer without weights and an unknown custom op cannot form an executable OpenVINO model. |
| Acceptance criteria | Endpoint returns 404/“not available” until a converted model exists, or files are named and captioned as templates. |

### F-14 — OpenVINO deployment pipeline absent

| Field | Content |
|---|---|
| Severity / class | [P1] · [NOT IMPLEMENTED] / measurement [BLOCKED] |
| Observed | No PyTorch model, ONNX file, IR (.xml/.bin), NNCF config, OpenVINO runtime dependency, Python environment (`docs/GAP_REGISTER.md` G-PY-01; confirmed: `python` not installed on the audit machine) or benchmark script. Because the engine is a closed-form expression, the PyTorch→ONNX→IR path has no subject; a closed-form engine needs no accelerator (it evaluates in microseconds in JavaScript). |
| Acceptance criteria | Benchmark register (Appendix C.4) filled from a reproducible script: device, OpenVINO version, precision, batch, warm-up, ≥ 1000 timed runs, p50/p95/p99, cold start, peak memory, and max absolute/relative output deviation vs FP32. |

### F-15 — Blueprint vs implementation conflict

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Observed | (a) Pilot: blueprint BAB 1.2 names Jalan Raya Narogong (Bekasi–Bogor); the code implements Karawang Pantura Klari–Jatisari (`karawangPilot.ts`, from spec v2.2 per `docs/SOURCE_INVENTORY.md`). "Narogong" appears nowhere in `src/`; a report at approximately (−6.38, 107.00) is flagged `OUT_OF_SCOPE` (`screening.ts:40,83`; edge test). (b) Stack: blueprint Next.js + Supabase + FastAPI/PyTorch/OpenVINO; code Vite + React 19 + Express + JSON file store. (c) Blueprint 3D "Holographic Cross-Section" (Three.js) and isometric map (pitch 45-60°): no Three.js dependency, no map pitch setting; the cross-section is a 2D stack of `div`s. (d) Blueprint on-device SLM (Phi-3/Llama-3.2 INT4 on NPU, "tanpa membocorkan data … ke server pihak ketiga"): code calls a cloud model (`narrativeService.ts:9`, `gemini-3.7-flash`) with a template fallback. |
| Acceptance criteria | Recorded decision naming the governing document; traceability matrix (Appendix D) re-run with no unexplained DIVERGENT rows. |

### F-16 — No empirical data; contradictory provenance badges

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Observed | Repository contains no FWD basins, FEM solutions, CV images/weights, WIM records, cores or longitudinal PCI surveys. Segment attributes are hand-authored (`karawangPilot.ts` header: SYNTHETIC/ILLUSTRATIVE). The legacy dataset declares 13 "Stasiun WIM" records and `hasWimStation: true` (`indonesianRoads.ts:26,77,128…`) while the pilot declares no WIM; map popups show "FWD Validated" (`LeafletMap.tsx:757,988`). |
| Acceptance criteria | Data inventory (Appendix E) complete; no validation badge without a validation record. |

### F-17 — Anti-spoofing absent

| Field | Content |
|---|---|
| Severity / class | [P1] · [NOT IMPLEMENTED] |
| Observed | No code for screen-capture, blur, or non-road rejection. Photo checks are format/size only (`photoValidation.ts`, magic bytes, ≤ 5 MB). Human review is the only defence. |
| Acceptance criteria | Detector with documented false-accept/false-reject rates; rejected reports retained for audit, not silently discarded. |

### F-18 — Overlay and material recommendation are PCI look-ups

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `pinnEngine.ts:115-125` |
| Observed | Thickness $=\max(4, 0.22(75-\mathrm{PCI}))$ cm when predicted PCI < 70, independent of strain, structure, traffic and material (edge test: 8.1 cm for both 5 cm and 25 cm asphalt). Type string "AC-BC (Binder Course) + AC-WC (Wearing Course) Poly-Modified Asphalt" conflates three products. The blueprint's AC-WC vs PMA cross-simulation (BAB 4.3) is not implemented. |
| Acceptance criteria | Recommendation from a cited overlay design method, with inputs listed and "advisory, not a construction design" wording. |

### F-19 — Exported PDF without status disclaimer

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `src/services/reporting/pdfGenerator.ts:78-163` |
| Observed | "Official report" includes OpenVINO latency (l.90), threshold verdicts (l.111), savings and pothole horizon, and the footer "Dihasilkan secara otomatis oleh sistem kecerdasan buatan terpadu PUPR, Kemenhub, & Intel OpenVINO" (l.163), naming institutions that have not endorsed it. |
| Acceptance criteria | Every page carries engine status, data status and "not an official document"; institution names removed unless authorised. |

### F-20 — Random attribution percentages

| Field | Content |
|---|---|
| Severity / class | [P1] · [VERIFIED] |
| Affected | `CommunityReportsDashboard.tsx:259-261` (`estimatedPinnContributionPercent = 72 + Math.random()*20`; summary text "dipercepat hingga X%" uses a second, different random number); `LeafletMap.tsx:360-361` |
| Acceptance criteria | No contribution percentage without a decomposition method (`docs/AI.md` already states this rule for the new surfaces). |

### F-21 to F-31 — Medium and low findings

| ID | Sev. | Observation and evidence | Acceptance criterion |
|---|---|---|---|
| F-21 | [P2] | Telemetry jitter and `SIM-${Date.now()}` ids make the legacy result payload non-reproducible (edge test). The new assessment path is deterministic (hash id, `assessment.ts:67-74`). | Deterministic payload for identical inputs; test asserts equality. |
| F-22 | [P2] | Economic loss $=0.85 \cdot LF \cdot L/10$ (Rp bn), savings $=0.72\times$ loss, Zero-ODOL impact $= 1-1/LF$ (negative, e.g. −144 %, below 10 t), "+3.5 years" life extension (`pinnEngine.ts:188-201`); constant budgets in policy views; "Data PUPR 2025" badge on a constant table (`ExecutivePolicyDashboard.tsx:223`). Partially mitigated by the ILUSTRATIF notice on `/policy`. | Cost model with sources, or removal; no official-source badge on constants. |
| F-23 | [P2] | No status notice on `/engine/simulation`, `/engine/fwd`, `/engine/prediction`, `/engineering`, `/reports`, OperationsHome BERANDA/ALERTS branches, the classic layout and the global modals (subagent sweep; spot-checked). | Lint-style test that every page rendering engine/CV/telemetry output includes a status component. |
| F-24 | [P2] | Supabase migration (17 tables, RLS) written but not applied; server uses an atomic JSON file store (`fileCaseStore.ts:44-45`). Blueprint `damage_reports` columns (`tensile_strain_et`, `predicted_rul_days`, `pore_water_pressure_kpa`, `is_spoofed`, `substandard_material_flag`) are replaced by `report_cases` + `pinn_predictions` — a defensible normalisation, not recorded against the blueprint. [BLOCKED] (credentials). | Applied migration, integration tests against it, schema decision in DECISION_LOG. |
| F-25 | [P2] | Weather is a deterministic hash of the segment id (`evidence.ts:128-142`), labelled DEMO; traffic → load uses an illustrative axle spectrum and 3 axles/vehicle (`evidence.ts:60-69`); no BMKG/OpenWeather/TomTom/HERE integration; no "virtual WIM" regression. Labelling is honest on new surfaces. | Live adapters with provenance, or permanent DEMO labels. |
| F-26 | [P2] | No "installation year" input or ageing curve (BAB 4.2); no sub-standard material alert (BAB 4.4); no AC-WC/PMA cross-simulation (BAB 4.3). | Implemented with documented logic; alert framed as an investigation trigger, never as proof. |
| F-27 | [P2] | 226 tests pass; physics tests are regression/characterisation only; no independent-reference comparison, no CV model test, no browser E2E (G-SW-02). | Reference-comparison test (from `evidence/compare.mjs`) and a Playwright golden path in CI. |
| F-28 | [P2] | `assessSegment` clamps inputs (e.g. axle 0 → 10 t, h 0 → 5 cm) and reports strains for the clamped scenario while flagging `outOfRange` (edge test: 73 µε for a request of 0 t). | Refuse, or state "computed for clamped values" next to the numbers. |
| F-29 | [P3] | 2D cross-section draws a 15 cm, 300 MPa base the engine ignores and labels total thickness $h+25$ while drawing $h+15$ (`SimulationPanel.tsx:468,495`). | Drawing equals model inputs. |
| F-30 | [P3] | README title "Physics-Informed Neural Network Decision Support System" and "106 tes" (actual 226); UI "Gemini 2.5" (`SimulationPanel.tsx:704`) vs server `gemini-3.7-flash`; package name `react-example`; typo "Mebeg" (`ExecutivePolicyDashboard.tsx:124`). | Documentation matches code; checked in review. |
| F-31 | [P3] | `Content-Disposition` filename interpolates `req.query.device` without whitelist (`openvinoController.ts`). Node rejects CR/LF in headers, so response splitting is unlikely; quotes can still break the header. [NOT VERIFIED] by request. | Whitelist of devices and precisions. |

## A.3 Positive findings (verified strengths)

| ID | Strength | Evidence |
|---|---|---|
| S-01 | Server-enforced workflow state machine with role, assignment, ownership and separation-of-duty rules; audit trail; optimistic concurrency | `src/domain/workflow/*`, `server/routes/workflow.routes.ts`; tests "cross-role golden path", "wrong role, wrong assignee and self-approval are forbidden", "stale versions are rejected", "concurrent transitions are serialized" — all pass |
| S-02 | Honest status vocabulary on the newer surfaces (RULE_BASED, DEMO, SYNTHETIC, VALIDATION_REQUIRED; confidence capped LOW) | `assessment.ts:17,160-195`; `PinnPage.tsx:30-50`; `docs/AI.md`, `docs/validation/PINN_VALIDATION_GAP.md` |
| S-03 | CV → engineering boundary refuses to infer modulus, CBR or load from a photo | `assessment.ts:238-257` |
| S-04 | DEMO CV can never auto-verify a report | `screening.ts:88-97`; test passes |
| S-05 | ESAL arithmetic correct and input-validated | `esal.ts:30-51` |
| S-06 | What-If runs persisted with physical-direction sanity checks and provenance | `whatIf.ts`, `intelligence.routes.ts:95-125`; test "What-If runs are persisted as SIMULATED records" |
| S-07 | Atomic persistence (temp file + rename) and upload magic-byte checks | `fileCaseStore.ts:44-45`; `photoValidation.ts` |
| S-08 | Prior internal validation-gap report already identified the engine's deterministic identity and similarity failures; this audit independently reproduces and extends it with a reference solver | `docs/validation/PINN_VALIDATION_GAP.md` |
