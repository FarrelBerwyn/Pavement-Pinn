# Gap Register

Imported from spec v2.2 Lampiran O (G-01..G-07) and extended with software gaps found
during implementation. External-data gaps are not closed by software. Status values:
OPEN, PARTIAL, CLOSED (software), BLOCKED (external).

| ID | Gap | Why it matters | Software can close? | External dependency | Status | Evidence / next action |
|---|---|---|---|---|---|---|
| G-01 | Precise geometry of the Klari–Jatisari corridor | Map scope, seed data, OUT_OF_SCOPE check | Partly (digitise from OSM) | Field verification | OPEN | `KRW-001..004` use ILLUSTRATIVE polylines; pilot bbox in `screening.ts` is approximate. Next: digitise from OSM, store as PostGIS LineString |
| G-02 | Official WIM/FWD access for the corridor | Real loads and structure | No | Bina Marga / Dishub data | BLOCKED (external) | WIM provider interface exists; UI shows WIM DATA NOT AVAILABLE |
| G-03 | Local CV dataset (Karawang distress photos) | Local detection accuracy | Partly (augmentation) | Field photos | OPEN | Notebook audited (docs/AI.md); no weights; screening stays DEMO |
| G-04 | Validated PINN architecture | Model credibility | Yes (needs Python/PyTorch) | Reference solutions | OPEN | Formula engine labelled RULE_BASED; ablation PLANNED |
| G-05 | Actual OpenVINO benchmark (CPU/iGPU/NPU) | Intel relevance claim | Yes (CPU at least) | Intel hardware, model | OPEN | No runtime in repo; targets only |
| G-06 | ODOL tonnage statistics for the corridor | Precision of load argument | No | Official statistics | BLOCKED (external) | Not claimed anywhere |
| G-07 | KIIC/Suryacipta traffic linkage to the corridor | Scope of Advanced tier | No | OSINT research | OPEN | Legacy KIIC segments kept as demo data, not pilot claims |
| G-SB-01 | Supabase PostgreSQL/PostGIS not connected | Cloud persistence (brief §V, §AX) | Yes | Project credentials | BLOCKED (credentials) | Schema + RLS in `supabase/migrations/`; server uses `FileCaseStore` behind `CaseStore` |
| G-SB-02 | No identity provider (Supabase Auth) | Real authentication | Yes | Project credentials | BLOCKED (credentials) | Server-signed demo/anonymous sessions; `DEMO_AUTH=false` switch |
| G-SB-03 | Photo object storage | Photos live inside report JSON (≤ 5 MB) | Yes | Storage bucket | BLOCKED (credentials) | Magic-byte validation done; EXIF/GPS metadata stripping not done |
| G-PY-01 | No Python runtime on the dev machine | FastAPI, PyTorch, Ultralytics, OpenVINO cannot run/test here | — | Environment | BLOCKED (environment) | Provider contracts documented in docs/AI.md |
| G-SW-01 | Simulations not persisted | What-If history lost on restart | Yes | — | OPEN | Kept in server memory (`persisted: false`); table exists in migration |
| G-SW-02 | Browser E2E automation (Playwright) | Repeatable UI regression | Yes | npm dependency + browser download | OPEN | Golden path verified manually in the built-in browser; HTTP-level golden path automated |
| G-SW-03 | Upvotes are per-browser | Shared support counts | Yes | — | OPEN | Documented demo interaction |
| G-SW-04 | Legacy views keep illustrative figures (executive budget/savings, WIM plates, simulator telemetry) | Overclaim risk | Yes (relabel/remove) | Product decision | PARTIAL | New views avoid them; flagged in FINAL_AUDIT |
| G-SW-05 | Density heatmap counts CLOSED-as-invalid reports | Heatmap meaning | Yes | Product decision | OPEN | Rule unchanged by design (DECISION_LOG, open questions) |
| G-SW-06 | Rate limiting is in-process | Multi-instance deployments | Yes | Shared store | OPEN | Fine for a single demo server |
| G-SW-07 | Routing (safer route / route to inspection) | Spec §25 | Partly | Routing data/API | NOT_IMPLEMENTED | "Lihat di peta" navigation only |
