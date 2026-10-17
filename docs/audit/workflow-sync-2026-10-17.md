# Audit sinkronisasi alur kerja lintas akun — 2026-10-17

Lingkup: `Mulai Tugas`, laporan, status, inspeksi, rekomendasi, keputusan, notifikasi dan
halaman terkait, R.E → M.O → F.E → D.M. Acuan: `FILES/PAVEMENT-PINN_v2.2.docx` (§19 RBAC,
§24 State Machine, Lampiran K tabel `citizen_reports`) dan kode di branch
`feature/m1-report-ownership`. File `PAVEMENT-PINN_v2.2(5).docx` tidak ditemukan; yang dipakai
`FILES/PAVEMENT-PINN_v2.2.docx` (71 952 byte; salinan identik di `FILES/Docs/`).

## 1. Pemetaan peran

| Singkatan | Peran v2.2 (§19) | Role di kode | Akun demo (modern / klasik) |
|---|---|---|---|
| R.E | Citizen | `PUBLIC_REPORTER` (`PUBLIC_VIEWER` = hanya lihat) | USR-004 |
| M.O | Operations Manager | `OPERATIONS_MANAGER` | USR-008 / USR-002 |
| F.E | Field Engineer | `FIELD_ENGINEER` | USR-006 / USR-001 |
| D.M | Policy Maker | `POLICY_MAKER` | USR-007 / USR-003 |

**Perbedaan dengan permintaan (perlu keputusan, lihat §8):** v2.2 §19 memberi Field Engineer aksi
"Approve/request verification" dan **tidak** memberi Policy Maker aksi persetujuan (hanya overview,
prioritas, skenario, proyeksi anggaran). §24 hanya menulis "ACTION APPROVED (manusia)" tanpa
menyebut peran. Implementasi (DECISION_LOG D-012) menaruh persetujuan pada Operations Manager
dengan pemisahan tugas: F.E yang merekomendasikan tidak boleh menyetujui. D.M di kode membaca
seluruh bukti dan memprioritaskan ruas, tetapi tidak mengubah status. Permission **tidak** diubah.

Nama status: §24 dan kode memakai `FIELD_INSPECTION_REQUESTED`; enum tabel di Lampiran K memakai
`INSPECTION_REQUESTED`. Kode mengikuti §24.

## 2. Diagram alur data dan status

```
R.E (browser)                     Server (sumber kebenaran)                         Peran lain
──────────────                    ─────────────────────────                         ──────────
Lapor kerusakan ── POST /api/workflow/reports ─▶ createSessionReport (whitelist)
                                                  SUBMITTED → AI_SCREENING ─(DEMO/tanpa model)─▶ NEEDS_REVIEW
                                                  FileCaseStore .data/workflow.json (temp+rename)
                                                  AuditLog: aktor, waktu, alasan
M.O ◀── GET /reports (tiap 15 dtk + saat fokus) ──┤
M.O ── REVIEW_ACCEPT ──────────────────────────▶ VERIFIED
M.O ── REQUEST_INSPECTION(engineerId, dueAt) ──▶ FIELD_INSPECTION_REQUESTED ──▶ F.E: Tugas Saya + badge + bell
F.E ── "Mulai Tugas" = SUBMIT_INSPECTION ──────▶ INSPECTED (OBSERVED)
F.E ── RECOMMEND_ACTION ───────────────────────▶ ACTION_RECOMMENDED (+ snapshot penilaian RULE_BASED dari server)
                                                       └──▶ M.O: perlu keputusan · D.M: prioritas & bell
M.O ── APPROVE_ACTION / REJECT_ACTION ─────────▶ ACTION_APPROVED / kembali INSPECTED ──▶ F.E & D.M: bell
M.O ── START_WORK ─────────────────────────────▶ IN_PROGRESS (perintah kerja internal, bukan SPK resmi)
M.O ── COMPLETE_WORK_ORDER ────────────────────▶ IN_PROGRESS (WO selesai) ──▶ F.E: tugas verifikasi
F.E ── RESOLVE ────────────────────────────────▶ RESOLVED
M.O ── CLOSE_RESOLVED ─────────────────────────▶ CLOSED
R.E ◀── tampilan PUBLIC: status + catatan publik saja (tanpa nama staf / catatan internal)
```

Setiap transisi membawa `expectedVersion`; versi kedaluwarsa → 409 `VERSION_CONFLICT`, klien
memuat ulang. Sinkronisasi antar-akun adalah **polling 15 detik + muat ulang saat jendela fokus**,
bukan realtime/push.

## 3. Matriks permission (dari `stateMachine.ts`, diuji di server)

| Aksi | R.E | M.O | F.E | D.M | Sistem |
|---|---|---|---|---|---|
| Kirim laporan | ✔ | ✔ | ✔ | ✔ | |
| Penyaringan otomatis | | | | | ✔ |
| Terima tinjauan / tutup tidak valid | | ✔ | | | |
| Tugaskan inspeksi | | ✔ | | | |
| Kirim hasil inspeksi / rekomendasi | | | ✔ hanya yang ditugaskan | | |
| Setujui / kembalikan rekomendasi | | ✔ bukan perekomendasi | | | |
| Terbitkan & selesaikan perintah kerja | | ✔ | | | |
| Verifikasi perbaikan | | | ✔ | | |
| Tutup laporan | | ✔ | | | |
| Baca kasus lengkap (STAFF) | | ✔ | ✔ | ✔ | |
| Baca tampilan publik | ✔ (milik sendiri: `isMine`) | | | | |
| Audit trail | | ✔ | ✔ | ✔ | |

## 4. Temuan, akar masalah, perbaikan

| ID | P | Lokasi | Akar masalah / bukti sebelum | Perbaikan | Acceptance | Status |
|---|---|---|---|---|---|---|
| WS-01 | P0 | `features/work-orders/MyTasksView.tsx` | 7 tugas hardcoded; "Mulai Tugas" hanya `setTasks` lokal; banner `DEMO LOKAL` | Tugas diturunkan dari kasus yang ditugaskan M.O (`fieldTasks.ts`); "Mulai Tugas" membuka form `SUBMIT_INSPECTION` | F.E yang ditugaskan melihat tugas & konteks laporan asli; F.E lain tidak | **CLOSED** — test `cross-account-tasks` |
| WS-02 | P0 | `pages/engineering/WorkOrdersPage.tsx` | F.E melihat dua daftar tugas (antrian + demo) | F.E: Tugas Saya; M.O: antrian | satu sumber | **CLOSED** |
| WS-03 | P1 | `PavementPinnDashboard.tsx` | "Mulai Tugas Lapangan" = `alert()`, tugas palsu, "7 tugas aktif" | kartu dari kasus nyata, buka Tugas Saya | jumlah = kasus terbuka | **CLOSED** |
| WS-04 | P0 | `PavementPinnDashboard.tsx` checklist | `alert('…Data terverifikasi tersimpan dalam sistem')` tanpa menyimpan apa pun (sukses palsu) | tombol mengarah ke Tugas Saya | tidak ada klaim simpan palsu | **CLOSED** |
| WS-05 | P1 | `PavementPinnDashboard.tsx` "Riwayat" | `alert` dengan PCI 2024/2025 karangan | buka Riwayat Jalan | — | **CLOSED** |
| WS-06 | P0 | `features/fwd/FieldEngineerTools.tsx` | F.E "Terbitkan SPK Baru" lokal → melompati persetujuan M.O (START_WORK hanya M.O) | tombol diganti "Ajukan Penanganan (Tugas Saya)"; daftar SPK diberi label ILUSTRATIF | tidak ada jalur F.E menerbitkan perintah kerja | **CLOSED** |
| WS-07 | P1 | `ModernAppLayout.tsx` bell | 4 notifikasi dummy ("Laporan diverifikasi…") | `features/workflow/notifications.ts` dari riwayat transisi per peran; tanda baca per akun di browser | notifikasi = transisi nyata | **CLOSED** — test |
| WS-08 | P2 | `ModernAppLayout.tsx` sidebar | badge "7" hardcoded | `tasksDue(fieldTasks(...))` — fungsi sama dengan halaman | badge = tugas giliran F.E | **CLOSED** — test |
| WS-09 | P1 | `domain/reports/reportFactory.ts` | `...draft` menyimpan `repairDetails`, `upvotesCount`, `wimCorrelation`, klasifikasi CV dari klien (ditemukan oleh test baru: laporan warga baru tampil dengan "PCI 28 → 88" dan 84 dukungan) | whitelist; upvote 0; klasifikasi klien → `NOT_CLASSIFIED` | bukti perbaikan hanya dari alur | **CLOSED** — test |
| WS-10 | P1 | `services/api/workflowClient.ts` (offline) | rekomendasi tanpa snapshot penilaian (server melampirkannya) | gateway offline menghitung snapshot sendiri | sama dengan server | **CLOSED** — test |
| WS-11 | P1 | `AppStateProvider.tsx` | akun lain hanya melihat perubahan setelah ganti akun / muat ulang manual | polling 15 dtk + fokus (mode SERVER) | M.O melihat laporan R.E ≤ 15 dtk | **CLOSED** (bukan realtime) |
| WS-12 | P2 | `ReportWorkflowPanel.tsx` | ID aktor mentah (USR-008), aksen biru | nama + peran (M.O/F.E), tema terang/gelap, kuning PINN | — | **CLOSED** |
| WS-13 | P2 | `server/repositories/fileCaseStore.ts` | cache per proses: dua server pada `.data/` yang sama saling menimpa | belum diubah; jalankan satu instance per `DATA_DIR` | — | **OPEN** (dokumentasi) |
| WS-14 | P2 | konfigurasi | `SESSION_SECRET` tidak di-set → sesi hilang saat server restart (data tetap) | butuh nilai rahasia dari Anda | — | **OPEN** — HD-WS-2 |
| WS-15 | P3 | `FieldEngineerTools.tsx` | prop `onUpdateReportStatus` tidak pernah dipanggil | dibiarkan (tidak berefek) | — | OPEN |
| WS-16 | P2 | spesifikasi | Approver & peran D.M berbeda dari permintaan (lihat §1) | tidak diubah | — | **BLOCKER** HD-WS-1 |

## 5. Hasil tes per akun dan per transisi

`npm test` → **244 lulus, 0 gagal** (2 test baru di `tests/integration/cross-account-tasks.test.ts`).
Satu laporan, login baru tiap langkah, server HTTP nyata dengan `FileCaseStore`:

| Langkah | Akun | Diperiksa | Hasil |
|---|---|---|---|
| Kirim | R.E USR-004 | 201, ID laporan; field bukti dari klien dibuang | ✔ |
| Tinjau | M.O USR-008 | kasus sama, `NEEDS_REVIEW`, notifikasi REVIEW | ✔ |
| Tugaskan | M.O | `FIELD_INSPECTION_REQUESTED`, `assignedBy` = M.O | ✔ |
| Mulai Tugas | F.E USR-006 | tugas ada, CTA "Mulai Tugas", deskripsi asli, badge 1, notifikasi | ✔ |
| Isolasi | F.E USR-001 | tidak ada tugas/notifikasi untuk kasus itu | ✔ |
| Inspeksi → rekomendasi | F.E | CTA berikutnya `RECOMMEND_ACTION`; lalu `WAITING`, badge 0 | ✔ |
| Baca | M.O, D.M | inspeksi 9 cm, rekomendasi, snapshot `RULE_BASED`; D.M tanpa aksi | ✔ |
| Keputusan | M.O | `ACTION_APPROVED`; F.E & D.M menerima notifikasi | ✔ |
| Status publik | R.E | `ACTION_APPROVED`, tanpa catatan/ID staf, notifikasi | ✔ |
| Gateway offline | — | snapshot penilaian terlampir | ✔ |

Sudah tercakup sebelumnya di `workflow-api.test.ts` (tidak diulang): golden path sampai
`CLOSED` + urutan audit lengkap, D.M ditolak menyetujui (403), F.E lain ditolak (403), versi
basi 409, transisi ilegal 422, token palsu, persistensi setelah restart server, gagal tulis → 503
dan data tidak berubah.

Browser (server uji port 3100, `DATA_DIR` terpisah — data `.data/` Anda tidak disentuh): F.E
login → bell "1 Baru: Tugas inspeksi baru untuk Anda · REP-KRW-001 …", badge sidebar 1; sesi
2026-10-16: Mulai Tugas → kirim inspeksi → rekomendasi, lalu M.O/D.M/R.E membaca kasus yang sama
lewat API.

## 6. Komponen UI yang diseragamkan

`ReportWorkflowPanel` (tema `light`/`dark`, tombol utama `bg-brand text-navy`, fokus
`ring-brand`), `StateBadge` (+ `TONE_CLASS_LIGHT`), Tugas Saya (kartu, chip filter, ringkasan,
drawer), kartu tugas di dasbor PINN, antrian M.O/D.M (hex neon → token), dropdown notifikasi
(empty state), badge sidebar. Penyapuan gaya global (warna, radius, bayangan tanpa glow) sudah
di-commit sesi lain di `4d6defe` dan `3e5d4d4`; audit ini tidak mengulanginya.

## 7. Keputusan yang dibutuhkan

- **HD-WS-1** — Siapa yang menyetujui penanganan? (a) tetap M.O (implementasi sekarang, D-012), D.M
  membaca & memprioritaskan; (b) D.M menyetujui (menyimpang dari v2.2 §19); (c) F.E menyetujui
  sesuai teks §19 (bertentangan dengan pemisahan tugas). Permission tidak diubah sampai diputuskan.
- **HD-WS-2** — Set `SESSION_SECRET` (≥32 karakter) agar login bertahan saat server restart.
- **HD-WS-3** — Realtime (SSE/WebSocket) dibutuhkan, atau polling 15 dtk cukup untuk demo?
- Supabase (penyimpanan produksi) tetap tidak terhubung (F-24); tidak ada deployment dilakukan.
