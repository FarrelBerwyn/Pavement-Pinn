# Document Control

Table 0.1 — Document metadata

| Field | Value |
|---|---|
| Document ID | PAVEMENT-PINN-V3-BASELINE-001 |
| Title | PAVEMENT-PINN v3 — Consolidated Forensic Audit, Reference-Code Comparison & Development Baseline |
| Version / date | 1.0 · 2026-10-15 |
| Repository | `pavement-pinn` (local folder `…/Intel AI Global Impact Festival 2026/Projects/pavement-pinn`) |
| Branch / commit | `feature/m1-report-ownership` · `4a9b4fc49ec6e1d583648b2eaaa26293577add2e` |
| Working tree | 24 modified, 1 deleted, 10 untracked paths from another session's demo-authentication work (unchanged since AUDIT-001), plus the audit folders. Nothing was staged, committed, stashed, reset or overwritten by this baseline |
| Inputs | `AGENTS.md` (sha256 `06a7635c…4b535`); *PAVEMENT-PINN v3 Dokumen Induk*, 65 pages, v3.0 dated 15 Oct 2026 (sha256 `1cdc4229…b6ab`); `pavement_pinn_v3_code.zip` (sha256 `664c6a7f…2b88`); AUDIT-001 v1.0 (2026-10-14) and its registers |
| Method | Read-only repository inspection; full reading of AGENTS.md and the 65-page PDF (text layer); isolated, non-executed inspection of the ZIP; independent numerical checks with the AUDIT-001 layered-elastic solver and JavaScript ports (`evidence/`) |
| Not done | No Python executed (blocked by machine policy, F-38); no `npm test`/`npm run lint` re-run (code identical to the audited state, see §1.4); no build, deploy, migration, dependency installation or Git state change |
| Status | Baseline issued for team review. Overall project status against v3: **NOT v3-COMPLIANT** — 19 open P0 items |
| Classification | Internal engineering document of the project team. Not approved by, and not affiliated with, Intel or any government agency |
| Companion files | Appendices A–G as separate Markdown registers in this folder; `evidence/`; this PDF and its generated Markdown master |

Table 0.2 — Status labels used in this report

| Label | Meaning |
|---|---|
| [AS-IS IMPLEMENTATION] | What the repository actually contains today, from source inspection |
| [V3 SPECIFICATION] | What the v3 Dokumen Induk or AGENTS.md requires; not evidence that it exists |
| [REFERENCE ZIP] | Candidate code from the other team's package; not executed here |
| [VERIFIED FINDING] | Established by evidence collected or re-checked in this baseline |
| [PROPOSED TARGET STATE] | Recommended future state; does not exist |
| [TERBUKTI] / [TARGET] / [RENCANA] / [DILARANG] | v3 §1.1 claim legend: proven in this repository / measurable goal not yet measured / not built / prohibited claim |

# Chapter 0 — Executive Summary

**Central question.** Given the repository's actual state, the 14 October forensic audit, the v3 specification and the reference team's code, what should be kept, corrected, integrated, redesigned, tested and built next?

**Short answer.** Keep the workflow backbone; remove every unmeasured number first; then build the physics path in a separate Python service using the reference code only after the team reproduces it and fixes the defects found here. Nothing in the AI or physics stack of v3 exists in this repository yet, and the machine used for this baseline cannot run Python at all, which is now the main schedule risk.

Table 0.3 — Executive summary

| Area | Finding | Label |
|---|---|---|
| Repository state | Code unchanged since AUDIT-001: no file in `src/`, `server/`, `tests/` is newer than the audit register | [VERIFIED FINDING] |
| Previous audit | 31 findings re-validated: 22 confirmed open, 7 superseded by v3 but still shipped, 1 partially resolved (F-15: decided in v3, not implemented), 1 blocked. None fixed, none regressed | [VERIFIED FINDING] |
| Prohibited claims | Six of the eight v3 §1.5 prohibited claims are still visible in the current build (PINN solver, unmeasured latency/NPU, WIM/FWD validation, "aman/melebihi batas ijin", days-to-pothole, agency names) | [VERIFIED FINDING] |
| Structural engine | The current engine is a heuristic formula, not a solver and not a network. Its strains are 15× (εt) and 47× (εv) below layered-elastic theory on the v3 reference case | [VERIFIED FINDING] |
| MLET reference case | The v3 reference values (εt 303 µε, εv 793 µε at 10 t; 274/663 at 8.16 t; exact ×3 similarity) are reproduced to 0.1 % by the audit's independent solver | [VERIFIED FINDING] |
| Reference ZIP | 11 safe files; core math (AI transfer functions, life index, ESAL example, priority example, knapsack property, number checker examples) re-derived and correct. Five design defects found before any training: missing d/a feature (F-32), physically wrong monotonicity signs (F-33), incomplete validation (F-34), no guardrail code (F-35), Monte Carlo seeding/zero-growth issues (F-36) | [VERIFIED FINDING] |
| "DIUJI" status | Reported by the other team; not inherited. No reference file was executed here | [REFERENCE ZIP] |
| Surrogate / PINN | No trained surrogate, dataset, weights or metrics exist anywhere. All surrogate accuracy numbers in v3 are "contoh dokumen" | [TARGET] |
| Benchmarks | None exist; any latency/NPU figure would be fabricated | [RENCANA] |
| Privacy | Stored citizen photos keep EXIF/GPS metadata; no blurring; no deletion job (F-46) | [VERIFIED FINDING] |
| Environment | Python is blocked by Windows Application Control (F-38); all Python phases blocked on this machine | [VERIFIED FINDING] |
| Recommendation | Start with Phase 0 "Truthful status" (pure TypeScript, needs only approvals); resolve HD-01 (Python runtime) in parallel; do not train or benchmark anything until R1-02 reproduces the reference tests on the team's own Intel machine | [PROPOSED TARGET STATE] |

What must not be claimed today: that the project is v3-compliant; that a PINN or PI-surrogate exists or was trained; that the reference code passed tests in this repository; any latency, NPU, accuracy or energy figure; field (FWD/WIM) validation; that the system is offline-capable.

# Chapter 1 — Audit Provenance and Document Authority

## 1.1 Source hierarchy

Table 1.1 — Sources and their authority

| Source | Role in this baseline | Authority |
|---|---|---|
| A — Current repository | Object of the audit; the only evidence of what exists | Highest for "what is" |
| B — AUDIT-001 (2026-10-14) and registers | Historical baseline; every finding re-validated (Appendix C) | Historical; superseded by new evidence |
| C1 — v3 Dokumen Induk (65 pp.) | Target specification; decisions D-01–D-18 | Highest for "what should be" (D-01) |
| C2 — AGENTS.md | Operational rules for agents; defers to the PDF on conflict | Below the PDF |
| C3 — Reference ZIP | Candidate implementation; quality checked independently | Lowest; never proof of existence |

## 1.2 Conflicts found between sources

Table 1.2 — Source conflicts and their resolution in this baseline

| Conflict | Sources | Resolution |
|---|---|---|
| Strain under-prediction "14 hingga 77 kali" vs "15 sampai 47 kali" | v3 §0 p. 4 vs v3 §4.4 p. 21 and AGENTS §0 | Report the reference-case ratios 15×/47× with the case named (F-41) |
| Severity of F-06, F-12–F-16, F-19, F-20 (P1 in AUDIT-001, P0 in v3) | AUDIT-001 vs v3 §4.10 | v3 governs (D-01); both recorded (Appendix C, Table C.1) |
| Monotonicity sign for εt vs E1/E3 | ZIP `SIGNS` has −1; v3 §4.4 candidate list omits it | Neither is adopted; independent check shows violations (F-33) |
| Austroads equation with SF factor | v3 §4.4 shows SF; ZIP omits it | Open (HD-04, F-49) |
| Workflow state names | v3 Fig. 3.2 vs current spec v2.2 §24 lifecycle | Open (HD-02, F-39); current states kept |
| Decision IDs D-01… vs D-001… | v3 vs `docs/DECISION_LOG.md` | Prefix `V3-` proposed (Appendix G) |
| Python service vs "no FastAPI yet" | v3 D-04 vs existing D-001 | v3 governs; D-001 marked superseded in part after approval |
| Commit trailers | AGENTS §6 (`Assisted-by:`) vs the repository owner's attribution rule | Open (HD-08) |
| "Trust Gate rejects out-of-corridor" vs "REFERRED" | ZIP `trust_gate.py` vs v3 §4.1 | Specification wins; F-43 |

## 1.3 Method

1. Read-only reconnaissance: repository root, branch, commit, `git status` (including ignored files), recent log, CI workflows, test inventory, existing project instructions (none at repository root; the user-level memory notes were consulted), and the user's running development server on port 3000 (left untouched).
2. Recovery of AUDIT-001 from `docs/audit/forensic-2026-10-14/` and re-validation of each finding (Appendix C).
3. Full reading of AGENTS.md and of all 65 PDF pages via `pdftotext -layout` and `-raw` (the table of §4.10 and §1.3 needed raw order). Page images could not be rendered (no `pdftoppm`); diagrams were read from their text layer.
4. ZIP listed, hashed and extracted into an isolated temporary directory; every file read; nothing executed.
5. Independent numerical checks (`evidence/v3check.mjs`, `evidence/v3check2.mjs`; Node v24.16.0; run log `evidence/evidence-run.log`).
6. Comparative assessment, registers, this report, and an automated PDF QA pass.

## 1.4 Why the test suite was not re-run

AUDIT-001 ran `npm test` (226/226 pass) and `npm run lint` (clean) on this exact working tree on 2026-10-14 (its tests T-03, T-04). No file under `src/`, `server/` or `tests/` has changed since (Appendix H, T-11). Re-running would produce no new information, so the earlier results are cited. Re-running becomes mandatory with the first code change (Chapter 11).

# Chapter 2 — Previous Audit Findings and Current Status

All 31 AUDIT-001 findings were re-checked against the current code. The full crosswalk with evidence and next action per finding is Appendix C.

Table 2.1 — Status of previous findings

| Status | Count | Meaning for planning |
|---|---|---|
| [CONFIRMED_OPEN] | 22 | Fix as specified in v3 §4.10 |
| [SUPERSEDED_BY_V3] | 7 | Requirement replaced (e.g. anti-spoofing → Trust Gate); the defective code is still shipped and must be removed |
| [PARTIALLY_RESOLVED] | 1 | F-15: v3 decided the source of truth and the corridors; code still Karawang-only and still calls a cloud LLM |
| [BLOCKED] | 1 | F-24: no Supabase credentials |
| [RESOLVED_VERIFIED] | 0 | — |

The five original P0 findings — formula presented as PINN (F-01), fabricated telemetry (F-02), strains one to two orders too low (F-03), fake WIM training (F-04) and invented CV confidence (F-05) — are all still open. F-03 is now confirmed by two independent solvers (PyMastic as reported by v3, and the audit solver re-run here).

# Chapter 3 — V3 Specification Traceability

Appendix A maps every v3 decision (D-01–D-18), role feature (W1–W7, O1–O6, E1–E7, K1–K6), module (A–H), API endpoint, prohibited claim (§1.5) and demo Definition-of-Done item (§8.4) to the current code.

Table 3.1 — Traceability summary

| Group | Items | [TERBUKTI] | [RENCANA] / [TARGET] | [DILARANG] present |
|---|---|---|---|---|
| Decisions D-01–D-18 | 18 | 0 | 18 | 8 contradicted by shipped text (D-02, D-05, D-06, D-07, D-11, D-12, D-13, D-14) |
| Role features | 27 (incl. admin) | 2 (O3 review with reason; O5 separation of duties) | 23 | 2 (K1 constants, K5 PDF) |
| Modules A–H | 10 rows | 0 | 10 | — |
| API contracts | 5 + data model | 0 | 6 | — |
| Prohibited claims | 8 | — | — | 6 present, 2 not observed |
| Demo DoD | 6 | 0 | 6 | DoD-1 fails today |

The parts of the current system that v3 explicitly builds on — state machine, server-side RBAC, separation of duties, audit trail, honest status vocabulary in the new domain layer, `esal.ts` with the 8.16 t axle, persisted What-If — remain sound and are the reason this baseline recommends no rewrite of the workflow layer.

# Chapter 4 — Reference ZIP Technical Assessment

Appendix B lists every file with reported status, independent evidence, compatibility and disposition. Key points:

- **Safety.** 11 plain-text files, no unsafe paths, links, binaries or network/shell calls; extracted only to an isolated temporary directory. One risky default: `np.load(..., allow_pickle=True)` on a dataset file.
- **What holds up.** `mlet_strains` produces the reference strains that an independent solver reproduces (M-01–M-03); the Asphalt Institute constants, the life-index closed form, the ESAL example, the priority example and the knapsack property are correct (M-09, M-13, M-17–M-19).
- **What does not.** The surrogate feature set cannot represent the dual-tyre geometry it is trained on (F-32); two of six monotonicity constraints contradict layered-elastic results (F-33); the D-04 guardrail exists only in prose (F-35); training lacks OOD and ablation (F-34); Monte Carlo seeding and zero growth are mishandled (F-36); the number checker rejects English decimals and citation years and accepts swapped values (F-37); the Trust Gate drops out-of-corridor photos instead of referring them (F-43); YOLO is AGPL-3.0 (F-42).
- **Status.** The other team's "DIUJI" applies to their environment. In this repository every reference component is [RENCANA] until R1-02.

Table 4.1 — Disposition summary

| Disposition | Components |
|---|---|
| [INTEGRATE_REFERENCE] (after R1-02) | `mlet_strains`, `life_index_years`, `priority_score`, `test_core.py` as pytest |
| [ADAPT] | `allowable_reps`, ESAL functions, knapsack, number checker, `trust_gate.py`, `gen_mlet_dataset.py`, `mc_life.py`, `slm_brief.py`, `bench_tools.py` |
| [INVESTIGATE] → team rewrite | `train_pi_surrogate.py` |
| [DEFER] | `train_yolo.py` (licence decision and local photos first) |

# Chapter 5 — Current-versus-Target Architecture

![Figure 5.1 — As-is architecture (browser to Express over HTTPS/JSON; the domain kernel calls the heuristic engine). AS-IS IMPLEMENTATION, from source inspection on 2026-10-15.](figures/fig-5-1-as-is.svg)

![Figure 5.2 — v3 target architecture. V3 SPECIFICATION (§3.2) as PROPOSED TARGET STATE; nothing in the Python service exists yet.](figures/fig-5-2-target.svg)

## 5.1 Component comparison

Table 5.1 — Component-by-component comparison and disposition

| Component | Current [AS-IS IMPLEMENTATION] | v3 target [V3 SPECIFICATION] | Class today | Disposition |
|---|---|---|---|---|
| Frontend | React 19 + Vite SPA, Leaflet/MapLibre 2D | Same + PWA/Service Worker, ID/EN | Production-capable (non-PWA) | [KEEP] + [ADAPT] |
| Workflow API | Express, state machine (11 states), RBAC, audit, optimistic concurrency, file store | Same + 4 new states, routing | Production-capable | [KEEP]; states [INVESTIGATE] (HD-02) |
| Identity | Server-signed sessions; credential login being added in the working tree | Real identity for internal roles (D-18) | Partial | [ADAPT] |
| Photo intake | Magic bytes, 5 MB, duplicate hint 30 m/7 d; EXIF kept | Trust Gate + EXIF strip + blur + deletion | Partial | [ADAPT] (keep checks, add Module A/B) |
| Damage classification | Keyword match, constant confidence | YOLO 4 classes OpenVINO INT8 | Mock | [REMOVE] now; Module C later |
| Structural engine | `pinnEngine.ts` heuristic formula | PyMastic MLET + PI-surrogate + guard | Mock/heuristic | [REPLACE] (justified by F-03) |
| Life/deterioration | RUL days, pothole horizon, PCI projection | Indeks Umur P10/P50/P90 | Heuristic, prohibited | [REMOVE] + build Module D3 |
| Traffic load | Demo provider; "Virtual WIM" modal | Counts × VDF (Module E) | Demo/mock | [REMOVE] WIM; [ADAPT] provider |
| ESAL | `esal.ts`, 8.16 t fourth power | Same + counts × VDF | Production-capable | [KEEP] |
| Prioritisation | Workflow buckets | Transparent score + knapsack | None | [INTEGRATE_REFERENCE] (TypeScript) |
| Narrative | Cloud Gemini + fallback | Local SLM on NPU + checker | Cloud dependency | [REPLACE] (D-10) |
| Telemetry/benchmark | `Math.random`, constants, simulated benchmark | `measurements/*.json` only | Fabricated | [REMOVE] then build Evidence page |
| Device detection | Browser guesses NPU | Python `available_devices` | Fabricated | [REPLACE] |
| PDF export | Agency names, no disclaimer | Status block + disclaimer per page | Defective | [ADAPT] |
| Persistence | Atomic JSON file store; Supabase migration unapplied | Supabase or VM + backup | Partial | [DEFER] to HD-06 |
| Tests | 226 node tests; no reference/E2E/pytest | + pytest + MLET reference + Playwright | Partial | [ADAPT] |

## 5.2 End-to-end workflow trace

Table 5.2 — Golden path: current vs target

| Step | Current path | Target path (v3 Fig. 3.2) | Gap |
|---|---|---|---|
| Citizen report | `SUBMIT` → `SUBMITTED`; photo validated (type/size) and stored with EXIF | Compressed photo, on-phone checks, tracking code | Compression, tracking code, EXIF strip |
| Input validation / privacy | `BEGIN_SCREENING` (SYSTEM) → rule screening, duplicate hint, OUT_OF_SCOPE for non-Karawang | `/v1/screen`: EXIF strip → Trust Gate → blur → YOLO | Entire Module A/B/C; corridor config |
| Damage classification | Keyword match (display only) | Versioned YOLO; confidence internal only | Model |
| Operator triage | `SCREENING_PASSED`/`NEEDS_REVIEW` → `VERIFIED` or `CLOSE_INVALID` with reason | `SCREENED` → `TRIAGED` by risk score; REJECTED_WITH_REASON, MERGED, REFERRED | Score, merge, referral, state names |
| Structural assessment | `assessment.ts` RULE_BASED formula, honestly labelled | `/v1/assess`: PyMastic εt/εv, P10/P50/P90, criterion | Python service |
| Engineering review / recommendation | `SUBMIT_INSPECTION`, `RECOMMEND_ACTION` by engineer | Same + option comparison + SLM brief | Options, SLM |
| Human approval | `APPROVE_ACTION` by operations manager; self-approval forbidden | Same (O5) | none — keep |
| Repair | `START_WORK`, `COMPLETE_WORK_ORDER` (internal, not SPK) | Same | none |
| Repair verification | `RESOLVE` by engineer → `CLOSE_RESOLVED` | After-photo + YOLO check + citizen confirmation | After-photo rule, confirmations |

# Chapter 6 — Mathematical and Scientific Verification

Appendix D holds the full register (M-01–M-25) and equations EQ-1 to EQ-7. This chapter states the conclusions.

![Figure 6.1 — Critical strains on the v3 reference case (10 t, 4 isolated tyres, q 0.55 MPa). Legacy engine values from AUDIT-001; MLET values from the independent audit solver, matching the PyMastic values reported in v3. VERIFIED FINDING.](figures/fig-6-1-strains.svg)

## 6.1 Engine identity (D-02)

The current engine is a heuristic closed-form formula (M-24). The reference package contains a numerical physics solver wrapper (PyMastic) and an untrained surrogate design. The project therefore has **neither a PINN nor a trained physics-informed surrogate**. After R2 it would have a hybrid: physics solver as reference, surrogate as accelerator, guarded fallback to the solver.

## 6.2 MLET

The reference values are reproduced independently to 0.1 % (M-01, M-02) and elastic similarity is exact (M-03). Contact radius, sign convention and sampling depths are consistent (M-05–M-07). The dual-tyre values (227/876 µε) and the PyMastic unit convention could not be reproduced without Python (M-04, M-05) and remain to be shown by R1-02.

```math EQ-8 | Reference-case contact radius used in M-01 (10 t axle, 4 tyres, q = 0.55 MPa).
a = \sqrt{\frac{10 \times 9806.65 / 4}{\pi \times 0.55}} = 119.1 \, \mathrm{mm}
```

## 6.3 Transfer functions and life index (D-05)

The Asphalt Institute constants match the published form (M-09). The Austroads branch is the 2004 form without the SF/RF factor shown in v3 (M-10, F-49). The criteria differ about 200–300× in $N_d$ (M-11), so the choice must be made, cited and displayed by a human (HD-04). The life-index closed form is correct (M-13); its use in `mc_life.py` breaks for zero growth (F-36). No output may be expressed in days or as a pothole horizon.

## 6.4 Surrogate validation (D-04)

![Figure 6.2 — Direction check of the six non-zero SIGNS entries: share of 54 layered-elastic structures in which a +10 % change of the feature moves the output in the required direction. VERIFIED FINDING (isolated tyre, on axis); the dual configuration remains to be checked with PyMastic.](figures/fig-6-2-signs.svg)

The pipeline MLET → dataset → training → held-out validation → OpenVINO export → cross-check → fallback has no executed step. Two design defects must be fixed before data generation: the d/a ratio (F-32) and the sign table (F-33). The 10 % cross-check fallback is a target acceptance criterion with no code yet (F-35). No surrogate accuracy, FP16/INT8 deviation or timing may be cited (M-22, M-23).

## 6.5 Monte Carlo

Determinism is designed in (hash seed) but not executed. Required changes: common random numbers between dry and wet scenarios, seed tied to the surrogate version, zero-growth branch, provenance fields (F-36). P10/P50/P90 describe the spread of the stated input distributions, which are assumptions — they are not calibrated confidence intervals and must not be presented as such.

## 6.6 Other scientific claims

ESAL uses the 8.16 t standard axle in `esal.ts` (keep) while the legacy engine still uses 10 t (F-08). The VDF values in the v3 example are illustrative, not MDP 2017. The priority score reproduces its documented example; it is a policy instrument, not a learned model, and its validation target (Spearman ≥ 0.6 against blind engineer rankings) is a [TARGET]. Surface severity rules from photos are approximate by design (v3 §4.3). No FWD, deflection, WIM or field data exist: every structural number is at best numerically verified, never field-validated.

# Chapter 7 — Data, Privacy, and Responsible AI

Table 7.1 — Responsible-AI requirements against the current build

| Requirement (v3) | Current state | Gap / finding |
|---|---|---|
| Numerical honesty (D-11, AGENTS rule 1) | 15 `Math.random` call sites in runtime UI/engine code; simulated benchmark; "Latensi <10 ms" text | F-02, F-14, F-20 — Phase 0 |
| Provenance per output (AGENTS rule 3) | New domain layer records provenance and status (`RULE_BASED`, `DEMO`, `SYNTHETIC`); legacy screens do not | F-23; extend to inference outputs (model version, device, units, status) |
| Human authority (§3.5) | AI never transitions state: only `SYSTEM` screening steps, all human decisions role-guarded; separation of duties tested | Keep; inference service must not call the state machine |
| Privacy (D-09) | EXIF kept, no blur, no deletion job, no retention log | F-46 — R3-01, R3-03 |
| Public-map privacy (W5) | Not verified in this baseline | Add public-response field test |
| Rate limit and duplicates | Rate limiting on intelligence and workflow routes; duplicate hint | Add pHash, per-device salted hash |
| GenAI (D-10) | Cloud Gemini call active (key on this machine is invalid, so the fallback text is served) | R4-03; "100 % offline" must never be claimed (§1.5) |
| Licensing (§6.5) | PyMastic Apache-2.0 (attribution needed on adoption); Ultralytics AGPL-3.0 undecided; reference ZIP has no licence | F-42, F-48 — HD-03, HD-09 |
| GenAI disclosure (§6.6) | No disclosure sheet; trailer convention unresolved | HD-08 |
| Prohibited claims (§1.5) | 6 of 8 present | Appendix A, Table A.4 |

Data status: the repository holds no empirical road, deflection, traffic-count or labelled image data. Segment data are reference/demo values and must stay labelled DEFAULT or ASSUMED. PyMastic-generated data, when produced, are SYNTHETIC and must never be presented as field data.

# Chapter 8 — Findings Register and Risk Prioritisation

Appendix E lists 51 findings: the 31 carried over (v3 priorities) and 20 new ones (F-32–F-51).

Table 8.1 — Open findings by severity

| Severity | Carried over | New | Total |
|---|---|---|---|
| [P0] | 18 | 1 | 19 |
| [P1] | 9 | 6 | 15 |
| [P2] | 4 | 10 | 14 |
| [P3] | 0 | 3 | 3 |

Table 8.2 — Top risks for the next milestone

| Rank | Risk | Findings | Mitigation |
|---|---|---|---|
| 1 | False or unmeasured claims seen by judges | F-01, F-02, F-05, F-06, F-14, F-16, F-19, F-20 | Phase 0, CI grep test |
| 2 | Physics path cannot start: no Python | F-38 | HD-01 |
| 3 | Personal data in stored photos | F-46 | R3-01 now, Module B later |
| 4 | Surrogate trained on a flawed design | F-32, F-33, F-35 | R2-01, R2-02, R2-04 before training |
| 5 | Licence exposure from YOLO | F-42 | HD-03 before integration |
| 6 | State-machine change breaks the verified backbone | F-39 | HD-02, mapping first, existing tests untouched |

# Chapter 9 — Integration and Migration Strategy

## 9.1 Boundaries

1. **Express stays the system of record.** It owns cases, RBAC, audit and every state transition. The Python service is stateless with respect to cases; Express calls it via `INFERENCE_URL` (default `http://localhost:8100`) and stores the response as provenance-tagged evidence.
2. **Python owns physics and models.** MLET, transfer functions, Monte Carlo, surrogate and guard, Trust Gate, privacy, YOLO, SLM, benchmarks live in `inference/` with pytest.
3. **TypeScript owns policy logic.** Priority score, budget optimiser and ESAL × VDF go to `src/domain/intelligence/` next to `esal.ts`, so the operator and planner screens stay deterministic and testable in the existing suite.
4. **Fail closed.** If the inference service is down, the UI shows "layanan inferensi tidak tersedia" and no number — never a fallback formula.

## 9.2 Adoption rules for reference files

Table 9.1 — Adoption rules

| Rule | Detail |
|---|---|
| Reproduce first | A reference file is adopted only after its tests run on the team's machine (R1-02) |
| Provenance header | Adopted files carry origin (v3 package, sha256), licence and "adapted by" |
| Team-written science | Training, transfer functions, Monte Carlo, evaluation and benchmarks are written or rewritten by team members (AGENTS §6); AI may review and write tests |
| No silent behaviour change | Legacy tests that encode physically wrong behaviour are marked legacy with approval |
| Dependencies | `requirements.txt` with pins; Ultralytics only after HD-03 |
| Data and models | Gitignored; only hashes, cards and `models/registry.json` committed |

## 9.3 Proposed change sequence

Table 9.2 — Change sequence (each line one or more small PRs)

| Order | Change | Files (indicative) | Gate |
|---|---|---|---|
| 1 | `no-fake-claims.test.ts` (failing first) | `tests/unit/` | G-0 |
| 2 | Remove random telemetry/attribution; "belum diukur" | `pinnEngine.ts`, `CommunityReportsDashboard.tsx`, `LeafletMap.tsx`, `Navbar.tsx`, `FieldEngineerTools.tsx`, dashboards | G-0 |
| 3 | Delete WIM modal/scraper and IR export routes | `features/wim/*`, `services/wim/*`, `openvino*` server files, routes | G-0 |
| 4 | CV "belum diklasifikasi"; device "tidak diketahui"; verdict text removal | `cvDamageClasses.ts`, `deviceDetector.ts`, `pinnEngine.ts` | G-0 |
| 5 | PDF disclaimer; README/package; status labels | `pdfGenerator.ts`, `README.md`, pages | G-0 |
| 6 | Corridor config (Narogong + Karawang) | `config/corridors/`, `screening.ts` | G-0, HD-07 |
| 7 | DECISION_LOG merge | `docs/DECISION_LOG.md` | approval |
| 8 | `inference/` + `/v1/assess` + Express adapter | new folder, `server/` | G-1 |
| 9 | Surrogate pipeline and guard | `inference/training/`, `inference/core/` | G-2 |
| 10 | Screening, privacy, detector; new states | `inference/`, `src/domain/workflow/` | G-3, G-4 |
| 11 | SLM, benchmarks, Evidence page | `inference/genai/`, `inference/bench/`, UI | — |
| 12 | Role features, Playwright, deployment | various | G-5 |

# Chapter 10 — Development Roadmap

![Figure 10.1 — Roadmap phases, their dependencies and blockers. PROPOSED TARGET STATE.](figures/fig-10-1-roadmap.svg)

Appendix F holds the 52 tasks (R0-01 … R7-04) with source requirement, gap, change, dependencies, tests, acceptance criteria, priority, track and size, plus the approval gates G-0…G-5. Recommended first phase: **M-P0 "Truthful status"** (R0-01–R0-10) — it needs no Python, removes five of the six prohibited claims still on screen (the day-based life and horizon fields go with R1-06) and makes V3-DOD-1 pass. Phases 1–5 are blocked until HD-01 provides a Python runtime on the interview laptop. The v3 seven-day emergency plan cannot be met as written while that blocker is open; calendar estimates are therefore withheld.

# Chapter 11 — Test Plan and Definition of Done

Table 11.1 — Test plan per phase

| Phase | New tests | Gate commands | Definition of done |
|---|---|---|---|
| 0 | `no-fake-claims.test.ts` (grep `Math.random` in runtime paths; forbidden phrases; payload equality); route 404 tests; PDF snapshot; corridor screening test | `npm test`, `npm run lint` | M-P0 exit criteria (Appendix F.5) |
| 1 | pytest: 303/793 ±1 %, 274/663, ×3 similarity, invalid input raises; contract tests `/v1/assess`; Node adapter test; cross-check vs audit solver on axis | + `pytest` | Engineer UI shows PyMastic strains, criterion, "indikatif, bukan desain"; no legacy life fields |
| 2 | Dataset card check; sign-check report; metrics schema (random, OOD, similarity, violation %, ablation); guard tests; MC: P10 ≤ P50 ≤ P90, determinism, dry ≥ wet per sample, g = 0 finite | + `pytest` | `models/pi_surrogate_metrics.json` complete; fallback flagged |
| 3 | EXIF-strip test; gate branch tests; blur recall report; deletion-log test; "no silent drop"; public-response privacy test | + `pytest` | FAR/FRR, recall and mAP per class/condition stored |
| 4 | 50-case checker suite (ID and EN, citations, swapped values); network-off test | + `pytest` | Pass rate and tokens/s per device stored |
| 5 | `measurements/*.json` schema test | + benchmark script on the interview laptop | Evidence page reads only `/v1/measurements` |
| 6 | Score example 83.3; weight-change audit; DP ≥ greedy; budget curve monotone; option monotonicity; merge/SLA/REFERRED tests | all | §3.4 acceptance criteria |
| 7 | Playwright golden path | all + Playwright | v3 §8.4 DoD all ticked |

Non-negotiable for every phase: no existing test deleted or weakened; tolerances of reference tests never widened to make them pass; failures recorded with their output.

# Chapter 12 — Readiness and Unresolved Decisions

Table 12.1 — Readiness

| Item | Ready? | Note |
|---|---|---|
| Phase 0 implementation | Ready after approval | Pure TypeScript; change plan per PR (> 3 files) |
| Phase 1–5 implementation | Blocked | F-38 / HD-01 |
| Reference code adoption | Not ready | Reproduce first (R1-02); fix F-32–F-37, F-43 |
| Surrogate training | Not ready | HD-05, R2-02 sign check |
| YOLO integration | Not ready | HD-03 licence; local photos |
| State-machine extension | Needs approval | HD-02 |
| Persistence/deployment | Needs decision | HD-06 |
| Pitch claims | Restricted | Only [TERBUKTI] items; see Chapter 0 list of things that must not be claimed |

Open human decisions HD-01 to HD-09 are listed with options in Appendix G, Table G.2. This baseline did not take any of them.

**Readiness statement.** The project is not v3-compliant. It has a sound, tested workflow core and a clear, evidence-based path. The single most valuable next action is Phase 0; the single biggest risk is the missing Python runtime.

<!-- include: appendices -->

# Appendix H — Test and Evidence Register

Table H.1 — Commands and checks

| Test ID | Command or procedure | Environment | Result | Evidence | Reproduced? |
|---|---|---|---|---|---|
| T-01 | `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain --ignored`, `git log --oneline -12`, `git stash list` | repo root | HEAD `4a9b4fc`; 24 M, 1 D, 10 untracked + audit folders; ignored: `dist/`, `node_modules/`, AUDIT-001 log; no stash | this report, Document Control | Read-only |
| T-02 | `netstat -ano` for ports 3000/8100 | host | 3000 LISTENING (PID 18032, user's server, untouched); 8100 free | — | — |
| T-03 | Tool inventory: `command -v python python3 py pip uv node pdftotext pdftoppm unzip` + `uv python list` | host | Node, pdftotext, unzip, Chrome present; no pdftoppm; Python stubs only; `python3.11.exe` blocked by Application Control (os error 4551) | console | Yes (deterministic) |
| T-04 | `sha256sum` of inputs; `unzip -lv` | inputs | 11 entries, safe paths | `evidence/reference-inputs.txt` | Yes |
| T-05 | `pdftotext -layout` and `-raw` on the v3 PDF | scratch copy | 65 pages, 3 596 lines | — | Yes |
| T-06 | `node evidence/v3check.mjs` | Node v24.16.0 | Reference 303.12/792.67 µε; similarity 3.0000; AI/AUS $N_f$, $N_d$; life closed form; sign check 54 structures | `evidence/evidence-run.log` | Yes (deterministic) |
| T-07 | `node evidence/v3check2.mjs` | Node v24.16.0 | 8.16 t 273.74/662.99 µε; CBR 6→3 $N_d$ ×3.98; knapsack 1 000 cases; priority 83.3; ESAL 1 360/2 930; checker cases | `evidence/evidence-run.log` | Yes (deterministic) |
| T-08 | AUDIT-001 T-03 `npm test` (cited) | same working tree, 2026-10-14 | 226/226 pass | AUDIT-001 Appendix C | Not re-run (no change, §1.4) |
| T-09 | AUDIT-001 T-04 `npm run lint` (cited) | same | exit 0 | AUDIT-001 Appendix C | Not re-run |
| T-10 | Python reference suite `test_core.py` | — | Not run | — | [BLOCKED] (F-38) |
| T-11 | `find src server tests -newer <AUDIT-001 register>`; spot `grep` of 20 finding locations; prohibited-phrase sweep | repo | No newer file; all cited lines present; 6/8 prohibited claims present | Appendix C | Yes |
| T-12 | `npm run lint` after adding this folder (its `.mjs` files fall under `tsc` because of `allowJs`) | repo | See PDF QA summary | `PAVEMENT_PINN_v3_PDF_QA_Summary.md` | Yes |

Table H.2 — Not performed, with reason

| Item | Reason | Status |
|---|---|---|
| PyMastic, NumPy, OpenCV, PyTorch, OpenVINO, Ultralytics runs | No permitted Python runtime | [BLOCKED] |
| Dual-tyre MLET reproduction | Independent solver is axis-only | [BLOCKED] |
| Surrogate training, YOLO training, SLM, benchmarks | No Python, no data, no NPU access verified | [BLOCKED] |
| `npm run build`, deploy, migrations | Would change `dist/` or external state; not needed | Not run (safety) |
| HTTP calls to the user's server | Port 3000 belongs to the user | Not run |
| Playwright golden path | No suite exists | [RENCANA] |

# Appendix I — API and Data-Contract Differences

Table I.1 — Current Express endpoints vs v3 inference contracts

| v3 contract | Closest current endpoint | Difference | Action |
|---|---|---|---|
| `POST /v1/screen` (multipart image, lat, lon, gps_acc, captured_at) | Report submission in `workflow.routes.ts` (photo as URL or base64 data URL) | No trust, privacy or detection outputs; photo inline in the case record | New service; Express forwards photo, stores blurred result only |
| `POST /v1/assess` (layers with h, E, ν, source; subgrade CBR + state; traffic P10–P90 + growth; criterion; n_mc; seed) | Intelligence assessment/What-If routes (`intelligence.routes.ts`); legacy `POST /api/simulate` | Current inputs: axle t, rain, flood, temperature, CBR, AC thickness/modulus; no q, a, ν, base layer, criterion, MC; outputs include legacy life fields | New service; Express adapter; retire `/api/simulate` |
| `POST /v1/options` | none | — | New |
| `POST /v1/brief` (role, facts) → text, checker, model, device, tokens/s | Narrative endpoint (Gemini, fallback) | Free-text prompt to cloud; no checker | Replace |
| `GET /v1/measurements` | `/api/openvino/export-*` (fake), simulated benchmark | Fabricated values | Remove, then new |

Table I.2 — Data model differences (v3 §4.9 vs current)

| v3 table | Current | Note |
|---|---|---|
| corridors, segments (authority, layers with source) | `karawangPilot.ts`, `indonesianRoads.ts` constants; migration tables (unapplied) | Needs config + provenance per layer (HD-07) |
| reports (tracking code, salted device hash) | `report_cases` (file store; migration unapplied) | No tracking code; account-id ownership exists |
| photos (blurred URL, raw URL null after deletion, pHash) | photo inside the case record | Separate storage, deletion |
| trust_checks, detections, assessments, confirmations, priority_snapshots, traffic_counts, measurements | `pinn_predictions` (migration), What-If runs persisted | New tables or JSON collections after HD-06 |
| audit_log (+ weight changes, model promotion, data deletion) | audit trail exists | Extend event types |

# Appendix J — Glossary and Sources

Table J.1 — Glossary

| Term | Meaning |
|---|---|
| MLET | Multilayer linear-elastic theory (Burmister); stresses and strains in a layered pavement under a circular load |
| εt / εv | Horizontal tensile strain at the bottom of the asphalt / vertical compressive strain at the top of the subgrade (µε = 10⁻⁶) |
| PI-surrogate | Neural network imitating MLET, with physics entered through dimensionless variables and derivative penalties; not a PDE-residual PINN |
| PyMastic | Open-source Python layered-elastic solver (Apache-2.0) |
| Transfer function | Empirical law converting strain to allowable load repetitions (fatigue $N_f$, rutting $N_d$) |
| ESAL / VDF / CESA | Equivalent 8.16 t standard axle load / vehicle damage factor / cumulative ESAL |
| Indeks Umur | Indicative structural life index in years (P10/P50/P90), not a design life |
| Trust Gate | Layered photo checks with measured false-accept/false-reject rates |
| FAR / FRR | False accept / false reject rate |
| HD-xx | Open human decision (Appendix G) |
| R-x-yy | Roadmap task (Appendix F) |
| M-xx | Mathematical verification item (Appendix D) |

Table J.2 — Sources

| No. | Source |
|---|---|
| [S1] | *PAVEMENT-PINN v3 Dokumen Induk*, v3.0, 15 Oct 2026, 65 pp. (sha256 `1cdc4229fb…b6ab`) |
| [S2] | `AGENTS.md` — Panduan Agent Coding untuk PAVEMENT-PINN v3 (sha256 `06a7635c…4b535`) |
| [S3] | `pavement_pinn_v3_code.zip` (sha256 `664c6a7f…2b88`) |
| [S4] | PAVEMENT-PINN-AUDIT-001 v1.0, 2026-10-14, `docs/audit/forensic-2026-10-14/` |
| [S5] | Huang, Y. H., *Pavement Analysis and Design*, 2nd ed., Pearson, 2004 (Asphalt Institute criteria), as cited in [S1] ref. [23] |
| [S6] | Austroads, *Guide to Pavement Technology Part 2*; Bina Marga, *Manual Desain Perkerasan Jalan 2017*, as cited in [S1] ref. [24] — edition to be fixed by HD-04 |
| [S7] | PyMastic, github.com/Mostafa-Nakhaei/PyMastic, as cited in [S1] ref. [18] |
| [S8] | Repository `pavement-pinn`, commit `4a9b4fc`, working tree of 2026-10-15 |
