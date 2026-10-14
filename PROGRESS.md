# Progress

Read at the start of every session together with docs/DECISION_LOG.md,
docs/REQUIREMENT_TRACEABILITY.md and docs/GAP_REGISTER.md, then `git status`.

## 2026-10-14 — branch `feature/m1-report-ownership` (local commits, not pushed)

| Phase | Status | Commit(s) | Notes |
|---|---|---|---|
| Checkpoint | DONE | 498c829 | Snapshot of post-restructure hardening, maps, provenance |
| M1a factory + ownership | DONE | 151b301 | `createSessionReport`, `canEditReport` by account id |
| P1 domain workflow | DONE | 7b24b09 | State machine, screening, audit, public projection |
| P2 API + persistence | DONE | 6996a27, 3d51f40 | Signed sessions, workflow/intelligence/provenance endpoints, file store, Supabase migration (not applied) |
| M1b anonymous identity, M1c audit gating, P3 role UIs, P4 engines | DONE | 11b9b45, 61ddc90 (queue fix) | Shared workflow panel and queues; ESAL, traffic/WIM, weather, baseline, assessment, explanation |
| P5 Road Story, What-If, map link | DONE | 246e50d | `/roads/:id/` insight |
| P6 UI tokens, motion, CI | DONE | dfb7487 | Tokens, focus ring, reduced motion, `.github/workflows/ci.yml` |
| P7 verification | DONE | — | 209 tests; browser golden path; production bundle smoke test |
| P8 docs | DONE | (this commit) | DECISION_LOG, SOURCE_INVENTORY, REQUIREMENT_TRACEABILITY, GAP_REGISTER, DATA_ACQUISITION_PLAN, AI, DEPLOYMENT, FINAL_AUDIT, WORKFLOW_API, WORKFLOW_STATE_MACHINE |

## Next tasks (in order)

1. Decide whether to remove or recompute the illustrative figures in legacy screens (now labelled, G-SW-04).
2. Playwright suite for the golden path (G-SW-02).
3. Exclude CLOSED-as-invalid reports from the density heatmap if the product owner agrees (G-SW-05).
4. With credentials: Supabase store + Auth + Storage (G-SB-01..03).
5. With Python and data: CV fine-tuning on local photos, PINN training and ablation,
   OpenVINO CPU benchmark (G-03, G-04, G-05).
6. Digitise corridor geometry from OSM (G-01).

## Not committed on purpose

`docs/POST_STRUCTURE_AUDIT.md` stays untracked (it locates exposed tokens in sibling
repositories; owner decision).
