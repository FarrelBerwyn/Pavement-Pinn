# Login and demo authentication

Status: **demo authentication**. The login checks a username (or demo email) and a
password against five dummy demo credentials. It is not production authentication:
there is no identity provider, no user database, and the credentials are public.

## What changed

| Before | Now |
|---|---|
| `/login/` was an account picker; the password field was decorative | `/login/` is a login page: username or email, password, server-side check |
| The profile dropdown, the profile panel (mobile tab "Profile") and the classic-portal navbar could switch to any account | They show the signed-in identity and offer profile/settings and **Keluar** (logout); no account switching |
| `POST /api/auth/login` and `/api/auth/demo-session` issued a token for any `{ accountId }` | Both require `{ username, password }`; a body with only an account id or a role gets `400` and no token |
| A refreshed tab silently created a server session for the stored account id | A named account only resumes a session created by a login; otherwise the identity is signed out |
| Demo identities had government-looking emails and NIP numbers | Emails are `…@pavement-pinn.example`, ID numbers read `DEMO-000n (bukan NIP asli)`, and the UI labels them "Akun demo · identitas fiktif" |

## Demo accounts

Dummy credentials for a local or explicitly enabled demo environment only. The people
are fictional; agency names describe the kind of stakeholder a role stands for, not an
account issued by that agency.

| Role (identifier unchanged) | Name | Username | Password | Account opened | Classic portal |
|---|---|---|---|---|---|
| `FIELD_ENGINEER` | Ir. Ahmad Subagyo, M.T. | `field.ahmad` | `FieldPinn2026!` | USR-006 | USR-001 |
| `OPERATIONS_MANAGER` | Drs. Hendra Gunawan, S.Si. | `ops.hendra` | `OpsPinn2026!` | USR-008 | USR-002 |
| `POLICY_MAKER` | Dr. Ir. Retno Wulandari | `policy.retno` | `PolicyPinn2026!` | USR-007 | USR-003 |
| `PUBLIC_REPORTER` | Budi Santoso, S.T. | `citizen.budi` | `CitizenPinn2026!` | USR-004 | — |
| `PUBLIC_VIEWER` | Siti Aminah, S.E. | `viewer.siti` | `ViewerPinn2026!` | USR-005 | — |

- Usernames are case-insensitive; the demo email of the account also works as username.
- Passwords are case-sensitive.
- Official roles keep their two existing interfaces. The login form opens the modern app;
  the demo-access panel also offers "Portal klasik" (request field `layout: "CLASSIC_PORTAL"`).
- Source: `src/data/reference/demoCredentials.ts` (accounts: `demoAccounts.ts`).

## Where demo credentials exist

| Place | When | How it is controlled |
|---|---|---|
| Server (`server/auth/demoLogin.ts`) | always in the code; checked only while `DEMO_AUTH` is not `false` | `DEMO_AUTH=false` makes `/api/auth/login` answer `403 DISABLED` |
| Browser bundle | dev server, or a build with `VITE_DEMO_ACCESS=true` | loaded by a dynamic import behind a build-time constant; otherwise not in the output |
| Persistent browser storage | never | only the server-signed token and the account id are kept in `sessionStorage` (tab lifetime) |

Checked on 2026-10-14: a default `npm run build` contains no demo password or username in
`dist/assets`; a build with `VITE_DEMO_ACCESS=true` contains them in one lazily loaded
chunk (`demoCredentials-*.js`). Repeat the check after changing `demoAccess.ts`:

```bash
grep -lE 'FieldPinn2026|citizen\.budi' dist/assets/*
```

The server compares SHA-256 digests of the password in constant time and answers the
same `401 "Invalid username or password."` for an unknown user and a wrong password.
Login attempts are limited to 20 per minute per client (`429 RATE_LIMITED` after that).

## Route behaviour

| Situation | Result |
|---|---|
| Not signed in, public route (`/dashboard/`, `/reports/`, `/roads/:id/`, `/engine/`, …) | allowed, as before: citizens may view the map and report anonymously (spec §22) |
| Not signed in, protected route | redirect to `/login/?next=<path>` |
| Successful login | `next` when that account may open it, otherwise the account's home route (unchanged landing rules) |
| Signed in, route of another role | "Akses dibatasi" page at the same URL (unchanged) |
| Refresh | same identity, if its server session is still valid (8 h token); otherwise signed out |
| Account id edited in `sessionStorage` | the app finds no session for it and signs the identity out |
| Logout | token discarded, stored identity cleared, back to `/login/`; the visitor is anonymous again |

The root `/` keeps sending anonymous visitors to the public dashboard. Making the login
page the landing page for everyone would remove anonymous public reporting, which the
product requires; that is a product decision, not part of this change.

## Static build (GitHub Pages)

There is no server on the static host. With `VITE_DEMO_ACCESS=true` the browser checks
the demo credentials itself and shows "Build statis tanpa server" on the login page; this
gives no security at all. Without the flag the static build has **no login**: only the
anonymous public view works. The current Pages workflow does not set the flag, so the
official roles are not reachable there until it is added to the build environment.

## What is not production-grade

- No identity provider, user store, password hashing at rest, password reset, MFA,
  account lockout or audit of login attempts.
- Sessions are stateless HMAC tokens (8 h). Logout only discards the token in the
  browser; the server cannot revoke a token before it expires.
- Without `SESSION_SECRET` (≥ 32 chars) tokens are signed with a per-process key.
- Route guards hide UI only. Server endpoints enforce roles from the signed token;
  data bundled into the JavaScript (reference datasets) is visible to anyone.

Production needs: an identity provider (Supabase Auth is the planned one, decision log
D-021) whose verified JWT replaces `/api/auth/login`, roles assigned by an administrator,
`DEMO_AUTH=false`, and no `VITE_DEMO_ACCESS` in production builds.

## Tests

- `tests/integration/auth-api.test.ts`: each credential opens its account and role;
  case and email handling; classic-portal selection; generic failure; body-only account
  ids and roles refused; tampered token refused; rate limit; `DEMO_AUTH=false`.
- `tests/unit/demo-auth.test.ts`: credential table and names; fictional identities;
  server check; gateways never create a named session from an account id; static build
  login, refresh, logout, wrong credentials and the no-demo build; login messages; route
  guards for signed-out and wrong-role identities.
- Existing workflow and intelligence API tests now sign in with these credentials.
