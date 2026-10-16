# PAVEMENT-PINN — Sistem Pendukung Keputusan Perkerasan Jalan

PAVEMENT-PINN membantu warga melaporkan kerusakan jalan dan membantu operator, insinyur,
dan perencana menindaklanjutinya lewat alur kerja yang tercatat. Nama "PINN" adalah nama
proyek; **mesin yang berjalan saat ini adalah rumus heuristik `RULE_BASED`, bukan jaringan
saraf terlatih dan bukan pemecah teori elastis berlapis.** Spesifikasi yang berlaku adalah
*PAVEMENT-PINN v3 Dokumen Induk* (lihat `AGENTS.md`).

## Status jujur (diperbarui 2026-10-15)

| Bagian | Status | Keterangan |
|---|---|---|
| Alur kerja laporan, RBAC server, pemisahan wewenang, jejak audit | **Berjalan, diuji** | dipertahankan dari versi sebelumnya |
| Mesin struktural | **RULE_BASED** | regangan 15–47× di bawah teori elastis berlapis pada kasus acuan v3; diganti PyMastic/MLET di Fase 1 |
| PI-surrogate + Monte Carlo | **RENCANA** | belum ada dataset, bobot, atau metrik |
| Klasifikasi foto (Computer Vision) | **Belum diklasifikasi** | tidak ada model; keyakinan tidak ditampilkan |
| OpenVINO / NPU / latensi | **Belum diukur** | tidak ada runtime, model IR, atau benchmark; angka hanya dari `measurements/*.json` |
| Data WIM / FWD | **Tidak ada sumber data** | modal "pelatihan WIM" dan stasiun WIM fiktif telah dihapus |
| Ringkasan AI | DEMO | rencana: SLM lokal dengan pemeriksa angka (Fase 4) |
| Laporan PDF | indikatif | setiap halaman berisi penafian "bukan dokumen resmi" |

Tidak ada instansi pemerintah maupun Intel yang menjadi pemberi data atau pengesah sistem ini.
Klaim penghematan anggaran, horizon lubang dalam hari, dan vonis "aman"/"melebihi batas ijin"
sengaja tidak ditampilkan karena belum ada dasar perhitungan yang tervalidasi.

Rencana kerja dan temuan: `docs/audit/MASTER_TRACKER.md`.


## 🧭 Panduan Developer: Menjalankan, Struktur Kode, dan Rute

Bagian ini menjelaskan kode yang ada di repositori.

### Menjalankan

```bash
npm install
```

```bash
npm run dev
```

Server Express dan Vite berjalan di `http://localhost:3000/PavementPinn/`.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan (Express dan Vite middleware) |
| `npm run lint` | pemeriksaan tipe (`tsc --noEmit`) |
| `npm test` | tes otomatis: regresi numerik mesin RULE_BASED, klaim palsu, kontrak API, rute, RBAC, batas modul, status laporan, peta |
| `npm run build` | build produksi ke `dist/` (termasuk `404.html` untuk GitHub Pages) |
| `npm start` | menjalankan build produksi |

Variabel lingkungan opsional: `PORT` (bawaan 3000), `VITE_BASE_PATH` (bawaan
`/PavementPinn/`), `GEMINI_API_KEY` (hanya di server). Lihat `.env.example`.

### Struktur kode

```text
server/            backend Express: routes, controllers, services, repositories, integrations
src/app/           router, tabel rute, guard, provider, dua shell aplikasi
src/pages/         komposisi tingkat rute
src/features/      alur kerja per pemangku kepentingan (laporan warga, WIM, kebijakan, FWD, ...)
src/engines/       logika numerik (PINN) dan taksonomi computer vision, tanpa React
src/runtime/       profil perangkat browser (tidak mengklaim NPU)
src/services/      klien API, PDF berpenafian
src/components/    komponen bersama (peta, panel simulasi, kerangka halaman)
src/data/          data referensi dan data demonstrasi
src/types/         kontrak tipe, dipakai juga oleh server
tests/             tes unit, integrasi, dan validasi fisika
docs/              dokumentasi arsitektur, API, dan validasi
```

### Rute utama

`/dashboard/`, `/reports/`, `/roads/:roadId/`, `/login/`, `/settings/`,
`/engine/` (`pinn`, `simulation`, `fwd`, `prediction`),
`/computer-vision/` (`detection`, `history`),
`/engineering/`, `/operations/`, `/policy/`.

### Status kemampuan (penting untuk dibaca)

Agar tidak ada klaim yang berlebihan, status tiap kemampuan dicatat apa adanya:

- **Mesin PINN** saat ini adalah perhitungan deterministik berbentuk rumus tertutup
  (lihat `/engine/pinn/`). Jaringan saraf terlatih belum ada di repositori.
- **Telemetri OpenVINO, benchmark, ekspor IR palsu, dan pipeline WIM** telah dihapus;
  layar menampilkan "belum diukur" / "belum diklasifikasi".
- **Login** memakai akun demo; endpoint alur kerja memeriksa peran dan kepemilikan di server
  dengan token sesi bertanda tangan.
- **Penyimpanan** alur kerja memakai file store JSON lokal (folder .data); migrasi Supabase belum diterapkan.

### Dokumentasi

| Dokumen | Isi |
|---|---|
| `docs/architecture/BASELINE_AUDIT.md` | kondisi repositori sebelum restrukturisasi |
| `docs/architecture/ROUTE_MAP.md` | semua URL, komponen, dan aturan akses |
| `docs/architecture/DEPENDENCY_MAP.md` | struktur akhir, aturan dependensi, tabel migrasi berkas |
| `docs/architecture/RBAC_MATRIX.md` | matriks peran terhadap rute dan aksi, serta batasannya |
| `docs/architecture/FEATURE_PRESERVATION_MATRIX.md` | status setiap fitur setelah restrukturisasi |
| `docs/api/API_INVENTORY.md` | kontrak keenam endpoint |
| `docs/validation/PINN_REGRESSION_REPORT.md` | rumus, konstanta, dan hasil regresi numerik |
| `docs/validation/RESTRUCTURE_TEST_REPORT.md` | perintah, hasil uji, celah verifikasi, dan cara rollback |
| `docs/validation/POST_RESTRUCTURE_HARDENING.md` | hasil pengerasan: perbaikan, keamanan backend, audit Git, daftar kesiapan |
| `docs/validation/PINN_VALIDATION_GAP.md` | celah validasi ilmiah: klasifikasi model, ambang regangan, data minimum yang dibutuhkan |

## 🔁 Alur Kerja Lintas Peran (workflow server)

Laporan warga, triase Operations, inspeksi Field Engineer, rekomendasi, persetujuan,
perintah kerja internal, verifikasi perbaikan, dan pelacakan status publik kini berjalan
di atas **satu catatan bersama** yang disimpan server (`npm run dev` / `npm start`).
Setiap perubahan status dicatat di audit trail (hanya untuk peran resmi).

- Status implementasi vs validasi ilmiah: [`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md)
- Kontrak API: [`docs/api/WORKFLOW_API.md`](docs/api/WORKFLOW_API.md) · state machine: [`docs/architecture/WORKFLOW_STATE_MACHINE.md`](docs/architecture/WORKFLOW_STATE_MACHINE.md)
- Keputusan & celah: [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md), [`docs/GAP_REGISTER.md`](docs/GAP_REGISTER.md), [`docs/REQUIREMENT_TRACEABILITY.md`](docs/REQUIREMENT_TRACEABILITY.md)
- AI/model: [`docs/AI.md`](docs/AI.md) — CV berstatus **DEMO**, PINN belum ada model terlatih (mesin **RULE_BASED**), OpenVINO belum dijalankan.
- Deploy: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). GitHub Pages hanya statis: di sana alur kerja berjalan di memori browser dengan label **DEMO OFFLINE**.

Identitas masih **demo** (pemilih akun tanpa kata sandi; `DEMO_AUTH=false` untuk mematikannya).
Pengunjung tanpa login adalah **Pengunjung Anonim**, bukan akun Budi.
