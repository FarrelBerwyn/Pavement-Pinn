# RBAC Matrix

## 1. What kind of access control this is

Four layers must be kept apart.

| Layer | Status | What it does |
|---|---|---|
| Frontend route guards (`src/app/guards/routeAccess.ts`, `src/features/rbac/accessPolicy.ts`) | IMPLEMENTED | decide which screens an identity can open and where it lands |
| Demo account switching (`src/app/providers/SessionProvider.tsx`, `/login/`) | SIMULATED authentication | picks one of eight bundled accounts; no credential is checked |
| Workflow API authorization (`server/routes/workflow.routes.ts`, `src/domain/`) | IMPLEMENTED (since P2) | the server decides the actor from a token it signed and enforces roles, assignment, ownership, transitions and audit access |
| Identity provider (real login) | NOT CONNECTED | Supabase Auth planned (G-SB-02); until then demo tokens are issued on request |

Consequences that must not be glossed over:

- **Identity is still a demo.** Anyone can select any account, and
  `/api/auth/demo-session` issues a token for it. The password field in the login dialog
  is decorative. `DEMO_AUTH=false` switches the picker off on the server. What the server
  does enforce is that *whoever holds a token* can only do what that role, assignment and
  ownership allow — editing the UI or the request body cannot change that.
- **Route guards hide UI; they do not protect bundled data.** Reference datasets still
  ship inside the public JavaScript bundle and `GET /api/roads` (legacy contract)
  returns WIM vehicle details to anyone. Workflow data (inspections, staff notes,
  recommendations, audit) is served only by the API and only to official roles.
- The demo identity is remembered in `sessionStorage` (key
  `pavement-pinn.demo-session.account-id`) only so that refresh and deep links keep
  the same identity within a browser tab. It is a convenience, not a session token.
- Before any login the visitor is an anonymous `PUBLIC_VIEWER` ("Pengunjung Anonim"),
  not the Budi demo account. The server gives anonymous visitors their own `anon-…` id
  and a claim token per report for tracking.

## 2. Role identifiers (unchanged)

`FIELD_ENGINEER`, `OPERATIONS_MANAGER`, `POLICY_MAKER`, `PUBLIC_REPORTER`, `PUBLIC_VIEWER`,
defined in `src/types/rbac.ts`. The eight demo accounts, their ids, `allowedScopes`,
`restrictedScopes`, clearance levels and `layoutStyle` values are unchanged
(`src/data/reference/demoAccounts.ts`, re-exported by `src/features/authentication/demoAccounts.ts`).

`allowedScopes` and `restrictedScopes` are descriptive strings shown in the login
dialog. No code evaluates them, before or after the restructure. The enforced rules
are the route and action matrices below.

## 3. Role by route matrix

A = ALLOW, L = LOGIN_REQUIRED (redirect to `/login/?next=...`), F = FORBIDDEN (403 page).

| Route | FIELD_ENGINEER | OPERATIONS_MANAGER | POLICY_MAKER | PUBLIC_REPORTER | PUBLIC_VIEWER |
|---|---|---|---|---|---|
| `/dashboard/` | A | A | A | A | A |
| `/dashboard/analytics/` | A | A | A | A | A |
| `/login/` | A | A | A | A | A |
| `/roads/:roadId/` | A | A | A | A | A |
| `/reports/` | A | A | A | A | A |
| `/settings/` | A | A | A | A | A |
| `/engine/` | A | A | A | A | A |
| `/engine/pinn/` | A | A | A | A | A |
| `/engine/simulation/` | A | A | A | A | A |
| `/engine/fwd/` | A | A | F | L | L |
| `/engine/prediction/` | A | A | F | L | L |
| `/computer-vision/` | A | A | A | A | A |
| `/computer-vision/detection/` | A | A | A | A | A |
| `/computer-vision/history/` | A | A | A | A | A |
| `/engineering/` | A | F | F | L | L |
| `/engineering/tasks/` | A | F | F | L | L |
| `/engineering/reference/` | A | A | F | L | L |
| `/operations/` | F | A | F | L | L |
| `/operations/tasks/` | F | A | F | L | L |
| `/operations/alerts/` | F | A | F | L | L |
| `/operations/monitoring/road-condition/` | F | A | F | L | L |
| `/operations/monitoring/wim/` | F | A | F | L | L |
| `/operations/monitoring/odol/` | F | A | F | L | L |
| `/operations/monitoring/weather/` | F | A | F | L | L |
| `/operations/actions/traffic-engineering/` | F | A | F | L | L |
| `/operations/actions/alerts/` | F | A | F | L | L |
| `/policy/` | F | F | A | L | L |

Where the matrix comes from: it encodes what each role could reach in the original
application (sidebar entries, in-view buttons, and the account-switch reset effect).
Two points worth knowing:

- The simulator (`/engine/simulation/`) is open to everyone because the public
  sidebar already contained "Simulasi PINN".
- An operations manager may open `/engine/fwd/`, `/engine/prediction/` and
  `/engineering/reference/` because the operations views had buttons leading there
  and the USR-008 scope text says "Akses Seluruh Survei dan Rekayasa Lapangan".

## 4. Role by action matrix

Each row mirrors a gate that exists in the UI code (`ACTION_RULES` in `accessPolicy.ts`).

| Action | FE | OM | PM | Reporter | Viewer | Where it is gated |
|---|---|---|---|---|---|---|
| View public road health | yes | yes | yes | yes | yes | route `/dashboard/` |
| Create a damage report | yes | yes | yes | yes | yes | no role check; every creation path builds the report with `createSessionReport` (`features/community-reports/reportFactory.ts`) |
| Edit own damage report | no | no | no | yes | no | `canEditReport(account, report)` in `accessPolicy.ts` (rules below), used by the map bottom sheet, `/reports/`, `ReportDetailModal` and both edit save handlers |
| Upvote a damage report | yes | yes | yes | yes | yes | no role check |
| Run a PINN simulation | yes | yes | yes | yes | yes | route `/engine/simulation/` |
| Export the simulation PDF | yes | yes | yes | yes | yes | no role check on the button |
| Use FWD and overlay tools | yes | yes | no | no | no | route `/engine/fwd/` |
| Verify a damage report | yes | no | no | no | no | workflow `SUBMIT_INSPECTION` by the assigned engineer, enforced by the API |
| Manage work orders (SPK) | yes | yes | no | no | no | routes `/engineering/tasks/`, `/operations/tasks/` |
| View PCI trend history | yes | yes | no | no | no | route `/engine/prediction/` |
| Monitor WIM operations | no | yes | no | no | no | routes under `/operations/` |
| Issue ODOL enforcement (BATM, ETLE) | no | yes | no | no | no | `OperationsManagerAppView` under `/operations/monitoring/` |
| View policy analysis | no | no | yes | no | no | route `/policy/` |
| Triage reports (review, close, assign inspection) | no | yes | no | no | no | workflow actions, enforced by the API |
| Approve/reject maintenance, start and complete work orders | no | yes | no | no | no | workflow actions; the recommender cannot approve |
| View the audit trail | yes | yes | yes | no | no | `GET /api/workflow/audit` (403 otherwise); UI entry points hidden |

### Report creation and ownership (M1a)

Every new report is built by one factory, `createSessionReport`. It sets a random id
(`REP-` plus 16 hex characters from `crypto.getRandomValues`), `creatorAccountId` and
`creatorRole` from the selected demo account, `origin: 'SESSION'`, an ISO `createdAt`
and status `PENDING`, and rejects reports without a valid account, segment, coordinates,
depth or area. The bundled demo reports keep no owner and no `origin`.

`canEditReport` allows a content edit only when all of these hold, and fails closed
otherwise:

1. the account has a non-empty id and the role `PUBLIC_REPORTER`;
2. the report was created in this session (`origin: 'SESSION'`);
3. `report.creatorAccountId` equals the account id (display names are never compared, so
   USR-001 and USR-006, which share a name, cannot edit each other's reports);
4. `report.creatorRole` equals the account role;
5. the status is `PENDING`.

Consequences: `PUBLIC_VIEWER` and the official roles cannot edit report content, not
even reports they created; nobody can edit the bundled demo reports, including the one
attributed to Budi Santoso by name. Field Engineer verification is a separate action
(the engineer flag on the bottom sheet) and is not decided by `canEditReport`; the
shared store is deliberately not gated, so verification keeps working.

**Still not security.** The account is picked without credentials, `creatorAccountId` is
written by the browser, and the reports live in browser memory. Real ownership needs
authentication, server-side storage and a server check on every edit.

Findings recorded honestly:

- The `PUBLIC_VIEWER` demo account is described as view-only-plus-new-report. With
  M1a it may create reports but not edit them, own ones included.
- "Create a damage report" has no role check anywhere, so the policy maker can create
  one too if they reach the report card.
- The PDF content labels any role other than field engineer or operations manager as
  "Executive Policy Maker" (pre-existing behaviour of `pdfGenerator.ts`).

## 5. Identity switching and state isolation

| Behaviour | Result |
|---|---|
| Switching account re-evaluates the current route | PASS (unit test: from every route, for every account, the landing route is allowed) |
| A protected workspace is never rendered for a role that lacks it | PASS (browser: guard decides before the shell picks its view) |
| Landing never remains on `/login/` | PASS |
| `next` parameter accepts only same-app paths | PASS (unit test with hostile values) |
| Identity survives refresh within the tab | PASS (browser) |
| Upvotes do not carry over between identities | PASS (unit tests and browser, hardening pass) |
| Logout | `SessionProvider.logout()` resets to the default public identity and clears the stored id. The existing UI has no dedicated logout action: the "Keluar" button opens the account switcher, as it was designed to. |

**Data shared across identities (by design, pre-existing).** Road segments, community
reports, the latest simulation result and the audit trail live in one in-memory store
that stands in for a backend, so they are intentionally shared between demo
identities and reset on refresh.

**Per-identity state (fixed in the hardening pass).** Upvotes used to be stored on the
report itself, so an upvote made as one identity appeared as "already upvoted" for the
next one. They are now tracked per account in
`src/features/community-reports/reportState.ts`: the count is shared, the "upvoted by
me" flag belongs to the account that voted. Seed upvote flags are attributed to the
default reporter account (USR-004). Verified by `tests/unit/report-state.test.ts` and
in the browser across two identities. Like everything else here this is in-memory
demo state, not a security control.

## 6. Backend

| Endpoint group | Session | Role / rule |
|---|---|---|
| six original `/api/*` endpoints | none | none (unchanged legacy contract) |
| `POST /api/auth/demo-session`, `/api/auth/login` | none | demo picker; 403 when `DEMO_AUTH=false` |
| `POST /api/auth/anonymous` | none | issues an anonymous public-viewer session |
| `GET /api/workflow/reports`, `/:id`, `/api/risk-map`, `/api/road-segments/*`, `/api/provenance/*` | optional | staff get full cases; everyone else the public projection |
| `POST /api/workflow/reports` (`/api/reports`) | required (anonymous allowed) | 10 per hour per client |
| `POST /api/workflow/reports/:id/transitions` | required | transition table: role, assignment, separation of duty, reason, version |
| `PATCH /api/workflow/reports/:id/content` | required | `canEditReport`: own report by id, PUBLIC_REPORTER, before human review |
| `GET /api/workflow/audit`, `/api/workflow/engineers`, `GET /api/simulations/:id` | required | official roles only |
| `POST /api/simulations` | required | FIELD_ENGINEER only |

Matrix of workflow actions per role: docs/architecture/WORKFLOW_STATE_MACHINE.md.
Tests: `tests/integration/workflow-api.test.ts`, `tests/integration/intelligence-api.test.ts`.
`tests/integration/api.test.ts` still documents that the six legacy endpoints are open.

## 7. Test coverage

`tests/unit/rbac.test.ts` (10 tests): the 27 by 5 route matrix written out
independently of the route table, the 16 by 5 action matrix, the account catalogue,
the landing rules, the no-stale-permission sweep, and `next` sanitisation.
Browser checks per role are listed in `docs/validation/RESTRUCTURE_TEST_REPORT.md`.
