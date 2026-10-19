// Builds PAVEMENT_PINN_Feature_Priority_for_Judges.pdf (A4, Chrome headless).
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

// ------------------------------------------------------------------ data
// Each feature: id, nama, dasar (Dokumen Induk), daya tarik juri 1–5, kemudahan 1–5 (5 = paling mudah),
// estimasi hari (1 developer), kondisi repo sekarang, parameter rubrik, kenapa juri tertarik, versi minimal yang cukup.
const WAJIB = [
  ['W-01', 'Bersihkan angka palsu + slide "apa yang kami temukan dan perbaiki"', 'F0; §1.4–1.5; demo 4:05', 4, 5, '0,5', 'Sebagian: file OpenVINO/WIM palsu dihapus, `no-fake-claims.test.ts` ada', 'M02 2.4', 'Kejujuran tentang audit sendiri jarang ada di finalis; menutup risiko diskualifikasi etika', 'Tes grep lulus + satu slide sebelum/sesudah'],
  ['W-02', 'Lembar pengungkapan GenAI', '§6.6; Rubrik 0–4', 3, 5, '0,25', 'Tidak ada', 'M02 3 (0 → 2)', 'Juri wajib menilai; tanpa lembar = 0 poin', '`evidence/13_genai_disclosure.md`: alat, kegunaan, porsi kode'],
  ['W-03', 'Sitasi masalah, urgensi, dan SDG di repo/slide', '§2.2–2.4, §7.3, Lampiran A', 4, 5, '0,5', 'Hanya narasi blueprint; tanpa sitasi', 'M01 1.4, 2.2, 2.3 (+7)', 'Pembuka demo 0:00–0:40 memakai angka WHO/PU/Korlantas', 'Tabel sitasi + SDG 3.6, 9.1, 11.2, 13.1 dengan indikator'],
  ['W-04', 'Koridor Narogong sebagai konfigurasi', 'D-03; F0', 2, 5, '0,5', 'Hanya Karawang; Narogong `OUT_OF_SCOPE`', 'M01 1.2, 3.3', 'Konsisten dengan materi yang sudah dikirim; dua koridor tanpa ubah kode = bukti skala', '`config/corridors/narogong.json` + karawang'],
  ['W-05', 'Cek kualitas foto di ponsel (W2)', '§3.4 W2; demo 0:40', 4, 5, '0,5', 'Tidak ada', 'M01 3.2; M02 2.4', 'Momen demo pertama: foto buram ditolak dengan alasan, langsung terlihat juri', 'Varians Laplacian + kecerahan di canvas; pesan ulang foto'],
  ['W-06', 'Kode pelacakan + halaman status (W4)', '§3.4 W4', 3, 4, '0,5', 'Sebagian: ID laporan + status publik ada', 'M01 3.1', 'Warga melihat tindak lanjut; menutup demo alur warga', 'Kode pendek (mis. NRG-7K3Q) + tahap & tanggal'],
  ['W-07', 'Hapus EXIF + Trust Gate dasar (A)', 'D-08, D-09; §4.1', 4, 4, '1', 'Validasi magic-byte saja', 'M02 2.4; M01 3.2', 'Privasi nyata pada data warga; jawaban langsung untuk pertanyaan etika', 'EXIF strip + blur/cahaya/geofence/pHash dari `trust_gate.py`'],
  ['W-08', 'Deteksi kerusakan nyata YOLO → OpenVINO INT8 (C)', 'D-07; §4.3; F3', 5, 3, '2', 'Classifier DEMO', 'M02 1.2, 2.1, 4.1; M03 2.3, 3.1, 3.2', 'Inferensi AI nyata yang terlihat di layar; inti "AI + Intel"', 'RDD2022 subset + ≥100 foto lokal, ekspor INT8, mAP tercatat'],
  ['W-09', 'Mesin struktural MLET via PyMastic (E3 bagian 1)', 'D-04; §4.4; F1', 5, 4, '1', 'Rumus lama, regangan 14–77× terlalu kecil', 'M02 2.1; M03 1.1', 'Menutup temuan P0 paling serius; angka acuan 303/793 µε bisa ditunjukkan', '`/v1/assess` + tes acuan ±1%'],
  ['W-10', 'PI-surrogate OpenVINO + Monte Carlo P10/P50/P90 (E3 bagian 2)', 'D-02, D-05; §4.4; F2', 5, 2, '2', 'Tidak ada', 'M02 1.1, 1.3; M03 2.1, 3.1–3.3', 'Inilah "PINN" yang jujur; 2.000 simulasi per segmen di laptop', 'Surrogate FP16 + MC 2.000 sampel + label "indikatif"'],
  ['W-11', 'Skor prioritas dengan rincian (O1)', '§3.4 O1; Modul F', 4, 4, '1', 'Antrian ada, tanpa skor', 'M01 1.1; M02 1.2', '"Bukan siapa yang paling keras mengeluh": logika yang mudah dipahami juri', 'Skor 0–100 + rincian bahaya/struktural/konfirmasi/keadilan'],
  ['W-12', 'Ringkasan SLM di NPU + pemeriksa angka (E5, G)', 'D-10; §4.7; F4', 5, 3, '1,5', 'Gemini cloud opsional', 'M03 2.2, 3.2, 3.3; M02 2.4', 'NPU + OpenVINO GenAI langsung menjawab metrik Intel; GenAI bukan wrapper', 'Qwen2.5-1.5B INT4 + placeholder angka + `check_brief`'],
  ['W-13', 'Halaman Bukti dari benchmark nyata (F5)', 'D-11; §5.4; demo 2:55', 5, 4, '1', 'Tidak ada', 'M03 1.2, 2.1, 2.3; M02 4.2', 'Juri Intel ingin angka dari laptop di depan mereka', '`measurements/*.json`: perangkat, versi OpenVINO, p50/p95, token/s'],
  ['W-14', 'Demo offline di laptop Intel (E1 versi minimal)', '§3.4 E1; demo 1:30', 5, 4, '0,5', 'Tidak ada', 'M01 3.2; M03 2.1', '"Wi-Fi mati, masih jalan" adalah momen paling diingat', 'Layanan inferensi lokal; alur inspeksi berjalan tanpa internet'],
];

const NANTI = [
  ['N-01', 'Koreksi deteksi oleh insinyur (E2)', '§3.4 E2 (P0); Modul H', 3, 3, '1', 'M02 2.3', 'Simpan koreksi sebagai label; dasar active learning'],
  ['N-02', 'Dasbor KPI koridor dari data nyata (K1)', '§3.4 K1 (P0)', 3, 3, '1', 'M01 1.1', 'Butuh data pilot dulu; angka tanpa data tidak bernilai'],
  ['N-03', 'PDF kebijakan dengan penafian (K5)', '§3.4 K5 (P0)', 2, 4, '0,5', 'M02 2.4', 'Penafian "bukan dokumen resmi" di setiap halaman; hapus nama instansi'],
  ['N-04', 'Peta bahaya publik tanpa data pribadi (W5)', '§3.4 W5 (P0)', 3, 4, '0,5', 'M02 2.4', 'Peta sudah ada; tambah tes respons publik tanpa field pribadi'],
  ['N-05', 'Bandingkan opsi perbaikan (E4)', '§3.4 E4; D-14; demo 2:20', 4, 3, '1', 'M02 1.2', 'Memakai mesin W-09/W-10; tampil di demo bila sempat'],
  ['N-06', 'Optimasi paket anggaran + skenario (K2, K3)', '§3.4 K2–K3; demo 3:20', 4, 3, '1,5', 'M01 1.1; M02 1.3', 'Knapsack DP + pembanding serakah; ada di `pavement_core.py`'],
  ['N-07', 'Peta keadilan cakupan (K4)', '§3.4 K4; demo 3:20', 4, 4, '0,5', 'M01 3.1', 'Cerita inklusi: wilayah sepi laporan tidak dianggap baik'],
  ['N-08', 'Antrian offline warga (W3)', '§3.4 W3', 3, 3, '1', 'M01 3.2', 'Service Worker + IndexedDB + idempotency key'],
  ['N-09', 'Gabung duplikat dengan pHash (O2)', '§3.4 O2', 2, 4, '0,5', 'M02 2.3', 'Logika 30 m / 7 hari sudah ada'],
  ['N-10', 'SLA + pengarahan kewenangan (O4, O6, D-17)', '§3.4 O4, O6', 3, 3, '1', 'M01 3.3', 'Status REFERRED; instansi pengelola per segmen'],
  ['N-11', 'Konfirmasi warga + verifikasi perbaikan (W6, E6)', '§3.4 W6, E6', 3, 3, '1', 'M01 1.1', 'Menaikkan komponen konfirmasi di skor'],
  ['N-12', 'Aksesibilitas WCAG AA, Lighthouse ≥ 90 (W7)', '§3.4 W7', 2, 4, '0,5', 'M01 3.2', 'Bilingual sudah ada; audit kontras & ARIA'],
  ['N-13', 'Deploy PWA warga live + Playwright golden path', 'D-18; F7', 4, 3, '1,5', 'M02 4.3', 'Satu-satunya jalan ke poin deployment'],
  ['N-14', 'Uji pengguna (SUS) + peringkat buta (Spearman)', '§7.2, §8.1 H9–H10', 4, 3, '2 (tim)', 'M01 1.1; M02 4.2', 'Angka pilot untuk slide penutup demo 4:35'],
];

const ADDON = [
  ['A-01', 'RAG "Tanya Pedoman" lokal dengan OpenVINO GenAI / OPEA', '§1.4 (OPSIONAL P2); rubrik M03 3.3', 'Disebut eksplisit di rubrik ("OpenVINO GenAI API or OPEA for RAG")', 'Bila W-12 stabil'],
  ['A-02', 'Flag kerusakan dini untuk investigasi (E7, D-15)', '§3.4 E7 (P2)', 'Insight unik model vs lapangan; wajib bahasa netral tanpa tuduhan', 'Bila W-10 + data tahun pasang ada'],
  ['A-03', 'Panel mitra pengawasan beban Dishub, baca saja (K6, D-13)', '§3.4 K6 (P2)', 'Menghubungkan ODOL ke kerusakan; tanpa tombol penegakan', 'Bila survei lalu lintas (Modul E) ada'],
  ['A-04', 'Active learning: latih ulang dari koreksi + kurva mAP (Modul H)', '§4.8; §8.1 H12', 'Bukti sistem membaik seiring waktu (durasi dampak)', 'Bila N-01 berjalan'],
  ['A-05', 'Klasifikasi adegan (jalan vs layar/bukan jalan)', '§8.2 "ditunda"', 'Memperkuat Trust Gate terhadap foto palsu', 'Bila ≥300 foto layar terkumpul'],
  ['A-06', 'Pelatihan di GPU Intel (PyTorch XPU) / Intel Tiber AI Cloud dengan log', '§5.1; §9.3 syarat nilai penuh', 'Menaikkan M03 2.3 ke penuh', 'Bila perangkat/akses tersedia'],
  ['A-07', 'Hitung lalu lintas dari video', '§8.2 "ditunda"', 'Mengganti hitung manual untuk Modul E', 'Bila Modul E dasar selesai'],
  ['A-08', 'Bahasa daerah / interaksi suara', '§9.1 syarat nilai penuh aksesibilitas', 'Satu-satunya jalan ke 3/3 aksesibilitas', 'Bila W7 lulus'],
  ['A-09', 'Admin: registri model, retensi, ekspor audit', '§3.4 Administrator (P1)', 'Tata kelola model untuk skala', 'Setelah N-13'],
];

const JANGAN = [
  'PINN yang "menyelesaikan persamaan Burmister" atau "setara FEM < 10 ms" (§1.5)',
  'Angka latensi, daya, utilisasi NPU, akurasi yang tidak berasal dari `measurements/*.json` (D-11)',
  '"Divalidasi dengan data FWD/WIM/lapangan"; "jalan ini aman"/"melebihi batas ijin" dari model',
  'Sisa umur dalam hari, horizon lubang, proyeksi PCI, penghematan APBN (D-05, D-06)',
  'Nama PUPR/Kemenhub/BMKG/Bina Marga/Intel sebagai pemberi data atau pengesah',
  'Deteksi rutting/stripping dari satu foto, tekanan air pori, twin 3D (RENCANA; AGENTS.md §6)',
  'Batas tonase dinamis, perintah "alihkan truk", "kontraktor nakal", "korupsi"',
  '"100% offline" untuk seluruh sistem (yang offline hanya mode lapangan insinyur)',
];

const DEMO = [
  ['0:00–0:40', 'Masalah global & lokal', 'W-03'],
  ['0:40–1:30', 'Ponsel: foto buram ditolak → foto baik terkirim → kode pelacakan', 'W-05, W-06, W-07, W-08'],
  ['1:30–2:20', 'Antrian skor risiko → Wi-Fi mati → εt/εv + P10–P90', 'W-11, W-14, W-09, W-10'],
  ['2:20–2:55', 'Opsi perbaikan + ringkasan SLM di NPU lolos pemeriksa', 'N-05 (opsional), W-12'],
  ['2:55–3:20', 'Halaman Bukti', 'W-13'],
  ['3:20–4:05', 'Perencana: paket anggaran + peta keadilan', 'N-06, N-07 (bila belum: tampilkan antrian skor saja)'],
  ['4:05–4:35', 'Responsible AI + "kami temukan dan perbaiki angka simulasi"', 'W-01, W-02, W-07'],
  ['4:35–5:00', 'Hasil pilot: laporan, SUS, ρ', 'N-14 (bila belum: sebut sebagai TARGET)'],
];

// ------------------------------------------------------------------ figures
function quadrant() {
  const W = 640, H = 400, L = 60, R = 620, T = 20, B = 360;
  const x = (e) => L + ((e - 0.5) / 5) * (R - L), y = (a) => B - ((a - 0.5) / 5) * (B - T);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Daya tarik juri vs kemudahan">`;
  s += `<rect x="${x(3)}" y="${T}" width="${R - x(3)}" height="${y(3) - T}" class="q1"/>`;
  s += `<text x="${R - 6}" y="${T + 14}" class="qt" text-anchor="end">QUICK WIN: menarik + mudah</text>`;
  s += `<text x="${L + 6}" y="${T + 14}" class="qt">Menarik, butuh usaha</text>`;
  s += `<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" class="axl"/><line x1="${L}" x2="${L}" y1="${T}" y2="${B}" class="axl"/>`;
  s += `<line x1="${x(3)}" x2="${x(3)}" y1="${T}" y2="${B}" class="mid"/><line x1="${L}" x2="${R}" y1="${y(3)}" y2="${y(3)}" class="mid"/>`;
  for (let i = 1; i <= 5; i++) s += `<text x="${x(i)}" y="${B + 14}" class="ax" text-anchor="middle">${i}</text><text x="${L - 8}" y="${y(i) + 3}" class="ax" text-anchor="end">${i}</text>`;
  s += `<text x="${(L + R) / 2}" y="${B + 32}" class="ax" text-anchor="middle">Kemudahan implementasi (5 = paling mudah)</text>`;
  s += `<text x="16" y="${(T + B) / 2}" class="ax" text-anchor="middle" transform="rotate(-90 16 ${(T + B) / 2})">Daya tarik juri</text>`;
  const pts = [...WAJIB.map((f) => [f[0], f[3], f[4], 'w']), ...NANTI.map((f) => [f[0], f[3], f[4], 'n'])];
  const seen = {};
  for (const [id, a, e, k] of pts) {
    const key = `${a},${e}`, n = (seen[key] = (seen[key] || 0) + 1) - 1;
    const cx = x(e) + ((n % 4) - 1.5) * 26, cy = y(a) + (Math.floor(n / 4) - 0.3) * 18;
    s += `<circle cx="${cx}" cy="${cy}" r="11" class="${k === 'w' ? 'pw' : 'pn'}"/><text x="${cx}" y="${cy + 3}" class="pl" text-anchor="middle">${id.slice(2)}</text>`;
  }
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
th, td { border: 0.5pt solid #D5DAE3; padding: 1.1mm 1.6mm; vertical-align: top; text-align: left; font-size: 8.1pt; }
thead th { background: #EEF2F8; font-weight: 600; } tr { break-inside: avoid; }
td.n { text-align: center; white-space: nowrap; }
code { font-family: Consolas, monospace; font-size: 7.7pt; background: #F1F3F7; padding: 0 0.8mm; border-radius: 1mm; }
.cover { min-height: 255mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
.kicker { color: #5B6475; letter-spacing: 0.6pt; text-transform: uppercase; font-size: 8.6pt; }
.tiles { display: flex; gap: 4mm; margin: 5mm 0; }
.tile { flex: 1; border: 0.6pt solid #D5DAE3; border-radius: 2mm; padding: 3.5mm; }
.tile .n { font-size: 20pt; font-weight: 700; } .tile .t { color: #5B6475; font-size: 8.2pt; }
.t-w { border-top: 3pt solid #0B5CAD; } .t-n { border-top: 3pt solid #C9822B; } .t-a { border-top: 3pt solid #2E7D4F; } .t-x { border-top: 3pt solid #9B1C1C; }
.note { border-left: 2.5pt solid #C9822B; background: #FFF8EE; padding: 2.4mm 3.4mm; margin: 3mm 0; }
.stars { color: #0B5CAD; letter-spacing: 0.5pt; white-space: nowrap; } .ease { color: #2E7D4F; letter-spacing: 0.5pt; white-space: nowrap; }
.fig { width: 100%; margin: 2mm 0 3mm; }
.fig .ax { font-size: 10px; fill: #5B6475; } .fig .qt { font-size: 10.5px; fill: #23344F; font-weight: 600; }
.fig .axl { stroke: #9AA6B8; } .fig .mid { stroke: #C9D1DD; stroke-dasharray: 4 3; } .fig .q1 { fill: #EAF2FB; }
.fig .pw { fill: #0B5CAD; } .fig .pn { fill: #C9822B; } .fig .pl { font-size: 9px; fill: #fff; font-weight: 700; }
.legend span { display: inline-block; margin-right: 5mm; font-size: 8pt; } .dot { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; vertical-align: middle; margin-right: 1mm; }
.pb { break-before: page; }
.small { font-size: 7.8pt; color: #5B6475; }
`;
const dots = (n, cls) => `<span class="${cls}">${'●'.repeat(n)}${'○'.repeat(5 - n)}</span>`;
const sumDays = (rows, i) => rows.reduce((a, r) => a + parseFloat(String(r[i]).replace(',', '.')), 0).toString().replace('.', ',');

const wajibTable = `<table><thead><tr><th>ID</th><th>Fitur</th><th>Dasar (Dok. Induk)</th><th>Daya tarik</th><th>Mudah</th><th>Hari</th><th>Kondisi repo</th><th>Rubrik</th></tr></thead><tbody>
${WAJIB.map((f) => `<tr><td><strong>${f[0]}</strong></td><td>${code(f[1])}</td><td>${code(f[2])}</td><td>${dots(f[3], 'stars')}</td><td>${dots(f[4], 'ease')}</td><td class="n">${f[5]}</td><td>${code(f[6])}</td><td>${esc(f[7])}</td></tr>`).join('')}
</tbody></table>`;
const wajibWhy = `<table><thead><tr><th>ID</th><th>Kenapa juri tertarik</th><th>Versi minimal yang sudah cukup untuk demo</th></tr></thead><tbody>
${WAJIB.map((f) => `<tr><td><strong>${f[0]}</strong></td><td>${code(f[8])}</td><td>${code(f[9])}</td></tr>`).join('')}</tbody></table>`;
const quick = WAJIB.filter((f) => f[3] >= 4 && f[4] >= 4);

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>PAVEMENT-PINN — Prioritas Fitur untuk Juri</title><style>${css}</style></head><body>
<div class="cover"><div>
  <div class="kicker">Intel AI Global Impact Festival 2026 · AI Changemaker · Stage 3</div>
  <h1>PAVEMENT-PINN v3<br>Prioritas Fitur: Wajib, Bisa Nanti, dan Add-on</h1>
  <p>Mana yang membuat juri tertarik dan mudah dibangun walaupun belum dikembangkan. Disusun dari hasil audit rubrik (16-10-2026), analisis gap v3, dan <em>PAVEMENT-PINN v3 Dokumen Induk</em> (§1.3–1.5, §3.4, §4, §5, §8, §11) agar tetap sesuai arah proyek.</p>
  <div class="tiles">
    <div class="tile t-w"><div class="n">${WAJIB.length}</div><div class="t">WAJIB sebelum wawancara · ±${sumDays(WAJIB, 5)} hari kerja developer</div></div>
    <div class="tile t-n"><div class="n">${NANTI.length}</div><div class="t">PERLU, bisa nanti · ±${sumDays(NANTI.filter((r) => !String(r[5]).includes('tim')), 5)} hari + uji pengguna</div></div>
    <div class="tile t-a"><div class="n">${ADDON.length}</div><div class="t">ADD-ON setelah semua prioritas berhasil</div></div>
    <div class="tile t-x"><div class="n">${JANGAN.length}</div><div class="t">JANGAN dibangun/diklaim (§1.5)</div></div>
  </div>
  ${quadrant()}
  <div class="legend"><span><i class="dot" style="background:#0B5CAD"></i>Wajib (W-xx)</span><span><i class="dot" style="background:#C9822B"></i>Bisa nanti (N-xx)</span><span class="small">Nomor = ID fitur. Skor daya tarik & kemudahan adalah penilaian audit ini, bukan dari juri.</span></div>
</div>
<table><tbody>
<tr><th>Tanggal</th><td>16 Oktober 2026</td></tr>
<tr><th>Cara klasifikasi</th><td><strong>Wajib</strong> = P0 di Dokumen Induk §3.4 yang muncul di naskah demo §11 atau rencana darurat 7 hari §8.2, ditambah quick win dokumen. <strong>Bisa nanti</strong> = P0 sisa dan P1 yang tidak menghambat demo. <strong>Add-on</strong> = P2/OPSIONAL dan "syarat nilai penuh" §9. <strong>Jangan</strong> = klaim dilarang §1.5 dan fitur RENCANA.</td></tr>
<tr><th>Estimasi hari</th><td>Perkiraan untuk satu developer yang memakai kode referensi <code>pavement_pinn_v3_code.zip</code>; bukan hasil pengukuran.</td></tr>
</tbody></table></div>

<h2>1. Ringkasan: mulai dari mana</h2>
<div class="note"><strong>Quick win (daya tarik ≥ 4 dan kemudahan ≥ 4): ${quick.map((f) => f[0]).join(', ')}.</strong> Semuanya bisa dibangun dalam ±${sumDays(quick, 5)} hari dan langsung terlihat juri. Lalu kerjakan tiga fitur "menarik, butuh usaha" yang menjadi inti AI + Intel: <strong>W-08 YOLO OpenVINO INT8, W-10 PI-surrogate + Monte Carlo, W-12 SLM di NPU</strong>. Tanpa ketiganya, Metric 03 tetap mendekati nol.</div>
<h3>Urutan kerja yang disarankan (±13 hari kerja satu developer, cocok dengan sprint 14 hari §8.1)</h3>
<ol>
<li><strong>Hari 1–2 (dokumen + bersih-bersih):</strong> W-01, W-02, W-03, W-04. Usaha kecil, ±+10 poin rubrik, menutup risiko etika.</li>
<li><strong>Hari 3–5 (fisika benar + foto warga):</strong> W-09 MLET PyMastic, W-05 cek kualitas di ponsel, W-06 kode pelacakan, W-07 EXIF + Trust Gate.</li>
<li><strong>Hari 6–10 (AI + Intel inti):</strong> W-08 YOLO INT8, W-10 surrogate + Monte Carlo, W-11 skor prioritas.</li>
<li><strong>Hari 11–13 (NPU + bukti):</strong> W-12 SLM di NPU, W-13 Halaman Bukti, W-14 demo offline.</li>
<li>Sisa waktu: daftar "Bisa nanti" sesuai urutan demo (N-05, N-06, N-07, N-13, N-14 dulu).</li>
</ol>

<h2 class="pb">2. WAJIB sebelum wawancara (${WAJIB.length} fitur)</h2>
<p>Daya tarik (biru) dan kemudahan (hijau) dinilai 1–5. Semua fitur di sini muncul di naskah demo 5 menit atau menutup parameter rubrik yang sekarang bernilai 0–1.</p>
${wajibTable}
<h3>Kenapa juri tertarik, dan versi minimal yang cukup</h3>
<p>Versi minimal = batas terkecil yang masih jujur dan bisa didemokan. Kerjakan versi minimal semua fitur wajib dulu sebelum menyempurnakan satu fitur.</p>
${wajibWhy}

<h2 class="pb">3. PERLU tapi bisa nanti (${NANTI.length} fitur)</h2>
<p>Dikerjakan setelah semua fitur wajib berjalan. Bila belum selesai saat wawancara, sebut sebagai TARGET atau RENCANA, jangan didemokan (§11 aturan demo #4).</p>
<table><thead><tr><th>ID</th><th>Fitur</th><th>Dasar</th><th>Daya tarik</th><th>Mudah</th><th>Hari</th><th>Rubrik</th><th>Catatan</th></tr></thead><tbody>
${NANTI.map((f) => `<tr><td><strong>${f[0]}</strong></td><td>${code(f[1])}</td><td>${code(f[2])}</td><td>${dots(f[3], 'stars')}</td><td>${dots(f[4], 'ease')}</td><td class="n">${f[5]}</td><td>${esc(f[6])}</td><td>${code(f[7])}</td></tr>`).join('')}
</tbody></table>

<h2>4. ADD-ON setelah semua prioritas berhasil (${ADDON.length})</h2>
<p>Hanya dikerjakan bila seluruh fitur wajib dan sebagian besar "bisa nanti" sudah lulus kriterianya. AGENTS.md §6: fitur di luar daftar tidak dikerjakan kecuali diminta tim.</p>
<table><thead><tr><th>ID</th><th>Add-on</th><th>Dasar</th><th>Nilai tambah</th><th>Syarat mulai</th></tr></thead><tbody>
${ADDON.map((f) => `<tr><td><strong>${f[0]}</strong></td><td>${code(f[1])}</td><td>${code(f[2])}</td><td>${code(f[3])}</td><td>${code(f[4])}</td></tr>`).join('')}
</tbody></table>

<h2 class="pb">5. Pemetaan ke naskah demo 5 menit (§11)</h2>
<table><thead><tr><th>Waktu</th><th>Yang tampil di layar</th><th>Fitur yang harus siap</th></tr></thead><tbody>
${DEMO.map((d) => `<tr><td class="n">${d[0]}</td><td>${esc(d[1])}</td><td>${esc(d[2])}</td></tr>`).join('')}
</tbody></table>
<p class="small">Aturan demo §11: latih ≥ 5 kali dengan stopwatch; siapkan data contoh yang sudah dinilai bila inferensi lambat; bila gagal, putar rekaman cadangan; jangan tampilkan fitur RENCANA.</p>

<h2>6. JANGAN dibangun atau diklaim</h2>
<p>Dari Dokumen Induk §1.5 dan AGENTS.md §2/§6. Menambahkan hal ini justru menurunkan skor etika dan kredibilitas di depan juri.</p>
<ul>${JANGAN.map((j) => `<li>${code(j)}</li>`).join('')}</ul>

<h2>7. Prasyarat agar fitur wajib bisa dibangun</h2>
<table><thead><tr><th>Prasyarat</th><th>Dibutuhkan oleh</th><th>Status</th></tr></thead><tbody>
<tr><td>Laptop Intel Core Ultra dengan NPU (yang dipakai saat wawancara)</td><td>W-12, W-13, W-14</td><td>Belum terkonfirmasi</td></tr>
<tr><td>Python 3.11+, PyMastic, OpenVINO, NNCF, openvino-genai</td><td>W-07 s.d. W-14</td><td>Python belum terpasang di mesin dev ini</td></tr>
<tr><td>Keputusan lisensi Ultralytics (AGPL-3.0)</td><td>W-08</td><td>Perlu keputusan tim (AGENTS.md §9)</td></tr>
<tr><td>≥ 100–150 foto lokal + subset RDD2022</td><td>W-08</td><td>Belum dikumpulkan</td></tr>
<tr><td>Keputusan atribusi GenAI di commit (<code>Assisted-by</code> vs aturan proyek sekarang)</td><td>W-02</td><td>Perlu keputusan tim</td></tr>
</tbody></table>
<p class="small">Dihasilkan dari <code>docs/audit/feature-priority-2026-10-16/_build/build.mjs</code>. Laporan terkait: <code>docs/audit/ai-changemaker-rubric-2026-10-16/</code>, <code>docs/audit/v3-intel-plan-2026-10-16/</code>.</p>
</body></html>`;

const htmlPath = path.join(here, 'report.html');
writeFileSync(htmlPath, html);
const outPdf = path.join(outDir, 'PAVEMENT_PINN_Feature_Priority_for_Judges.pdf');
const tmp = mkdtempSync(path.join(tmpdir(), 'pp-pdf-'));
try {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=10000', `--print-to-pdf=${outPdf}`, pathToFileURL(htmlPath).href], { stdio: 'pipe' });
} finally { rmSync(tmp, { recursive: true, force: true }); }
console.log('quick wins', quick.map((f) => f[0]).join(','), 'wajib days', sumDays(WAJIB, 5), '->', outPdf);
