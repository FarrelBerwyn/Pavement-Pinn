# Appendix C — Test and Benchmark Evidence (Artifact E)

Document PAVEMENT-PINN-AUDIT-001 · Version 1.0. Environment: Windows 11 Home 10.0.26200, Node.js v24.16.0, npm scripts from `package.json`, Chrome 155.0.8059.40 (PDF rendering only). Python is not installed on the audit machine (`python` resolves to the Microsoft Store stub), so no PyTorch, Ultralytics or OpenVINO command could run. All commands were run from the repository root unless stated otherwise. No command modified tracked files, the database, `dist/` or the user's development server.

## C.1 Test execution register

Table C.1 — Commands executed

| Test ID | Command or procedure | Environment | Result | Evidence | Limitation |
|---|---|---|---|---|---|
| T-01 | `git rev-parse`, `git log --oneline -15`, `git status --short`, `git stash list`, `git worktree list` | repo root | HEAD `4a9b4fc`, branch `feature/m1-report-ownership`; 24 modified, 1 deleted, 10 untracked paths; no stash; one worktree | Document Control | Read-only snapshot at audit start |
| T-02 | `netstat -ano` filtered for ports 3000/3100/3200 | host | Port 3000 LISTENING (PID 18032, the user's server); 3100/3200 free | Document Control | Server was not called, restarted or reconfigured |
| T-03 | `npm test` (`tsx --test "tests/**/*.test.ts"`) | working tree incl. uncommitted changes | 226 tests, 226 pass, 0 fail, exit 0, 14.3 s | console summary | 17 of the 226 tests live in untracked files of another session (`auth-api`, `demo-auth`); the committed HEAD alone was not tested separately |
| T-04 | `npm run lint` (`tsc --noEmit`) | working tree | exit 0, no diagnostics | console | Type safety only |
| T-05 | `node evidence/verify-mlet.mjs` | audit folder | PASS: Bessel values; homogeneous 3-layer = Boussinesq (max rel. error ≈ 2e-12); surface deflection rel. error 1.0e-5; similarity ratio 3.0000000 | `evidence/evidence-run.log` | Verifies the audit's reference solver only |
| T-06 | `node evidence/verify-layered.mjs` | audit folder | PASS: kernel consistency ≤ 2e-14; interface continuity; Burmister chart values 0.646/0.291/0.081 | `evidence/evidence-run.log` | Chart-reading accuracy for the Burmister comparison |
| T-07 | `tsx evidence/compare.mjs` | audit folder, imports engine read-only | exit 0; Tables B.3-B.5 | `evidence/compare-grid.json`, log | Loading assumptions stated in B.4 |
| T-08 | `tsx evidence/edge.mjs` | audit folder, imports engine read-only | exit 0; Table B.7 | `evidence/evidence-run.log` | Function-level; HTTP path not exercised |
| T-09 | Static UI-claim sweep (subagent, read-only grep) + manual spot-check of 10 cited locations | `src/` | All 10 spot-checks matched | Appendix A references | Automated sweep may miss dynamically built strings |
| T-10 | Blueprint text extraction `pdftotext -layout` | scratch copy of the blueprint PDF | 1062 lines, BAB 1-10 | — | Some mathematical glyphs are lost in the text layer; blueprint page images could not be rendered (no `pdftoppm`) |

## C.2 Tests deliberately not performed

Table C.2 — Not performed, with reason

| Item | Reason | Status |
|---|---|---|
| `npm run build` | Writes `dist/`, which already holds a build from 2026-10-14 16:31 that the user may rely on; not needed to establish any finding | Not run (safety) |
| Second dev server or production smoke test | Not required for findings; would add processes beside the user's server | Not run |
| HTTP calls to `/api/simulate`, `/api/openvino/*` | Port 3000 belongs to the user; function-level evidence suffices | Not run |
| Browser end-to-end golden path | Prior session reports a manual run (`docs/FINAL_AUDIT.md`); no Playwright suite exists (G-SW-02) | [NOT VERIFIED] by this audit |
| Camera / GPS on a phone | No device available | [BLOCKED] |
| CV model evaluation (mAP, per-class) | No weights, no local dataset, no Python | [BLOCKED] |
| PINN training, ablation, held-out evaluation | No model, no data, no Python | [BLOCKED] |
| OpenVINO conversion, quantisation, latency | No model, no runtime, no Python | [BLOCKED] |
| Comparison with a certified layered-elastic program | None installed | [BLOCKED] |
| FWD / field validation | No data in repository | [BLOCKED] |

## C.3 Classification of the existing test suite

Table C.3 — What each existing suite establishes

| Category | Files (tests) | Establishes | Does not establish |
|---|---|---|---|
| 1. Unit | `tests/unit/*` (144) | Workflow rules, RBAC, report factory and ownership, maps, routes, module boundaries, type gate, intelligence helpers | Physical validity |
| 2. Integration | `tests/integration/*` (49) | HTTP contracts, auth tokens, hardening, workflow and intelligence endpoints | Physical validity; real IdP or database |
| 3. Mathematical verification | `pinn-mathematical-audit.test.ts` (14) | Code equals the documented closed-form formulas; monotonicity; known deviations pinned | Agreement with elasticity or measurement |
| 4. Numerical benchmark | `pinn-regression.test.ts` (14), `pinn-threshold-characterization.test.ts` (5) | Output unchanged against 76 golden scenarios; threshold reachability | Correctness of the golden values |
| 5. Empirical validation | none | — | — |
| 6. Production / hardware benchmark | none | — | — |

Counts from `grep -c "test("` per file: `tests/unit` 144, `tests/integration` 49, `tests/physics-validation` 33; total 226, matching the runner. Of these, 17 tests (`auth-api` 8, `demo-auth` 9) are in files untracked by Git (another session's work in progress).

## C.4 Edge benchmark register

Table C.4 — Edge benchmark register (no measurement exists)

| Benchmark | Device | Precision | Latency | Numerical deviation | Status |
|---|---|---|---|---|---|
| PINN inference per scenario (target < 10 ms) | CPU / Arc iGPU / NPU | FP32 / FP16 / INT8 | not measured | not measured | [BLOCKED] (no model, no runtime) |
| YOLOv8 inference | CPU / iGPU | INT8 | not measured | not measured | [BLOCKED] |
| SLM (Phi-3-mini / Llama-3.2) | NPU | INT4 | not measured | not measured | [NOT IMPLEMENTED] |
| UI "benchmark" (`simulatedBenchmark.ts`) | none (lookup table + JS loop) | n/a | constants 6.8-22.5 ms × factor | constant 99.4-100 % | [SIMULATED] — not a measurement |
| Engine formula evaluation in JavaScript | host CPU (Node) | FP64 | not timed (sub-millisecond by inspection: ~40 arithmetic operations) | n/a | [NOT VERIFIED]; irrelevant to OpenVINO |

Required benchmark protocol before any latency claim (Appendix F of the report): fixed model hash; OpenVINO version; `core.available_devices` output; device driver versions; precision and NNCF configuration; batch size and input shape; 50 warm-up runs; ≥ 1000 timed runs; cold-start time; p50/p95/p99; throughput; peak resident memory; maximum absolute and relative deviation of outputs vs FP32 on a fixed validation set; power measured with a stated tool, or reported as not measured.
