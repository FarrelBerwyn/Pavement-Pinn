# PAVEMENT_PINN_E2E_WORKFLOW_AUDIT

## Environment
- Repository: `d:\Farrel Folder\Programming\Intel AI Global Impact Festival 2026\Projects\pavement-pinn`
- Branch: `feature/m1-report-ownership`
- Commit: `58a2342` (with uncommitted working tree active)
- Active localhost: `http://localhost:3000/PavementPinn/`
- Runtime ID: `25bff609` (PID 26096, SYNCED, primary :3000)
- Frontend URL: `http://localhost:3000/PavementPinn/`
- Backend/API: `http://localhost:3000/api/`
- Database: `.data/workflow.json` (Canonical persistent JSON data store)
- Test accounts:
  - R.E (Reporter): `citizen.budi` / `CitizenPinn2026!` (USR-004, Budi Santoso, S.T., `PUBLIC_REPORTER`)
  - O.M (Operations Manager): `ops.hendra` / `OpsPinn2026!` (USR-008, Drs. Hendra Gunawan, S.Si., `OPERATIONS_MANAGER`)
  - F.E (Field Engineer): `field.ahmad` / `FieldPinn2026!` (USR-006, Ir. Ahmad Subagyo, M.T., `FIELD_ENGINEER`)
- Test data namespace: `PINN-E2E-001`

## Canonical workflow
R.E submits report
-> O.M reviews report
-> O.M issues SPK
-> F.E receives SPK
-> F.E navigates to location
-> F.E submits completion evidence
-> O.M verifies evidence
-> O.M requests revision OR approves
-> R.E receives final notification

## Role, Route & Component Map
- R.E:
  - Route: `/PavementPinn/reports/` (`ROUTES.reports`)
  - Create Form: `ReportRoadIssueCard.tsx`
  - Feed & Cards: `CommunityReportsDashboard.tsx`
  - Detail Modal: `ReportDetailModal.tsx`
- O.M:
  - Route: `/PavementPinn/operations/tasks/` (`ROUTES.operationsTasks`)
  - Case Board: `LegacyCaseBoard.tsx` (`role="OPS"`)
  - SPK Modal: `SpkModal` (`onDialog({ kind: 'SPK' })`)
  - Verification Modal: `WorkVerifyModal` (`onDialog({ kind: 'WORK_VERIFY' })`)
- F.E:
  - Route: `/PavementPinn/engineering/tasks/` (`ROUTES.engineeringTasks`)
  - Case Board: `LegacyCaseBoard.tsx` (`role="FE"`)
  - Navigation Modal: `TaskNavigation.tsx` / `LeafletMap.tsx` (`onStartNavigation`)
  - Work Completion Modal: `WorkDoneModal` (`onDialog({ kind: 'WORK_DONE' })`)

## Test Case
- Test ID: `PINN-E2E-001`
- Report ID: PENDING_INITIAL_RUN
- SPK ID: PENDING_SPK_ISSUANCE
- Current role: R.E (`citizen.budi`)
- Current status: NOT_STARTED
- Expected status: Complete cycle from SUBMITTED -> VERIFIED -> IN_PROGRESS -> RESOLVED -> CLOSED
- Actual status: IN_PROGRESS
- Browser evidence: Pending browser run
- API/database evidence: Pending API/persistence audit
- Result: NOT TESTED

## Transition Log

| Tahap | Aktor | Expected State (Model) | Expected Status UI | Bukti yang Harus Tersedia | Actual State | Status Persistence | Result |
|---|---|---|---|---|---|---|---|
| Laporan dibuat | R.E (`citizen.budi`) | `SUBMITTED` / `NEEDS_REVIEW` | Menunggu Peninjauan | Report ID, koordinat, foto awal, placeholder sesudah | — | — | NOT TESTED |
| Laporan diperiksa | O.M (`ops.hendra`) | `NEEDS_REVIEW` | Menunggu Peninjauan | Laporan tampil di Tim & Tugas, ID cocok | — | — | NOT TESTED |
| SPK diterbitkan | O.M (`ops.hendra`) | `FIELD_INSPECTION_REQUESTED` / `IN_PROGRESS` | Menunggu F.E | SPK ID, penugasan ke USR-006, instruksi | — | — | NOT TESTED |
| Tugas diterima | F.E (`field.ahmad`) | `FIELD_INSPECTION_REQUESTED` / `IN_PROGRESS` | Tugas Saya | SPK muncul di dashboard F.E, instruksi cocok | — | — | NOT TESTED |
| Navigasi ke lokasi | F.E (`field.ahmad`) | N/A (UI Navigation) | Peta Navigasi | Koordinat tujuan laporan, marker, rute | — | — | NOT TESTED |
| Bukti dikirim | F.E (`field.ahmad`) | `IN_PROGRESS` (with completion submission) | Menunggu Verifikasi | Foto sesudah, catatan penyelesaian F.E | — | — | NOT TESTED |
| Revisi diminta | O.M (`ops.hendra`) | `IN_PROGRESS` (decision `REWORK_REQUESTED`) | Perlu Revisi | Alasan revisi tercatat di riwayat | — | — | NOT TESTED |
| Bukti revisi dikirim | F.E (`field.ahmad`) | `IN_PROGRESS` (new completion submission) | Menunggu Verifikasi | Foto revisi baru & catatan | — | — | NOT TESTED |
| Verifikasi disetujui | O.M (`ops.hendra`) | `RESOLVED` | Selesai | Approval record, timestamp verifikasi O.M | — | — | NOT TESTED |
| Hasil diterima | R.E (`citizen.budi`) | `RESOLVED` | Selesai | Notifikasi penyelesaian, before/after lengkap | — | — | NOT TESTED |

## Defects Log
*(Will be populated during automated browser audit if any bugs are discovered)*

## Final Acceptance Checklist
- [ ] R.E dapat mengirim laporan.
- [ ] Before/after card tampil benar.
- [ ] Foto sesudah kosong sebelum ada bukti.
- [ ] O.M menerima laporan yang sama.
- [ ] Card menyesuaikan status.
- [ ] O.M dapat menerbitkan SPK.
- [ ] SPK tersimpan dan terhubung ke laporan.
- [ ] F.E menerima SPK.
- [ ] Navigasi membuka Maps & Ruas Jalan dengan lokasi yang benar.
- [ ] F.E dapat mengirim foto sesudah dan catatan.
- [ ] Tombol berubah menjadi `Bukti Perbaikan Berhasil Dikirim` setelah penyimpanan sukses.
- [ ] O.M menerima bukti.
- [ ] Modal verifikasi menampilkan detail yang benar.
- [ ] Minta Revisi berfungsi dan alasan tercatat.
- [ ] F.E dapat mengirim ulang bukti revisi.
- [ ] Setujui Verifikasi berfungsi.
- [ ] Status final menjadi Selesai hanya setelah approval O.M.
- [ ] R.E menerima notifikasi penyelesaian.
- [ ] Seluruh data tetap benar setelah refresh.
- [ ] Tidak ada duplikasi laporan, SPK, bukti, atau notifikasi.
- [ ] Authorization setiap role benar.
- [ ] Regression test lulus.
