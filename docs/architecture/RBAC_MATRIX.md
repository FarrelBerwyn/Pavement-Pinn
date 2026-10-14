# RBAC Matrix

## 1. What kind of access control this is

Three layers must be kept apart. Only the first one exists as a control.

| Layer | Status | What it does |
|---|---|---|
| Frontend route guards (`src/app/guards/routeAccess.ts`, `src/features/rbac/accessPolicy.ts`) | IMPLEMENTED | decide which screens a demo identity can open and where it lands |
| Demo account switching (`src/app/providers/SessionProvider.tsx`, `/login/`) | SIMULATED authentication | picks one of eight bundled accounts; no credential is checked |
| Backend authorization (`server/`) | PLANNED, not implemented | every API endpoint answers any caller |

Consequences that must not be glossed over:

- **This is not security.** Anyone can select any account. The password field in the
  login dialog is decorative and never read.
- **The guards hide UI; they do not protect data.** All datasets ship inside the
  public JavaScript bundle and `GET /api/roads` returns the full road dataset,
  including WIM vehicle details, to anyone.
- The demo identity is remembered in `sessionStorage` (key
  `pavement-pinn.demo-session.account-id`) only so that refresh and deep links keep
  the same identity within a browser tab. It is a convenience, not a session token.
- No backend authorization was added during the restructure. Adding a header-based
  "role check" on the server would have been fake security, so it was deliberately
  left out. Real protection needs an identity provider, server-side sessions or
  tokens, and per-endpoint role checks.

## 2. Role identifiers (unchanged)

`FIELD_ENGINEER`, `OPERATIONS_MANAGER`, `POLICY_MAKER`, `PUBLIC_REPORTER`, `PUBLIC_VIEWER`,
defined in `src/types/rbac.ts`. The eight demo accounts, their ids, `allowedScopes`,
`restrictedScopes`, clearance levels and `layoutStyle` values are unchanged
(`src/features/authentication/demoAccounts.ts`).

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
| Create a damage report | yes | yes | yes | yes | yes | no role check on the report card |
| Edit own damage report | no | no | no | yes | no | `ReportDetailBottomSheet`: role must be `PUBLIC_REPORTER` |
| Upvote a damage report | yes | yes | yes | yes | yes | no role check |
| Run a PINN simulation | yes | yes | yes | yes | yes | route `/engine/simulation/` |
| Export the simulation PDF | yes | yes | yes | yes | yes | no role check on the button |
| Use FWD and overlay tools | yes | yes | no | no | no | route `/engine/fwd/` |
| Verify a damage report | yes | yes | no | no | no | `FieldEngineerTools` on `/engine/fwd/` |
| Manage work orders (SPK) | yes | yes | no | no | no | routes `/engineering/tasks/`, `/operations/tasks/` |
| View PCI trend history | yes | yes | no | no | no | route `/engine/prediction/` |
| Monitor WIM operations | no | yes | no | no | no | routes under `/operations/` |
| Issue ODOL enforcement (BATM, ETLE) | no | yes | no | no | no | `OperationsManagerAppView` under `/operations/monitoring/` |
| View policy analysis | no | no | yes | no | no | route `/policy/` |

Findings recorded honestly:

- The `PUBLIC_VIEWER` demo account is described as view-only-plus-new-report, and the
  only enforced difference from `PUBLIC_REPORTER` is the missing edit button.
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
| Logout | `SessionProvider.logout()` resets to the default public identity and clears the stored id. The existing UI has no dedicated logout action: the "Keluar" button opens the account switcher, as it was designed to. |

**Data shared across identities (by design, pre-existing).** Road segments, community
reports, the latest simulation result and the audit trail live in one in-memory store
that stands in for a backend, so they are intentionally shared between demo
identities and reset on refresh. One side effect is a real leak of per-user state:
the `userUpvoted` flag is stored on the report itself, so an upvote made as one
identity appears as "already upvoted" for the next identity. This existed before the
restructure and was not changed.

## 6. Backend

| Endpoint | Authentication | Role check |
|---|---|---|
| all six `/api/*` endpoints | none | none |

`tests/integration/api.test.ts` contains a test named "no endpoint requires
authentication" that documents this state. When real authorization is introduced it
must be replaced by a role-to-endpoint matrix.

## 7. Test coverage

`tests/unit/rbac.test.ts` (10 tests): the 27 by 5 route matrix written out
independently of the route table, the 13 by 5 action matrix, the account catalogue,
the landing rules, the no-stale-permission sweep, and `next` sanitisation.
Browser checks per role are listed in `docs/validation/RESTRUCTURE_TEST_REPORT.md`.
