import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, P, UL, note, H1, H2, H3, esc, md, pre } from './h.mjs';
import { SCORE } from './p9.mjs';

const SRC = [
  ['[1]', 'WHO. Road traffic injuries (fact sheet, 20 Juli 2026). https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries', 'TERVERIFIKASI', '16 Okt 2026: 1,16 juta; 92% LMIC; 3% PDB; target 2030'],
  ['[2]', 'WHO. Global status report on road safety 2023. https://www.who.int/publications/i/item/9789240086517', 'TERVERIFIKASI', ''],
  ['[3]', 'UN General Assembly A/RES/74/299, Improving global road safety (2020); Decade of Action 2021–2030', 'TERVERIFIKASI', 'Dirujuk di [1]'],
  ['[4]', 'DT Next, "Highway hazard" (7 Nov 2023), mengutip MoRTH Road Accidents in India 2022. https://www.dtnext.in/edit/highway-hazard-746663', 'TERVERIFIKASI SEKUNDER', 'Cari laporan MoRTH primer'],
  ['[5]', 'Fleet World, ALARM Survey 2026 (Asphalt Industry Alliance). https://fleetworld.co.uk/?p=133323', 'TERVERIFIKASI SEKUNDER', 'Unduh ringkasan ALARM primer'],
  ['[6]', 'ASCE, 2025 Report Card: Roads. https://infrastructurereportcard.org/wp-content/uploads/2025/03/Roads.pdf', 'PERLU CEK', ''],
  ['[7]', 'SSATP / World Bank, Financing Maintenance. https://www.ssatp.org/sites/ssatp/files/publication/Financing_Maintenance.pdf', 'PERLU CEK', ''],
  ['[8]', 'IPCC (2021). AR6 WG1, Summary for Policymakers. https://www.ipcc.ch/report/ar6/wg1/', 'TERVERIFIKASI', ''],
  ['[9]', 'Arya, D. dkk. RDD2022: A multi-national image dataset for automatic Road Damage Detection. arXiv:2209.08538', 'TERVERIFIKASI', '47.420 citra, 6 negara, > 55.000 anotasi; lisensi CC BY-SA 4.0 menurut katalog Dataset Ninja → cek halaman resmi'],
  ['[10]', 'kumparan, "Jalan Rusak di RI Meningkat Sejak 2024" (Mar 2026), dari Buku Kondisi Jalan Nasional Sem. I 2025, Kementerian PU. https://kumparan.com/kumparannews/jalan-rusak-di-ri-meningkat-sejak-2024-kalteng-kaltim-hingga-jateng-26xLBY44hlY', 'TERVERIFIKASI SEKUNDER', '3.021,5 km tidak mantap Sem. I 2025; unduh buku aslinya'],
  ['[10b]', 'detikFinance, "47.604 Km Jalan Nasional & 3.020 Km Tol Siap Dilintasi Saat Mudik Lebaran" (Mar 2025): kemantapan jalan nasional 95,22%. https://finance.detik.com/infrastruktur/d-7816409', 'TERVERIFIKASI SEKUNDER', 'Pembanding; periode berbeda'],
  ['[11]', 'Katadata, "PUPR Minta Tambahan Anggaran Rp 32 T untuk Perbaikan Jalan Daerah" (24 Mei 2023), data BPS 2022. https://katadata.co.id/amp/berita/industri/646dd09be2e0f', 'TERVERIFIKASI SEKUNDER', ''],
  ['[11b]', 'BPS, Panjang Jalan Menurut Provinsi dan Tingkat Kewenangan Pemerintahan (km), 2023. https://www.bps.go.id', 'PERLU CEK', 'Ganti [11] dengan tabel primer'],
  ['[12]', 'detikOto, "3 Nyawa Melayang di Jalan Setiap Hari..." (30 Okt 2024), kutipan Kakorlantas. https://oto.detik.com/motor/d-7613736', 'TERVERIFIKASI SEKUNDER', '74% roda dua (data s.d. Sept 2024)'],
  ['[12a]', 'JawaPos, "Kakorlantas sebut angka kecelakaan lalu lintas pada 2025 menurun" (akhir 2025): 2024 = 150.096 kecelakaan, 26.839 meninggal. https://www.jawapos.com/nasional/2512300277', 'TERVERIFIKASI SEKUNDER', 'Cari rilis Korlantas primer'],
  ['[13]', 'Republika (12 Feb 2026); Katadata; Bisnis.com (Jan–Feb 2026): Zero ODOL efektif 1 Jan 2027, uji coba 27 Jan–31 Mei 2026, ±Rp41–43 T/tahun', 'TERVERIFIKASI SEKUNDER', 'Status Perpres per Feb 2026 belum terbit — cek ulang'],
  ['[14]', 'Mojok (opini), "Jalan Narogong Cileungsi Ditelantarkan..." (23 Mar 2024)', 'PERLU CEK', 'Konteks saja'],
  ['[15]', 'Metro TV; GridOto ("Jalur Tengkorak Narogong Bekasi...")', 'PERLU CEK', 'Konteks saja'],
  ['[16]', 'Xweather (Vaisala), RoadAI. https://xweather.com/blog/article/how-to-detect-prioritize-and-fix-potholes-faster', 'PERLU CEK', ''],
  ['[17]', 'Intel, Intel® Digital Readiness Programs. https://www.intel.com/content/www/us/en/corporate/artificial-intelligence/digital-readiness-home.html', 'TERVERIFIKASI', 'Festival tercantum sebagai program'],
  ['[18]', 'PyMastic (Apache-2.0). https://github.com/Mostafa-Nakhaei/PyMastic', 'TERVERIFIKASI', 'Lisensi + perbandingan KENPAVE/WESLEA di README; update terakhir 2020'],
  ['[19]', 'OpenVINO 2026.0 release notes. https://github.com/openvinotoolkit/openvino/releases/tag/2026.0.0', 'TERVERIFIKASI', 'Qwen2.5-1.5B-Instruct, Qwen3-Embedding-0.6B di NPU; speculative decoding NPU; `openvino.runtime` dihapus; 2026.3 tersedia'],
  ['[20]', 'Ultralytics: OpenVINO export & release v8.4.80 (argumen `quantize`). https://docs.ultralytics.com/integrations/openvino ; https://community.ultralytics.com/t/new-release-ultralytics-v8-4-80/2085', 'TERVERIFIKASI', 'AGPL-3.0'],
  ['[21]', 'PAVEMENT-PINN-AUDIT-001, Forensic Technical Audit Report (14 Okt 2026), internal', 'TERVERIFIKASI', '`docs/audit/forensic-2026-10-14/`'],
  ['[21b]', 'Audit Rubrik AI Changemaker (16 Okt 2026), internal', 'TERVERIFIKASI', '`docs/audit/ai-changemaker-rubric-2026-10-16/`'],
  ['[22]', 'Evaluation Rubrics: AI Changemaker (Interview Tips Deck Students 2026, hal. 4–8)', 'TERVERIFIKASI', 'Dibaca langsung'],
  ['[23]', 'Huang, Y. H. Pavement Analysis and Design, 2nd ed. (Pearson, 2004): kriteria Asphalt Institute', 'PERLU CEK', 'Cantumkan halaman'],
  ['[24]', 'Austroads, Guide to Pavement Technology Part 2 (sebutkan edisi); Ditjen Bina Marga, Manual Desain Perkerasan Jalan (2017)', 'PERLU CEK', 'Nomor dokumen + edisi'],
  ['[25]', 'UU RI No. 27 Tahun 2022 tentang Pelindungan Data Pribadi', 'TERVERIFIKASI', ''],
];

const codeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'reference_code');
const FILES = [
  ['pavement_core.py', 'DIUJI (lingkungan penyusun v3.0)', 'MLET via PyMastic, fungsi transfer, Indeks Umur, ESAL, skor prioritas, knapsack, pemeriksa angka'],
  ['test_core.py', 'DIUJI (lingkungan penyusun v3.0)', 'Tes 303/793 µε, kesebangunan, knapsack ≥ serakah, pemeriksa angka'],
  ['trust_gate.py', 'DIUJI (lingkungan penyusun v3.0)', 'Laplacian, kecerahan, pHash, jarak, keputusan gate'],
  ['gen_mlet_dataset.py', 'DIUJI (n kecil)', 'Pembangkit data surrogate (Latin hypercube, multi-core)'],
  ['mc_life.py', 'DIUJI (lingkungan penyusun v3.0)', 'Monte Carlo Indeks Umur + sensitivitas, deterministik'],
  ['train_pi_surrogate.py', 'BELUM DIUJI', 'PyTorch PI-surrogate + loss monotonisitas + ekspor OpenVINO'],
  ['train_yolo.py', 'BELUM DIUJI', 'RDD2022, pelatihan, evaluasi, ekspor INT8 (perbarui ke `quantize=8`)'],
  ['slm_brief.py', 'BELUM DIUJI', 'SLM di NPU, placeholder, pemeriksa, templat'],
  ['bench_tools.py', 'BELUM DIUJI', 'Benchmark OpenVINO → `measurements/*.json`'],
];

export const appA = `
${H1('sA', 'Lampiran A: Daftar Sumber dan Status Verifikasi')}
${P('Diverifikasi ulang 16 Okt 2026 lewat penelusuran web dan GitHub API. [[TERVERIFIKASI]] = isi dicocokkan dengan sumber resmi/primer; [[TERVERIFIKASI SEKUNDER]] = ditemukan lewat media/agregator; [[PERLU CEK]] = belum dibuka ulang. Simpan setiap sumber ke `evidence/01_sources/` sebelum dipakai di slide.')}
${T(['No', 'Sumber', 'Status', 'Catatan'], SRC.map((s) => [s[0], s[1], `[[${s[2]}]]`, s[3]]), { cls: 'src', widths: ['6%', '58%', '15%', '21%'] })}
`;

export const appB = `
${H1('sB', 'Lampiran B: Kode Referensi')}
${P('Isi paket `pavement_pinn_v3_code.zip`, disalin apa adanya ke `docs/v3/_build/reference_code/`. Status dari README paket. **Bagi tim semua berstatus BELUM DIUJI sampai dijalankan di repo dan perangkat tim** (gerbang M1). Modul ilmiah inti sebaiknya ditulis ulang oleh anggota tim (6.6).')}
${T(['File', 'Status (paket)', 'Isi'], FILES.map((f) => [`\`${f[0]}\``, f[1], f[2]]))}
${note('Perbaikan yang sudah diketahui', UL([
  '`train_yolo.py`: Ultralytics ≥ 8.4.80 memakai `quantize=8`; `int8=True` masih diterima dengan peringatan [20].',
  'OpenVINO 2026.0 menghapus namespace `openvino.runtime` — impor dari `openvino` [19].',
  'PyMastic: `q` dalam kPa bila E dalam MPa; `iteration=20`; `et = -Strain_R`.',
]), 'warn')}
${FILES.map((f) => `${H3(`B · ${f[0]}`)}${pre(readFileSync(path.join(codeDir, f[0]), 'utf8'))}`).join('')}
`;

export const appC = `
${H1('sC', 'Lampiran C: Glosarium')}
${T(['Istilah', 'Arti'], [
  ['MLET', 'Multilayer linear-elastic theory (Burmister): solusi tegangan-regangan perkerasan berlapis di bawah beban lingkaran'],
  ['εt / εv', 'Regangan tarik horizontal di dasar lapis aspal / regangan tekan vertikal di puncak tanah dasar (µε = 10⁻⁶)'],
  ['PI-surrogate', 'Jaringan saraf yang meniru MLET; fisika masuk lewat variabel tanpa dimensi dan loss turunan'],
  ['Kesebangunan elastis', 'Semua modulus × k → semua regangan ÷ k'],
  ['Titik kolokasi', 'Titik di domain input tanpa label tempat penalti fisika dievaluasi'],
  ['Fungsi transfer', 'Persamaan empiris regangan → jumlah repetisi beban sampai gagal'],
  ['ESAL / CESA', 'Equivalent standard axle load (8,16 t) / kumulatifnya'],
  ['VDF', 'Vehicle damage factor: ESAL per kendaraan suatu golongan'],
  ['CBR', 'California Bearing Ratio; soaked = setelah direndam'],
  ['Aturan Miner', 'Kerusakan kumulatif = Σ (repetisi terjadi / repetisi izin)'],
  ['P10/P50/P90', 'Persentil ke-10, 50, 90 distribusi Monte Carlo'],
  ['FAR / FRR', 'False accept rate / false reject rate'],
  ['NNCF', 'Neural Network Compression Framework (kuantisasi Intel)'],
  ['NPU', 'Neural Processing Unit pada Intel Core Ultra'],
  ['OpenVINO GenAI', 'Pustaka Intel untuk menjalankan LLM/VLM/embedding lokal di CPU/GPU/NPU'],
  ['OPEA', 'Open Platform for Enterprise AI — kerangka RAG/GenAI'],
  ['SUS', 'System Usability Scale, kuesioner 10 butir (0–100)'],
  ['FWD', 'Falling Weight Deflectometer, alat ukur lendutan struktural'],
  ['IDR', 'Intel Digital Readiness — kumpulan program Intel, termasuk AI Global Impact Festival'],
  ['Gerbang (gate)', 'Kriteria lulus milestone yang harus dibuktikan sebelum klaim dipakai'],
])}
`;

export const appD = `
${H1('sD', 'Lampiran D: Teks Siap Pakai')}
${H2('sD-1', 'D.1 Judul (maks. 10 kata)')}
${P('Bila judul masih dapat diperbarui: **PAVEMENT-PINN: Edge AI Turning Citizen Pothole Reports into Safer Roads.** Bila tidak, pertahankan judul yang dikirim dan pakai kalimat inti v3.1 di pitch.')}
${H2('sD-2', 'D.2 Deskripsi 150 kata (bahasa Inggris)')}
${P('Road damage injures and kills riders, and 92% of road deaths occur in low- and middle-income countries, where local governments lack data to decide which repairs come first. PAVEMENT-PINN lets citizens report damage from a phone browser without installing an app. On Intel hardware, a Photo Trust Gate and a YOLO detector quantized with OpenVINO check the photo, blur faces and plates, and classify cracks and potholes. An open layered-elastic solver and a physics-informed neural surrogate estimate an indicative structural life index under wet conditions and counted truck traffic, with P10–P90 uncertainty from thousands of simulations on a Core Ultra laptop, even offline. Operators get an explainable risk ranking, planners a repair package within budget, and a small language model on the NPU drafts role-specific briefs whose numbers are inserted and checked by code. Humans approve every action. Pilot: Jalan Raya Narogong, Indonesia. SDGs 3.6, 9.1, 11.2, 13.1.')}
${P('Tambahkan kalimat "Measured: [mAP], [latency], [SUS]." **hanya** bila angkanya ada di `evidence/`.')}
${H2('sD-3', 'D.3 Pernyataan pengungkapan GenAI (sesuaikan dengan kenyataan)')}
${P('"We used generative AI tools during development and disclose them here. Claude (Anthropic) was used to audit our repository against the official rubric and to draft planning documentation, including this master document; [Kiro/Cursor/other] was used to scaffold parts of the user interface and tests. [The scientific core — solver integration, surrogate training and validation, the structural life model, evaluation scripts and benchmarks — was written and verified by the team, as shown in our commit history.] A cloud language model used in an early prototype has been replaced by a local small language model on the Intel NPU, whose outputs are constrained and checked by code."')}
${P('Hapus kalimat dalam [ ] bila tidak benar. Pernyataan yang tidak sesuai riwayat commit lebih merugikan daripada skor rendah.')}
${H2('sD-4', 'D.4 Kalimat satu napas untuk pembukaan wawancara')}
${P('"PAVEMENT-PINN turns citizen pothole photos into risk-ranked, budget-aware repair decisions: AI on Intel hardware checks and measures the damage, verifiable pavement physics estimates how fast the road will fail when it is wet and loaded by trucks, and officers decide with evidence, even offline."')}
${H2('sD-5', 'D.5 Email ke penyelenggara tentang IDR (bahasa Inggris)')}
${pre(`Subject: PAVEMENT-PINN (AI Changemakers Stage 3) – question on Intel program participation

Dear organizers,
We are the PAVEMENT-PINN team, a Stage 3 finalist in the AI Changemakers category.
Intel lists the AI Global Impact Festival among its Digital Readiness Programs. Could you
confirm whether our participation in the festival counts as participation in an Intel program
for the "IDR Participation" criterion, and whether there are Intel learning modules we can
complete before our interview?
Thank you,
[Name], on behalf of the PAVEMENT-PINN team`)}
`;

export const appE = `
${H1('sE', 'Lampiran E: Keterlacakan Temuan Audit → Dokumen dan Milestone')}
${P('Setiap parameter rubrik yang berstatus selain Pass pada audit 16 Okt dipetakan ke bagian dokumen ini dan milestone yang menutupnya.')}
${T(['Parameter', 'Status audit', 'Gap utama (audit)', 'Bagian v3.1', 'Milestone'], SCORE.flatMap((m) => m[2].map((p) => [`${m[0]} ${p[0]}`, `[[${p[2]}]]`, p[6], ({
  'M01': { '1.1': '7.2, 9', '1.2': '7.5, D-03', '1.3': '4.8, 7.6, 9', '1.4': '7.3', '2.1': '2.1', '2.2': '2.2, 2.3, A', '2.3': '2.4, A', '3.1': '3.4, 7.2', '3.2': '7.4, 3.4 W7', '3.3': '7.5, 7.6' },
  'M02': { '1.1': '4.4 D2, slide 6', '1.2': '4.3, 4.7, 11', '1.3': '2.6, 4.4', '2.1': '4.3, 4.4, 4.7', '2.2': '12, Lamp. C', '2.3': '4.3, 4.5, 6.2', '2.4': '6.1–6.5', '3 G': '6.6, D-19, D.3', '4.1': '4.3, 8.1', '4.2': '5.4, 7.2', '4.3': '7.5, D-18' },
  'M03': { '1.1': '5.1', '1.2': '5.3', '2.1': '5.2, 5.4', '2.2': '5.6, D-21', '2.3': '5.1', '3.1': '4.3, 4.4, 5.4', '3.2': '5.1, 5.6', '3.3': '5.1, 4.7', '4 I': '5.5, D.5' },
}[m[0]][p[0].slice(0, 3)] || '—'), p[7]])), { widths: ['22%', '15%', '33%', '17%', '13%'] })}
${H3('Temuan forensik P0 (AUDIT-001)')}
${T(['Temuan P0', 'Ditutup oleh', 'Status 16 Okt'], [
  ['"PINN" = rumus heuristik (F-01)', 'D-02, 4.4, M1–M2', '[[SEBAGIAN]] (label RULE_BASED)'],
  ['Telemetri/loss/latensi dari `Math.random` (F-02)', 'D-11, M0, M5', '[[SEBAGIAN]] (grep kosong; belum di-commit)'],
  ['Regangan 1–2 orde terlalu kecil (F-03)', 'D-04, M1', '[[BELUM]]'],
  ['Modal "WIM training" palsu (F-04)', 'M0', '[[SEBAGIAN]] (file dihapus; belum di-commit)'],
  ['Keyakinan CV dikarang dari nama file (F-05)', 'D-07, M3', '[[SEBAGIAN]] (DEMO berlabel)'],
])}
<p class="end">Akhir dokumen. Versi 3.1, 16 Oktober 2026. Perbarui tanggal dan nomor versi setiap kali isi berubah; simpan versi lama di repositori (<code>docs/v3/</code>).</p>
`;
