# Final Audit — 2026-10-14

Branch `feature/m1-report-ownership` (local, not pushed). Status values: PASS, PARTIAL,
BLOCKED, NOT_IMPLEMENTED. Software completeness and scientific validation are separate.

## Verification run

| Check | Result |
|---|---|
| `npm test` | 209 tests, 209 pass, 0 fail |
| `npm run lint` (tsc) | clean |
| `npm run build` | SPA + server bundle built; existing warning: chunks > 500 kB |
| Production bundle smoke test (`node dist/server.cjs`, port 3200) | `/api/health` 200, SPA route 200, `/api/system-health` OK, official audit 200, store written to `DATA_DIR` |
| Browser golden path (built-in browser, port 3100, fresh store) | passed end to end — see below |
| Mobile check (375×812) | reports modal and operations queue without horizontal overflow (one overflow found and fixed) |
| Console | only Vite HMR websocket errors (port 24678 held by another dev server); no application errors |

### Golden path observed in the browser

1. Anonymous visitor (server-issued `anon-…`) submits a photo report → stored as
   `REP-F3585488BF4DEDDE`, state `NEEDS_REVIEW` (CV is DEMO).
2. Operations Manager (USR-008) sees it in "Perlu ditinjau", sees the DEMO screening
   reasons, accepts it and assigns USR-006 with a deadline.
3. Field Engineer (USR-006) sees exactly one assigned inspection, submits an OBSERVED
   inspection and a recommendation; the server attaches a RULE_BASED assessment (risk
   HIGH, prototype score 22).
4. Policy Maker (USR-007) sees KRW-001 ranked first with the open/confirmed/pending
   counts and the pending recommendation, and has no approval actions.
5. Operations approves, issues an internal work order (labelled not an SPK), marks it
   complete; the engineer verifies the repair; Operations closes the report.
6. Audit trail (Operations) lists all 12 events with actor, time, transition and reason.
7. Back as an anonymous citizen: the report shows "Ditutup" with public notes only, no
   staff identities or notes; no audit button.

## Audits (brief §BT)

| # | Audit | Status | Notes |
|---|---|---|---|
| 1 | Feature | PARTIAL | Workflow, roles, evidence engines, Road Story, What-If, provenance done; routing, escalation, budget scenarios not implemented; CV/PINN/OpenVINO models blocked |
| 2 | Route | PARTIAL | Existing 27 routes intact (route/RBAC tests). Spec-style routes (`/report/:id`, `/engineer/*`, `/audit`, `/health` pages) not added as separate pages; their functions live in existing pages (reports modal, tasks, road detail, audit modal, `/api/system-health`) |
| 3 | Button | PARTIAL | Every new control acts on the API or shows a labelled state. Legacy screens (executive policy, WIM enforcement, OpenVINO diagnostics) keep demonstrative controls; not exhaustively audited in this pass |
| 4 | API | PASS | Workflow, identity, intelligence, provenance, health endpoints with validation, auth, errors, limits (WORKFLOW_API.md) |
| 5 | Database | BLOCKED | Local atomic JSON store works; Supabase/PostGIS migration written, not applied (credentials) |
| 6 | RBAC | PASS (demo identity) | Server-side enforcement of roles, assignment, ownership, separation of duties, audit access; identity provider BLOCKED |
| 7 | Security | PARTIAL | Token signing, body-independent identity, magic-byte upload checks, rate limits, headers, no secrets in bundle; missing EXIF stripping, real auth, shared rate limiter; legacy `/api/roads` still exposes WIM vehicle fields |
| 8 | Mobile | PARTIAL | Layout checked at 375 px for the new surfaces; camera/GPS not exercised on a real device |
| 9 | Accessibility | PARTIAL | Labels on all new form fields, visible focus ring, reduced motion, text + colour status badges, semantic tables; no screen-reader or contrast audit of legacy screens |
| 10 | E2E | PARTIAL | HTTP-level golden path automated; browser golden path manual; no Playwright suite |
| 11 | Data provenance | PASS (new surfaces) | Every assessment input and report field carries a status; legacy screens still show some unlabelled illustrative figures (see below) |
| 12 | AI claims | PASS (new surfaces) | No accuracy, latency or savings claimed; RULE_BASED/DEMO/VALIDATION_REQUIRED shown |
| 13 | Demo | PASS | Deterministic seed + pilot segments; works without external APIs; offline in-browser mode on GitHub Pages (labelled) |
| 14 | Deployment | BLOCKED | Node deployment documented and smoke-tested locally; no host, no cloud credentials, nothing pushed |
| 15 | Proposal traceability | PASS | REQUIREMENT_TRACEABILITY.md, GAP_REGISTER.md, DECISION_LOG.md |

## Known overclaim risks left in legacy screens (not changed in this pass)

- Executive policy views show budget, economic-loss and savings figures that are
  illustrative constants, not outputs of a validated model.
- WIM/ODOL operation views show licence plates and per-truck weights from SIMULATED data,
  and enforcement buttons (BATM, ETLE) that do not reach any real system.
- The simulator shows OpenVINO latency/device telemetry produced by a simulated
  benchmark; it is labelled "simulasi" in some places, not all.
- The task planner under the new queue (`MyTasksView`) is the earlier local demo planner.

Each of these screens now carries a visible ILUSTRATIF / SIMULASI / DEMO LOKAL notice;
removing or recomputing the figures remains a follow-up (G-SW-04).

## Software vs scientific status

| Dimension | Software | Scientific validation |
|---|---|---|
| Workflow & roles | Complete for the demo identity model | n/a |
| Persistence | Local, tested | Cloud not connected |
| CV | Interface + DEMO fallback | VALIDATION REQUIRED (no model, no local data) |
| Traffic/ESAL/WIM | Implemented with fallbacks | DATA REQUIRED (no WIM) |
| PINN | Labelled rule-based fallback, pipeline executable | VALIDATION REQUIRED (no trained model) |
| OpenVINO | Not executed | DATA REQUIRED (no benchmark) |
| What-If / Road Story | Implemented, labelled | Outputs are simulations of a rule-based engine |
