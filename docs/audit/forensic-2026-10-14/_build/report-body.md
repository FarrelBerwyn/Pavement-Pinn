# Document Control

Table 0.1 — Document metadata

| Field | Value |
|---|---|
| Document ID | PAVEMENT-PINN-AUDIT-001 |
| Title | PAVEMENT-PINN — Comprehensive Forensic Technical Audit Report: Scientific Validity, PINN Mathematics, Software Architecture, Data Integrity, and Intel Edge AI Readiness |
| Version | 1.0 (initial issue) |
| Audit date | 2026-10-14 |
| Repository | `pavement-pinn` (local working copy) |
| Commit audited | `4a9b4fc49ec6e1d583648b2eaaa26293577add2e` — "feat: persist What-If runs; label legacy illustrative screens (G-SW-01, G-SW-04)" |
| Branch | `feature/m1-report-ownership` (local; not pushed per project notes) |
| Working-tree state | Uncommitted work of another session: 24 modified, 1 deleted, 10 untracked paths (demo-login and authentication rework: `server/auth/demoLogin.ts`, `src/features/authentication/*`, `tests/integration/auth-api.test.ts`, `tests/unit/demo-auth.test.ts`, docs). Not modified, staged or reverted by this audit. Code inspection and tests reflect this working tree. |
| Reference document | *Berikut adalah Master Blueprint & Kanvas Arsitektur Lengkap PAVEMENT-PINN (Versi Final Terbaru)*, 25 pages (BAB 1–10) |
| Other project sources consulted | `docs/SOURCE_INVENTORY.md` (spec v2.2, not available to this audit), `docs/validation/PINN_VALIDATION_GAP.md`, `docs/FINAL_AUDIT.md`, `docs/AI.md`, `docs/GAP_REGISTER.md`, `PROGRESS.md` |
| Classification | Internal engineering review — project team and mentors |
| Report status | Issued for review. Audit-only phase: no application code, formula, threshold, schema, data or configuration was changed. |
| Overall status | **[FAIL]** against the claim "validated PINN-based pavement engineering platform" (criteria below) |
| Prepared by | Automated audit session (Claude Code) at the request of the repository owner. No organisation, approval or endorsement is implied. |

Table 0.2 — Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-10-14 | Initial forensic audit: blueprint traceability, PINN identity, mathematical verification with an independent layered-elastic reference, data, tests, OpenVINO readiness, findings and roadmap |

**Audit scope.** All tracked source under `src/`, `server/`, `tests/`, `scripts/`, `supabase/`, project documentation, and the uncommitted working tree as found; the master blueprint as the statement of intended requirements. Out of scope: sibling repositories in the parent folder, deployment hosts, external services, and the confidential contents of `docs/POST_STRUCTURE_AUDIT.md` (it locates credentials in other repositories and is deliberately not reproduced).

**Audit limitations.** (1) No Python runtime, model weights, datasets or OpenVINO installation exist on the audit machine, so training, CV evaluation and hardware benchmarks are [BLOCKED]. (2) The blueprint PDF could be read only through its text layer; some mathematical glyphs and the page design could not be inspected visually, so the report's layout is reference-inspired, not a replica. (3) Spec v2.2, which the code follows, was not available to the audit. (4) The reference solver used for numerical verification was written during the audit and is verified against closed forms only. (5) The user's development server was not called; HTTP behaviour of legacy endpoints is inferred from code and function-level tests.

**Evidence classification.** [VERIFIED] directly demonstrated by inspection or a reproducible test; [PARTIALLY VERIFIED] partly demonstrated; [NOT IMPLEMENTED] absent from the inspected scope (the whole repository was searched unless stated); [NOT VERIFIED] insufficient evidence either way; [FAILED] a defined check was executed and failed; [BLOCKED] verification impossible because of a named dependency. Diagrams carry [AS-IMPLEMENTED], [BLUEPRINT REFERENCE] or [PROPOSED TARGET STATE]. Implementation evidence, test evidence, scientific validation and deployment evidence are reported separately throughout.

**Overall status criteria.** [PASS]: no open P0 or P1; a trained physics-informed model with held-out validation; measured edge benchmarks. [CONDITIONAL PASS]: no open P0; every P1 has an accepted plan; every displayed AI, telemetry or engineering figure is either measured or adjacently labelled; the engine is either physically verified or explicitly positioned as a screening heuristic. [FAIL]: any open P0. **Rationale:** five P0 findings are open (F-01 to F-05): the engine is not a PINN, model and hardware telemetry are fabricated, strain responses contradict layered-elastic theory by one to two orders of magnitude, a fake training run is presented, and CV confidence is invented. Build and test success (226/226, clean type check) does not change this status.

<!-- pagebreak -->

# Abbreviations and Terminology

Table 0.3 — Abbreviations used in this report

| Term | Meaning |
|---|---|
| AC-WC / AC-BC / AC-Base | Asphalt Concrete Wearing / Binder / Base Course (Bina Marga) |
| BP-x | Blueprint requirement identifier (Appendix D) |
| CBR | California Bearing Ratio (%) |
| CV | Computer vision |
| ESAL / LEF | Equivalent Single Axle Load / Load Equivalency Factor |
| FEM | Finite Element Method |
| FWD | Falling Weight Deflectometer |
| IR | OpenVINO Intermediate Representation (.xml + .bin) |
| MLET | Multilayer linear-elastic theory (Burmister) |
| NNCF | Neural Network Compression Framework |
| NPU / iGPU | Neural Processing Unit / integrated GPU |
| ODOL | Over Dimension Over Loading |
| PCI | Pavement Condition Index (0–100) |
| PINN | Physics-Informed Neural Network |
| PMA / SMA / HRS | Polymer Modified Asphalt / Stone Matrix Asphalt / Hot Rolled Sheet |
| RBAC | Role-Based Access Control |
| RUL | Remaining Useful Life |
| SLM | Small Language Model |
| WIM | Weigh-In-Motion |
| εt / εv | Horizontal tensile strain at the bottom of the asphalt / vertical compressive strain at the top of the subgrade (µε) |
| F-xx / S-xx / R-xx / T-xx | Finding / strength / remediation task / test identifiers |

<!-- pagebreak -->

# Executive Summary

**1. Implementation maturity.** PAVEMENT-PINN is a working web prototype (React 19 + Vite, Express API, JSON file store) with a well-engineered, test-covered multi-stakeholder workflow: anonymous citizen reporting, operations review and assignment, field inspection, recommendation, approval with separation of duties, internal work orders, verification and an audit trail (226 automated tests pass; type check clean). The scientific and AI components that give the project its name are not implemented: there is no neural network, no training, no CV model, no OpenVINO runtime and no measured benchmark.

**2. Scientific validity of the physics engine.** The engine (`src/engines/pinn/core/pinnEngine.ts`) is a set of independent power-law formulas with literal coefficients. An independent multilayer linear-elastic reference solver written for this audit (verified against the Boussinesq closed form to ≈ 1e-12 and against Burmister two-layer chart values) shows the engine's tensile strains at a median of about 5–7 % and compressive strains at about 2–2.5 % of elastic theory across the documented input range. For the blueprint's default segment (AC-WC 10 cm, 2500 MPa, CBR 6) under a 10 t axle the engine gives εt = 20 µε and εv = 17 µε where the reference gives about 300–435 µε and 790–1170 µε. The engine therefore reports typical structures as "STABIL … dalam batas elastis aman" when elastic theory places them well above common fatigue and rutting limits.

**3. Engine identity.** Deterministic analytical heuristic. It is not a trained PINN, not a surrogate of any reference model, and not a hybrid. The newer domain layer already labels it `RULE_BASED`; several legacy screens, the README title and the exported PDF still present it as a PINN running on OpenVINO.

**4. Physics equations.** Equilibrium, constitutive law, boundary conditions and interface continuity (BAB 5.1) are not implemented or enforced anywhere in executable code. The engine fails the elastic-similarity test that every layered-elastic solution satisfies (exponents −0.4/−0.75/−0.6 instead of −1).

**5. Reference data.** None. No FWD, FEM, WIM, core, CV image or longitudinal PCI data is in the repository; segment attributes are hand-authored synthetic values, and some screens contradict that with "FWD Validated" and WIM-station badges.

**6. Integration status.** Workflow, RBAC (demo identity), persistence (local atomic file store) and What-If persistence: implemented and tested. CV: keyword matching with constant confidence (DEMO; human review always required on the server). Weather and traffic: deterministic demo providers, honestly labelled on new surfaces. Supabase: migration written, not applied. Pilot corridor: Karawang (spec v2.2), not the blueprint's Jalan Raya Narogong.

**7. Edge inference.** No verified capability. All latency, power, NPU utilisation, quantisation-accuracy and loss figures in the UI are constants or random numbers; the "OpenVINO IR export" is a hand-written XML without weights; the hardware detector claims an Intel NPU by default.

**8. Critical blockers.** (a) The identity and telemetry misrepresentations (F-01, F-02, F-04, F-05); (b) the physically inconsistent response model (F-03) and its downstream life and threshold logic (F-06, F-07); (c) the absence of any empirical dataset (F-16); (d) no Python/ML toolchain (G-PY-01); (e) an unresolved conflict between the blueprint and the spec the code follows (F-15).

**9. Remediation priorities.** First remove or relabel every unsupported claim and every random or constant "measurement" (Phase P0, Chapter 13); then replace the response formulas with a verified layered-elastic computation and unify thresholds and the standard axle; then connect persistence and real data providers; only then train and validate a PINN or surrogate and benchmark it on Intel hardware.

Table 0.4 — Executive summary by domain

| Domain | Blueprint requirement | Actual evidence | Status | Risk | Next action |
|---|---|---|---|---|---|
| PINN identity | Trained PINN with data, physics, BC and IC losses (BAB 5.1) | One closed-form function; no network, weights, optimiser or residual | [NOT IMPLEMENTED] | Critical | Relabel (R-P0-01); decide model form (R-P0-04) |
| Physics consistency | Burmister multilayer elasticity | Strains 1–2 orders below MLET reference; similarity test fails | [FAILED] | Critical | Verified MLET computation (R-P1-01) |
| Thresholds and failure | εt, εv limits leading to life prediction | 180/200/250/350 µε uncited and inconsistent; no transfer functions | [FAILED] | High | Threshold register + one criterion (R-P1-02) |
| RUL / PCI / recommendation | Days to failure, PCI trend, PMA vs AC-WC | Heuristics independent of structure; overlay = PCI look-up | [FAILED] | High | Deterioration model (R-P3-04) |
| Data | FWD/FEM data loss; GRDDC + local CV data; SNI baseline | No empirical data; synthetic attributes | [NOT IMPLEMENTED] | Critical | Data acquisition (R-P2-04) |
| Computer vision | YOLOv8 + anti-spoofing | Keyword match, constant confidence; no anti-spoofing | [NOT IMPLEMENTED] | Critical | Remove claims (R-P0-02); model (R-P3-05) |
| Weather / traffic | BMKG weather; virtual WIM from traffic API | Deterministic demo providers; illustrative axle spectrum | [PARTIALLY VERIFIED] | Medium | Live adapters (R-P2-03) |
| Workflow and RBAC | Four roles, approvals, repair verification | Server-enforced state machine, audit trail, tests pass | [VERIFIED] (demo identity) | Low | Real identity provider (R-P2-02) |
| Persistence | Supabase PostgreSQL + Storage + Realtime | Local JSON store; migration not applied | [BLOCKED] | Medium | Apply migration (R-P2-01) |
| OpenVINO / edge | ONNX → IR → NNCF; < 10 ms on CPU/iGPU/NPU | Simulated telemetry; illustrative IR; no runtime | [NOT IMPLEMENTED] | Critical (claim) | Remove figures (R-P0-02); benchmark after model (R-P3-06) |
| Geospatial twin / UI | 3D isometric map, Three.js cross-section, realtime pins | 2D maps, 2D cross-section, no realtime | [PARTIALLY VERIFIED] | Medium | Decide scope (R-P0-05) |
| GenAI | On-device Phi-3/Llama-3.2 on NPU | Cloud Gemini call + template fallback | [DIVERGENT] | Medium | Decide and document (R-P0-05) |

<!-- pagebreak -->

# Chapter 1 — Project Context and Blueprint Traceability

## 1.1 Problem definition, pilot corridor and SDGs

The blueprint (BAB 1) motivates the system with national road-condition and budget statistics, the ODOL problem and the fourth-power law, and selects **Jalan Raya Narogong (Bekasi–Bogor)** as the Phase 1 pilot, with Karawang (Klari–Simpang Jomin) and Semarang as Phase 2 expansion. The implementation follows a later specification, *PAVEMENT-PINN v2.2* (`docs/SOURCE_INVENTORY.md`), whose pilot is **Karawang Pantura Klari → Jatisari → Simpang Jomin** (`src/data/reference/karawangPilot.ts`, KRW-001..004). The string "Narogong" does not occur in `src/`; a report near Narogong (approximately −6.38, 107.00, an audit approximation) is flagged `OUT_OF_SCOPE: di luar koridor pilot Klari–Jatisari` by `screenReport` (`src/domain/workflow/screening.ts:40,83`) [VERIFIED]. The statistics in BAB 1.1 were not re-verified (no source documents supplied); several of them reappear in policy screens as constants (F-22). SDG alignment (BAB 1.3) is narrative [N/A].

> **Source-of-truth conflict (F-15).** The audit reference ("Versi Final Terbaru") and the specification implemented in code disagree on the pilot corridor, the technology stack, the 3D twin and the on-device SLM. Until the team records which document governs, every traceability row marked [DIVERGENT] is a decision, not a defect.

## 1.2 Research gap and ten dimensions of novelty

Of the ten novelty dimensions (BAB 2.2), one is implemented and verified at software level (N6, one computation feeding three role views), one is verified for a demo identity model (N7, RBAC), two are partially present (N1, N3), and six are not implemented (N2 PINN losses, N4 virtual WIM and anti-spoofing, N5 recommender and quality audit, N8 heterogeneous Intel execution, N9 NNCF quantisation, N10 on-device SLM — the last implemented differently, via a cloud model). Rows BP-2.2-N1 to N10 in Appendix D give the evidence.

## 1.3 End-to-end pipeline (BAB 3) and system flow (BAB 9)

![Figure 1.1 — Blueprint five-phase pipeline (BAB 3) with the implementation status of each stage. BLUEPRINT REFERENCE, annotated with audit status.](figures/fig-1-1-blueprint-status.svg)

Phase 1 (offline training and compression) is entirely absent. Phase 2 (field acquisition) is present for the citizen report only; weather and traffic are demo providers. Phase 3 (translation from photo and weather to physics) is deliberately not implemented in the new domain layer — correctly, because no calibration exists — while the legacy engine applies uncited linear moisture and temperature factors. Phase 4 runs the formula engine instead of a PINN on OpenVINO. Phase 5 has a rule engine and a deterministic explanation layer but no local SLM.

## 1.4 Chapters 4–8 and 10 of the blueprint

Material catalogue, ageing, recommender and sub-standard audit (BAB 4): catalogue present as static reference text only; the others are not implemented (F-18, F-26). PINN and OpenVINO (BAB 5): not implemented (Chapters 3 and 10). Stakeholder roles (BAB 6): implemented with one deliberate divergence — the Field Engineer recommends and the Operations Manager approves, and the "SPK" is an internal work order explicitly marked as not an official document; the audit regards this separation of duties as an improvement that should be written back into the blueprint. 3D twin (BAB 7): 2D maps (Leaflet, MapLibre without pitch), a 2D stacked-`div` cross-section, no Three.js. Architecture and schema (BAB 8): different stack; the Supabase schema normalises the blueprint tables into `report_cases`, `damage_detections`, `pinn_predictions` and `simulations`, which is defensible but unapplied. Evaluation (BAB 10.1): none of the accuracy, latency or usability metrics has been measured.

## 1.5 Requirements traceability summary

The full matrix (67 requirements) is in Appendix D. Counted totals: 3 [VERIFIED], 24 [PARTIALLY VERIFIED], 7 [DIVERGENT], 26 [NOT IMPLEMENTED], 4 [NOT VERIFIED], 3 [N/A]. Every [VERIFIED] row concerns workflow software; no scientific or AI requirement is verified.

Table 1.1 — Representative traceability rows (full matrix in Appendix D)

| Requirement ID | Blueprint reference | Expected behaviour | Implementation location | Evidence | Status | Gap |
|---|---|---|---|---|---|---|
| BP-1.2a | BAB 1.2 | Pilot Jalan Raya Narogong | `karawangPilot.ts`; `screening.ts:40` | Narogong report OUT_OF_SCOPE | [DIVERGENT] | F-15 |
| BP-3.F1b | BAB 3 Fase 1 | PINN trained on FWD/FEM + Burmister loss | — | No training code | [NOT IMPLEMENTED] | F-01 |
| BP-3.F3b | BAB 3 Fase 3 | YOLOv8 class + confidence | `cvDamageClasses.ts:216-244` | Keyword match | [NOT IMPLEMENTED] | F-05 |
| BP-3.F4a | BAB 3 Fase 4 | εt, εv from PINN on OpenVINO | `pinnEngine.ts:58-69` | Formula, 1-2 orders low | [PARTIALLY VERIFIED] | F-03 |
| BP-6.0 | BAB 6 | Four roles with RBAC | `domain/workflow`, `features/rbac` | Tests pass | [VERIFIED] | IdP [BLOCKED] |
| BP-7.2d | BAB 7.2 | Three.js 3D cross-section | `SimulationPanel.tsx:460-517` | 2D divs | [NOT IMPLEMENTED] | F-15 |
| BP-10.1a | BAB 10.1 | RMSE/MAE/R² > 0.90 vs FWD/FEM | — | No evaluation | [NOT IMPLEMENTED] | F-16 |

<!-- pagebreak -->

# Chapter 2 — Repository and Software Architecture Audit

## 2.1 Repository inventory

222 tracked files (excluding lock files: about 58 000 lines, of which the golden fixture is 9 885). Main areas: `src/app` (shell, providers, layouts; `ModernAppLayout.tsx` alone 2 820 lines), `src/features` (role views, maps, policy, WIM, work orders), `src/domain` (workflow state machine, intelligence: assessment, ESAL, evidence providers, What-If, Road Story), `src/engines` (the formula engine and the CV class table), `src/runtime` (simulated hardware detection and benchmark), `server` (Express app, routes, controllers, services, file store), `supabase/migrations` (one migration, not applied), `tests` (24 files, 226 tests). There is no Python code, no notebook, no model file and no dataset other than TypeScript constants.

![Figure 2.1 — As-implemented architecture and data flow. AS-IMPLEMENTED (from source inspection).](figures/fig-2-1-architecture.svg)

## 2.2 Critical execution paths

Table 2.1 — Classification of critical features

| Feature | Path (input → output) | Classification | Evidence |
|---|---|---|---|
| Citizen report submission | UI form → `POST /api/workflow/reports` → `checkPhotoReference` → `screenReport` (DEMO CV) → `FileCaseStore.commit` | 1. Fully implemented (demo identity) | workflow tests; `photoValidation.ts`; `fileCaseStore.ts:44-45` |
| Review → assign → inspect → recommend → approve → work order → verify → close | `applyCommand` with role and version guards | 1. Fully implemented | "cross-role golden path" test |
| Engineering assessment | `GET /api/intelligence/...` → `assessSegment` → `runPinnSimulation` (clamped) | 4. Deterministic calculation presented, on new surfaces, honestly as RULE_BASED | `assessment.ts:114-196` |
| Legacy simulation | `POST /api/simulate` → `runPinnSimulation` (no validation) | 4. Deterministic calculation presented as PINN + OpenVINO | `simulationController.ts`; F-01, F-11 |
| What-If | `POST` simulation route → `runWhatIf` → persisted SIMULATED record | 2. Implemented with limitations (engine F-03) | `intelligence.routes.ts:95-125` |
| CV damage classification (UI) | photo URL/data URL → `analyzeImageDamageClass` → constant confidence | 3. Mocked | `cvDamageClasses.ts:216-244` |
| Weather, traffic → load | `DEMO_WEATHER_PROVIDER`, `estimateTrafficLoad` | 3. Mocked (labelled DEMO / INFERRED) | `evidence.ts` |
| OpenVINO telemetry and benchmark | constants + `Math.random` / JS loop | 3. Mocked, displayed as measurement | F-02 |
| WIM scraping + PINN training modal | `Math.random` records → fixed loss multiples | 3. Mocked, displayed as real | F-04 |
| GenAI narrative | `POST` narrative route → cloud model or template | 2. Implemented with limitations; not verified at runtime | `narrativeService.ts` |
| PDF report | `generateOfficialReportPdf` (jsPDF, client) | 2. Implemented; content inherits F-02/F-03 | F-19 |
| Supabase persistence | migration only | 6. Not verified (not applied) | F-24 |

## 2.3 Code-quality observations

Dead or disconnected code: `src/data/mock/auditLogs.ts` (`INITIAL_AUDIT_LOGS`, not imported; contains "Regangan Tarik 245 µε"). Duplicate implementations: two strain-limit charts (`FieldEngineerTools.tsx`, `FieldEngineerDashboard.tsx`) with different legends for the same field; two fourth-power bases (F-08). Fallback behaviour that produces plausible numbers when no result exists: strain placeholders 245/380 µε, loss placeholders 0.00342/0.00185/0.00157, latency "6.8 ms". Swallowed errors: the hardware detector's `catch { webGlSupported = false }` keeps the Intel defaults (F-12). Misleading UI state: a hard-coded "MELEBIHI AMBANG BATAS (+22.5%)" banner (F-06). Discrepancy between tests and runtime: tests pin the formulas' current output; nothing tests their physics. Strengths are listed as S-01 to S-08 in Appendix A.3.

## 2.4 Authentication, authorisation and security (summary)

Server-signed session tokens; actor derived from the token, never the body; role, assignment, ownership and separation-of-duty rules enforced in the domain service; official-only audit access; public projection hides staff identities; magic-byte upload validation; rate limiting in process. Gaps: no identity provider (demo accounts, [BLOCKED] on credentials), no EXIF/GPS stripping, the six original endpoints (`/api/simulate`, `/api/roads`, `/api/openvino/*`, narrative, health) are unauthenticated, and `/api/simulate` is unvalidated (F-11). The uncommitted demo-login rework was observed but not audited in depth because it is in progress in another session.

<!-- pagebreak -->

# Chapter 3 — Forensic PINN Identity and Training Audit

## 3.1 Method

The audit searched the whole repository for every element a PINN requires: model definitions (classes, layer arrays, weight tensors), automatic differentiation, residual computation, loss terms, optimisers, training loops, datasets, checkpoints and model loaders, plus dependencies (`package.json`) and non-TypeScript sources. It then traced every call site of the engine (`runPinnSimulation` is called from eight production modules: `AppStateProvider`, `ModernAppLayout`, `SimulationPanel`, `ExecutivePolicyView`, `StrategicPolicyMapView`, `MyTasksView`, `server/services/simulationService` and `domain/intelligence/assessment`).

## 3.2 Model identity

Table 3.1 — Model identity register

| Property | Required evidence | Observed implementation | Finding |
|---|---|---|---|
| Neural architecture | Model definition (layers, activations) | None. `src/engines/pinn/core/pinnEngine.ts` is one exported function of 296 lines | [NOT IMPLEMENTED] |
| Trainable parameters | Parameter inventory | None; every coefficient is a literal (120, 1.75, 0.4, 210, 1.4, 0.75, 45, 0.6, 0.5, 0.0018, …) | [NOT IMPLEMENTED] |
| Forward pass | Network evaluation | Closed-form expressions EQ-4 to EQ-11 | Deterministic formula |
| Automatic differentiation | Gradient of outputs w.r.t. coordinates | None; no spatial coordinates are inputs | [NOT IMPLEMENTED] |
| Physics residual | PDE residual at collocation points | None. `physicsLossValue` = `0.0018 + Math.random()*0.0006` | [NOT IMPLEMENTED]; displayed value fabricated (F-02) |
| Data loss | Comparison with FWD/FEM data | None. `dataLossValue` = `0.0011 + Math.random()*0.0004` | [NOT IMPLEMENTED]; fabricated (F-02) |
| Boundary / initial-condition loss | BC and IC terms | None (the WIM modal derives a "boundaryLoss" as `dataLoss × 0.42 + 0.00085`) | [NOT IMPLEMENTED]; fabricated (F-04) |
| Loss weighting, optimiser | λ weights; Adam + L-BFGS | None; the text "Konvergensi Adam Optimizer epoch 1500." is a constant | [NOT IMPLEMENTED] |
| Training loop | Gradient updates over data | None in code; the "training" modal runs three `setTimeout` steps | [NOT IMPLEMENTED] |
| Training data and splits | Dataset with provenance, train/val/test | None | [NOT IMPLEMENTED] |
| Checkpoint | Reproducible trained weights | None in repository or `dist/` | [NOT IMPLEMENTED] |
| Serialisation / loading | Model file and loader | None; the IR "export" is hand-written text | [NOT IMPLEMENTED] (F-13) |
| Inference | Loaded model execution | Function call with clamped inputs (new layer) or raw inputs (legacy) | Deterministic |
| Reproducibility | Same input → same output | Strains yes; telemetry and ids no | [PARTIALLY VERIFIED] (F-21) |
| Provenance | Model version recorded with outputs | New layer: `pinnEngine-formula@1 (deterministic, no trained weights)` | [VERIFIED] (new layer only) |

![Figure 3.1 — Required PINN elements versus elements present. Left: BLUEPRINT REFERENCE (BAB 5.1). Right: AS-IMPLEMENTED.](figures/fig-3-1-pinn-identity.svg)

## 3.3 Conclusion on identity

The engine is a **deterministic analytical heuristic**. It is not a PINN (no network, no physics residual), not a surrogate (it was not fitted to any reference solution present in the repository, and it disagrees with layered-elastic theory by one to two orders of magnitude), and not a hybrid. Training has not occurred: no artifact, log, dataset or code demonstrates it, and the existence of words such as "PINN", "training" or "loss" in UI text is not evidence of training. A deterministic engine can be a legitimate screening tool, but only if it is physically consistent and described as what it is; neither condition holds today for the legacy screens (F-01, F-03).

<!-- pagebreak -->

# Chapter 4 — Mathematical Audit of Pavement Physics

## 4.1 Multilayer elastic theory

The blueprint specifies Burmister multilayer elasticity with equilibrium and an isotropic constitutive law:

```math EQ-2 | Equilibrium (BLUEPRINT REFERENCE, BAB 5.1).
\nabla \cdot \boldsymbol{\sigma} + \mathbf{b} = 0
```

```math EQ-3 | Constitutive law (BLUEPRINT REFERENCE, BAB 5.1).
\boldsymbol{\sigma} = \mathsf{C} : \boldsymbol{\varepsilon}
```

Neither relation is evaluated in code, and the engine's inputs cannot support them: there is no field variable, no spatial coordinate, no Poisson ratio, no contact pressure or radius, and only one structural layer plus a subgrade (Table 4.1). An equilibrium residual alone would also not close the problem: Burmister's solution additionally needs the constitutive law for each layer, strain–displacement compatibility, the surface traction condition under the tyre, interface continuity (bonded or frictionless) and decay at depth and distance — the boundary-value problem solved by the audit's reference (EQ-12, Appendix B.4).

Table 4.1 — Mechanical-model elements required by MLET vs present in the engine

| Element | Required by MLET | Present in engine | Status |
|---|---|---|---|
| Equilibrium | yes | no | [NOT IMPLEMENTED] |
| Stress–strain law per layer (E, ν) | yes | E only, no ν | [NOT IMPLEMENTED] |
| Strain–displacement compatibility | yes | no | [NOT IMPLEMENTED] |
| Layer geometry | all layers incl. base, sub-base | asphalt thickness; a hidden "+15 cm" in εv | [PARTIALLY VERIFIED] |
| Surface load | pressure q over radius a, wheel configuration | axle tonnes only; "surface stress" $0.65P/10$ MPa | [FAILED] (F-09) |
| Interface conditions | continuity of $u_z, u_r, \sigma_z, \tau_{rz}$ | none; responses read one layer each | [FAILED] |
| Conditions at depth / distance | decay | basin $w_0e^{-0.0018r}$ fixed for every structure | [FAILED] |
| Assumptions (linear, isotropic, homogeneous layers, quasi-static) | stated | implicit, not stated | [NOT VERIFIED] |

The engine's responses are:

```math EQ-4 | Engine tensile strain (AS-IMPLEMENTED, pinnEngine.ts:58-62).
\varepsilon_t = \mathrm{round}\left(\frac{120 P}{h^{1.75} (E_1'/2000)^{0.4}}\right)
```

```math EQ-5 | Engine compressive strain (AS-IMPLEMENTED, pinnEngine.ts:65-69).
\varepsilon_v = \mathrm{round}\left(\frac{210 P}{(h + 15)^{1.4} (E_s/40)^{0.75}}\right)
```

Because every linear-elastic layered solution satisfies the similarity property (EQ-14), multiplying all moduli by $k$ must divide all strains and displacements by $k$. Applying the same scaling to EQ-4 to EQ-6 gives exponents −0.4, −0.75 and −0.6 (EQ-15). The engine therefore cannot be a layered-elastic solution or an approximation of one with uniform accuracy [FAILED].

## 4.2 Numerical comparison with an independent reference

The audit implemented an axisymmetric MLET solver (Love strain function, Hankel transform, bonded interfaces; `evidence/mlet.mjs`) and verified it before use (Table B.2): a homogeneous three-layer system reproduces the Boussinesq closed form to ≈ 1e-12 relative error at all tested depths; strains from displacement and stress kernels agree to 1e-14 in a strongly layered system; and Burmister two-layer interface stresses match published chart values (0.646, 0.291, 0.081 for modular ratios 1, 10, 100). It was then compared with the engine over 144 in-range cases.

![Figure 4.1 — Distribution of engine/reference strain ratios over the 144-case grid (box: inter-quartile range; whiskers: min–max). A ratio of 1 means agreement. AS-IMPLEMENTED evidence.](figures/fig-4-1-ratio-distribution.svg)

Results (Tables B.3–B.5): median ratios 0.047 (εt, two-layer), 0.067 (εt, three-layer), 0.019 and 0.025 (εv). Sensitivities differ qualitatively: in the engine εt does not depend on subgrade stiffness and εv does not depend on asphalt stiffness; in the reference both do. Load enters linearly in the engine but with exponent ≈ 0.6 in the reference at constant tyre pressure. The finding is robust to the loading assumptions (B.4) and classified [VERIFIED] against the reference; empirical accuracy of both remains [NOT VERIFIED] for lack of field data.

## 4.3 Dimensional analysis

EQ-4 to EQ-6 combine tonnes, centimetres and megapascals through fractional exponents, so their coefficients carry hidden units (for EQ-4, µε·cm^1.75·t⁻¹) and the expressions are not dimensionally homogeneous; their correctness could only come from calibration, and no calibration record exists. Specific issues: axle load is never converted to force or to a wheel load; "surface stress" scales with axle load instead of being set by tyre pressure; the εv formula adds an unexplained 15 cm; $E_s = 10\,$CBR MPa is an uncited correlation applied for CBR 3–10 %; strain is rounded to integer microstrain; rainfall intensity (mm/h) is used directly as a moisture state; the three time quantities (PCI horizon "per year", RUL years, pothole horizon days) are not linked by a common time model; PCI is used as a projection variable although it is defined by distress surveys. Full unit trace: Table B.8.

## 4.4 Boundary and edge cases

Function-level tests (Table B.7) show non-finite results for zero load (RUL and horizon ∞, Zero-ODOL impact −∞), zero thickness, zero modulus and zero or negative CBR; negative strains for negative loads; silent `NaN` propagation with a GREEN alert; string coercion; negative Zero-ODOL percentages below 10 t; unbounded linear stiffening below 25 °C; and saturation that masks absurd inputs (1000 mm/h). The new `assessSegment` path clamps inputs to the documented ranges and flags them (F-28); the legacy `/api/simulate` path performs no validation (F-11). No equation was modified.

<!-- pagebreak -->

# Chapter 5 — Strain Thresholds and Failure-Criterion Audit

Every strain-related threshold was traced (Table B.6). Four numeric limits exist for two quantities — 180, 200 and 250 µε for εt, 350 µε for εv — plus fabricated placeholder values (245, 380 µε) and a hard-coded "+22.5 %" exceedance banner. None cites a document, clause, table or calibration; the same field is labelled "AASHTO" in one chart and "Bina Marga" in another; and the engine's KRITIS rule triggers at 250 µε while its message cites a 200 µε limit [FAILED].

Table 5.1 — Strain thresholds (abridged from Table B.6)

| Parameter | Source location | Current value | Physical meaning | Source/standard | Verification status | Risk |
|---|---|---|---|---|---|---|
| εt warning | `pinnEngine.ts:130` | 180 µε | approaching fatigue | none | [UNVERIFIED] | Medium |
| εt limit | `pinnEngine.ts:129`, `FieldEngineerTools.tsx:198`, `pdfGenerator.ts:111` | 200 µε | fatigue limit | "AASHTO" / "Bina Marga" (uncited, inconsistent) | [UNVERIFIED] | High |
| εt critical | `pinnEngine.ts:128` | 250 µε | exceeds limit | none; contradicts own text | [FAILED] | High |
| εv limit | `FieldEngineerTools.tsx:203` | 350 µε | rutting limit | none | [UNVERIFIED] | High |

Engineering distinctions the implementation does not make:

- **Tensile strain at the bottom of the asphalt** governs bottom-up fatigue cracking; **vertical compressive strain at the top of the subgrade** governs structural rutting. The code computes both but evaluates neither against a number of load repetitions.
- **Elastic response versus accumulated permanent deformation**: all outputs are single-load elastic responses; no accumulation model exists.
- **Fatigue life versus rutting life**: no life is computed from strain at all — RUL and pothole horizon come from load factor and rain only (EQ-10).
- **Structural failure versus visible pothole formation**: the "pothole horizon" is a rule, not a failure criterion, and potholes also depend on surface ravelling, water ingress and patch quality, which no input describes.

Reachability: on the 144-case grid the engine exceeds 200 µε in 3 cases and never exceeds 350 µε (maximum 98 µε), whereas the reference exceeds them in 111–123 and 126–134 cases respectively. The thresholds and the response scale are therefore mutually inconsistent; with a physically consistent response model, the fixed limits would be exceeded in most cases, which shows that a fixed limit without design traffic is not meaningful either. Required to close: the governing standard and clause for each limit chosen by the team (the audit does not substitute one), or transfer functions of the form EQ-16 with coefficients from that standard, evaluated with design ESAL (R-P1-02).

<!-- pagebreak -->

# Chapter 6 — Physics-to-Application Translation Audit

![Figure 6.1 — Translation chain from observation to predicted deterioration, with the implementation status of each link. BLUEPRINT REFERENCE chain, AS-IMPLEMENTED status.](figures/fig-6-1-translation-chain.svg)

Table 6.1 — Status of each translation step

| Step (blueprint) | Implementation | Nature of output | Assessment |
|---|---|---|---|
| Visual damage → material degradation (E₁ penalty 40–60 % for severe alligator cracking) | New layer refuses the mapping (`translateSurfaceEvidence`, status CALIBRATION_REQUIRED); legacy engine ignores damage class | Surface indicator only | Correct refusal. A CV label is not a modulus measurement; a back-calculated modulus needs FWD or laboratory data |
| Weather → moisture effect → pore-water pressure | Rain intensity and flood hours reduce CBR linearly (floor 0.4); no pore pressure | Assumed | [UNVERIFIED]. Rainfall is not pore-water pressure; saturation depends on drainage, duration, permeability and groundwater |
| Moisture → subgrade properties (CBR 6 → 2.5 %) | $E_s=10\,$CBR·$f_w$ | Assumed | [UNVERIFIED]. A soaked/unsoaked CBR pair from tests would be the minimum calibration |
| Traffic speed / congestion → axle load (virtual WIM) | Not implemented; traffic volume × heavy share × illustrative spectrum × 3 axles | Inferred, labelled | Congestion is correctly **not** treated as truck weight (`evidence.ts` note). The blueprint's speed-to-ODOL rule has no validation and should not be implemented without WIM data |
| Road age → ageing | Not implemented | — | Requires installation-year data and a mix-specific ageing model |
| Traffic loading → structural response | Engine EQ-4/5 | Calculated (inconsistent with MLET) | [FAILED] (F-03) |
| Structural response → predicted deterioration | Not linked: life uses load factor and rain only | Assumed | [FAILED] (F-07) |
| Visible pothole → future structural failure | Pothole horizon rule | Assumed | Not a valid inference; potholes have several mechanisms (identifiability limitation) |

Undocumented constants in the chain: 0.004 per mm/h, 0.015 per flood hour, floor 0.4; 1.2 % per °C, floor 0.5; the +12 °C air-to-surface assumption (`assessment.ts:86`); 3 axles per heavy vehicle; the illustrative axle spectrum; ±35 % traffic spread. The new layer propagates provenance labels and caps confidence at LOW, which is appropriate; it does not propagate numerical uncertainty through the engine.

**Identifiability.** From a photo, a rainfall value and a traffic count, the system cannot uniquely identify whether damage results from overload, moisture, a thin or weak structure, poor mix quality or poor drainage; several mechanisms produce the same surface distress. Any feature that attributes a cause — the "PINN contribution" percentages (F-20) or the planned sub-standard material alert — must present alternatives and treat its output as a hypothesis for investigation.

<!-- pagebreak -->

# Chapter 7 — RUL, PCI, and Material Recommendation Audit

```math EQ-10 | Engine deterioration rules (AS-IMPLEMENTED, pinnEngine.ts:92-112).
\Delta_{PCI} = \min\left(35, \frac{2.5 LF}{f_w}\right), \quad PCI' = \max(10, PCI_0 - 0.8\Delta_{PCI}) \\ RUL = \max\left(0.3, \frac{PCI'}{1.2\Delta_{PCI}}\right), \quad H_{pothole} = \max\left(3, \frac{1800 f_w}{LF}\right)
```

**RUL and pothole horizon.** Not a time-dependent deterioration process: there is no traffic accumulation, no damage summation and no calibration. Neither quantity depends on asphalt thickness, modulus, CBR or temperature (verified at 18 t across the full range: PCI′ 59, RUL 1.9 years, horizon 171 days in every case). The three time-to-failure quantities contradict each other (1.9 years of life, 171 days to pothole, PCI at the floor of 10 within two years). At zero load RUL and horizon are infinite.

**PCI.** PCI (as defined by distress-survey standards such as ASTM D6433) is a 0–100 index computed from observed distress types, severities and extents. The engine instead subtracts a load-and-rain term from a stored value, with an undefined horizon ("predicted PCI"), and the five-year "preventive" curve rises 2.5 points a year regardless of inputs and starts 5 points *below* the no-action curve. The scale is valid; the definition and dynamics are not documented [FAILED].

**Material and overlay recommendation.** Overlay thickness is $\max(4, 0.22(75-PCI'))$ cm when PCI′ < 70 (EQ-11), independent of strain, structure, traffic and material; the type is chosen by thickness bands and one band reads "AC-BC + AC-WC Poly-Modified Asphalt", conflating products. The blueprint's cross-simulation (AC-WC vs PMA under local rain and load, BAB 4.3) and its "PMA ≥ 8.5 cm" directive are not implemented; "8.5 cm" appears only as a UI constant. Recommendations must not be presented as construction-ready designs: an overlay design needs measured deflections or a structural evaluation, design traffic, material properties and a design method (F-18).

**Structural anomaly alert.** Not implemented (F-26). If built, it must be an investigation trigger (e.g. "response inconsistent with recorded age, traffic and rainfall; core sampling recommended"), never evidence of contractor misconduct; the blueprint's own wording rule (BAB 4.4) is consistent with this.

**Predictive accuracy.** No accuracy can be claimed: no independent reference observations exist (two dated PCI surveys per segment would be the minimum to begin calibrating a deterioration model).

<!-- pagebreak -->

# Chapter 8 — Data Integrity and Validation Dataset Audit

## 8.1 Computer vision data

Table 8.1 — CV data inventory

| Item | Availability | Source / provenance | Status | Training suitability | Validation suitability |
|---|---|---|---|---|---|
| Road-damage images | None in repository; sample photos are Unsplash URLs | Unsplash (stock), not annotated | Illustrative | No | No |
| Labels and severities | Constants per class (`cvDamageClasses.ts`) | Authored | Synthetic | No | No |
| External notebook (YOLOv8n-seg, Roboflow pothole set, CC BY 4.0, 720/60 images, single class) | Outside repository (`FILES/Docs/…ipynb`, audited in `docs/AI.md`) | Third-party Kaggle run; weights not included | Candidate only | Possible starting point for the pothole class | Not for Indonesian roads without local data |
| Train/val/test split, leakage checks, anti-spoofing data, class balance | None | — | [NOT IMPLEMENTED] | — | — |

## 8.2 Pavement-engineering and PINN data

Table 8.2 — Pavement data inventory

| Data | Availability | Provenance | Authentic or synthetic | Units / completeness | Suitable for training | Suitable for validation |
|---|---|---|---|---|---|---|
| FWD deflection basins | None | — | — | — | — | — |
| FEM / MLET reference solutions | None in repository (audit reference generated in `evidence/`, not committed as data) | Audit | Computed | Two/three-layer, on-axis only | Only as physics pre-training; never as sole validation | Only for numerical verification |
| Layer geometry and materials | Segment defaults (thickness, CBR) + reference baseline (base 20 cm, sub-base 25 cm, modulus 1800–3200 MPa) | Hand-authored; `karawangPilot.ts` header: SYNTHETIC | Synthetic | No ν, no base/sub-base moduli | No | No |
| Elastic modulus / Poisson ratio | Ranges only; no ν | Authored | Synthetic | Incomplete | No | No |
| CBR / subgrade | Per-segment defaults (3–6.2 %) | Authored | Synthetic | No soaked/unsoaked pairs | No | No |
| Traffic / ESAL / WIM | Volumes and heavy shares per segment; illustrative spectrum; legacy "WIM stations" (13) | Authored; pipeline modal uses `Math.random` | Synthetic | No axle spectra | No | No |
| Weather / rainfall / drainage | Deterministic demo values | Hash of segment id | Synthetic | No drainage data | No | No |
| Longitudinal condition, maintenance history | One "survey date" (DATA REQUIRED) per pilot segment; illustrative histories in legacy views | Authored | Synthetic | No time series | No | No |

**Synthetic is not ground truth.** All segment attributes are synthetic. If MLET or FEM solutions are later generated to train a surrogate, the same generator must not be used as the sole independent validation, because agreement would then measure only the surrogate's fit to its own generator. Independent validation needs field measurements (FWD basins with layer data from cores or as-built records, strain-gauge or instrumented-section data, dated PCI surveys).

**Missing data and plausible sources (not verified as accessible).** Bina Marga / BBPJN FWD and IRMS survey records for the pilot corridor; as-built drawings and core logs; WIM records (Kemenhub/BPTD or toll operators); BMKG rainfall station series; laboratory soaked/unsoaked CBR; local road-damage photographs with annotation protocol and consent. The audit has no evidence of access to any of these; access requests are a remediation task (R-P2-04). Licensing: Unsplash images are free to use under the Unsplash licence but carry no annotations; the Roboflow dataset is CC BY 4.0 (attribution required).

<!-- pagebreak -->

# Chapter 9 — Numerical Verification and Test Audit

The existing suite (226 tests, all passing; Table C.3) is strong for software behaviour and weak for science: 144 unit and 49 integration tests cover workflow, RBAC, API contracts, maps and module boundaries; 33 physics-validation tests prove that the code equals its documented formulas, pin 76 golden scenarios at zero tolerance and characterise threshold reachability. Their own header states that they are "not evidence of physical accuracy". No test compares the engine with an analytical or trusted reference, with FEM or with FWD data; none tests generalisation to unseen segments; there is no CV test and no browser end-to-end test.

Table 9.1 — Coverage of verification objectives

| Objective | Existing tests | This audit | Status |
|---|---|---|---|
| Correctness of individual equations (code = formula) | yes (400 random inputs, exact) | re-derived EQ-4..11 | [VERIFIED] |
| Dimensional consistency | no | analysed (4.3, B.8) | [FAILED] |
| Boundary-condition satisfaction | n/a (no BVP in engine) | reference solver: surface traction, interface continuity | engine [NOT IMPLEMENTED]; reference [VERIFIED] |
| Physical limiting behaviour | partial (linearity, monotonicity) | similarity, Boussinesq limit | engine [FAILED] |
| Numerical stability | finite outputs in documented ranges | non-finite outside (Table B.7) | [PARTIALLY VERIFIED] |
| Comparison with analytical/trusted reference | no | MLET reference, 144 cases | [FAILED] |
| Comparison with independent FEM / FWD | no | no data | [BLOCKED] |
| Generalisation to unseen segments / loads | no | — | [NOT VERIFIED] |
| Reproducibility | golden fixture | non-deterministic telemetry found | [PARTIALLY VERIFIED] |
| End-to-end application correctness | HTTP golden path | — | [PARTIALLY VERIFIED] (no browser automation) |

Executed commands, exit codes and limitations are listed in Appendix C (T-01 to T-10); deliberately skipped operations in Table C.2. A passing software test is not proof of scientific validity, and a reference that satisfies its own boundary-value problem is not proof that the model, parameters or predictions are correct for real roads: empirical accuracy remains [NOT VERIFIED].

<!-- pagebreak -->

# Chapter 10 — Intel OpenVINO and Edge Hardware Audit

![Figure 10.1 — Intended deployment pipeline (BLUEPRINT REFERENCE) with the status of each stage found in the repository.](figures/fig-10-1-openvino.svg)

Table 10.1 — Deployment pipeline status

| Stage | Expected artifact | Found | Status |
|---|---|---|---|
| PyTorch model | `.pt` / training code | none; no Python | [NOT IMPLEMENTED] |
| ONNX export | `.onnx` | none | [NOT IMPLEMENTED] |
| OpenVINO IR | `.xml` + `.bin` | hand-written XML with custom op `PhysicsPDEOp`, no `.bin` (`openvinoExportService.ts:15-42`) | [FAILED] as an artifact (F-13) |
| NNCF quantisation | config, calibration set, INT8/FP16 IR | JSON template claiming `nncf_quantization` | [NOT IMPLEMENTED] |
| Runtime usage | `openvino` package, `core.compile_model` | none (code samples inside a JSON string only) | [NOT IMPLEMENTED] |
| Device availability (CPU/iGPU/NPU) | `available_devices` query | browser heuristic defaulting to "Intel Core Ultra with NPU" (`deviceDetector.ts:14-15,46`) | [FAILED] (F-12) |
| Device selection and fallback | AUTO/MULTI policies | UI selector feeding lookup constants | [SIMULATED] |
| Precision support | FP32/FP16/INT8/INT4 runs | constant multipliers 1.4/1.0/0.8 | [SIMULATED] |
| Quantisation deviation | measured output deltas | constants 99.4/99.8/100 % | [SIMULATED] |
| Latency (cold/warm), batch, memory, utilisation | measured distributions | constants + random jitter; JS `tanh` loop | [SIMULATED] (F-02) |
| < 10 ms target | measured p95 on target device | not measured; "8.4 ms" hard-coded from the blueprint | [NOT VERIFIED] |

**Eligibility for the OpenVINO workflow.** The current engine is ~40 floating-point operations of closed-form arithmetic. It is not a neural network and cannot be exported through PyTorch → ONNX → IR; it also needs no accelerator (its evaluation time in JavaScript is far below a millisecond by inspection; not timed by the audit). OpenVINO becomes relevant only for (a) a trained CV model, (b) a trained PINN or MLET surrogate, or (c) a local SLM. For (b), the benchmark must also report numerical deviation of the accelerated, quantised model from its FP32 version **and** from the MLET reference, since quantisation error in strain directly changes fatigue life through the steep transfer functions (EQ-16).

No benchmark number in the application is a hardware measurement. The protocol required before any latency claim is in Appendix F; the benchmark register (Table C.4) is empty by necessity.

<!-- pagebreak -->

# Chapter 11 — End-to-End Architecture and Operational Integrity

The intended flow — Public Reporter → Operations Manager → Field Engineer → Physics and Rule Engine → Policy Maker → Repair Execution and Verification — is the strongest part of the implementation.

Table 11.1 — Operational integrity checks

| Step | Implementation | Persisted / authorised | Status |
|---|---|---|---|
| Report creation and validation | server identity, photo magic bytes ≤ 5 MB, coordinates plausibility, duplicate hint (30 m / 7 days) | yes / server-side | [VERIFIED] (tests) |
| Coordinate and segment association | nearest-segment logic; pilot bounding box approximate (G-01) | yes | [PARTIALLY VERIFIED] |
| Evidence image storage | inside the report JSON (≤ 5 MB); no object storage; no EXIF stripping | yes (file store) | [PARTIALLY VERIFIED] |
| Weather and traffic provenance | DEMO / SYNTHETIC / INFERRED labels attached | yes | [VERIFIED] (labels); data [NOT IMPLEMENTED] |
| Physics-engine invocation | `assessSegment` on demand; snapshot stored with the recommendation | yes | [VERIFIED] (software); physics [FAILED] |
| Error propagation | 400/422/409/503 on workflow and intelligence routes; legacy `/api/simulate` returns 500 or non-finite values | — | [PARTIALLY VERIFIED] |
| Recommendation generation | engineer-entered treatment + engine snapshot | yes | [VERIFIED] |
| Shared persistence | local atomic JSON store; Supabase not applied | single instance only | [BLOCKED] |
| Real-time updates | none (no push channel) | — | [NOT IMPLEMENTED] |
| RBAC enforcement | domain + route guards; recommender ≠ approver | yes | [VERIFIED] (demo identity) |
| Approval and assignment transitions | legal-transition table; stale-version rejection; serialised writes | yes | [VERIFIED] |
| Audit trail | every transition with actor, time, reason; official-only access | yes | [VERIFIED] |
| Report generation | client-side jsPDF "official" report | not persisted | [PARTIALLY VERIFIED] (F-19) |
| Final repair verification | engineer verifies after work-order completion; OM closes | yes | [VERIFIED] |

**UI-only versus backend.** The Road detail, What-If, workflow queues and Road Story consume backend engine outputs (rule-based, labelled). The policy dashboards, WIM/ODOL enforcement views, OpenVINO diagnostics, the WIM training modal, many map popups and the classic layout consume constants, random values or a client-side engine call, and several of them carry no status label (F-23). The "3D cross-section" is a 2D drawing whose base layer (15 cm, 300 MPa) is not used by the engine (F-29). No production system was touched and no work order left the application; the internal work order is explicitly not an SPK.

<!-- pagebreak -->

# Chapter 12 — Findings, Severity, and Remediation

Thirty-one findings were raised: 5 P0, 15 P1, 8 P2 and 3 P3, together with eight verified strengths. The complete register with all twelve fields per P0/P1 finding is Appendix A; Table 12.1 lists the P0 and P1 findings.

![Figure 12.1 — Findings by severity and evidence class. AS-IMPLEMENTED evidence.](figures/fig-12-1-severity.svg)

Table 12.1 — Critical and high findings

| Finding ID | Severity | Component | Evidence | Impact | Required action | Acceptance criteria |
|---|---|---|---|---|---|---|
| F-01 | [P0] | Engine identity | [VERIFIED] | False PINN claim | Relabel or build a real model | No unsupported "PINN/neural" text; or model artifact + metrics |
| F-02 | [P0] | Telemetry | [VERIFIED] | Fabricated AI and Intel figures | Remove random/constant measurements | No `Math.random` in telemetry; figures trace to measurement records |
| F-03 | [P0] | Strain model | [VERIFIED] | Unsafe "safe" verdicts | Verified MLET computation | ≤ 15 % vs verified reference; similarity exponent −1 |
| F-04 | [P0] | WIM training modal | [VERIFIED] | Fabricated official data and training | Remove or mock-up label | No epochs/losses/official wording without real run |
| F-05 | [P0] | CV display | [VERIFIED] | Invented model confidence | Remove model name/confidence | Confidence only from versioned REAL model |
| F-06 | [P1] | Thresholds | [VERIFIED] | Untraceable verdicts | One cited criterion per mode | Threshold register sourced; single constant module |
| F-07 | [P1] | RUL/PCI | [VERIFIED] | Baseless life figures | Documented deterioration model | Structural inputs affect life; one failure definition |
| F-08 | [P1] | Standard axle | [VERIFIED] | 2.255× inconsistency | Single cited axle | Modules agree (test) |
| F-09 | [P1] | Load model / units | [VERIFIED] | Non-physical load scaling | Full load contract | Units and dimensions documented |
| F-10 | [P1] | Moisture/temperature | [VERIFIED] | Uncalibrated effects | Cite or calibrate | Each relation sourced with validity range |
| F-11 | [P1] | Legacy API | [VERIFIED] | Non-finite outputs | Input validation | 400/422 for invalid input; no non-finite output |
| F-12 | [P1] | Device detector | [VERIFIED] | False NPU claim | Honest detection | NPU only from device query |
| F-13 | [P1] | IR export | [VERIFIED] | Fake model artifact | Remove or template label | Real IR only from converted model |
| F-14 | [P1] | OpenVINO pipeline | [NOT IMPLEMENTED] | Edge claims unsupported | Build after model exists | Reproducible benchmark register |
| F-15 | [P1] | Blueprint vs spec | [VERIFIED] | Conflicting requirements | Governance decision | No unexplained DIVERGENT rows |
| F-16 | [P1] | Data | [VERIFIED] | No validation basis | Data acquisition | Inventory with provenance; no unsupported badges |
| F-17 | [P1] | Anti-spoofing | [NOT IMPLEMENTED] | Spam/spoof risk | Implement and measure | FAR/FRR on held-out set |
| F-18 | [P1] | Recommender | [VERIFIED] | Non-design presented as design | Design-method based, advisory | Inputs listed; "not for construction" |
| F-19 | [P1] | PDF export | [VERIFIED] | Unlabelled "official" output | Status on every page | Disclaimer; no unauthorised institution names |
| F-20 | [P1] | Attribution % | [VERIFIED] | Random causal claims | Remove | No attribution without decomposition |

<!-- pagebreak -->

# Chapter 13 — Phased Remediation Roadmap

![Figure 13.1 — Phased remediation roadmap. PROPOSED TARGET STATE; no phase is complete.](figures/fig-13-1-roadmap.svg)

No remediation was implemented during this audit, and no phase is complete until its exit criteria are demonstrated.

<!-- landscape-start -->

Table 13.1 — Phase P0: integrity and scientific identity

| Task ID | Priority | Prerequisite | Required change | Acceptance test | Expected evidence | Exit criteria |
|---|---|---|---|---|---|---|
| R-P0-01 | [P0] | — | Replace "PINN / neural / Burmister solver / OpenVINO inference" wording on legacy screens, README and PDF with the engine's actual status | grep test over `src/`, README, PDF template | CI test listing allowed phrases | F-01 closed |
| R-P0-02 | [P0] | — | Remove `Math.random` and constants from telemetry, loss, benchmark, CV confidence and attribution displays; show "not measured" | unit test: identical inputs → identical payload; grep for `Math.random` in listed files | test output | F-02, F-05, F-20, F-21 closed |
| R-P0-03 | [P0] | — | Remove or relabel the WIM scraping/training modal and IR export | manual review + route test | screenshots, test | F-04, F-13 closed |
| R-P0-04 | [P0] | — | Decide model form: (a) MLET screening engine, (b) MLET-trained surrogate, (c) true PINN; record in DECISION_LOG | decision record exists | DECISION_LOG entry | decision approved by team and mentor |
| R-P0-05 | [P0] | — | Decide governing document (blueprint vs spec v2.2): pilot corridor, stack, 3D, SLM | traceability matrix re-run | updated Appendix D | no unexplained DIVERGENT rows |
| R-P0-06 | [P0] | R-P0-01 | Withdraw engineering verdict text ("STABIL… aman", "MELEBIHI AMBANG") until F-03/F-06 close | grep test | test | no verdicts from unverified responses |

Table 13.2 — Phase P1: workflow integration and contracts

| Task ID | Priority | Prerequisite | Required change | Acceptance test | Expected evidence | Exit criteria |
|---|---|---|---|---|---|---|
| R-P1-01 | [P1] | R-P0-04 | Implement MLET response computation (or adopt a certified library) with full layer inputs, ν, wheel load, pressure, configuration | comparison test vs verified reference (≤ 15 %); Boussinesq limit; similarity | CI test with stored reference grid | F-03, F-09 closed |
| R-P1-02 | [P1] | R-P1-01 | One cited fatigue and one cited rutting criterion with design traffic; single constants module | consistency test across engine, UI, PDF | threshold register with sources | F-06 closed |
| R-P1-03 | [P1] | — | Single standard axle constant with citation | cross-module test | test | F-08 closed |
| R-P1-04 | [P1] | — | Validate `/api/simulate` (or retire it in favour of intelligence routes) | contract tests for invalid classes | test output | F-11 closed |
| R-P1-05 | [P1] | — | Honest device detection; unknown = unknown | unit test with no WebGL info | test | F-12 closed |
| R-P1-06 | [P1] | R-P0-01 | PDF status block and disclaimer on every page; remove institution names | PDF snapshot test | sample PDF | F-19 closed |
| R-P1-07 | [P1] | — | Typed input/output contract with units for every engine call | schema test | contract doc | contracts versioned |

Table 13.3 — Phase P2: shared persistence and provenance

| Task ID | Priority | Prerequisite | Required change | Acceptance test | Expected evidence | Exit criteria |
|---|---|---|---|---|---|---|
| R-P2-01 | [P2] | credentials | Apply Supabase migration; implement `CaseStore` on PostgreSQL; RLS tests | integration tests against database | CI logs | F-24 closed |
| R-P2-02 | [P2] | credentials | Identity provider; retire demo accounts in production | auth tests | config record | REQ-AUTH-002 PASS |
| R-P2-03 | [P2] | API keys | Live weather adapter; traffic counts; WIM adapter when data exists | provider contract tests | provenance records | F-25 closed or labelled |
| R-P2-04 | [P2] | institutional contact | Data acquisition plan executed: FWD, cores, CBR, WIM, PCI surveys, local photos | data inventory review | Appendix E updated with provenance and licences | F-16 closed |
| R-P2-05 | [P2] | R-P0-02 | Status label on every page showing model or telemetry output | lint-style UI test | test | F-23 closed |
| R-P2-06 | [P2] | R-P1-01 | Persist model version, inputs, units and provenance with every prediction | schema test | stored records | provenance complete |

Table 13.4 — Phase P3: end-to-end scientific verification

| Task ID | Priority | Prerequisite | Required change | Acceptance test | Expected evidence | Exit criteria |
|---|---|---|---|---|---|---|
| R-P3-01 | [P3] | R-P1-01 | Cross-check the MLET implementation against a certified program (KENLAYER, WESLEA, BISAR or PyMastic) | agreement within stated tolerance on ≥ 20 structures | comparison table | reference accepted |
| R-P3-02 | [P3] | R-P2-04 | Validate against FWD basins (back-calculation) on held-out sections | RMSE, MAE, bias per sensor offset | validation report | blueprint BAB 10.1 metrics reported honestly |
| R-P3-03 | [P3] | R-P0-04, R-P2-04 | If (b)/(c): build surrogate or PINN with physics residual, data loss, documented split; ablation (data-only vs data+physics) | held-out metrics; out-of-range behaviour | training logs, checkpoints, model card | F-01 closed in the strong sense |
| R-P3-04 | [P3] | R-P1-02, R-P2-04 | Deterioration and RUL model from transfer functions and/or calibrated PCI curves with traffic growth | calibration and validation on dated surveys | model report | F-07, F-18 closed |
| R-P3-05 | [P3] | R-P2-04 | CV model trained and evaluated on local annotated photos; anti-spoofing with FAR/FRR | mAP, per-class metrics, leakage checks | model card | F-05, F-17 closed |
| R-P3-06 | [P3] | R-P3-03 or R-P3-05 | OpenVINO conversion, NNCF quantisation and benchmark on named Intel hardware | Appendix F protocol | benchmark register filled | F-14 closed |
| R-P3-07 | [P3] | all | Uncertainty quantification and limitation statement for every output | review | model cards | claims register updated |

<!-- landscape-end -->

<!-- pagebreak -->

# Chapter 14 — Final Scientific Readiness Assessment

Table 14.1 — Readiness by dimension

| Dimension | Current status | Supporting evidence | Critical limitation | Required next step | Public claim now? |
|---|---|---|---|---|---|
| Genuine PINN implementation | [NOT IMPLEMENTED] | Table 3.1 | No network, residual, data or training | R-P0-04, R-P3-03 | No |
| Mathematical correctness (code = formula) | [VERIFIED] | existing tests; EQ-4..11 | formulas themselves unvalidated | — | Only as "formula engine" |
| Physics consistency | [FAILED] | Tables B.3–B.5; similarity | 1–2 orders below MLET | R-P1-01 | No |
| Strain and failure-threshold traceability | [FAILED] | Table B.6 | no sources; inconsistent | R-P1-02 | No |
| Training-data readiness | [NOT IMPLEMENTED] | Tables 8.1–8.2 | no empirical data | R-P2-04 | No |
| Independent numerical verification | [PARTIALLY VERIFIED] | audit reference (closed-form verified) | not yet cross-checked with certified software; not in CI | R-P3-01, R-P1-01 | Engine: no |
| Empirical validation | [NOT VERIFIED] | — | no FWD/PCI data | R-P3-02 | No |
| RUL and PCI credibility | [FAILED] | EQ-10, Table B.7 | decoupled, inconsistent | R-P3-04 | No |
| Application integration | [VERIFIED] (workflow) / [PARTIALLY VERIFIED] (AI stages) | 226 tests; Table 11.1 | demo identity; local store | R-P2-01, R-P2-02 | Yes, as a workflow prototype |
| OpenVINO readiness | [NOT IMPLEMENTED] | Table 10.1 | no model, no runtime | R-P3-06 | No |
| Reproducibility | [PARTIALLY VERIFIED] | golden fixture; non-deterministic telemetry | random payload fields | R-P0-02 | Partially |
| Competition-claim readiness | [FAIL] | Chapters 3, 4, 10 | five open P0 | Phase P0 | Only claims in list 1 |

## 14.1 Claims supported by current evidence

1. A working multi-stakeholder road-damage reporting and maintenance workflow with four roles, server-enforced permissions, separation of duties, persistence and a complete audit trail (demo identity, local storage).
2. Anonymous citizen reporting with server-issued identity and validated photo uploads.
3. A deterministic, rule-based pavement screening calculation whose outputs are labelled RULE_BASED with LOW confidence on the newer screens, with input provenance and out-of-range flags.
4. A correct ESAL / fourth-power load-equivalency calculation (with the 8.16 t standard axle).
5. Persisted What-If scenario comparisons labelled as simulations.
6. An honest internal validation-gap analysis and this independent audit, including a closed-form-verified layered-elastic reference implementation.

## 14.2 Claims requiring further verification

1. That the formula engine can serve as a screening tool after its responses are replaced or recalibrated against a verified MLET computation (R-P1-01).
2. That fixed strain limits or transfer functions from a named standard apply to the pilot corridor (R-P1-02).
3. Camera and GPS reporting on real phones within the blueprint's 15-second target.
4. Weather, traffic and WIM integration once data sources are connected.
5. Any CV accuracy figure, after a model is trained on local data.
6. Any latency, throughput or power figure, after a model exists and is benchmarked on named Intel hardware.

## 14.3 Claims that must not yet be made

1. That PAVEMENT-PINN contains, trains or runs a Physics-Informed Neural Network.
2. That predictions obey Burmister / multilayer elastic theory or are "equivalent to FEM".
3. That any physics loss, data loss, training epoch or convergence value has been observed.
4. That inference runs on Intel OpenVINO, on an NPU or iGPU, in INT8/FP16, or in under 10 ms (including "8.4 ms").
5. That YOLOv8 or any model classifies damage, with any confidence value, or that photos are screened for spoofing.
6. That remaining useful life, pothole horizon, PCI projections, overlay thickness, material choice, economic loss or budget savings are predictions of a validated model.
7. That data are scraped from, validated by or endorsed by Bina Marga, PUPR, Kemenhub, BMKG or Intel.
8. That a road segment is structurally "safe" or "exceeds the permitted limit" on the basis of the current engine.
9. That the system has been validated with FWD, WIM or field data.

<!-- pagebreak -->

<!-- include: appendices -->

# Appendix E — Data and Model Inventory

Table E.1 — Model and artifact inventory

| Artifact | Expected | Found | Location | Status |
|---|---|---|---|---|
| PINN definition / training code | Python module | none | — | [NOT IMPLEMENTED] |
| PINN weights / checkpoint | `.pt`, `.onnx`, IR `.bin` | none | — | [NOT IMPLEMENTED] |
| CV weights | YOLOv8 `.pt` / IR | none | — | [NOT IMPLEMENTED] |
| CV training notebook | notebook | external Kaggle notebook (not in repository) | `FILES/Docs/` (parent folder) | Candidate; not reproducible here |
| OpenVINO IR | `.xml` + `.bin` | template XML string | `server/services/openvinoExportService.ts` | [FAILED] |
| Formula engine | — | `pinnEngine.ts` | `src/engines/pinn/core/` | deterministic, 296 lines |
| Golden regression fixture | — | 76 scenarios | `tests/physics-validation/fixtures/pinn-golden.json` | regression only |
| Reference solver (audit) | — | MLET on-axis solver + verification + comparison | `docs/audit/forensic-2026-10-14/evidence/` | [VERIFIED] vs closed forms |
| Road datasets | surveyed attributes | hand-authored TypeScript constants | `src/data/reference/*.ts` | synthetic |

Table E.2 — Dataset requirement for closure

| Claim to support | Minimum data | Split rule |
|---|---|---|
| Strain response | layer thicknesses and moduli (incl. base, sub-base), ν, wheel load and pressure, plus FWD basins or instrumented sections | calibrate on some sections, validate on others never used for calibration |
| Moisture effect | soaked/unsoaked CBR or seasonal FWD on the same sections, drainage condition | seasonal hold-out |
| Deterioration / RUL | ≥ 2 dated PCI surveys per segment, traffic and rainfall between them, maintenance history | temporal hold-out |
| Load | WIM axle spectra or axle-load surveys | station hold-out |
| CV | annotated local photos with consent and location metadata policy | location-disjoint split; near-duplicate removal |

# Appendix F — Benchmark Methodology

No benchmark was executed (no model, no runtime). Any future benchmark must report: hardware (CPU model, iGPU, NPU, driver versions, power mode), OS, OpenVINO version and `available_devices`; model hash and source; precision (FP32/FP16/INT8/INT4) and NNCF configuration with calibration set; input shape and batch size; 50 warm-up runs; at least 1000 timed runs with p50/p95/p99 and mean ± standard deviation; cold-start (first inference including compilation) separately; throughput at the reported batch; peak resident memory; device utilisation if measured with a named tool; numerical deviation (max absolute and relative) of each precision and device against FP32 on a fixed validation set and, for physics models, against the MLET reference; the exact script and command. Simulated numbers must never be entered in the register.

# Appendix G — Remediation Acceptance Criteria (critical and high findings)

Table G.1 — Closure conditions

| Finding | Closure condition (all must hold) |
|---|---|
| F-01 | (a) grep for "Physics-Informed Neural Network", "PINN Solver", "neural", "PDE solver" in `src/`, README and the PDF template returns only roadmap or status text; or (b) model card, training script, data split, checkpoints and held-out metrics exist and the UI loads that model |
| F-02 | No `Math.random` in engine, telemetry, benchmark, CV or attribution code; every displayed latency/loss/power figure links to a stored measurement record |
| F-03 | Automated comparison with a verified MLET reference over a documented grid: relative error ≤ 15 % (or a justified tolerance) for εt, εv, w₀; similarity exponent −1 ± 0.01; reference cross-checked with a certified program (R-P3-01) |
| F-04 | Modal removed or reduced to a labelled mock-up without numbers or official-source wording |
| F-05 | No model name or confidence shown unless `modelStatus = REAL` with a recorded `modelVersion` and published metrics |
| F-06 | Threshold register complete with document and clause per value; one constants module; test proves engine, UI and PDF agree |
| F-07 | Deterioration model documented; life responds to structural inputs in documented directions; one failure definition; finite outputs for all valid inputs |
| F-08 | One standard axle constant, cited; cross-module test |
| F-09 | Input contract with units for load, pressure/radius, configuration, all layers' E, ν, h; dimensional note |
| F-10 | Each moisture/temperature relation cited or calibrated with validity range and uncertainty |
| F-11 | Contract tests show 400/422 for invalid, missing, non-numeric, negative and out-of-range inputs; no non-finite output |
| F-12 | Hardware reported only from a positive device query; unit test without WebGL info returns "unknown" |
| F-13 | Export endpoints return "not available" or are captioned templates until a converted model exists |
| F-14 | Benchmark register filled from a reproducible script per Appendix F |
| F-15 | Decision record; matrix shows no unexplained DIVERGENT rows |
| F-16 | Data inventory with provenance, licence and status for every dataset; validation badges only with records |
| F-17 | Anti-spoofing detector with FAR/FRR on a held-out set; rejected reports retained for audit |
| F-18 | Recommendation from a cited design method; inputs shown; "advisory — not a construction design" |
| F-19 | Disclaimer and status on every PDF page; no institution named without authorisation |
| F-20 | No attribution percentage without a documented decomposition method |

# Appendix H — Glossary

Table H.1 — Glossary

| Term | Definition as used in this report |
|---|---|
| PINN | A neural network $u_\theta$ trained with a loss that includes residuals of governing equations evaluated by differentiating $u_\theta$, plus data and boundary terms |
| PDE | Partial differential equation; here the equations of elastostatics |
| MLET / Burmister | Multilayer linear-elastic theory for axisymmetric loads on bonded or unbonded horizontal layers over a half-space |
| Boussinesq solution | Closed-form elastic solution for a homogeneous half-space; the single-layer limit of MLET |
| Elastic similarity | Property that scaling all moduli by k scales all strains and displacements by 1/k |
| FWD | Falling Weight Deflectometer: impulse load test measuring surface deflection basins |
| FEM | Finite Element Method |
| CBR | California Bearing Ratio, a penetration index of soil strength (%) |
| ESAL | Equivalent Single Axle Loads (80 kN standard axle) |
| PCI | Pavement Condition Index, 0–100, computed from surveyed distress |
| RUL | Remaining Useful Life |
| Transfer function | Empirical relation between a critical strain and the number of load repetitions to failure |
| OpenVINO | Intel toolkit and runtime for optimised inference on Intel CPU, GPU and NPU |
| IR | OpenVINO Intermediate Representation (.xml topology + .bin weights) |
| NNCF | Neural Network Compression Framework (quantisation, pruning) |
| iGPU / NPU | Integrated graphics processor / neural processing unit |
| INT8 / FP16 / INT4 | Numerical precisions used for quantised inference |
| WIM | Weigh-In-Motion axle-load measurement |
| ODOL | Over Dimension Over Loading |
| SLM | Small language model |
| RBAC | Role-based access control |
| Provenance | Record of where a value came from and its status (observed, inferred, synthetic, simulated) |
