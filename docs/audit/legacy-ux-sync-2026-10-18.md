# Audit — legacy UX, cross-role workflow and cross-port sync (2026-10-18)

Scope: restore the legacy task UX on the current design and backend, and prove that every
localhost port of this environment reads and writes one workflow store. Evidence below comes
from the running servers, the stored data and browser runs; unit tests are listed separately.

## 1. Servers found (before the fix)

| Port | Process | Code | Data store | Notes |
|---|---|---|---|---|
| 3001 | `tsx server/index.ts` (Express + Vite middleware), this repo, branch `feature/m1-report-ownership` | started 08:23, commit `d55d72f` | `.data/workflow.json` | Restarted 08:58 on `e6df122` + this change |
| 5173 | a **second** `tsx server/index.ts` from the same folder (started 08:26 via `npm run dev`, not by this session) | old server code, no version in `/api/health` | the same `.data/workflow.json` | Not stopped (holds data, see §2) |
| 3002 | started 08:58 by this session for the cross-port test | `e6df122` + this change | the same file | |

API calls are same-origin: a page on :5173 talks to the :5173 backend, a page on :3001 to the
:3001 backend. Sessions are signed per process (`SESSION_SECRET` unset), so each port needs its
own login; the workflow data is meant to be shared through the file.

## 2. Root cause (P0) and data incident

`FileCaseStore` read `workflow.json` once and kept it in memory for the life of the process, and
every commit rewrote the whole file from that memory. With two processes on one file:

- changes made on one port were never seen on the other (REP-0D48E30E6358447F was visible on
  :5173 only; REP-A171A382E0100AB4 on :3001 only);
- the next commit of one process silently dropped the other's changes from disk.

Proven loss: REP-0D48E30E6358447F (created and accepted on :5173 at 08:28, `VERIFIED` v4) was
removed from disk at 08:36 when a test on :3001 committed. It still exists in the memory of the
:5173 process. A read-only export of that process (staff view of all cases + audit) and a copy of
the disk file were saved outside the repo before any change. **Restoring it into the shared store
and restarting :5173 needs the owner's approval** (it is a data change).

Fix (`server/repositories/fileCaseStore.ts`, `src/domain/workflow/service.ts`):
- `load` re-reads the file when its mtime/size changed;
- `commit` takes a cross-process lock file and writes only if the revision on disk is still the
  one the change was built on (compare-and-swap); otherwise `StoreConflictError`;
- the service retries the operation on fresh data, so per-case version checks still reject a
  genuinely conflicting action (`VERSION_CONFLICT`), and nothing is overwritten.

`/api/health` now reports the code a process runs (`server.commit`, `currentCommit`, `stale`);
the app shows a banner on a port whose server is older than the repository or reports no version.

## 3. Feature matrix

Status: TERSEDIA = shown working with evidence; BERUBAH = works, behaviour/UX differs from the old
version; BELUM DIVERIFIKASI = not enough evidence; GAGAL = tested and failed.

| Fitur | Komponen UI | API / state | Status | Bukti | Perbaikan |
|---|---|---|---|---|---|
| Popup sukses R.E | `ReportRoadIssueCard` | `POST /api/workflow/reports` → `NEEDS_REVIEW` | TERSEDIA | REP-A6C1B012808C9D1E created on :3002, popup after server save, status "Menunggu peninjauan M.O" | — |
| Panel detail peta | `ReportDetailBottomSheet` | public/staff view | BERUBAH | Before/After slider, status, GPS; "Ulasan Warga" not shown (reviews are local mock data, no backend) | slider restored |
| Before/After R.E | `BeforeAfterSlider` | `workOrder.completionPhotoUrl`, public only when `RESOLVED`/`CLOSED` | TERSEDIA | public API `after=0` before verification, `13343` bytes after; R.E sees before 238391 / after 13343 | shared slider |
| Modal SPK M.O | `SpkModal` | `REVIEW_ACCEPT` + `REQUEST_INSPECTION` | TERSEDIA | :3002, v3→v5; partial failure now reported explicitly | estimate field, "SPK … diterbitkan" notice |
| Kartu tugas F.E | `CaseCard` | assignment, inspection | TERSEDIA | SPK no., F.E, priority, due date (overdue badge), M.O instructions, reporter vs measured size | richer card |
| Tab F.E | `fieldStages.ts` | state + reviews + work order | TERSEDIA | 14 unit tests; live "Belum Dimulai (4)" incl. new/returned tasks | single mapping, stage groups |
| Navigasi F.E | `TaskNavigation` | report coordinates | BERUBAH | map centred on the case pin, back keeps context; routing via Google Maps; distance only from device GPS | — |
| Modal bukti F.E | `WorkDoneModal` | `COMPLETE_WORK_ORDER` (photo required, byte-checked) | TERSEDIA | send disabled without photo; :3001 v12→v13 | — |
| Modal verifikasi M.O | `WorkVerifyModal` | `RESOLVE` / `REQUEST_REWORK` | TERSEDIA | slider + zoom, evidence history (2 submissions) | slider |
| Revisi pekerjaan | same | `REQUEST_REWORK` | TERSEDIA | rework reason shown to F.E on :3001; first evidence kept | — |
| Notifikasi R.E | `notifications.ts`, bell | derived from server history | TERSEDIA | R.E on :3002 got "Laporan Anda selesai…", "Lihat Hasil" opened the same case, map centred | — |
| Sinkronisasi browser | board polling (15 s) | shared store | TERSEDIA (:3001/:3002) · GAGAL (:5173 until restarted) | F.E action on :3001 seen by an open M.O page on :3002 after 8 s without reload | store fix |
| Persistensi | `FileCaseStore` | `.data/workflow.json` | TERSEDIA | data survived server restarts; cross-process tests | — |
| Konteks akun | `AccountContext` | counts from the same cases | TERSEDIA | M.O and F.E headers, desktop + 390 px | new |
| Upload gagal (UI) | modals | server 400 | BELUM DIVERIFIKASI | API rejects a fake image (test); not exercised in the browser | — |

## 4. Tests

- Unit/integration: shared store (3), F.E stages (14), workflow, API contract; full suite green.
- Browser, separate profiles, cross-port: R.E :3002 → M.O :3002 → F.E :3001 (navigation,
  inspection, re-inspection, recommendation) → M.O (approval, work order, rework) → F.E → M.O
  verification → R.E notification and result; REP-A6C1B012808C9D1E ends `RESOLVED` v16.
- Live negative checks on :3001/:3002: R.E/F.E accept → 403; the same action sent to both
  ports at once → one 200, one 409 `VERSION_CONFLICT`, one history record; double SPK → 200 + 409,
  one assignment; F.E verify / R.E SPK → rejected (422). Test report REP-E8FB41B8788BB50F.

## 5. Open

- REP-0D48E30E6358447F: restore from the :5173 export and restart :5173 — awaiting approval.
- :5173 still runs the old store code; any action there can again overwrite the shared file.
- Sessions reset on restart (`SESSION_SECRET` unset); photo EXIF is not stripped.
