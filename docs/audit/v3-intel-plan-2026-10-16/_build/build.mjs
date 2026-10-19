// Builds PAVEMENT_PINN_v3_Gap_Analysis_and_Intel_Plan.pdf (A4, Chrome headless).
// Usage: node build.mjs (from this folder). Writes report.html here and the PDF one level up.
import { writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const table = (head, body, cls = 'compact') =>
  `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${code(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const st = (s) => {
  const k = { ADA: 'ok', SEBAGIAN: 'mid', BELUM: 'no', TIDAK: 'no', DIUJI: 'ok', 'BELUM DIUJI': 'mid' }[s] || 'mid';
  return `<span class="badge b-${k}">${esc(s)}</span>`;
};

// ------------------------------------------------------------------ data
// [param, maks, sekarang, target rencana ini, target Dokumen Induk §9, fase pemberi]
const SCORE = [
  ['M01', 'Enriching Lives – Impact & Inclusion', [
    ['1.1 Depth of Impact', 3, 1, 2, '2,5', 'F5 + KPI pilot'],
    ['1.2 Scale of Impact', 3, 1, 2, '2,5', 'F0 (koridor Narogong + Karawang)'],
    ['1.3 Duration of Impact', 3, 1, 3, '3', 'Dokumen (pemilik, active learning)'],
    ['1.4 Alignment with SDGs', 3, 1, 3, '3', 'Dokumen §7.3 → repo/UI'],
    ['2.1 Clarity of problem', 3, 2, 3, '3', 'Dokumen §2.1'],
    ['2.2 Evidence problem exists', 3, 1, 3, '3', 'Lampiran A + evidence/01_sources'],
    ['2.3 Time-critical evidence', 3, 0, 3, '3', 'Dokumen §2.4'],
    ['3.1 Target audience', 3, 2, 3, '3', 'Wawancara petugas/warga'],
    ['3.2 Accessibility & usability', 3, 2, 2, '2,5', 'F6 (PWA, offline, ID/EN)'],
    ['3.3 Scalability', 3, 1, 2, '2,5', 'F0 + biaya per pengguna §7.6'],
  ]],
  ['M02', 'AI Innovation – Application & Implementation', [
    ['1.1 AI necessary', 2, 1, 2, '2', 'F2–F4'],
    ['1.2 Clear & effective use', 3, 1, 2, '2,5', 'F3 + F4 (CV + surrogate + SLM satu alur)'],
    ['1.3 Idea classification', 3, 2, 2, '2,5', 'F2 (PI-surrogate + MC)'],
    ['2.1 Model choice', 3, 1, 3, '3', 'F1–F3'],
    ['2.2 Sub-domain knowledge', 2, 1, 2, '2', 'Latihan Q&A §12'],
    ['2.3 Data obtained & analyzed', 2, 1, 2, '2', 'F3 data card + survei lalu lintas'],
    ['2.4 Ethics', 3, 2, 3, '3', 'F3 (EXIF, blur) + register risiko'],
    ['3 GenAI transparency', 4, 0, 2, '1–3', 'Lembar pengungkapan'],
    ['4.1 Prototyping', 3, 1, 3, '3', 'F3 (inferensi nyata)'],
    ['4.2 Testing', 3, 2, 3, '3', 'F5 + SUS + Spearman'],
    ['4.3 Full-scale deployment', 2, 0, 1, '1', 'F7 (PWA live)'],
  ]],
  ['M03', 'Use of Intel Technologies', [
    ['1.1 Intel resources in lifecycle', 3, 0, 3, '3', 'F1–F5 (peta §5.1)'],
    ['1.2 Reason for selection', 4, 1, 3, '3,5', 'Dokumen §5.3 + benchmark sendiri'],
    ['2.1 HW appropriateness', 3, 0, 2, '2,5', 'F5 (MC per segmen, token/s NPU)'],
    ['2.2 HW type', 3, 0, 3, '3', 'F4 (NPU Core Ultra)'],
    ['2.3 HW extent', 4, 0, 3, '3,5', 'F2 data CPU, F3 latih XPU, F5 eval, F7 deploy'],
    ['3.1 SW appropriateness', 3, 0, 3, '3', 'F2/F3 (OpenVINO + NNCF)'],
    ['3.2 SW type', 3, 0, 3, '3', 'OpenVINO, NNCF, GenAI, Optimum, sklearnex'],
    ['3.3 SW extent', 4, 0, 3, '3,5', 'F2–F5; RAG OpenVINO GenAI (opsional)'],
    ['4 IDR participation', 3, 0, 0, '0 atau 3', 'Konfirmasi penyelenggara'],
  ]],
];
const tot = (i) => SCORE.reduce((a, [, , ps]) => a + ps.reduce((b, p) => b + p[i], 0), 0);
const mtot = (m, i) => m[2].reduce((b, p) => b + p[i], 0);

// Fase rencana: [id, nama, durasi (sprint 14 hari / darurat 7 hari), pekerjaan, teknologi Intel, parameter, bukti, skor kumulatif]
const PHASES = [
  ['F0', 'Bersihkan klaim palsu + dokumen dampak', 'H1 / D1', 'Tutup F-01, F-02, F-04, F-05, F-06, F-12, F-13, F-16, F-19, F-20; `DECISION_LOG.md` D-01..D-18; koridor Narogong sebagai `config/corridors/narogong.json`; sitasi, SDG, urgensi, biaya per pengguna ke repo; lembar pengungkapan GenAI', '— (persiapan: siapkan laptop Core Ultra ber-NPU, email penyelenggara soal IDR)', 'M01 1.2–2.3, 3.3; M02 3', '`no-fake-claims.test.ts`; evidence/01_sources; 13_genai_disclosure.md', 36],
  ['F1', 'Layanan inferensi + fisika MLET', 'H2 / D2', 'FastAPI `inference/`; `/v1/assess` dengan PyMastic (roda ganda); ganti `runPinnSimulation`; tolak input di luar rentang; satu konstanta sumbu 8,16 t', 'Python di CPU Intel (multi-core)', 'M02 2.1; M03 1.1', 'Tes acuan εt ≈ 303 µε, εv ≈ 793 µε (±1%); uji kesebangunan', 38],
  ['F2', 'PI-surrogate + Monte Carlo', 'H3–H4 / D4', '`gen_mlet_dataset.py` ≥ 5.000–20.000 kasus; `train_pi_surrogate.py`; ekspor OpenVINO FP32/FP16 (+INT8 NNCF bila deviasi wajar); MC 2.000 sampel → Indeks Umur P10/P50/P90; pengaman OOD/uji silang > 10%', 'CPU Core Ultra/Xeon (data), PyTorch XPU (latih), OpenVINO + NNCF, sklearnex (ablation)', 'M02 1.1, 1.3, 2.1; M03 1.1, 2.3, 3.1–3.3', '`models/pi_surrogate_metrics.json` (acak + OOD + ablation MLP)', 47],
  ['F3', 'Foto warga: Trust Gate, privasi, YOLO', 'H5–H6 / D3', '`/v1/screen`: hapus EXIF → Trust Gate (blur, cahaya, geofence, pHash) → kaburkan wajah/pelat → YOLO 4 kelas (RDD2022 + foto lokal, split per lokasi) → OpenVINO INT8; status SCREENED/REJECTED_WITH_REASON/MERGED/REFERRED; hapus foto mentah ≤ 7 hari', 'Ultralytics di Arc iGPU (XPU) atau Intel Tiber AI Cloud; NNCF INT8; OpenVINO Runtime CPU/GPU', 'M02 1.2, 2.3, 2.4, 4.1; M03 2.3, 3.1', 'mAP per kelas/kondisi, FP32 vs INT8, FAR/FRR, recall pengaburan', 56],
  ['F4', 'SLM lokal di NPU', 'H7 / D5', 'Ganti Gemini (`narrativeService.ts`) dengan `/v1/brief`: Qwen2.5-1.5B INT4 via OpenVINO GenAI; placeholder angka diisi kode; `check_brief`; fallback templat; NPU → GPU → CPU', 'OpenVINO GenAI di NPU, Optimum Intel (INT4)', 'M02 1.2, 2.4; M03 2.2, 3.2, 3.3', '% lolos pemeriksa pada 50 kasus; token/detik per perangkat', 62],
  ['F5', 'Benchmark + Halaman Bukti', 'H8 / D5', '`bench_tools.py` + `benchmark_app` untuk YOLO, surrogate, SLM di CPU/GPU/NPU pada laptop wawancara; deteksi perangkat dari `core.available_devices`; Halaman Bukti hanya membaca `/v1/measurements`', 'benchmark_app, OpenVINO accuracy check; CPU/iGPU/NPU Core Ultra', 'M01 1.1; M02 4.2; M03 1.2, 2.1, 2.3', '`measurements/*.json` dengan perangkat, versi OpenVINO, driver, tanggal', 68],
  ['F6', 'Keputusan per peran', 'H9–H11 / ditunda', 'Antrian skor risiko + rincian; gabung duplikat; REFERRED; optimasi anggaran (knapsack DP); peta keadilan; mode lapangan offline; status warga', '(memakai model F2–F4 secara offline di laptop Intel)', 'M01 3.1, 3.2; M02 1.2', 'SUS, peringkat buta + Spearman', 71],
  ['F7', 'Kualitas + deployment', 'H8, H11–H13 / D6', 'Playwright golden path; Supabase atau VM + cadangan harian; PWA warga di URL publik', 'VM CPU Intel Xeon (server warga)', 'M02 4.3; M01 3.3; M03 2.3', 'URL publik, statistik laporan live, rekaman demo cadangan', 74],
];

const GAPS = [
  ['A Photo Trust Gate', 'Blur, kecerahan, geofence, akurasi GPS, pHash duplikat, rate limit; FAR/FRR terukur', 'Validasi magic-byte ≤ 5 MB, petunjuk duplikat 30 m / 7 hari', 'SEBAGIAN', '`trust_gate.py` (DIUJI)', 'F3'],
  ['B Privasi', 'Hapus EXIF + kaburkan wajah/pelat sebelum simpan; foto mentah ≤ 7 hari', 'Identitas staf disembunyikan di tampilan publik; EXIF belum di-strip', 'SEBAGIAN', '—', 'F3'],
  ['C Deteksi kerusakan', 'YOLO 4 kelas (D00/D10/D20/D40), RDD2022 + lokal, OpenVINO INT8', 'Classifier aturan DEMO; notebook YOLOv8n-seg 1 kelas tanpa bobot', 'BELUM', '`train_yolo.py` (BELUM DIUJI)', 'F3'],
  ['D Mesin struktural', 'MLET PyMastic + PI-surrogate OpenVINO + MC P10/P50/P90', '`pinnEngine.ts` rumus; regangan 14–77× terlalu kecil', 'BELUM', '`pavement_core.py`, `gen_mlet_dataset.py`, `mc_life.py` (DIUJI); `train_pi_surrogate.py` (BELUM DIUJI)', 'F1–F2'],
  ['E Estimator beban', 'Hitung kendaraan × VDF MDP 2017; rasio aktual/normal', '`esal.ts` benar (8,16 t), lalu lintas INFERRED tanpa data', 'SEBAGIAN', 'fungsi ESAL di `pavement_core.py`', 'F1 + survei'],
  ['F Prioritas & anggaran', 'Skor dapat dijelaskan; knapsack DP + pembanding serakah; peta keadilan', 'Antrian peran ada; tanpa skor risiko atau optimasi', 'BELUM', 'skor prioritas + knapsack di `pavement_core.py`', 'F6'],
  ['G SLM lokal', 'Qwen2.5-1.5B INT4 di NPU via OpenVINO GenAI + pemeriksa angka', 'Gemini cloud opsional + fallback templat', 'BELUM', '`slm_brief.py` (BELUM DIUJI; helper diuji)', 'F4'],
  ['H Active learning & registri', 'Koreksi insinyur → label; `models/registry.json`', 'Tidak ada', 'BELUM', '—', 'F6'],
  ['Halaman Bukti', 'Hanya membaca `measurements/*.json`', 'Telemetri palsu sudah dihapus di working tree; belum ada pengukuran', 'SEBAGIAN', '`bench_tools.py` (BELUM DIUJI)', 'F5'],
  ['Koridor pilot', 'Narogong koridor 1, Karawang koridor 2, sebagai konfigurasi', 'Hanya Karawang di kode; Narogong `OUT_OF_SCOPE`', 'BELUM', '—', 'F0'],
  ['Deployment', 'PWA live publik + Supabase/VM', 'Bundle Node lokal; GitHub Pages demo statis', 'SEBAGIAN', '—', 'F7'],
  ['Workflow, RBAC, audit, What-If', 'Pertahankan', 'Terbukti (229 tes lulus 16-10-2026)', 'ADA', '—', '—'],
];

const LIFECYCLE = [
  ['Pelingkupan masalah', 'Materi Intel Digital Readiness / festival; panduan OpenVINO', '—', 'Belum ada bukti', 'BELUM', 'Sertifikat/lencana + catatan belajar'],
  ['Akuisisi data', 'OpenVINO Runtime (Trust Gate + pengaburan) saat kurasi foto', 'Core Ultra CPU', 'Belum ada foto lokal', 'BELUM', 'Log kurasi dengan perangkat'],
  ['Pembuatan data fisika', 'Python + NumPy/SciPy (PyMastic) multi-core', 'CPU Intel (Core Ultra/Xeon)', 'Python belum terpasang di mesin dev ini', 'BELUM', 'Log waktu + lscpu/Info Sistem'],
  ['Eksplorasi data', 'Intel Extension for Scikit-learn (`sklearnex`)', 'CPU Intel', 'Tidak ada', 'BELUM', 'Notebook + waktu dengan/tanpa patch'],
  ['Pemodelan', 'PyTorch XPU, Ultralytics YOLO', 'Arc iGPU Core Ultra / Intel Tiber AI Cloud', 'Tidak ada model terlatih', 'BELUM', 'Log `torch.xpu.get_device_name()`'],
  ['Optimasi', 'NNCF (INT8 PTQ), Optimum Intel (INT4 SLM)', 'CPU Intel', 'Tidak ada', 'BELUM', 'Tabel akurasi FP32/FP16/INT8/INT4'],
  ['Evaluasi', '`benchmark_app`, skrip benchmark, accuracy check', 'CPU, iGPU, NPU', 'Simulasi sudah dihapus; belum diukur', 'BELUM', '`measurements/*.json`'],
  ['Deployment', 'OpenVINO Runtime (AUTO/CPU/GPU), OpenVINO GenAI (NPU)', 'Core Ultra (lapangan), VM Xeon (warga)', 'Tidak ada', 'BELUM', 'Rekaman demo offline; lscpu VM'],
];

const CODEZIP = [
  ['pavement_core.py', 'DIUJI', 'MLET via PyMastic, fungsi transfer, Indeks Umur, ESAL, skor prioritas, knapsack, pemeriksa angka', 'CPU Intel (Python)', 'M02 2.1, 4.1; M03 1.1'],
  ['test_core.py', 'DIUJI', 'Harus mencetak `ALL TESTS PASSED` (env `PYMASTIC`)', '—', 'M02 4.2'],
  ['trust_gate.py', 'DIUJI', 'Blur, kecerahan, pHash, jarak, keputusan', 'CPU / OpenVINO Runtime', 'M02 2.4; M01 3.2'],
  ['gen_mlet_dataset.py', 'DIUJI', 'Latin hypercube, multi-core', 'CPU multi-core Intel', 'M03 2.3'],
  ['mc_life.py', 'DIUJI', 'Monte Carlo deterministik + sensitivitas', 'CPU/iGPU via surrogate', 'M02 1.1; M03 2.1'],
  ['train_pi_surrogate.py', 'BELUM DIUJI', 'PyTorch → OpenVINO; cek API versi terpasang', 'PyTorch XPU, OpenVINO, NNCF', 'M03 3.1–3.3'],
  ['train_yolo.py', 'BELUM DIUJI', 'Ultralytics; versi baru `quantize=8` bukan `int8=True`', 'XPU, OpenVINO INT8', 'M02 4.1; M03 2.3'],
  ['slm_brief.py', 'BELUM DIUJI', 'OpenVINO GenAI di NPU; helper sudah diuji', 'NPU, OpenVINO GenAI', 'M03 2.2, 3.2, 3.3'],
  ['bench_tools.py', 'BELUM DIUJI', 'Menulis `measurements/*.json`', 'benchmark_app; CPU/GPU/NPU', 'M03 1.2, 2.1'],
];

const DECISIONS = [
  ['Laptop Intel Core Ultra ber-NPU', 'Tanpa perangkat ini poin "AI-specific hardware (NPU)" (M03 2.2) dan benchmark NPU tidak dapat diambil. Benchmark harus di laptop yang dipakai saat wawancara.', 'Kritis'],
  ['Python belum terpasang di mesin dev ini', 'Semua fase F1–F5 butuh Python 3.11+, PyMastic, OpenVINO, NNCF. `test_core.py` belum dapat dijalankan di sini, jadi status "DIUJI" baru klaim dokumen.', 'Kritis'],
  ['Tanggal wawancara', 'Menentukan sprint 14 hari atau darurat 7 hari.', 'Tinggi'],
  ['Atribusi GenAI di commit', 'AGENTS.md meminta trailer `Assisted-by: <tool>`; Dokumen Induk menyebut disusun dengan bantuan Claude; aturan proyek saat ini menulis co-author "Pavement-PINN". Perlu satu keputusan agar lembar pengungkapan konsisten (M02 3).', 'Tinggi'],
  ['Lisensi Ultralytics (AGPL-3.0)', 'AGENTS.md §9: wajib tanya manusia sebelum memasang dependensi copyleft. Alternatif: model deteksi berlisensi permisif.', 'Sedang'],
  ['Status IDR', 'Email penyelenggara; 0 atau 3 poin tergantung konfirmasi. Jangan klaim tanpa bukti.', 'Sedang'],
  ['Tes legacy fisika', 'Golden fixture rumus lama akan gagal setelah MLET. AGENTS.md: tandai sebagai legacy, jangan ubah diam-diam.', 'Sedang'],
  ['Supabase vs VM', 'Pilih satu untuk F7 dan catat di DECISION_LOG (D-18).', 'Rendah'],
];

// ------------------------------------------------------------------ figures
function phaseChart() {
  const W = 640, H = 230, x0 = 40, y0 = 200, top = 20, bw = 56, gap = 16;
  const pts = [['Kini', 25], ...PHASES.map((p) => [p[0], p[7]])];
  const y = (v) => y0 - ((y0 - top) * v) / 90;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Proyeksi skor kumulatif per fase">`;
  for (const g of [0, 30, 60, 90]) s += `<line x1="${x0}" x2="${W - 10}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text x="${x0 - 6}" y="${y(g) + 4}" class="ax" text-anchor="end">${g}</text>`;
  const ty = y(78);
  s += `<line x1="${x0}" x2="${W - 10}" y1="${ty}" y2="${ty}" class="target"/><text x="${W - 12}" y="${ty - 4}" class="ax" text-anchor="end">target Dokumen Induk 78–83</text>`;
  pts.forEach(([l, v], i) => {
    const x = x0 + 12 + i * (bw + gap);
    s += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y0 - y(v)}" rx="3" class="${i ? 'bar' : 'bar0'}"/>`;
    s += `<text x="${x + bw / 2}" y="${y(v) - 5}" class="val" text-anchor="middle">${v}</text>`;
    s += `<text x="${x + bw / 2}" y="${y0 + 16}" class="ax" text-anchor="middle">${l}</text>`;
  });
  return s + '</svg>';
}

function metricCompare() {
  const W = 640, rowH = 54, H = SCORE.length * rowH + 20, x0 = 230, bw = 330;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Skor sekarang vs target per metrik">`;
  SCORE.forEach((m, i) => {
    const y = 6 + i * rowH, now = mtot(m, 2), tgt = mtot(m, 3);
    s += `<text x="0" y="${y + 16}" class="lbl">${m[0]} ${esc(m[1].split(' – ')[0])}</text>`;
    s += `<rect x="${x0}" y="${y + 2}" width="${bw}" height="16" rx="3" class="track"/><rect x="${x0}" y="${y + 2}" width="${Math.max(2, (bw * now) / 30)}" height="16" rx="3" class="bar0"/>`;
    s += `<text x="${x0 + bw + 8}" y="${y + 15}" class="val">${now}/30 kini</text>`;
    s += `<rect x="${x0}" y="${y + 22}" width="${bw}" height="16" rx="3" class="track"/><rect x="${x0}" y="${y + 22}" width="${(bw * tgt) / 30}" height="16" rx="3" class="bar"/>`;
    s += `<text x="${x0 + bw + 8}" y="${y + 35}" class="val">${tgt}/30 target</text>`;
  });
  return s + '</svg>';
}

// ------------------------------------------------------------------ html
const css = `
@page { size: A4; margin: 15mm 13mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1D2433; font-size: 9pt; line-height: 1.42; margin: 0; }
h1 { font-size: 21pt; margin: 0 0 4mm; color: #0B3A75; line-height: 1.2; }
h2 { font-size: 13pt; color: #0B3A75; border-bottom: 1.2pt solid #0B3A75; padding-bottom: 1.4mm; margin: 6mm 0 3mm; break-after: avoid; }
h3 { font-size: 10.3pt; margin: 4.5mm 0 2mm; color: #23344F; break-after: avoid; }
p { margin: 0 0 2.4mm; } ul, ol { margin: 0 0 3mm; padding-left: 5mm; } li { margin-bottom: 1mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; }
th, td { border: 0.5pt solid #D5DAE3; padding: 1.1mm 1.6mm; vertical-align: top; text-align: left; font-size: 8.2pt; }
thead th { background: #EEF2F8; font-weight: 600; }
tr { break-inside: avoid; } tr.tot td { font-weight: 700; background: #F6F8FB; }
td.n { text-align: center; white-space: nowrap; }
code { font-family: Consolas, monospace; font-size: 7.8pt; background: #F1F3F7; padding: 0 0.8mm; border-radius: 1mm; word-break: break-word; }
.badge { display: inline-block; font-size: 7.4pt; font-weight: 600; padding: 0.2mm 1.5mm; border-radius: 2mm; white-space: nowrap; }
.b-ok { color: #116329; background: #E6F4EA; } .b-mid { color: #6B4E00; background: #FFF4D6; } .b-no { color: #9B1C1C; background: #FBE5E5; }
.cover { min-height: 255mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.kicker { color: #5B6475; letter-spacing: 0.6pt; text-transform: uppercase; font-size: 8.6pt; }
.tiles { display: flex; gap: 4mm; margin: 5mm 0; }
.tile { flex: 1; border: 0.6pt solid #D5DAE3; border-radius: 2mm; padding: 3.5mm; }
.tile .n { font-size: 20pt; font-weight: 700; color: #0B3A75; } .tile .t { color: #5B6475; font-size: 8.2pt; }
.tile.hl { background: #0B3A75; } .tile.hl .n, .tile.hl .t { color: #fff; }
.note { border-left: 2.5pt solid #C9822B; background: #FFF8EE; padding: 2.4mm 3.4mm; margin: 3mm 0; }
.ok { border-left-color: #2E7D4F; background: #EEF8F1; }
.fig { width: 100%; margin: 2mm 0 3mm; }
.fig .lbl { font-size: 11px; fill: #23344F; } .fig .val { font-size: 10.5px; fill: #23344F; font-weight: 600; } .fig .ax { font-size: 10px; fill: #5B6475; }
.fig .track { fill: #E8ECF2; } .fig .bar { fill: #0B5CAD; } .fig .bar0 { fill: #9AA6B8; }
.fig .grid { stroke: #E8ECF2; stroke-width: 1; } .fig .target { stroke: #C9822B; stroke-width: 1.4; stroke-dasharray: 5 4; }
.pb { break-before: page; }
.cols { display: flex; gap: 4mm; } .cols > div { flex: 1; }
.card { border: 0.5pt solid #D5DAE3; border-radius: 1.5mm; padding: 2.5mm 3mm; margin-bottom: 3mm; break-inside: avoid; }
.card h4 { margin: 0 0 1.5mm; font-size: 9.6pt; color: #0B3A75; }
.small { font-size: 7.8pt; color: #5B6475; }
`;

const scoreRows = SCORE.flatMap((m) => [
  ...m[2].map((p) => [m[0], p[0], String(p[1]), String(p[2]), String(p[3]), p[4], p[5]]),
]);
const scoreTable = `<table><thead><tr><th>Metrik</th><th>Parameter</th><th>Maks</th><th>Kini</th><th>Target rencana</th><th>Target Dok. Induk</th><th>Fase pemberi bukti</th></tr></thead><tbody>
${SCORE.map((m) => m[2].map((p) => `<tr><td>${m[0]}</td><td>${esc(p[0])}</td><td class="n">${p[1]}</td><td class="n">${p[2]}</td><td class="n"><strong>${p[3]}</strong></td><td class="n">${esc(p[4])}</td><td>${esc(p[5])}</td></tr>`).join('')
  + `<tr class="tot"><td>${m[0]}</td><td>Subtotal</td><td class="n">30</td><td class="n">${mtot(m, 2)}</td><td class="n">${mtot(m, 3)}</td><td class="n">${m[0] === 'M01' ? '28' : '25–28'}</td><td></td></tr>`).join('')}
<tr class="tot"><td colspan="2">Total</td><td class="n">90</td><td class="n">${tot(2)}</td><td class="n">${tot(3)}</td><td class="n">78–83</td><td>+3 bila IDR terkonfirmasi</td></tr></tbody></table>`;
void scoreRows;

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>PAVEMENT-PINN v3 — Analisis Gap dan Rencana Intel</title><style>${css}</style></head><body>

<div class="cover"><div>
  <div class="kicker">Intel AI Global Impact Festival 2026 · AI Changemaker · Stage 3</div>
  <h1>PAVEMENT-PINN v3<br>Analisis Gap Teknologi dan Rencana Implementasi Berbasis Metrik Intel</h1>
  <p>Lanjutan dari <em>Audit Rubrik AI Changemaker</em> (16 Oktober 2026). Dokumen ini menganalisis hasil audit sebelumnya, menjelaskan tiga dokumen acuan v3 (Dokumen Induk, paket kode referensi, AGENTS.md), membandingkannya dengan teknologi yang saat ini belum ada di repository, lalu menyusun rencana bertahap yang dipetakan ke setiap parameter rubrik — terutama Metric 03 <em>Use of Intel Technologies</em>.</p>
  <div class="tiles">
    <div class="tile"><div class="n">25/90</div><div class="t">Skor audit saat ini (27,8%)</div></div>
    <div class="tile hl"><div class="n">${tot(3)}/90</div><div class="t">Target rencana ini bila F0–F7 selesai dengan bukti (${((100 * tot(3)) / 90).toFixed(1).replace('.', ',')}%)</div></div>
    <div class="tile"><div class="n">78–83</div><div class="t">Target versi Dokumen Induk §9</div></div>
  </div>
  ${phaseChart()}
  <p class="small">Semua angka target adalah proyeksi, bukan penilaian juri. Target rencana ini sengaja lebih konservatif daripada Dokumen Induk (bilangan bulat, tanpa IDR).</p>
</div>
<table><tbody>
<tr><th>Tanggal</th><td>16 Oktober 2026</td></tr>
<tr><th>Objek</th><td>Repository <code>pavement-pinn</code>, branch <code>feature/m1-report-ownership</code> (working tree)</td></tr>
<tr><th>Dokumen acuan</th><td><code>PAVEMENT-PINN_v3_Dokumen_Induk.pdf</code> (65 hal., v3.0, 15-10-2026); <code>pavement_pinn_v3_code.zip</code> (9 file Python + README); <code>AGENTS.md</code></td></tr>
<tr><th>Disusun oleh</th><td>Sesi Claude Code atas permintaan pemilik repository. Bukan penilaian resmi.</td></tr>
</tbody></table></div>

<h2>1. Analisis hasil audit sebelumnya</h2>
<div class="cols"><div>${metricCompare()}</div></div>
<h3>1.1 Apa yang dikatakan skor 25/90</h3>
<ul>
<li><strong>Kekuatan nyata</strong> ada di fondasi perangkat lunak: alur multi-peran, RBAC server, pemisahan wewenang, audit trail, label provenance, 229 tes lulus. Ini memberi poin di M01 3.1/3.2 dan M02 2.4/4.2.</li>
<li><strong>Kelemahan struktural</strong>: inti yang dinilai juri — inferensi AI nyata dan teknologi Intel — belum ada. Akibatnya M02 4.1 (prototipe dengan inferensi nyata), M02 2.1 (model), dan hampir seluruh M03 bernilai 0–1.</li>
<li><strong>Kelemahan dokumen</strong>: SDG, sitasi masalah, urgensi, biaya per pengguna, dan pengungkapan GenAI tidak ada di repository. Ini murah diperbaiki: Dokumen Induk §2, §7, §6.6 sudah menyediakan isinya.</li>
</ul>
<h3>1.2 Pola skor: poin hilang terkonsentrasi</h3>
<table><thead><tr><th>Kelompok</th><th>Poin hilang</th><th>Penyebab tunggal</th><th>Fase penutup</th></tr></thead><tbody>
<tr><td>M03 seluruhnya</td><td class="n">29</td><td>Tidak ada OpenVINO/NNCF/GenAI/benchmark di perangkat Intel</td><td>F2–F5</td></tr>
<tr><td>M02 inferensi & model (1.1, 1.2, 2.1, 4.1)</td><td class="n">7</td><td>Mesin rule-based; CV DEMO</td><td>F1–F3</td></tr>
<tr><td>M01 bukti & SDG (1.4, 2.2, 2.3)</td><td class="n">7</td><td>Belum ada sitasi/SDG di repo</td><td>F0 (dokumen)</td></tr>
<tr><td>M02 transparansi GenAI</td><td class="n">4</td><td>Tidak ada lembar pengungkapan</td><td>F0</td></tr>
</tbody></table>
<h3>1.3 Perubahan sejak audit forensik (sudah ada di working tree, belum di-commit)</h3>
<div class="note ok">Sebagian Fase 0 sudah berjalan: file simulasi OpenVINO (<code>openvinoExportService.ts</code>, <code>openvino.routes.ts</code>, <code>simulatedBenchmark.ts</code>), modal WIM palsu (<code>BinaMargaWimPipelineModal.tsx</code>, <code>binaMargaWimScraper.ts</code>) dihapus; <code>tests/unit/no-fake-claims.test.ts</code> ditambahkan; tidak ditemukan <code>Math.random</code> di <code>src/</code> dan <code>server/</code>. Yang belum: koridor Narogong, <code>config/</code>, <code>inference/</code>, <code>measurements/</code>, <code>evidence/</code>, <code>AGENTS.md</code>, <code>docs/v3/</code>.</div>

<h2 class="pb">2. Penjelasan tiga dokumen acuan</h2>
<div class="card"><h4>2.1 PAVEMENT-PINN v3 — Dokumen Induk (65 halaman)</h4>
<p>Sumber kebenaran tunggal yang menggantikan blueprint v1, dokumen finalis v2 dan spesifikasi v2.2. Setiap klaim diberi status TERBUKTI, TARGET, RENCANA, atau DILARANG.</p>
${table(['Bagian', 'Isi utama', 'Relevansi rubrik'], [
  ['0–1', 'Ringkasan, kondisi aplikasi (5 temuan P0), log keputusan D-01..D-18, fitur hapus/ubah/pertahankan/tambah, klaim dilarang', 'Fondasi kejujuran → M02 2.4, 3'],
  ['2', 'Masalah global & Indonesia dengan sitasi (WHO 2026: 1,16 juta kematian; jalan nasional tidak mantap +35,6%; 74% kecelakaan roda dua), urgensi (tenggat 2030, Zero ODOL 2027)', 'M01 2.1–2.3'],
  ['3', 'Arsitektur v3, alur ujung-ke-ujung, 4 peran dengan kriteria lulus W1–W7, O1–O6, E1–E7, K1–K6', 'M01 3.1; M02 1.2'],
  ['4', 'Modul A–H (Trust Gate, privasi, YOLO, MLET + PI-surrogate, estimator beban, prioritas & anggaran, SLM NPU, active learning), model data, kontrak API, perbaikan F-01..F-31', 'M02 2.1–4.1'],
  ['5', 'Teknologi Intel di seluruh siklus, pembagian beban per perangkat, 5 alasan pemilihan, protokol benchmark, partisipasi IDR', 'M03 seluruhnya'],
  ['6', 'Register risiko, siklus data, Model Card, risiko GenAI, lisensi, transparansi GenAI', 'M02 2.4, 3'],
  ['7', 'Teori perubahan, KPI pilot, SDG 3.6/9.1/11.2/13.1 (+16.6), aksesibilitas, skalabilitas, biaya per pengguna', 'M01 1.1–1.4, 3.2, 3.3'],
  ['8–9', 'Sprint 14 hari / darurat 7 hari, paket bukti, Definition of Done, peta skor 90 poin (target 78–83)', 'Semua'],
  ['10–13 + Lamp.', 'Pitch deck 12 slide, naskah demo 5 menit, bank Q&A, checklist, daftar sumber, kode referensi, glosarium', 'Wawancara'],
])}
<p><strong>Keputusan kunci:</strong> "PINN" didefinisikan ulang secara jujur sebagai <em>physics-informed neural surrogate</em> untuk respons elastis berlapis (D-02), dengan PyMastic sebagai acuan (D-04); Narogong = koridor 1, Karawang = koridor 2 (D-03); GenAI lokal di NPU menggantikan cloud (D-10); semua angka performa hanya dari <code>measurements/*.json</code> (D-11).</p></div>

<div class="card"><h4>2.2 pavement_pinn_v3_code.zip — kode referensi (549 baris Python)</h4>
${`<table><thead><tr><th>File</th><th>Status</th><th>Fungsi</th><th>Teknologi Intel</th><th>Parameter</th></tr></thead><tbody>${CODEZIP.map((r) => `<tr><td><code>${esc(r[0])}</code></td><td>${st(r[1])}</td><td>${code(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table>`}
<p class="small">Status DIUJI/BELUM DIUJI dikutip dari README paket dan AGENTS.md. Audit ini tidak dapat menjalankan <code>test_core.py</code> karena Python belum terpasang di mesin ini; verifikasi ulang wajib di laptop tim.</p></div>

<div class="card"><h4>2.3 AGENTS.md — instruksi kerja agent coding</h4>
<ul>
<li><strong>9 aturan wajib</strong>: tanpa angka palsu; performa hanya dari <code>measurements/</code>; setiap keluaran model menyimpan asal-usul (<code>MEASURED</code>/<code>COMPUTED</code>/<code>DEFAULT</code>/<code>ASSUMED</code>); AI tidak mengubah status kasus; daftar frasa terlarang; deterministik; jangan melemahkan tes atau pindah stack; privasi foto; jangan commit kredensial/dataset.</li>
<li><strong>Arsitektur target</strong>: React PWA → Express (sudah ada) → layanan Python FastAPI <code>localhost:8100</code> dengan <code>/v1/screen</code>, <code>/v1/assess</code>, <code>/v1/options</code>, <code>/v1/brief</code>, <code>/v1/measurements</code>.</li>
<li><strong>Fakta teknis terverifikasi</strong>: PyMastic butuh q dalam kPa bila E dalam MPa; <code>iteration=20</code>; tanda <code>et = -Strain_R</code>; nilai acuan εt ≈ 303 µε, εv ≈ 793 µε.</li>
<li><strong>Fase 0–7</strong> berurutan dengan kriteria selesai, konvensi PR kecil per ID temuan, trailer <code>Assisted-by</code>, modul ilmiah inti sebaiknya ditulis tim, dan Definition of Done demo.</li>
</ul></div>

<h2 class="pb">3. Perbandingan: target v3 vs teknologi yang masih kurang</h2>
<h3>3.1 Per modul</h3>
<table><thead><tr><th>Modul</th><th>Target v3</th><th>Kondisi repository sekarang</th><th>Status</th><th>Kode referensi</th><th>Fase</th></tr></thead><tbody>
${GAPS.map((g) => `<tr><td><strong>${esc(g[0])}</strong></td><td>${code(g[1])}</td><td>${code(g[2])}</td><td>${st(g[3])}</td><td>${code(g[4])}</td><td>${esc(g[5])}</td></tr>`).join('')}
</tbody></table>

<h3>3.2 Siklus hidup teknologi Intel (Dokumen Induk §5.1) vs kondisi sekarang</h3>
<table><thead><tr><th>Tahap</th><th>Teknologi Intel</th><th>Hardware</th><th>Kondisi sekarang</th><th>Status</th><th>Bukti yang harus disimpan</th></tr></thead><tbody>
${LIFECYCLE.map((r) => `<tr><td><strong>${esc(r[0])}</strong></td><td>${code(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${st(r[4])}</td><td>${code(r[5])}</td></tr>`).join('')}
</tbody></table>
<div class="note">Kedelapan tahap berstatus BELUM. Inilah sebab M03 bernilai 1/30. Rubrik menilai <em>cakupan siklus</em> (M03 1.1, 2.3, 3.3 — total 11 poin): memakai OpenVINO hanya di deployment memberi nilai "1 tahap"; target rencana ini adalah ≥ 4 tahap dengan log perangkat.</div>

<h3>3.3 Pembagian beban kerja per perangkat (yang harus diukur)</h3>
${table(['Beban kerja', 'Perangkat utama', 'Alasan', 'Yang diukur'], [
  ['YOLO INT8 (foto)', 'iGPU atau CPU; NPU dicoba', 'Konvolusi teratur; iGPU mempercepat tanpa GPU diskrit', 'p50/p95 ms per foto; mAP INT8 vs FP32'],
  ['PI-surrogate (batch Monte Carlo)', 'CPU atau iGPU (batch besar)', 'MLP kecil; ukur, jangan berasumsi', 'Waktu 2.000 dan 100.000 sampel; deviasi FP16/INT8 vs FP32 dan vs PyMastic'],
  ['SLM INT4', 'NPU', 'Hemat daya di lapangan; CPU/iGPU bebas untuk UI dan YOLO', 'Token/detik, latensi token pertama, memori puncak'],
  ['Trust Gate + privasi', 'CPU', 'Harus jalan juga di server CPU', 'ms per foto'],
  ['Layanan warga', 'VM CPU Intel Xeon', 'Foto warga tidak dapat menunggu laptop petugas', 'Laporan per menit, p95 end-to-end'],
])}

<h2 class="pb">4. Rencana dan tahapan</h2>
<p>Urutan mengikuti AGENTS.md §5 dan Dokumen Induk §8. Prinsip: hapus klaim palsu dulu, lalu bangun bukti nyata dari yang paling bernilai rubrik. Setiap fase selesai hanya bila <code>npm test</code>, <code>npm run lint</code> dan <code>pytest</code> hijau.</p>
${PHASES.map((p) => `<div class="card"><h4>${p[0]} · ${esc(p[1])} <span class="small">(sprint 14 hari: ${esc(p[2].split(' / ')[0])} · darurat 7 hari: ${esc(p[2].split(' / ')[1])})</span></h4>
<table class="compact"><tbody>
<tr><th style="width:30mm">Pekerjaan</th><td>${code(p[3])}</td></tr>
<tr><th>Teknologi Intel</th><td>${code(p[4])}</td></tr>
<tr><th>Parameter rubrik</th><td>${esc(p[5])}</td></tr>
<tr><th>Bukti / kriteria selesai</th><td>${code(p[6])}</td></tr>
<tr><th>Skor kumulatif proyeksi</th><td><strong>${p[7]}/90</strong></td></tr>
</tbody></table></div>`).join('')}

<h3>4.1 Bila wawancara kurang dari 8 hari: rencana darurat 7 hari</h3>
${table(['Hari', 'Wajib selesai'], [
  ['D1', 'F0: hapus klaim palsu; slide "apa yang kami temukan dan perbaiki"; lembar pengungkapan GenAI; sitasi + SDG'],
  ['D2', 'F1: layanan Python + MLET PyMastic tersambung ke UI insinyur; tes acuan 303/793'],
  ['D3', 'F3: YOLO pada RDD2022 + ≥ 100 foto lokal, ekspor OpenVINO INT8, deteksi nyata di alur warga'],
  ['D4', 'F2: PI-surrogate + Monte Carlo + Indeks Umur; pengaburan wajah/pelat + hapus EXIF'],
  ['D5', 'F4 + F5: SLM di NPU + pemeriksa; benchmark CPU/GPU/NPU; Halaman Bukti'],
  ['D6', 'F7: deploy PWA live; uji pengguna ≥ 5 orang; rekam demo cadangan'],
  ['D7', 'Latihan wawancara penuh dua kali'],
])}
<p class="small">Ditunda bila waktu tidak cukup (sebut sebagai RENCANA): klasifikasi adegan, optimasi anggaran, RAG, hitung video, sebagian F6.</p>

<h2 class="pb">5. Pemetaan rencana ke metrik Intel (90 poin)</h2>
<p>Kolom "Kini" dari audit 16-10-2026. "Target rencana" adalah perkiraan konservatif bila fase pemberi bukti selesai. "Target Dok. Induk" dikutip dari §9 dokumen tersebut.</p>
${scoreTable}

<h3>5.1 Fokus Metric 03 — bagaimana setiap poin Intel diambil</h3>
${table(['Parameter M03', 'Yang dinilai juri', 'Cara memenuhinya di PAVEMENT-PINN', 'Bukti konkret'], [
  ['1.1 Resources in lifecycle (3)', 'Seluruh siklus vs beberapa tahap kritis vs 1 tahap', 'Intel di pembuatan data, pemodelan, optimasi, evaluasi, deployment', 'Peta §3.2 terisi dengan log per tahap'],
  ['1.2 Alasan pemilihan (4)', 'Alasan spesifik dan terhubung kebutuhan', 'Satu runtime untuk CPU/iGPU/NPU di laptop dinas tanpa GPU diskrit; NNCF dengan kontrol akurasi karena galat regangan diperbesar fungsi transfer pangkat 3–7; GenAI lokal untuk privasi & offline', 'Benchmark PyTorch CPU vs OpenVINO FP32/FP16/INT8 di perangkat yang sama'],
  ['2.1 HW appropriateness (3)', 'Hardware memperbaiki solusi / vital', 'Monte Carlo 2.000 sampel per segmen real time; SLM offline hemat daya', 'Waktu MC per segmen; token/detik NPU'],
  ['2.2 HW type (3)', 'General-purpose vs AI-specific', 'CPU Core Ultra + Arc iGPU + NPU; VM Xeon', 'Keluaran `core.available_devices` + model prosesor'],
  ['2.3 HW extent (4)', 'Seluruh siklus dev–deploy', 'Data (CPU), latih (XPU), eval (CPU/GPU/NPU), deploy (laptop + Xeon)', 'Log `torch.xpu.get_device_name()`, lscpu'],
  ['3.1 SW appropriateness (3)', 'Software memperbaiki solusi', 'OpenVINO + NNCF menentukan latensi & ukuran model', 'Tabel ukuran + latensi per presisi'],
  ['3.2 SW type (3)', 'Framework/toolkit/GenAI Intel', 'OpenVINO 2025/2026, NNCF, OpenVINO GenAI, Optimum Intel, sklearnex, PyTorch XPU', 'requirements + versi di measurements'],
  ['3.3 SW extent (4)', 'Seluruh siklus; OpenVINO GenAI/OPEA untuk GenAI', 'OpenVINO di 5 tahap; OpenVINO GenAI untuk `/v1/brief`; RAG opsional P2', 'measurements + rekaman offline'],
  ['4 IDR (3)', 'Dibuat dalam program Intel', 'Festival tercantum sebagai program Digital Readiness; konfirmasi ke penyelenggara; ikuti modul OpenVINO/AI for Youth', 'Email konfirmasi, sertifikat'],
])}

<h2 class="pb">6. Keputusan dan risiko yang perlu ditangani tim</h2>
${table(['Hal', 'Penjelasan', 'Prioritas'], DECISIONS)}

<h2>7. Definition of Done untuk demo wawancara</h2>
${table(['Kriteria', 'Status sekarang'], [
  ['Tidak ada angka di layar dari konstanta atau `Math.random` (tes CI lulus)', 'Sebagian: `Math.random` tidak ditemukan; konstanta ilustratif di layar lama masih perlu dicek'],
  ['Foto dari ponsel → gate → dikaburkan → dideteksi model berversi → antrian dengan skor yang dapat dijelaskan', 'Belum (CV DEMO)'],
  ['Penilaian struktural: εt/εv dari PyMastic, Indeks Umur P10/P50/P90, kriteria tercantum, label "indikatif"', 'Belum (rumus lama)'],
  ['Laptop dengan Wi-Fi mati tetap bisa menilai dan menulis ringkasan di NPU', 'Belum'],
  ['Halaman Bukti menampilkan benchmark nyata (perangkat, versi OpenVINO, tanggal)', 'Belum'],
  ['Semua tes (npm + pytest + Playwright) hijau; rekaman demo cadangan lokal', 'npm 229/229 lulus; pytest & Playwright belum ada'],
])}

<h3>Paket bukti yang harus siap dibuka saat wawancara (<code>evidence/</code>)</h3>
<p class="small">00_readme · 01_sources · 02_audit · 03_mlet_verification · 04_surrogate · 05_yolo · 06_trust_privacy · 07_slm · 08_benchmarks · 09_field · 10_users · 11_pilot · 12_ethics · 13_genai_disclosure.md · 14_demo_backup.mp4</p>
<p class="small">Dihasilkan dari <code>docs/audit/v3-intel-plan-2026-10-16/_build/build.mjs</code>. Laporan sebelumnya: <code>docs/audit/ai-changemaker-rubric-2026-10-16/</code>.</p>
</body></html>`;

// sanity: rubric maxima
for (const m of SCORE) { const mx = m[2].reduce((a, p) => a + p[1], 0); if (mx !== 30) throw new Error(`${m[0]} max ${mx}`); }
if (tot(2) !== 25) throw new Error('current total must match audit (25)');
if (PHASES.at(-1)[7] !== tot(3)) throw new Error('last phase must equal target total');

const htmlPath = path.join(here, 'report.html');
writeFileSync(htmlPath, html);
const outPdf = path.join(outDir, 'PAVEMENT_PINN_v3_Gap_Analysis_and_Intel_Plan.pdf');
const tmp = mkdtempSync(path.join(tmpdir(), 'pp-pdf-'));
try {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=10000', `--print-to-pdf=${outPdf}`, pathToFileURL(htmlPath).href], { stdio: 'pipe' });
} finally { rmSync(tmp, { recursive: true, force: true }); }
console.log('now', tot(2), 'target', tot(3), '->', outPdf);
