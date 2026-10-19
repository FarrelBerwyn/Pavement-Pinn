// Builds PAVEMENT_PINN_AI_Changemaker_Rubric_Audit.pdf (A4, Chrome headless).
// Usage: node build.mjs   (from this folder). Writes report.html and the PDF one level up.
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

// ---------------------------------------------------------------- data
// [kode, parameter, pertanyaan kunci (ringkas), status, skor, maks, evidence, gap, action, kelas bukti]
const M = [
  {
    id: 'M01', name: 'Enriching Lives – Impact & Inclusion', max: 30,
    groups: [
      ['Impact of the solution on society & overall SDG Goals', [
        ['1.1', 'Depth of Impact', 'Dampak jelas? transformatif? AI memberi dampak yang tak bisa dicapai software biasa? ada metrik terukur?', 'Need Modification', 1, 3,
          'Masalah kerusakan jalan & beban berlebih didefinisikan; alur warga → Operations → Field Engineer → Policy Maker berjalan end-to-end (golden path, `docs/FINAL_AUDIT.md`). Komponen AI belum berjalan (`docs/AI.md`).',
          'Tidak ada metrik perbaikan terukur; nilai tambah AI dibanding software biasa belum terbukti karena engine masih rule-based.',
          'Tetapkan 2–3 KPI (waktu laporan→inspeksi, recall deteksi lubang, galat prediksi umur sisa) dan ukur baseline vs dengan AI.', 'TERBUKTI (alur) / RENCANA (AI)'],
        ['1.2', 'Scale of Impact', 'Lokal, regional atau global?', 'Need Modification', 1, 3,
          'Pilot lokal Karawang KRW-001..004 (`src/data/reference/karawangPilot.ts`). Ekspansi Karawang/Semarang hanya di blueprint.',
          'Konflik pilot Narogong (blueprint, keputusan v3) vs Karawang (kode) belum diselesaikan.',
          'Selaraskan pilot di kode; tulis jalur skala lokal → provinsi → nasional dengan jumlah ruas/km yang dijangkau.', 'IMPLEMENTASI'],
        ['1.3', 'Duration of Impact', 'Jangka pendek, menengah atau panjang?', 'Not Verified', 1, 3,
          'Pemeliharaan jalan bersifat jangka panjang (narasi blueprint).',
          'Tidak ada rencana keberlanjutan: pemilik operasional, pendanaan, siklus retraining model.',
          'Dokumen keberlanjutan satu halaman: pemilik, biaya tahunan, siklus retraining.', 'RENCANA'],
        ['1.4', 'Alignment with UN SDGs', 'SDG mana? bagaimana selaras? inovatif? jalur AI yang skalabel yang tidak bisa dicapai non-AI?', 'Need Modification', 1, 3,
          'SDG 9, 11, 12, 13, 17 hanya disebut di blueprint BAB 1.3; tidak muncul di repo atau UI (audit forensik BP-1.3: Narrative).',
          'Tidak ada pemetaan target SDG (mis. 9.1, 11.2, 3.6) → fitur → indikator; argumen "AI vs non-AI" belum ada.',
          'Tabel target SDG → fitur → indikator terukur; jelaskan mengapa skala hanya mungkin dengan CV + model fisika.', 'RENCANA'],
      ]],
      ['Significance of the problem statement', [
        ['2.1', 'Clarity of the problem statement', 'Apa, di mana, mengapa, bagaimana?', 'Pass with Modification', 2, 3,
          'Apa/di mana/mengapa/bagaimana tercakup di blueprint BAB 1 dan spesifikasi v2.2 (`docs/SOURCE_INVENTORY.md`).',
          'Lokasi tidak konsisten (Narogong vs Karawang); belum ada satu problem statement ringkas yang dipakai di semua artefak.',
          'Satu paragraf problem statement final, sama di README, deck dan aplikasi.', 'RENCANA (dokumen)'],
        ['2.2', 'Evidence that the problem exists', 'Data didukung sitasi/referensi?', 'Need Modification', 1, 3,
          'Statistik nasional ada di blueprint, tetapi audit forensik menyatakan tidak diverifikasi dan tanpa dokumen sumber (§1.1, F-22).',
          'Tidak ada daftar sitasi di repo; sebagian angka menjadi konstanta di layar kebijakan.',
          'Daftar pustaka ber-URL/DOI (BPS, Kementerian PU, Korlantas, studi ODOL) dan tautkan setiap angka ke sumbernya.', 'RENCANA'],
        ['2.3', 'Evidence that the problem is time critical', 'Mendesak? didukung sitasi?', 'Not Verified', 0, 3,
          'Tidak ditemukan bukti bersitasi tentang urgensi waktu di repo.',
          'Urgensi hanya tersirat.',
          'Data tren bersitasi (laju kerusakan, kecelakaan, anggaran tahunan) dan argumen "mengapa sekarang".', '—'],
      ]],
      ['User & User Readiness', [
        ['3.1', 'Target Audience', 'Siapa yang terdampak? terhubung jelas dengan masalah?', 'Pass with Modification', 2, 3,
          'Empat peran nyata dengan RBAC di server: warga, Operations Manager, Field Engineer, Policy Maker (`tests/unit/rbac.test.ts`, golden path).',
          'Belum ada validasi pengguna (wawancara/survei dengan dinas atau warga).',
          'Wawancara 3–5 pengguna (Dinas PU/BBPJN, warga) dan dokumentasikan temuan.', 'TERBUKTI'],
        ['3.2', 'Accessibility & usability', 'UX setara? offline/low-bandwidth? perangkat murah? multibahasa/multimodal?', 'Pass with Modification', 2, 3,
          'Bilingual id/en (`src/i18n/translations.ts`); layout 375 px dicek; mode "DEMO OFFLINE" di GitHub Pages; fokus terlihat, reduced motion (`docs/FINAL_AUDIT.md` #8–9). Input foto + teks (multimodal dasar).',
          'Belum ada audit screen reader/kontras layar lama; kamera/GPS belum diuji di perangkat nyata; offline bukan PWA; belum diuji di HP murah/AI PC.',
          'Uji di HP Android murah + throttling 3G, audit Lighthouse/axe, PWA untuk pelaporan offline.', 'TERBUKTI (sebagian)'],
        ['3.3', 'Scalability', 'Jalur deployment spesifik? arsitektur modular? cost-per-user?', 'Need Modification', 1, 3,
          'Arsitektur modular (`tests/unit/module-boundaries.test.ts`); migrasi Supabase/PostGIS tertulis tetapi belum diterapkan (`docs/FINAL_AUDIT.md` #5).',
          'Tidak ada estimasi cost-per-user; mitra deployment tidak spesifik; deployment BLOCKED.',
          'Hitung biaya per pengguna dan per km jalan; sebut mitra konkret (dinas kabupaten, BBPJN).', 'IMPLEMENTASI'],
      ]],
    ],
  },
  {
    id: 'M02', name: 'AI Innovation – Application & Implementation', max: 30,
    groups: [
      ['Requirement & Innovative Use of AI', [
        ['1.1', 'Is the use of AI necessary?', '—', 'Pass with Modification', 1, 2,
          'Deteksi kerusakan dari foto dan estimasi kondisi struktural memang membutuhkan CV/ML (`docs/AI.md`).',
          'Saat ini fungsi yang sama dikerjakan rule engine; juri dapat menyimpulkan AI belum diperlukan.',
          'Tunjukkan perbandingan rule-based vs model pada data yang sama.', 'RENCANA'],
        ['1.2', 'Clear & effective use of AI', 'AI dipakai menyeluruh atau komponen kecil? GenAI/agentic sebagai inti atau wrapper API?', 'Need Modification', 1, 3,
          'CV = DEMO; PINN tidak ada (`pinnEngine.ts` = rumus deterministik); Gemini hanya narasi opsional dengan fallback offline (`server/services/narrativeService.ts:9`).',
          'AI adalah komponen kecil / wrapper API, bukan mesin inti.',
          'Jadikan model CV nyata inti screening; LLM tetap lapisan penjelasan yang tidak menambah kesimpulan.', 'IMPLEMENTASI (wrapper)'],
        ['1.3', 'Classification of the idea', 'Orisinal, adaptasi ide inovatif, atau generik?', 'Pass with Modification', 2, 3,
          'Kombinasi laporan warga + CV + model fisika perkerasan + workflow pemerintah = adaptasi ide inovatif.',
          'Komponen paling orisinal (PINN) belum ada.',
          'PINN terlatih dengan residual fisika + ablasi akan menaikkan klasifikasi ke orisinal.', 'RENCANA'],
      ]],
      ['Level of Complexity & Responsible Use of AI', [
        ['2.1', 'Is the choice of AI model appropriate?', '—', 'Not Verified', 1, 3,
          'YOLOv8n-seg (notebook Kaggle) cocok untuk lubang dan edge; PINN cocok untuk fisika perkerasan (`docs/AI.md`).',
          'Bobot tidak tersedia; hanya 1 kelas (Pothole); dataset bukan Indonesia.',
          'Fine-tune pada foto lokal, tambah kelas retak/rutting, simpan bobot + model card.', 'RENCANA'],
        ['2.2', 'Knowledge of AI sub-domains', 'ML, DL, CV, NLP, GenAI, Agentic, RAG, Multimodal, Edge.', 'Pass with Modification', 1, 2,
          'Dokumentasi menunjukkan pemahaman CV, PINN (loss, ablasi), inferensi edge (`docs/AI.md`, `docs/validation/PINN_VALIDATION_GAP.md`).',
          'Belum dibuktikan lewat implementasi; diuji juri saat wawancara.',
          'Latih tim menjelaskan arsitektur, loss PINN, trade-off FP16/INT8.', 'DOKUMEN'],
        ['2.3', 'How data is obtained and analyzed', '—', 'Need Modification', 1, 2,
          'Label provenance per input (REAL/DEMO/SYNTHETIC/INFERRED) teruji; `docs/DATA_ACQUISITION_PLAN.md`.',
          'Tidak ada data nyata (foto lokal, WIM, FWD).',
          'Kumpulkan ≥200 foto lokal berlabel dan dokumentasikan pipeline data.', 'TERBUKTI (provenance) / RENCANA (data)'],
        ['2.4', 'Awareness of ethical considerations', 'Privasi, bias, transparansi, keamanan, keselamatan, risiko GenAI.', 'Pass with Modification', 2, 3,
          'Tampilan publik menyembunyikan identitas staf (teruji); separation of duties; DEMO tidak pernah auto-pass; `tests/unit/no-fake-claims.test.ts`; label ILUSTRATIF/SIMULASI.',
          'EXIF/GPS foto belum di-strip; bias dataset non-Indonesia belum dianalisis; layar lama masih punya plat nomor simulasi; tidak ada dokumen etika terpadu.',
          'Strip EXIF; dokumen Responsible AI (privasi, bias, keselamatan, halusinasi LLM, jejak energi).', 'TERBUKTI (sebagian)'],
      ]],
      ['GenAI Tool Usage Transparency', [
        ['3', 'All GenAI tools listed?', '0 = tidak ada; 1 = GenAI metode utama; 2 = brainstorming; 3 = mayoritas kode orisinal; 4 = semua orisinal.', 'Need Modification', 0, 4,
          'Tidak ada daftar resmi alat GenAI. "Claude Code" hanya disebut sebagai penyusun laporan audit forensik; aturan proyek meminta trailer commit tidak menyebut Claude.',
          'Rubrik: tanpa pengungkapan = 0.',
          'Buat `docs/GENAI_DISCLOSURE.md`: semua alat (Claude Code, Gemini, dll.), kegunaan, porsi kode. Tinjau ulang kebijakan trailer commit.', '—'],
      ]],
      ['Readiness of the Solution', [
        ['4.1', 'Prototyping', 'Prototipe kerja dengan inferensi AI nyata.', 'Need Modification', 1, 3,
          'Prototipe kerja end-to-end (golden path di browser).',
          'Kriteria menuntut "real AI inference"; belum ada.',
          'Inferensi CV nyata di server (ONNX/OpenVINO) pada foto unggahan.', 'TERBUKTI (tanpa AI)'],
        ['4.2', 'Testing', 'Lingkungan uji terkontrol + UI; (opsional) metrik kuantitatif.', 'Pass with Modification', 2, 3,
          '`npm test` dijalankan 2026-10-16: 229 tes, 229 lulus, 0 gagal; smoke test bundle produksi (`docs/FINAL_AUDIT.md`).',
          'Tidak ada metrik AI kuantitatif (mAP/F1, latensi) atau umpan balik pengguna.',
          'Laporkan mAP50/F1 pada set validasi lokal, latensi terukur, hasil uji pengguna.', 'TERBUKTI'],
        ['4.3', 'Full-scale deployment', 'Bukti deployment live untuk target.', 'Not Yet', 0, 2,
          'Deployment BLOCKED; hanya demo statis GitHub Pages.',
          'Tidak ada deployment live untuk pengguna sasaran.',
          'Staging publik + pilot terbatas dengan satu mitra, catat penggunaan.', '—'],
      ]],
    ],
  },
  {
    id: 'M03', name: 'Use of Intel Technologies', max: 30,
    groups: [
      ['Requirement of Intel AI in the solution', [
        ['1.1', 'Are Intel technology resources used?', 'Seluruh lifecycle / beberapa tahap kritis / satu tahap non-kritis.', 'Not Yet', 0, 3,
          'Tidak ada dependensi Intel di `package.json`; kode OpenVINO simulasi dihapus di working tree; README: "OpenVINO … Belum diukur".',
          'Tidak ada tahap lifecycle yang memakai teknologi Intel.',
          'Lihat prioritas #1 (OpenVINO + Core Ultra).', '—'],
        ['1.2', 'Appropriateness & utility (alasan pemilihan)', 'Alasan pemilihan teknologi Intel dijelaskan?', 'Need Modification', 1, 4,
          'Jalur PyTorch → ONNX → OpenVINO IR → FP16/INT8 → CPU/iGPU/NPU direncanakan (spec §17, `docs/AI.md`).',
          'Alasan belum dihubungkan ke kebutuhan nyata (inferensi lokal di laptop dinas, tanpa GPU diskrit, privasi foto).',
          'Justifikasi tertulis: OpenVINO + NPU Core Ultra untuk inferensi lokal hemat biaya dan privat.', 'RENCANA'],
      ]],
      ['Use of Intel AI-optimized Hardware', [
        ['2.1', 'Appropriateness & utility', 'Memperbaiki solusi? vital? dioptimalkan untuk AI?', 'Not Yet', 0, 3, 'Tidak ada pengukuran di perangkat Intel.', '—', 'Benchmark Core Ultra: CPU vs iGPU vs NPU.', '—'],
        ['2.2', 'Type of hardware used', 'General-purpose (Core Ultra CPU, Xeon, Arc) vs AI-specific (Gaudi, NPU).', 'Not Verified', 0, 3, 'Perangkat pengembangan tidak terdokumentasi.', 'Tidak ada bukti CPU/NPU Intel dipakai.', 'Catat spesifikasi perangkat dan hasil per device.', '—'],
        ['2.3', 'Extent of use of Intel hardware', 'Seluruh lifecycle / 2–3 tahap / 1 tahap.', 'Not Yet', 0, 4, '—', '—', 'Intel HW untuk kompresi, benchmark dan inferensi deployment.', '—'],
      ]],
      ['Use of Intel AI Software', [
        ['3.1', 'Appropriateness & utility', 'Memperbaiki solusi? vital? dioptimalkan?', 'Not Yet', 0, 3, '—', '—', 'Tunjukkan peningkatan latensi/throughput OpenVINO vs PyTorch.', '—'],
        ['3.2', 'Type of software used', 'IPEX, OpenVINO 2025/2026, oneAPI, NNCF, OpenVINO GenAI, OPEA, ONNX.', 'Not Yet', 0, 3, '—', '—', 'OpenVINO + NNCF INT8; opsional OpenVINO GenAI untuk narasi lokal menggantikan Gemini.', '—'],
        ['3.3', 'Extent of use of Intel software', 'Seluruh lifecycle? OpenVINO GenAI/OPEA untuk GenAI/RAG?', 'Not Yet', 0, 4, '—', '—', 'OpenVINO di konversi, kuantisasi, benchmark, serving; OpenVINO GenAI di lapisan narasi.', '—'],
      ]],
      ['IDR Participation', [
        ['4', 'Intel Digital Readiness / Intel Program', 'Dibuat sebagai bagian dari program Intel?', 'Not Verified', 0, 3, 'Tidak ada bukti di repo.', '—', 'Lampirkan sertifikat/bukti bila ikut; bila tidak, poin tetap 0.', '—'],
      ]],
    ],
  },
];

// Komponen proyek PINN vs ekspektasi rubrik
const COMPONENTS = [
  ['Workflow pelaporan & RBAC', 'Alur warga → Operations → Engineer → Policy, audit trail, separation of duties', 'TERBUKTI', 'M01 3.1, 3.2 · M02 2.4, 4.2', 'Kuat; ini fondasi demo.'],
  ['Computer Vision (deteksi kerusakan)', 'Classifier aturan di browser; `DEMO_CV_PROVIDER`; notebook YOLOv8n-seg tanpa bobot', 'RENCANA', 'M02 1.2, 2.1, 4.1 · M03 semua', 'Komponen kunci yang paling banyak membuka poin.'],
  ['PINN (model fisika perkerasan)', 'Tidak ada; `pinnEngine.ts` = rumus deterministik RULE_BASED, 29 skenario regresi', 'RENCANA', 'M02 1.1, 1.3, 2.1', 'Nama proyek menjanjikan PINN; juri akan menanyakannya.'],
  ['OpenVINO / Intel HW', 'Endpoint & telemetri simulasi dihapus; tidak ada runtime, IR, benchmark', 'TIDAK ADA', 'M03 seluruhnya (30 poin)', 'Gap terbesar.'],
  ['Narasi GenAI (Gemini)', 'Opsional, fallback offline, hanya menyusun ulang hasil', 'IMPLEMENTASI', 'M02 1.2, 2.4', 'Wrapper API; bisa dipindah ke OpenVINO GenAI lokal.'],
  ['Traffic / ESAL / WIM', 'Diimplementasikan dengan fallback INFERRED; tanpa data WIM', 'IMPLEMENTASI', 'M01 1.1 · M02 2.3', 'Butuh data nyata.'],
  ['Provenance & label klaim', 'Status REAL/DEMO/SYNTHETIC/INFERRED; tes anti-klaim palsu', 'TERBUKTI', 'M02 2.3, 2.4', 'Nilai tambah etika & transparansi.'],
  ['Deployment', 'Bundle Node teruji lokal; GitHub Pages demo statis; Supabase belum diterapkan', 'IMPLEMENTASI', 'M01 3.3 · M02 4.3', 'Belum ada pengguna live.'],
  ['Bukti masalah & SDG', 'Narasi blueprint tanpa sitasi di repo', 'RENCANA', 'M01 1.4, 2.2, 2.3', 'Murah diperbaiki, poin signifikan.'],
];

const PRIORITIES = [
  ['1', 'Inferensi CV nyata via OpenVINO di Intel Core Ultra', 'M03 1.1–3.3; M02 1.2, 2.1, 4.1, 4.2', '+15 s.d. +20', 'Tinggi', 'YOLOv8n-seg → export OpenVINO → NNCF INT8 → benchmark_app CPU/GPU/NPU → sidecar menggantikan `DEMO_CV_PROVIDER`.'],
  ['2', 'Pengungkapan alat GenAI', 'M02 3', '+1 s.d. +3', 'Sangat rendah', '`docs/GENAI_DISCLOSURE.md`; tinjau kebijakan trailer commit.'],
  ['3', 'Metrik kuantitatif', 'M02 4.2; M01 1.1', '+2 s.d. +3', 'Sedang', 'mAP50/F1 pada ≥200 foto lokal, latensi per device, uji pengguna kecil.'],
  ['4', 'Sitasi masalah + pemetaan target SDG', 'M01 1.4, 2.2, 2.3', '+4 s.d. +6', 'Rendah', 'Daftar pustaka ber-URL/DOI; tabel SDG target → fitur → indikator.'],
  ['5', 'Konsistensi pilot & problem statement', 'M01 1.2, 2.1', '+1 s.d. +2', 'Rendah', 'Narogong (v3) vs Karawang (kode).'],
  ['6', 'Cost-per-user, mitra, keberlanjutan', 'M01 1.3, 3.3', '+2 s.d. +3', 'Rendah', 'Satu halaman model biaya dan pemilik operasional.'],
  ['7', 'OpenVINO GenAI lokal untuk narasi', 'M03 3.2, 3.3; M02 2.4', '+2 s.d. +3', 'Sedang', 'Ganti Gemini cloud dengan LLM kecil di NPU/iGPU.'],
  ['8', 'Status IDR', 'M03 4', '+3 (bila ada)', 'Sangat rendah', 'Lampirkan sertifikat bila ikut program.'],
  ['9', 'Strip EXIF + dokumen Responsible AI', 'M02 2.4', '+1', 'Rendah', 'Privasi lokasi pelapor.'],
  ['10', 'Staging publik + pilot terbatas', 'M02 4.3; M01 3.3', '+1 s.d. +2', 'Tinggi', 'Butuh mitra dan host.'],
];

// ---------------------------------------------------------------- helpers
const statusClass = { 'Pass': 'st-pass', 'Pass with Modification': 'st-pwm', 'Not Verified': 'st-nv', 'Need Modification': 'st-nm', 'Not Yet': 'st-ny' };
const badge = (s) => `<span class="badge ${statusClass[s]}">${esc(s)}</span>`;
const sum = (m) => m.groups.flatMap((g) => g[1]).reduce((a, r) => a + r[4], 0);
const rows = (m) => m.groups.flatMap((g) => g[1]);
const pct = (a, b) => ((100 * a) / b).toFixed(1).replace('.', ',');
const total = M.reduce((a, m) => a + sum(m), 0);

function metricBars() {
  const W = 640, rowH = 46, H = M.length * rowH + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Skor per metrik">`;
  M.forEach((m, i) => {
    const y = 10 + i * rowH, x0 = 300, bw = W - x0 - 70, v = sum(m);
    s += `<text x="0" y="${y + 20}" class="lbl">${m.id} ${esc(m.name)}</text>`;
    s += `<rect x="${x0}" y="${y + 6}" width="${bw}" height="22" rx="3" class="track"/>`;
    s += `<rect x="${x0}" y="${y + 6}" width="${Math.max(2, (bw * v) / m.max)}" height="22" rx="3" class="bar"/>`;
    s += `<text x="${x0 + bw + 8}" y="${y + 22}" class="val">${v}/${m.max}</text>`;
  });
  return s + '</svg>';
}

function paramChart(m) {
  const r = rows(m), W = 640, rowH = 20, H = r.length * rowH + 10;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Skor parameter ${m.id}">`;
  r.forEach((p, i) => {
    const y = 4 + i * rowH, x0 = 250, unit = 70;
    s += `<text x="0" y="${y + 13}" class="lbl sm">${p[0]} ${esc(p[1].length > 38 ? p[1].slice(0, 37) + '…' : p[1])}</text>`;
    for (let k = 0; k < p[5]; k++) s += `<rect x="${x0 + k * (unit + 4)}" y="${y + 2}" width="${unit}" height="13" rx="2" class="${k < p[4] ? 'bar' : 'track'}"/>`;
    s += `<text x="${x0 + 4 * (unit + 4) + 8}" y="${y + 13}" class="val sm">${p[4]}/${p[5]}</text>`;
  });
  return s + '</svg>';
}

function statusDist() {
  const order = ['Pass', 'Pass with Modification', 'Not Verified', 'Need Modification', 'Not Yet'];
  let h = '<table class="compact"><thead><tr><th>Metrik</th>' + order.map((o) => `<th>${badge(o)}</th>`).join('') + '<th>Jumlah</th></tr></thead><tbody>';
  for (const m of M) {
    const r = rows(m);
    h += `<tr><td>${m.id}</td>` + order.map((o) => `<td class="num">${r.filter((p) => p[3] === o).length}</td>`).join('') + `<td class="num">${r.length}</td></tr>`;
  }
  const all = M.flatMap(rows);
  h += '<tr class="tot"><td>Total</td>' + order.map((o) => `<td class="num">${all.filter((p) => p[3] === o).length}</td>`).join('') + `<td class="num">${all.length}</td></tr>`;
  return h + '</tbody></table>';
}

function metricSection(m, i) {
  const v = sum(m);
  let h = `<section class="metric"><h2>${3 + i}. ${m.id} — ${esc(m.name)} <span class="score">${v}/${m.max} · ${pct(v, m.max)}%</span></h2>`;
  h += paramChart(m);
  for (const [gname, ps] of m.groups) {
    const gs = ps.reduce((a, p) => a + p[4], 0), gm = ps.reduce((a, p) => a + p[5], 0);
    h += `<h3>${esc(gname)} <span class="sub">${gs}/${gm}</span></h3>`;
    for (const p of ps) {
      h += `<div class="param"><div class="phead"><span class="pid">${p[0]}</span><span class="pname">${esc(p[1])}</span>${badge(p[3])}<span class="pscore">${p[4]}/${p[5]}</span></div>`;
      h += `<table class="kv"><tbody>
        <tr><th>Pertanyaan kunci</th><td>${code(p[2])}</td></tr>
        <tr><th>Evidence</th><td>${code(p[6])}</td></tr>
        <tr><th>Kelas bukti</th><td>${esc(p[9])}</td></tr>
        <tr><th>Gap</th><td>${code(p[7])}</td></tr>
        <tr><th>Action</th><td>${code(p[8])}</td></tr></tbody></table></div>`;
    }
  }
  return h + '</section>';
}

function summaryTable() {
  let h = '<table class="compact"><thead><tr><th>Metrik</th><th>Parameter</th><th>Status</th><th class="num">Skor</th></tr></thead><tbody>';
  for (const m of M) for (const p of rows(m)) h += `<tr><td>${m.id}</td><td>${p[0]} ${esc(p[1])}</td><td>${badge(p[3])}</td><td class="num">${p[4]}/${p[5]}</td></tr>`;
  return h + '</tbody></table>';
}

// ---------------------------------------------------------------- html
const css = `
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1D2433; font-size: 9.2pt; line-height: 1.42; margin: 0; }
h1 { font-size: 22pt; margin: 0 0 4mm; color: #0B3A75; }
h2 { font-size: 13.5pt; color: #0B3A75; border-bottom: 1.2pt solid #0B3A75; padding-bottom: 1.5mm; margin: 7mm 0 3mm; break-after: avoid; }
h3 { font-size: 10.5pt; margin: 5mm 0 2mm; color: #23344F; break-after: avoid; }
.score { float: right; font-size: 11pt; color: #23344F; } .sub { color: #5B6475; font-weight: 400; font-size: 9pt; }
p { margin: 0 0 2.5mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; }
th, td { border: 0.5pt solid #D5DAE3; padding: 1.4mm 2mm; vertical-align: top; text-align: left; }
thead th { background: #EEF2F8; font-weight: 600; }
.compact td, .compact th { padding: 1mm 1.6mm; font-size: 8.4pt; }
.num { text-align: right; white-space: nowrap; } tr.tot td { font-weight: 700; background: #F6F8FB; }
tr { break-inside: avoid; }
code { font-family: Consolas, monospace; font-size: 8.2pt; background: #F1F3F7; padding: 0 1mm; border-radius: 1mm; word-break: break-all; }
.badge { display: inline-block; font-size: 7.6pt; font-weight: 600; padding: 0.3mm 1.6mm; border-radius: 2mm; white-space: nowrap; border: 0.5pt solid; }
.st-pass { color: #116329; background: #E6F4EA; } .st-pwm { color: #1A5B8F; background: #E5F0FA; }
.st-nv { color: #6B4E00; background: #FFF4D6; } .st-nm { color: #9A3B00; background: #FDEBDD; } .st-ny { color: #9B1C1C; background: #FBE5E5; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.cover .kicker { color: #5B6475; letter-spacing: 0.6pt; text-transform: uppercase; font-size: 9pt; }
.big { display: flex; gap: 5mm; margin: 6mm 0; }
.tile { flex: 1; border: 0.6pt solid #D5DAE3; border-radius: 2mm; padding: 4mm; }
.tile .n { font-size: 22pt; font-weight: 700; color: #0B3A75; } .tile .t { color: #5B6475; font-size: 8.5pt; }
.tile.hl { background: #0B3A75; color: #fff; } .tile.hl .n, .tile.hl .t { color: #fff; }
.note { border-left: 2.5pt solid #C9822B; background: #FFF8EE; padding: 2.5mm 3.5mm; margin: 3mm 0; }
.fig { width: 100%; margin: 2mm 0 3mm; }
.fig .lbl { font-size: 11px; fill: #23344F; } .fig .sm { font-size: 9.5px; } .fig .val { font-size: 11px; fill: #23344F; font-weight: 600; }
.fig .track { fill: #E8ECF2; } .fig .bar { fill: #0B5CAD; }
.param { border: 0.5pt solid #D5DAE3; border-radius: 1.5mm; margin: 0 0 3mm; break-inside: avoid; }
.phead { display: flex; align-items: center; gap: 2.5mm; background: #F6F8FB; padding: 1.6mm 2.5mm; border-bottom: 0.5pt solid #D5DAE3; }
.pid { font-weight: 700; color: #0B3A75; min-width: 7mm; } .pname { flex: 1; font-weight: 600; } .pscore { font-weight: 700; font-size: 10pt; }
.kv { margin: 0; } .kv th { width: 27mm; background: #fff; color: #5B6475; font-weight: 600; border-left: 0; } .kv td { border-right: 0; }
.kv tr:last-child th, .kv tr:last-child td { border-bottom: 0; }
.pb { break-before: page; }
.small { font-size: 8.2pt; color: #5B6475; }
ol li { margin-bottom: 1mm; }
`;

const allRows = M.flatMap(rows);
const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>PAVEMENT-PINN — Audit Rubrik AI Changemaker</title><style>${css}</style></head><body>

<div class="cover">
  <div>
    <div class="kicker">Intel AI Global Impact Festival 2026 · AI Changemaker</div>
    <h1>PAVEMENT-PINN<br>Audit terhadap Rubrik Penilaian AI Changemaker</h1>
    <p>Penilaian independen per parameter berdasarkan <em>Evaluation Rubrics: AI Changemaker</em> (hal. 4–8), dengan bukti dari kode, dokumentasi, dan hasil uji repository.</p>
    <div class="big">
      <div class="tile hl"><div class="n">${total}/90</div><div class="t">Total skor · ${pct(total, 90)}%</div></div>
      ${M.map((m) => `<div class="tile"><div class="n">${sum(m)}/${m.max}</div><div class="t">${m.id} ${esc(m.name)} · ${pct(sum(m), m.max)}%</div></div>`).join('')}
    </div>
    ${metricBars()}
  </div>
  <table class="compact"><tbody>
    <tr><th>Tanggal audit</th><td>16 Oktober 2026</td></tr>
    <tr><th>Objek</th><td>Repository <code>pavement-pinn</code>, branch <code>feature/m1-report-ownership</code>, termasuk perubahan working tree yang belum di-commit</td></tr>
    <tr><th>Kriteria</th><td>Evaluation Rubrics: AI Changemaker — Metric 01, 02, 03 (maksimum 90 poin)</td></tr>
    <tr><th>Uji yang dijalankan</th><td><code>npm test</code> pada 16-10-2026: 229 tes, 229 lulus, 0 gagal</td></tr>
    <tr><th>Disusun oleh</th><td>Sesi audit otomatis (Claude Code) atas permintaan pemilik repository. Bukan penilaian resmi juri.</td></tr>
  </tbody></table>
</div>

<h2>1. Ringkasan eksekutif</h2>
<p>PAVEMENT-PINN saat ini adalah <strong>prototipe alur kerja yang matang dan jujur</strong>: pelaporan warga, triase, penugasan inspeksi, rekomendasi, persetujuan, work order, verifikasi dan penutupan berjalan end-to-end dengan kontrol akses di server, audit trail, dan pelabelan status data yang konsisten. Namun dua hal yang paling dinilai rubrik belum ada: <strong>inferensi AI nyata</strong> (CV masih DEMO, "PINN" masih rumus deterministik) dan <strong>pemakaian teknologi Intel</strong> (tidak ada OpenVINO, NNCF, atau benchmark di perangkat Intel; kode OpenVINO simulasi sedang dihapus).</p>
<div class="note"><strong>Skor: ${total}/90 (${pct(total, 90)}%).</strong> Metric 03 (sepertiga total) bernilai ${sum(M[2])}/30. Satu pekerjaan — menjalankan model deteksi kerusakan melalui OpenVINO di Intel Core Ultra dan mengukurnya — membuka sebagian besar poin yang hilang di Metric 02 dan 03 sekaligus.</div>

<h3>Distribusi status</h3>
${statusDist()}

<h3>Metodologi dan definisi status</h3>
<table class="compact"><tbody>
<tr><td>${badge('Pass')}</td><td>Sudah diimplementasikan dan terbukti berfungsi.</td></tr>
<tr><td>${badge('Pass with Modification')}</td><td>Sudah berfungsi, tetapi masih perlu penyempurnaan.</td></tr>
<tr><td>${badge('Not Verified')}</td><td>Belum dapat diverifikasi karena bukti atau pengujian tidak memadai.</td></tr>
<tr><td>${badge('Need Modification')}</td><td>Sudah tersedia, tetapi belum memenuhi kriteria secara memadai.</td></tr>
<tr><td>${badge('Not Yet')}</td><td>Belum diimplementasikan.</td></tr>
</tbody></table>
<p>Kelas bukti: <strong>TERBUKTI</strong> = dijalankan/diuji; <strong>IMPLEMENTASI</strong> = ada di kode, belum divalidasi; <strong>RENCANA</strong> = hanya narasi di blueprint/dokumen. Klaim yang hanya ada di dokumentasi tidak mendapat poin penuh; parameter tanpa bukti cukup ditandai Not Verified dan tidak diberi skor spekulatif. Tidak ada hasil uji yang dikarang.</p>

<h2 class="pb">2. Perbandingan metrik penilaian vs proyek PINN</h2>
<h3>2.1 Komponen proyek terhadap ekspektasi rubrik</h3>
<p>Tabel ini memetakan setiap komponen PAVEMENT-PINN ke parameter rubrik yang bergantung padanya, beserta kondisi nyata di repository.</p>
<table class="compact"><thead><tr><th>Komponen</th><th>Kondisi di repository</th><th>Kelas bukti</th><th>Parameter rubrik terdampak</th><th>Catatan</th></tr></thead><tbody>
${COMPONENTS.map((c) => `<tr><td><strong>${esc(c[0])}</strong></td><td>${code(c[1])}</td><td>${esc(c[2])}</td><td>${esc(c[3])}</td><td>${esc(c[4])}</td></tr>`).join('')}
</tbody></table>

<h3>2.2 Apa yang diharapkan juri vs apa yang dimiliki PINN</h3>
<table class="compact"><thead><tr><th>Metrik</th><th>Yang diharapkan rubrik</th><th>Kondisi PAVEMENT-PINN</th><th>Kekuatan</th><th>Kelemahan utama</th></tr></thead><tbody>
<tr><td>M01</td><td>Dampak terukur, skala, durasi, SDG yang konkret, masalah bersitasi, pengguna & aksesibilitas, jalur skala dan biaya</td><td>Masalah dan pengguna jelas; alur dan aksesibilitas dasar terbukti; bukti masalah dan SDG masih narasi</td><td>Empat peran nyata, bilingual, mobile, mode offline demo</td><td>Tanpa sitasi, tanpa KPI, tanpa cost-per-user, pilot tidak konsisten</td></tr>
<tr><td>M02</td><td>AI sebagai inti, model tepat, data nyata, etika, transparansi GenAI, prototipe dengan inferensi nyata, metrik uji, deployment</td><td>Rule engine dengan label jujur; CV DEMO; PINN belum ada; Gemini opsional; 229 tes lulus; belum deploy</td><td>Etika & provenance kuat, pengujian perangkat lunak luas, desain pipeline siap menerima model</td><td>Tidak ada inferensi AI nyata; pengungkapan GenAI tidak ada (0/4)</td></tr>
<tr><td>M03</td><td>Teknologi Intel di seluruh lifecycle, alasan pemilihan, HW AI-optimized (NPU/Gaudi), SW (OpenVINO, NNCF, OpenVINO GenAI, OPEA), IDR</td><td>Hanya rencana jalur OpenVINO di dokumen; implementasi simulasi dihapus</td><td>Rencana arsitektur (ONNX → IR → INT8 → CPU/iGPU/NPU) sudah benar arahnya</td><td>Tidak ada pemakaian Intel sama sekali</td></tr>
</tbody></table>

<h3>2.3 Skor per parameter (seluruh 30 parameter)</h3>
${summaryTable()}

<div class="pb"></div>
${M.map(metricSection).join('\n')}

<h2 class="pb">6. Prioritas perbaikan</h2>
<p>Diurutkan berdasarkan dampak terhadap skor dan kesiapan menghadapi pertanyaan juri. Potensi poin adalah perkiraan bila tindakan selesai <em>dengan bukti</em>; bukan penilaian.</p>
<table class="compact"><thead><tr><th>#</th><th>Tindakan</th><th>Parameter</th><th class="num">Potensi</th><th>Usaha</th><th>Detail</th></tr></thead><tbody>
${PRIORITIES.map((p) => `<tr><td>${p[0]}</td><td><strong>${esc(p[1])}</strong></td><td>${esc(p[2])}</td><td class="num">${esc(p[3])}</td><td>${esc(p[4])}</td><td>${code(p[5])}</td></tr>`).join('')}
</tbody></table>
<div class="note">Proyeksi realistis bila prioritas #1–#4 selesai dengan bukti yang dapat ditunjukkan: sekitar <strong>50–60/90</strong>. Angka ini bukan penilaian.</div>

<h3>Kesiapan wawancara juri — pertanyaan yang kemungkinan muncul</h3>
<ol>
<li>"Di mana PINN-nya?" — Jawaban jujur saat ini: mesin rule-based dengan pipeline siap model; tunjukkan rencana loss dan ablasi, idealnya dengan model awal.</li>
<li>"Bagian mana yang memakai Intel?" — Saat ini tidak ada. Prioritas #1 harus selesai sebelum penjurian.</li>
<li>"Berapa akurasi deteksinya?" — Belum ada; jangan mengutip metrik notebook Kaggle pihak ketiga.</li>
<li>"Alat GenAI apa yang dipakai saat pengembangan?" — Harus dijawab konsisten dengan dokumen pengungkapan.</li>
<li>"Pilotnya Narogong atau Karawang?" — Selaraskan sebelum presentasi.</li>
</ol>

<h2>7. Lampiran — sumber bukti</h2>
<table class="compact"><tbody>
<tr><td><code>docs/AI.md</code></td><td>Status CV, PINN, OpenVINO, narasi; audit notebook YOLOv8n-seg</td></tr>
<tr><td><code>docs/FINAL_AUDIT.md</code></td><td>Golden path browser, audit fitur/RBAC/mobile/aksesibilitas/deployment</td></tr>
<tr><td><code>docs/audit/forensic-2026-10-14/</code></td><td>Audit forensik: masalah, pilot, SDG naratif, statistik tak terverifikasi</td></tr>
<tr><td><code>docs/audit/v3-baseline-2026-10-15/</code></td><td>Baseline v3, keputusan pilot, roadmap</td></tr>
<tr><td><code>src/engines/pinn/core/pinnEngine.ts</code></td><td>Mesin rumus deterministik (RULE_BASED)</td></tr>
<tr><td><code>src/domain/workflow/screening.ts</code></td><td>Kontrak <code>CvScreeningProvider</code>, DEMO tidak pernah auto-pass</td></tr>
<tr><td><code>server/services/narrativeService.ts</code></td><td>Narasi Gemini opsional dengan fallback offline</td></tr>
<tr><td><code>src/i18n/translations.ts</code></td><td>Bahasa id/en</td></tr>
<tr><td><code>tests/</code></td><td>229 tes (unit, integrasi, validasi fisika) — 229 lulus pada 16-10-2026</td></tr>
<tr><td><code>package.json</code> + git status</td><td>Tidak ada dependensi Intel; file OpenVINO simulasi berstatus dihapus</td></tr>
</tbody></table>
<p class="small">Laporan ini dihasilkan dari <code>_build/build.mjs</code>. Ringkasan teks: <code>docs/audit/ai-changemaker-rubric-2026-10-16.md</code>.</p>
</body></html>`;

// sanity: totals per rubric
for (const m of M) { const mx = rows(m).reduce((a, p) => a + p[5], 0); if (mx !== m.max) throw new Error(`${m.id} max ${mx} != ${m.max}`); }

const htmlPath = path.join(here, 'report.html');
writeFileSync(htmlPath, html);
const outPdf = path.join(outDir, 'PAVEMENT_PINN_AI_Changemaker_Rubric_Audit.pdf');
const tmp = mkdtempSync(path.join(tmpdir(), 'pp-pdf-'));
try {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=10000', `--print-to-pdf=${outPdf}`, pathToFileURL(htmlPath).href], { stdio: 'pipe' });
} finally { rmSync(tmp, { recursive: true, force: true }); }
console.log('total', total, '->', outPdf);
