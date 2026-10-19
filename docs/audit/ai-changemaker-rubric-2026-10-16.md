# Audit Rubrik AI Changemaker — PAVEMENT-PINN (2026-10-16)

Sumber kriteria: *Evaluation Rubrics: AI Changemaker*, hal. 4–8 (`Interview Tips_Deck_Students 2026..pptx.pdf`).
Basis bukti: working tree branch `feature/m1-report-ownership` (termasuk perubahan belum di-commit), `docs/AI.md`,
`docs/FINAL_AUDIT.md`, `docs/audit/*`, dan `npm test` yang dijalankan pada 2026-10-16 (**229 tes, 229 lulus, 0 gagal**).

Prinsip: klaim yang hanya ada di dokumen/blueprint tidak mendapat poin penuh. Bukti diklasifikasikan sebagai
**[TERBUKTI]** (dijalankan/diuji), **[IMPLEMENTASI]** (ada di kode, belum divalidasi), atau **[RENCANA]** (hanya narasi).

## Ringkasan skor

| Metrik | Skor | Maks | % |
|---|---|---|---|
| 01 Enriching Lives – Impact & Inclusion | 12 | 30 | 40,0% |
| 02 AI Innovation – Application & Implementation | 12 | 30 | 40,0% |
| 03 Use of Intel Technologies | 1 | 30 | 3,3% |
| **Total** | **25** | **90** | **27,8%** |

Temuan kunci: produk adalah prototipe alur kerja yang matang dan jujur, tetapi **belum ada inferensi AI nyata**
(CV = DEMO, PINN = rumus RULE_BASED) dan **tidak ada teknologi Intel yang dipakai** — endpoint/telemetri OpenVINO
simulasi bahkan sudah dihapus di working tree (`server/services/openvinoExportService.ts`,
`src/runtime/openvino/simulatedBenchmark.ts` berstatus `D`). Metrik 03 adalah sepertiga nilai dan saat ini hampir nol.

## Metrik 01 — Enriching Lives: Impact & Inclusion (12/30)

| Parameter | Status | Skor | Evidence | Gap | Action |
|---|---|---|---|---|---|
| 1.1 Depth of Impact | Need Modification | 1/3 | Masalah kerusakan jalan & beban berlebih didefinisikan; alur warga→operator→insinyur→kebijakan berjalan [TERBUKTI, golden path di `docs/FINAL_AUDIT.md`]. Komponen AI belum berjalan (`docs/AI.md`). | Tidak ada metrik perbaikan terukur; nilai tambah AI vs software biasa belum terbukti karena engine rule-based. | Tetapkan 2–3 KPI (mis. waktu laporan→inspeksi, recall deteksi lubang, akurasi prediksi umur sisa) dan ukur baseline vs dengan AI. |
| 1.2 Scale of Impact | Need Modification | 1/3 | Pilot lokal Karawang KRW-001..004 (`src/data/reference/karawangPilot.ts`) [IMPLEMENTASI]; ekspansi regional hanya di blueprint [RENCANA]. | Konflik pilot Narogong vs Karawang (v3 memutuskan Narogong fase 1) belum diselesaikan di kode. | Selaraskan pilot di kode; tulis jalur skala lokal→provinsi→nasional dengan jumlah ruas/km yang dapat dijangkau. |
| 1.3 Duration of Impact | Not Verified | 1/3 | Pemeliharaan jalan bersifat jangka panjang (narasi). | Tidak ada rencana keberlanjutan (pemilik sistem, pendanaan, retraining model). | Dokumen keberlanjutan 1 halaman: pemilik operasional, siklus retraining, biaya tahunan. |
| 1.4 Alignment with SDGs | Need Modification | 1/3 | SDG 9, 11, 12, 13, 17 hanya di blueprint BAB 1.3 [RENCANA]; tidak ada di repo/UI. | Tidak ada pemetaan target SDG spesifik (mis. 9.1, 11.2) ke fitur & indikator; argumen "AI vs non-AI" belum ada. | Tabel SDG target → fitur → indikator terukur; jelaskan kenapa skala hanya mungkin dengan CV + model fisika. |
| 2.1 Clarity of problem statement | Pass with Modification | 2/3 | Apa/di mana/kenapa/bagaimana tercakup di blueprint BAB 1 dan spesifikasi v2.2 (`docs/SOURCE_INVENTORY.md`). | Lokasi tidak konsisten (Narogong vs Karawang); belum ada satu problem statement ringkas. | Satu paragraf problem statement final yang konsisten di README, deck, dan aplikasi. |
| 2.2 Evidence problem exists | Need Modification | 1/3 | Statistik nasional ada di blueprint, tetapi audit forensik mencatat "tidak diverifikasi, tanpa dokumen sumber" (laporan forensik §1.1, F-22). | Tidak ada daftar sitasi di repo; sebagian angka menjadi konstanta di layar kebijakan. | Daftar pustaka dengan URL/DOI (BPS, Kementerian PU, Korlantas, studi ODOL) dan tautkan setiap angka ke sumbernya. |
| 2.3 Evidence time-critical | Not Verified | 0/3 | Tidak ditemukan bukti bersitasi tentang urgensi waktu di repo. | Urgensi hanya tersirat. | Tambahkan data tren bersitasi (laju kerusakan, kecelakaan, anggaran tahunan) dan alasan "kenapa sekarang". |
| 3.1 Target audience | Pass with Modification | 2/3 | Empat peran nyata dan RBAC server-side: warga, Operations Manager, Field Engineer, Policy Maker [TERBUKTI, `tests/unit/rbac.test.ts`, golden path]. | Tidak ada validasi pengguna (wawancara/survei dengan dinas atau warga). | Wawancara 3–5 pengguna (Dinas PU/BBPJN, warga) dan catat temuan. |
| 3.2 Accessibility & usability | Pass with Modification | 2/3 | Bilingual id/en (`src/i18n/translations.ts`); layout 375 px dicek; mode "DEMO OFFLINE" di GitHub Pages; fokus terlihat, reduced motion (`docs/FINAL_AUDIT.md` #8–9). | Tidak ada audit screen reader/kontras layar lama; kamera/GPS belum diuji di perangkat nyata; offline bukan PWA; belum diuji di perangkat murah/AI PC. | Uji di HP Android murah + 3G throttling, audit Lighthouse/axe, pertimbangkan PWA untuk pelaporan offline. |
| 3.3 Scalability | Need Modification | 1/3 | Arsitektur modular (`tests/unit/module-boundaries.test.ts`); migrasi Supabase/PostGIS tertulis tetapi belum diterapkan (`docs/FINAL_AUDIT.md` #5). | Tidak ada estimasi cost-per-user; jalur deployment institusional tidak spesifik; deployment BLOCKED. | Hitung biaya per pengguna/per km jalan; sebutkan mitra deployment konkret (dinas kabupaten, BBPJN). |

## Metrik 02 — AI Innovation: Application & Implementation (12/30)

| Parameter | Status | Skor | Evidence | Gap | Action |
|---|---|---|---|---|---|
| 1.1 AI necessary? | Pass with Modification | 1/2 | Deteksi kerusakan dari foto dan estimasi kondisi struktural memang butuh CV/ML (`docs/AI.md`). | Saat ini fungsi yang sama dikerjakan rule engine — juri dapat menyimpulkan AI belum diperlukan. | Tunjukkan perbandingan rule-based vs model pada data yang sama. |
| 1.2 Clear & effective use | Need Modification | 1/3 | CV DEMO, PINN tidak ada (`pinnEngine.ts` = rumus), Gemini hanya narasi opsional (`server/services/narrativeService.ts:9`, fallback offline). | AI adalah komponen kecil/wrapper API, bukan mesin inti. | Jadikan model CV nyata inti alur screening; narasi LLM tetap sebagai lapisan penjelasan. |
| 1.3 Klasifikasi ide | Pass with Modification | 2/3 | Kombinasi laporan warga + CV + model fisika perkerasan + workflow pemerintah = adaptasi ide inovatif. | Komponen orisinal (PINN) belum ada. | Bila PINN dilatih, ide naik ke kategori orisinal. |
| 2.1 Pilihan model tepat | Not Verified | 1/3 | YOLOv8n-seg (notebook Kaggle) sesuai untuk lubang & edge; PINN sesuai untuk fisika perkerasan (`docs/AI.md`). | Bobot tidak ada, hanya 1 kelas (Pothole), dataset bukan Indonesia. | Latih/fine-tune pada foto lokal, tambah kelas retak/rutting, simpan bobot + model card. |
| 2.2 Pemahaman sub-domain AI | Pass with Modification | 1/2 | Dokumentasi menunjukkan pemahaman CV, PINN (loss, ablasi), edge inference (`docs/AI.md`, `docs/validation/PINN_VALIDATION_GAP.md`). | Belum dibuktikan lewat implementasi; akan diuji juri saat wawancara. | Latih tim menjelaskan arsitektur, loss PINN, dan trade-off INT8/FP16. |
| 2.3 Data diperoleh & dianalisis | Need Modification | 1/2 | Label provenance per input (REAL/DEMO/SYNTHETIC/INFERRED) [TERBUKTI, tes]; `docs/DATA_ACQUISITION_PLAN.md` [RENCANA]. | Tidak ada data nyata (foto lokal, WIM, FWD). | Kumpulkan dataset kecil nyata (≥200 foto lokal berlabel) dan dokumentasikan pipeline. |
| 2.4 Kesadaran etika | Pass with Modification | 2/3 | Tampilan publik menyembunyikan identitas staf [TERBUKTI, tes]; separation of duties; DEMO tidak pernah auto-pass; `tests/unit/no-fake-claims.test.ts`; label ILUSTRATIF/SIMULASI. | EXIF/GPS foto belum di-strip; bias dataset non-Indonesia belum dianalisis; layar lama masih punya plat nomor simulasi; belum ada dokumen etika terpadu. | Strip EXIF, dokumen Responsible AI (privasi, bias, keselamatan, risiko halusinasi LLM, jejak energi). |
| 3 GenAI Tool Usage Transparency | Need Modification | 0/4 | Tidak ada daftar resmi alat GenAI. "Claude Code" hanya disebut sebagai penyusun laporan audit forensik; aturan proyek meminta trailer commit tidak menyebut Claude. | Rubrik: tanpa daftar = 0. | Buat `docs/GENAI_DISCLOSURE.md`: semua alat (Claude Code, Gemini, dll.), untuk apa, porsi kode. Catatan: kebijakan trailer commit bertentangan dengan semangat kriteria ini — tinjau ulang. Pengungkapan jujur saja sudah memberi ≥1 poin. |
| 4.1 Prototyping | Need Modification | 1/3 | Prototipe kerja end-to-end [TERBUKTI]. | Kriteria menuntut "real AI inference"; belum ada. | Integrasikan inferensi CV nyata (server-side ONNX/OpenVINO) pada foto unggahan. |
| 4.2 Testing | Pass with Modification | 2/3 | Berjalan di lingkungan terkontrol dengan UI; 229/229 tes lulus (dijalankan 2026-10-16); smoke test bundle produksi (`docs/FINAL_AUDIT.md`). | Tidak ada metrik kuantitatif AI (mAP/F1, latensi) atau umpan balik pengguna. | Laporkan mAP50/F1 pada set validasi lokal + latensi terukur + hasil uji pengguna. |
| 4.3 Full-scale deployment | Not Yet | 0/2 | Deployment BLOCKED; hanya GitHub Pages demo statis. | Tidak ada deployment live untuk target pengguna. | Deploy staging publik + pilot terbatas dengan 1 mitra, catat penggunaan. |

## Metrik 03 — Use of Intel Technologies (1/30)

| Parameter | Status | Skor | Evidence | Gap | Action |
|---|---|---|---|---|---|
| 1.1 Intel resources dipakai | Not Yet | 0/3 | Tidak ada dependensi Intel di `package.json`; kode OpenVINO simulasi dihapus di working tree; README: "OpenVINO … Belum diukur". | Tidak ada tahap lifecycle yang memakai Intel. | Lihat prioritas #1. |
| 1.2 Alasan pemilihan | Need Modification | 1/4 | Jalur PyTorch→ONNX→OpenVINO IR→FP16/INT8→CPU/iGPU/NPU direncanakan (spec §17, `docs/AI.md`) [RENCANA]. | Alasan belum dihubungkan ke kebutuhan nyata (inferensi edge di laptop dinas, biaya tanpa GPU). | Tulis justifikasi: kenapa OpenVINO + NPU Core Ultra untuk inferensi lokal hemat biaya/privasi. |
| 2.1 HW: appropriateness | Not Yet | 0/3 | Tidak ada pengukuran di perangkat Intel. | — | Benchmark di Core Ultra (CPU vs iGPU vs NPU). |
| 2.2 HW: tipe | Not Verified | 0/3 | Perangkat pengembangan tidak terdokumentasi. | Tidak ada bukti CPU/NPU Intel yang dipakai. | Catat spesifikasi perangkat (`lscpu`/`dxdiag`) dan hasil per device. |
| 2.3 HW: extent | Not Yet | 0/4 | — | — | Pakai Intel HW di training kecil/kompresi, benchmark, dan inferensi deployment. |
| 3.1 SW: appropriateness | Not Yet | 0/3 | — | — | Tunjukkan peningkatan latensi/throughput terukur dari OpenVINO vs PyTorch. |
| 3.2 SW: tipe | Not Yet | 0/3 | — | — | OpenVINO 2025/2026 + NNCF INT8; opsional OpenVINO GenAI untuk narasi lokal menggantikan Gemini. |
| 3.3 SW: extent | Not Yet | 0/4 | — | — | OpenVINO di konversi, kuantisasi, benchmark, dan serving; OpenVINO GenAI untuk lapisan narasi. |
| 4 IDR Participation | Not Verified | 0/3 | Tidak ada bukti di repo bahwa proyek dibuat dalam Intel Digital Readiness/program Intel. | — | Bila ikut program, lampirkan sertifikat/bukti; bila tidak, poin ini 0. |

## Prioritas perbaikan (dampak skor vs usaha)

1. **Inferensi CV nyata via OpenVINO di Intel Core Ultra** (potensi ±+15–20 poin: M03 hampir semua parameter, M02 4.1/1.2/2.1/4.2).
   YOLOv8n-seg → `model.export(format="openvino")` → NNCF INT8 → `benchmark_app` di CPU/GPU/NPU → sidecar
   inferensi menggantikan `DEMO_CV_PROVIDER` lewat kontrak `CvScreeningProvider`. Simpan log benchmark sebagai bukti.
2. **GenAI disclosure** (+1 s.d. +3, usaha < 1 jam). Wajib ada; tanpa ini nilainya 0 apa pun kenyataannya.
3. **Metrik kuantitatif** (M02 4.2, M01 1.1): mAP50/F1 pada ≥200 foto lokal, latensi per device, uji pengguna kecil.
4. **Bukti masalah bersitasi + pemetaan SDG target** (M01 1.4, 2.2, 2.3: +4–6 poin, usaha dokumen).
5. **Konsistensi pilot (Narogong vs Karawang)** dan problem statement tunggal — risiko pertanyaan juri.
6. **Cost-per-user, mitra deployment, rencana keberlanjutan** (M01 1.3, 3.3).
7. **OpenVINO GenAI lokal** untuk narasi (menggantikan Gemini cloud) — menambah M03 3.2/3.3 dan cerita privasi/offline.
8. **IDR**: konfirmasi status keikutsertaan; jika ada, lampirkan bukti (+3).
9. **Strip EXIF + dokumen Responsible AI** (M02 2.4 → 3).
10. **Staging deploy publik + pilot terbatas** (M02 4.3).

Perkiraan realistis bila #1–#4 selesai dengan bukti: ±50–60/90. Angka ini proyeksi, bukan penilaian.
