# Appendix C — Previous Audit Crosswalk (F-01 to F-31)

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15 · Repository commit `4a9b4fc` (branch `feature/m1-report-ownership`, working tree with another session's uncommitted demo-authentication changes, unchanged since the previous audit).

Source of the original findings: PAVEMENT-PINN-AUDIT-001 v1.0 (2026-10-14), `docs/audit/forensic-2026-10-14/PAVEMENT_PINN_Audit_Findings_Register.md`. Source of the v3 actions and re-prioritisation: *PAVEMENT-PINN v3 Dokumen Induk* §4.10 (pp. 27–28) and the decision log §1.3 (pp. 7–8).

## C.1 How the revalidation was done

1. **Change detection.** `find src server tests -newer <audit findings register>` returned no file: no source, server or test file was modified after the audit register was written (2026-10-14 23:13). `git status` shows the same 24 modified, 1 deleted and 10 untracked paths the audit recorded, plus the audit folders themselves. The audited code is therefore the current code.
2. **Spot re-verification.** Every finding whose evidence is a code location was re-checked with a read-only `grep` on 2026-10-15 (commands and hits in Appendix H, T-11). All cited lines still exist with the same content; no finding regressed or was fixed.
3. **Re-classification against v3.** A finding is `SUPERSEDED_BY_V3` when v3 replaces the requirement it was measured against (for example, "anti-spoofing" becomes the Photo Trust Gate). Superseded does not mean closed: the code still contains the defect until the v3 replacement ships, so the *next action* column is what matters.
4. **No status was upgraded to `RESOLVED_VERIFIED`.** No defect has been corrected since the audit.

Status vocabulary: [CONFIRMED_OPEN] defect still present; [PARTIALLY_RESOLVED] decision or part of the fix exists, defect still visible; [SUPERSEDED_BY_V3] original requirement replaced by a v3 decision, replacement not yet built; [BLOCKED] cannot be verified or fixed without an external resource; [RESOLVED_VERIFIED], [REGRESSED], [NOT_REPRODUCIBLE] — none this cycle.

## C.2 Severity changes made by v3

v3 §4.10 assigns its own priorities. Under D-01 the v3 document governs, so the v3 priority is adopted below and the original severity is kept for history.

Table C.1 — Findings whose priority v3 raised

| ID | Audit severity (14 Oct) | v3 priority (§4.10) | Reason implied by v3 |
|---|---|---|---|
| F-06 | [P1] | [P0] | Unsourced "melebihi batas ijin" verdicts are a prohibited claim (§1.5) |
| F-07, F-18, F-22 | [P1] / [P1] / [P2] | [P0] | RUL in days, pothole horizon and APBN savings are prohibited claims (§1.5) |
| F-12, F-14 | [P1] | [P0] | Unmeasured NPU/latency figures are prohibited claims (§1.5, D-11) |
| F-13 | [P1] | [P0] (with F-04) | Fake IR export is part of the fake training story |
| F-15 | [P1] | [P0] | Source-of-truth conflict is the first decision (D-01, D-03) |
| F-16, F-19, F-20 | [P1] | [P0] | "FWD Validated", agency names and random attributions are prohibited claims |
| F-21 | [P2] | [P0] (with F-02) | Determinism is a design principle (§4 "Prinsip 4") |

<!-- landscape-start -->

## C.3 Crosswalk


Table C.2 — Previous findings, current evidence and next action

| ID | Original finding (abridged) | Orig. sev. | Previous evidence | Current evidence (2026-10-15) | Current status | Next action (v3 task) |
|---|---|---|---|---|---|---|
| F-01 | Closed-form formula presented as a trained PINN | [P0] | `pinnEngine.ts` (296 lines, no weights); README l.1 | Unchanged. README l.1 still "Physics-Informed Neural Network Decision Support System"; `assessment.ts:17` labels engine RULE_BASED honestly | [CONFIRMED_OPEN] | R0-01: relabel all legacy "PINN/neural" text until Module D exists; later label "PI-surrogate vX (dilatih dari MLET)" (D-02) |
| F-02 | Fabricated telemetry (loss, latency, power, NPU) | [P0] | `pinnEngine.ts:203-240`, Navbar, dashboards, PDF | `pinnEngine.ts:217` latency jitter, `:238-239` random losses still present; 15 `Math.random` call sites remain in 4 runtime files | [CONFIRMED_OPEN] | R0-02 with `no-fake-claims.test.ts` |
| F-03 | Strains 1–2 orders below layered-elastic theory | [P0] | `evidence/compare-grid.json`: engine 20/17 µε vs reference 303/793 µε | Engine unchanged; v3 §4.4 reports PyMastic 303/793 µε for the same case, matching the audit solver (M-01 in Appendix D) | [CONFIRMED_OPEN] (reconfirmed by a second, independent solver) | R1-03: replace with `/v1/assess` (MLET) |
| F-04 | Simulated WIM scraping + "PINN training" modal | [P0] | `BinaMargaWimPipelineModal.tsx`, `binaMargaWimScraper.ts:70-155` | 7 `Math.random` calls in `binaMargaWimScraper.ts` (l.72-110) | [CONFIRMED_OPEN] | R0-03: delete modal and service; route returns 404 |
| F-05 | CV class/confidence from file-name keywords | [P0] | `cvDamageClasses.ts:24-244` | Unchanged | [CONFIRMED_OPEN] | R0-04: show "belum diklasifikasi" until Module C; confidence only with `modelStatus=REAL` |
| F-06 | Strain limits 180/200/250/350 µε untraceable | [P1] | `pinnEngine.ts:128-132` | `pinnEngine.ts:128-129` still prints "melebihi batas ijin Bina Marga (200 µε)" | [CONFIRMED_OPEN] | R0-05 (text) then R1-05 (cited transfer function, criterion shown) |
| F-07 | RUL/pothole horizon/PCI projection heuristic | [P1] | `pinnEngine.ts:90-112,173-186` | Unchanged | [SUPERSEDED_BY_V3] (D-05, D-06) — defect still shipped | R1-06: remove fields; Indeks Umur P10/P50/P90 replaces them |
| F-08 | Two standard axles (10 t vs 8.16 t) | [P1] | `pinnEngine.ts:54`; `esal.ts:12` | `pinnEngine.ts:54` still `axleLoadTon / 10.0`; `esal.ts:12` `STANDARD_AXLE_TON = 8.16` | [CONFIRMED_OPEN] | R1-07: single constant 8.16 t with citation, cross-module test |
| F-09 | Load model lacks q, a, configuration, ν | [P1] | `pinnEngine.ts:56-80` | Unchanged; v3 reference `mlet_strains` takes q, tyres, dual spacing, ν per layer | [CONFIRMED_OPEN] | R1-03 (input contract of `/v1/assess`) |
| F-10 | Linear moisture/temperature heuristics; no pore pressure | [P1] | `pinnEngine.ts:35-50` | Unchanged | [SUPERSEDED_BY_V3] (§1.4: pore pressure → RENCANA; wet = soaked-CBR factor) | R1-08: remove linear rain factor; wet/dry scenario with editable soaked factor labelled ASSUMED |
| F-11 | `/api/simulate` accepts any input | [P1] | `simulationController.ts` | `server/routes/pinn.routes.ts:7` still registers `API_PATHS.simulate` | [CONFIRMED_OPEN] | R1-09: retire route or full schema validation (400/422) |
| F-12 | Device detector asserts NPU by default | [P1] | `deviceDetector.ts:14-15,46` | `deviceDetector.ts:15` default "Intel® Core™ Ultra Processor with NPU…"; `:54` recommends NPU | [CONFIRMED_OPEN] | R0-06: browser shows "tidak diketahui"; devices only from Python `core.available_devices` (R5-02) |
| F-13 | Hand-written IR XML with custom op | [P1] | `openvinoExportService.ts:15-42` | `openvinoExportService.ts:29` still `type="PhysicsPDEOp" version="custom"` | [CONFIRMED_OPEN] | R0-03: endpoint 404 |
| F-14 | No OpenVINO runtime/benchmark; "< 10 ms", "8.4 ms" | [P1] | repository-wide; `simulatedBenchmark.ts` | `simulatedBenchmark.ts` present; `demoAccounts.ts:128` (uncommitted file of another session) contains "Latensi <10 ms, NPU/CPU" | [CONFIRMED_OPEN] | R0-02 (remove text) and R5-01 (real `measurements/*.json`) |
| F-15 | Blueprint vs code source-of-truth conflict | [P1] | `karawangPilot.ts`; `screening.ts:40,83`; `narrativeService.ts:9` | Decision now exists in v3 (D-01, D-03, D-10) but code unchanged: `screening.ts:83` marks Narogong reports OUT_OF_SCOPE; `narrativeService.ts:9` still `gemini-3.7-flash` | [PARTIALLY_RESOLVED] (decided, not implemented) | R0-07 (corridor config), R4-03 (cloud call off), R0-08 (DECISION_LOG merge) |
| F-16 | No empirical data; "FWD Validated", WIM stations | [P1] | `LeafletMap.tsx:757,988` | `LeafletMap.tsx:26,282-287,362` still builds WIM-station correlations with licence plates | [CONFIRMED_OPEN] | R0-09: remove badges/stations; data inventory |
| F-17 | Anti-spoofing absent | [P1] | repository-wide | Unchanged; photo checks are magic-byte, 5 MB and duplicate hint only (`photoValidation.ts`) | [SUPERSEDED_BY_V3] (D-08 Trust Gate) | R3-02 (Module A with FAR/FRR) |
| F-18 | Overlay/material from PCI look-ups | [P1] | `pinnEngine.ts:115-125` | Unchanged | [SUPERSEDED_BY_V3] (D-14 option comparison) | R1-06 remove; R6-06 option comparison |
| F-19 | "Official" PDF with simulated telemetry, agency names | [P1] | `pdfGenerator.ts:78-163` | `pdfGenerator.ts:163` "…sistem kecerdasan buatan terpadu PUPR, Kemenhub, & Intel OpenVINO" | [CONFIRMED_OPEN] | R0-10: status block + "bukan dokumen resmi" on every page; snapshot test |
| F-20 | Random "PINN contribution" percentages | [P1] | `CommunityReportsDashboard.tsx:259-261`; `LeafletMap.tsx:360-361` | Same lines still call `Math.random` | [CONFIRMED_OPEN] | R0-02 |
| F-21 | Non-deterministic payloads | [P2] | `pinnEngine.ts:217,238-239,284` | Unchanged (`SIM-${Date.now()}` at l.284) | [CONFIRMED_OPEN] | R0-02 (payload equality test) |
| F-22 | Invented economic/Zero-ODOL figures | [P2] | `pinnEngine.ts:188-201` | Unchanged | [SUPERSEDED_BY_V3] (§1.4: APBN savings removed) | R1-06 |
| F-23 | Missing status labels on several pages | [P2] | page list in audit A.2 | Unchanged | [CONFIRMED_OPEN] | R0-11: status-label component + lint-style test |
| F-24 | Supabase migration not applied | [P2] | migration file; `fileCaseStore.ts` | Unchanged; credentials still absent | [BLOCKED] | R7-02 after D-18 choice (Supabase or one VM) |
| F-25 | Demo weather/traffic providers | [P2] | `evidence.ts:56-153` | Unchanged, honestly labelled DEMO | [SUPERSEDED_BY_V3] (D-12 Module E) | R6-08 (Module E from counts × VDF) |
| F-26 | Ageing, sub-standard alert, AC-WC/PMA not implemented | [P2] | repository-wide | Unchanged | [SUPERSEDED_BY_V3] (D-14, D-15) | R6-06, R6-07 |
| F-27 | No reference, CV or E2E tests | [P2] | `tests/` | Unchanged: 226 tests, none compares against an independent reference; no Playwright, no pytest | [CONFIRMED_OPEN] | R1-04 (MLET reference test in CI), R7-01 (Playwright) |
| F-28 | `assessSegment` clamps out-of-range inputs | [P2] | `assessment.ts:120-141` | `assessment.ts:131-132` still clamps | [CONFIRMED_OPEN] | R1-09 (reject, never clamp silently) |
| F-29 | 2D section shows a base the engine ignores | [P3] | `SimulationPanel.tsx:468,495` | Unchanged | [CONFIRMED_OPEN] | R1-10 (section drawn from real inputs + MLET grid, D-16) |
| F-30 | Stale README/labels/package name | [P3] | `README.md:1,262`; `package.json` | README l.1 unchanged; `package.json` name `react-example` | [CONFIRMED_OPEN] | R0-12 |
| F-31 | Unsanitised filename query parameter | [P3] | `openvinoController.ts` [NOT VERIFIED] | Static check: `openvinoController.ts:6,11` interpolate `req.query.device` into `Content-Disposition` without whitelist (not exercised over HTTP) | [CONFIRMED_OPEN] (static) | Removed with R0-03; otherwise whitelist |

<!-- landscape-end -->

## C.4 Summary

Table C.3 — Status counts

| Status | Count | IDs |
|---|---|---|
| [CONFIRMED_OPEN] | 22 | F-01–F-06, F-08, F-09, F-11–F-14, F-16, F-19–F-21, F-23, F-27–F-31 |
| [SUPERSEDED_BY_V3] | 7 | F-07, F-10, F-17, F-18, F-22, F-25, F-26 |
| [PARTIALLY_RESOLVED] | 1 | F-15 |
| [BLOCKED] | 1 | F-24 |
| [RESOLVED_VERIFIED], [REGRESSED], [NOT_REPRODUCIBLE] | 0 | — |

All five original P0 findings (F-01 to F-05) remain open. Under the v3 priorities, 18 findings are P0 work (§4.10), all still open.
