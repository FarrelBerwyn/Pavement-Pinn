# Appendix G — Decision Log Proposal and Open Human Decisions

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15.

`docs/DECISION_LOG.md` already exists (179 lines, entries D-001 to D-034, with 10 uncommitted lines from another session). It is **not modified** by this baseline. This appendix is the documented plan to update it; the merge happens only after approval (task R0-08, gate G-0).

## G.1 Proposed merge

1. Add a section **"v3 decisions (from PAVEMENT-PINN v3 Dokumen Induk §1.3)"** with entries `V3-D-01` … `V3-D-18`, copied verbatim in Indonesian with the PDF page reference. The `V3-` prefix avoids the collision with the existing three-digit IDs (for example D-012 "Separation of duties" vs v3 D-12 "Beban lalu lintas") — F-40.
2. Change the header's source hierarchy to: v3 Dokumen Induk > AGENTS.md > spec v2.2 > execution brief > existing repository > engineering judgement (D-01).
3. Mark the following existing entries:

Table G.1 — Existing decisions affected by v3

| Existing entry | v3 decision | Proposed marking |
|---|---|---|
| D-001 Keep Express; no FastAPI yet | V3-D-04 (Python inference service) | Superseded in part: Express stays the workflow API; a Python inference service is added |
| D-010 Lifecycle exactly as spec §24 | v3 Fig. 3.2 states | Open until HD-02; keep current states until approved |
| D-020 Engines RULE_BASED, labelled | V3-D-02, V3-D-04 | Remains true until R1-03 ships; then superseded |
| D-021 Traffic/WIM/weather fallbacks | V3-D-12 | Superseded (Virtual WIM removed; counts × VDF) |
| D-022 CV stops at a surface indicator | V3-D-06, V3-D-07 | Consistent; keep |
| D-031 Policy view shows evidence, not money | §1.4 (APBN savings removed) | Consistent; keep |
| D-033 Legacy illustrative screens labelled, not deleted | §1.4 HAPUS list, F-04/F-13 | Superseded for the WIM modal, IR export, telemetry and attribution screens (deleted); other legacy screens stay labelled |
| D-012, D-013 Separation of duties; work order ≠ SPK | v3 O5 | Consistent; keep (v3 builds on them) |

## G.2 Decisions this baseline did not take (need a human)

Table G.2 — Open human decisions

| ID | Question | Options | Why it matters | Blocks |
|---|---|---|---|---|
| HD-01 | Which Intel machine runs Python, and how is it allowed under the Application Control policy? | Policy exception for a managed Python; another team laptop; Intel Tiber AI Cloud for training only | Nothing in Phases 1–5 can run here (F-38); v3 §5.2 requires benchmarks on the interview laptop | R1-01 and everything after |
| HD-02 | Workflow vocabulary: keep current states with a display mapping, or rename to v3 names? | (a) keep + mapping + add four new states; (b) rename with data migration | Current `VERIFIED` ≠ v3 `VERIFIED` (F-39); state machine and RBAC are the verified backbone | R3-05 |
| HD-03 | YOLO licence path | AGPL-3.0 open-source release of the inference service; Ultralytics enterprise licence; permissive detector | Legal exposure when served over a network (F-42) | R3-04 |
| HD-04 | Transfer-function criterion and edition | Asphalt Institute (Huang 2004); Austroads 2004 form; edition adopted by MDP 2017 | $N_d$ differs about 200× (M-11); must be cited and shown | R1-05 |
| HD-05 | Surrogate input domain | Add ln(d/a) as a fifth feature; or restrict data to the 8.16 t standard axle and q = 0.55 MPa | Current design cannot represent dual-tyre geometry (F-32) | R2-01 |
| HD-06 | Persistence for the pilot (D-18 leaves the choice) | Apply Supabase migration; one VM with file store + daily backup | Schema, backups, identity for internal roles (F-24) | R7-02 |
| HD-07 | Narogong corridor data | Geometry, managing authority per segment (SK penetapan status jalan), layer data with sources | D-03, D-17 need real configuration; no such data in the repository | R0-07, R6-02 |
| HD-08 | Commit attribution convention | AGENTS §6 asks for an `Assisted-by: <tool>` trailer to make GenAI disclosure countable; this repository's owner has asked that co-author trailers name Pavement-PINN | Honest GenAI disclosure (v3 §6.6) depends on a consistent, truthful convention | All commits from Phase 0 |
| HD-09 | May the reference ZIP code be adopted, and who rewrites the scientific core? | Adopt with provenance header; team rewrites core modules (AGENTS §6) | No licence/authorship in the ZIP (F-48); judges ask who wrote the science | R1-03, R2-03 |
