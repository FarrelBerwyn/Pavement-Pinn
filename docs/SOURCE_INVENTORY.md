# Source Inventory

Inputs used to implement PAVEMENT-PINN, in priority order, and how far each could be
read. Extraction was done locally (docx: XML text; PDFs: a small Node script that inflates
streams and decodes text operators). Copies of the extracted text are not committed.

| # | Document | Version / date | Role | Read status |
|---|---|---|---|---|
| 1 | `PAVEMENT-PINN_v2.2.docx` | v2.2, Aug 2026 | Primary product and scientific specification | **Full text read** (41 sections + appendices A–R) |
| 2 | `PAVEMENT-PINN - Intel AI Impact 2026.pdf` | earlier proposal (3 stakeholder roles) | Use cases, positioning | **Partial**: custom font encoding garbles most text; Mermaid diagrams and some headings readable. Superseded by v2.2 where they differ (e.g. v2.2 has 4 roles and Karawang pilot) |
| 3 | `PAVEMENT-PINN_Team_Strategy_Intel_AI_Global_Impact_2026.pdf` | 2 pages | Strategy, demo narrative | **Not readable**: no extractable text (likely image/vector glyphs). Nothing from it is relied on |
| 4 | `Update Fix All execute Agent.pdf` | "Master Execution Prompt — Final Build Foundation" | Architecture, testing, traceability, completion rules | **Full text read** (sections 0–CA) |
| 5 | `pothole-segmentation-for-road-damage-assessment.ipynb` | Kaggle, Ultralytics 8.0.236 | Technical reference candidate for CV | **Fully inspected** (cells, outputs); audit in docs/AI.md |
| 6 | Repository, prior audits and reports | branch `feature/m1-report-ownership` | Existing implementation | Inspected; see docs/architecture/, docs/validation/ |

## Spec v2.2 contents used

- Pilot (§6): Karawang Pantura Klari → Jatisari → Simpang Jomin, codes KRW-001..004.
- Pipeline (§7), CV bridge (§8), traffic intelligence (§9), ESAL (§10), WIM (§11),
  weather (§12), baseline (§13), What-If (§14), mechanics (§15), PINN (§16), OpenVINO
  (§17), GenAI/rule engine (§18), RBAC (§19), architecture and entities (§20), map-first
  UI and design system (§21), citizen reporting (§22), human-only actions (§23), state
  machine (§24), routing (§25), user journeys (§26), explainability (§27), provenance
  (§28), responsible AI (§29), fallback matrix (§30), uncertainty (§31), evaluation (§32–33).
- Appendices: golden path and one-minute demo (A), MVP/Advanced/Future (C), data
  acquisition categories (D), tech stack lock (H), design tokens (I), subsystem patterns
  (J), DB example (K), API contracts (L), frontend IA (M), claim register (N), gap register
  G-01..G-07 (O), traceability example (P), readiness (Q), consistency audit (R).

## Roles

Spec: Citizen, Field Engineer, Operations Manager, Policy Maker. Repository identifiers:
`PUBLIC_REPORTER`, `PUBLIC_VIEWER` (citizens; anonymous visitors are `PUBLIC_VIEWER`),
`FIELD_ENGINEER`, `OPERATIONS_MANAGER`, `POLICY_MAKER`.

## Data entities (spec §20.3, execution brief §V) → implementation

| Entity | Where now |
|---|---|
| RoadSegment | `src/data/reference/{karawangPilot,indonesianRoads}.ts`; `road_segments` (migration) |
| CitizenReport | `ReportCase.report` in the workflow store; `report_cases` |
| DamageDetection | `ReportCase.screening`; `damage_detections` |
| InspectionAssignment, Inspection | `ReportCase.assignment/inspection`; tables of the same name |
| MaintenanceRecommendation, Approval, WorkOrder | `ReportCase.recommendation/approvals/workOrder`; tables |
| AuditLog | workflow snapshot `audit`; `audit_logs` |
| Traffic/WIM/Weather observations, PavementBaseline | provider interfaces in `src/domain/intelligence/evidence.ts`; tables in migration |
| PINNInference / RiskAssessment | `EngineeringAssessment` (RULE_BASED); `pinn_predictions` |
| Simulation | What-If results (memory); `simulations` |
| Provenance | per-field labels in API responses; `provenance` |
