import { T, KV, P, UL, OL, note, H1, H2, H3, esc, md, badge } from './h.mjs';

// [parameter, maks, status audit, skor audit, target v3.1, target v3.0, bukti yang dibutuhkan, milestone]
export const SCORE = [
  ['M01', 'Enriching Lives – Impact & Inclusion', [
    ['1.1 Depth of Impact', 3, 'NEED MODIFICATION', 1, 2, '2,5', 'KPI pilot terukur (waktu triase, presisi, ρ) + bukti AI melakukan yang tidak bisa software biasa', 'M5, M7'],
    ['1.2 Scale of Impact', 3, 'NEED MODIFICATION', 1, 2, '2,5', 'Dua koridor tanpa ubah kode; masalah global bersitasi; rencana open source', 'M0'],
    ['1.3 Duration of Impact', 3, 'NOT VERIFIED', 1, 3, '3', 'Rencana keberlanjutan: pemilik operasional, siklus retraining (Modul H), biaya tahunan', 'M0, M7'],
    ['1.4 Alignment with SDGs', 3, 'NEED MODIFICATION', 1, 3, '3', 'Tabel 7.3 di README, aplikasi, slide; alasan AI per target', 'M0'],
    ['2.1 Clarity of problem', 3, 'PASS WITH MODIFICATION', 2, 3, '3', 'Satu problem statement 2.1 yang sama di semua artefak; pilot konsisten', 'M0'],
    ['2.2 Evidence problem exists', 3, 'NEED MODIFICATION', 1, 3, '3', 'Lampiran A dengan status verifikasi + `evidence/01_sources`', 'M0'],
    ['2.3 Time-critical evidence', 3, 'NOT VERIFIED', 0, 3, '3', 'Bagian 2.4 bersitasi (2030, Zero ODOL 2027, tren jalan, musim hujan)', 'M0'],
    ['3.1 Target audience', 3, 'PASS WITH MODIFICATION', 2, 3, '3', 'Kutipan wawancara petugas/warga; empat peran nyata', 'M7'],
    ['3.2 Accessibility & usability', 3, 'PASS WITH MODIFICATION', 2, 2, '2,5', 'Lighthouse ≥ 90, Slow 3G, mode CPU-saja terukur, PWA', 'M3, M6'],
    ['3.3 Scalability', 3, 'NEED MODIFICATION', 1, 2, '2,5', 'Biaya per km/pengguna dari harga nyata; jalur penerapan spesifik', 'M0, M6'],
  ]],
  ['M02', 'AI Innovation – Application & Implementation', [
    ['1.1 AI necessary', 2, 'PASS WITH MODIFICATION', 1, 2, '2', 'Tiga titik AI yang perlu + pengakuan fisika acuan tidak butuh AI; perbandingan rule vs model', 'M2–M4'],
    ['1.2 Clear & effective use', 3, 'NEED MODIFICATION', 1, 2, '2,5', 'CV + surrogate + SLM dalam satu alur ujung-ke-ujung yang didemokan', 'M3, M4'],
    ['1.3 Idea classification', 3, 'PASS WITH MODIFICATION', 2, 2, '2,5', 'PI-surrogate + MC + optimasi; perbandingan dengan solusi eksisting (2.6)', 'M2'],
    ['2.1 Model choice', 3, 'NOT VERIFIED', 1, 3, '3', 'YOLO terlatih + MLET acuan + surrogate dengan ablasi + SLM kecil lokal', 'M1–M4'],
    ['2.2 Sub-domain knowledge', 2, 'PASS WITH MODIFICATION', 1, 2, '2', 'Semua anggota dapat menjelaskan CV, physics-informed ML, kuantisasi, GenAI lokal', 'M7'],
    ['2.3 Data obtained & analyzed', 2, 'NEED MODIFICATION', 1, 2, '2', 'Data card; split per lokasi; sintetis vs nyata; survei lalu lintas', 'M2, M3'],
    ['2.4 Ethics', 3, 'PASS WITH MODIFICATION', 2, 3, '3', 'EXIF + blur berjalan; register risiko; Model Card; risiko GenAI', 'M3, M4'],
    ['3 GenAI transparency', 4, 'NEED MODIFICATION', 0, 2, '1–3', 'Lembar pengungkapan jujur + riwayat commit konsisten (D-19)', 'M0'],
    ['4.1 Prototyping', 3, 'NEED MODIFICATION', 1, 3, '3', 'Inferensi AI nyata di setiap modul', 'M3'],
    ['4.2 Testing', 3, 'PASS WITH MODIFICATION', 2, 3, '3', 'mAP, FAR/FRR, MAPE surrogate, % lolos pemeriksa, latensi, SUS, ρ', 'M5, M7'],
    ['4.3 Full-scale deployment', 2, 'NOT YET', 0, 1, '1', 'PWA live untuk warga koridor pilot dengan laporan nyata', 'M6'],
  ]],
  ['M03', 'Use of Intel Technologies', [
    ['1.1 Intel resources in lifecycle', 3, 'NOT YET', 0, 3, '3', 'Peta 5.1 dengan bukti per tahap (≥ 4 tahap)', 'M1–M5'],
    ['1.2 Reason for selection', 4, 'NEED MODIFICATION', 1, 3, '3,5', 'Lima alasan 5.3 + benchmark sendiri PyTorch vs OpenVINO', 'M5'],
    ['2.1 HW appropriateness', 3, 'NOT YET', 0, 2, '2,5', 'Waktu MC per segmen; token/detik NPU; mode offline', 'M5'],
    ['2.2 HW type', 3, 'NOT VERIFIED', 0, 3, '3', 'Core Ultra CPU + Arc iGPU + NPU; Xeon; `available_devices`', 'M4, M5'],
    ['2.3 HW extent', 4, 'NOT YET', 0, 3, '3,5', 'Data (CPU), latih (XPU bila ada), evaluasi, deployment', 'M2–M6'],
    ['3.1 SW appropriateness', 3, 'NOT YET', 0, 3, '3', 'OpenVINO + NNCF menentukan latensi & ukuran (tabel per presisi)', 'M2, M3'],
    ['3.2 SW type', 3, 'NOT YET', 0, 3, '3', 'OpenVINO, NNCF, OpenVINO GenAI, Optimum Intel, sklearnex, PyTorch XPU', 'M2–M4'],
    ['3.3 SW extent', 4, 'NOT YET', 0, 3, '3,5', 'OpenVINO di ≥ 4 tahap; OpenVINO GenAI untuk SLM; RAG (Add-on) untuk nilai penuh', 'M2–M5'],
    ['4 IDR participation', 3, 'NOT VERIFIED', 0, 0, '0 atau 3', 'Konfirmasi penyelenggara + bukti materi Intel', 'M0'],
  ]],
];
const sum = (m, i) => m[2].reduce((a, p) => a + p[i], 0);
const tot = (i) => SCORE.reduce((a, m) => a + sum(m, i), 0);

function trajectory() {
  const pts = [['Kini', 25], ['M0', 36], ['M1', 38], ['M2', 47], ['M3', 56], ['M4', 62], ['M5', 68], ['M6', 71], ['M7', 74]];
  const W = 680, H = 230, x0 = 40, y0 = 196, top = 18, bw = 54, gap = 14;
  const y = (v) => y0 - ((y0 - top) * v) / 90;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img" aria-label="Proyeksi skor kumulatif per milestone">`;
  for (const g of [0, 30, 60, 90]) s += `<line x1="${x0}" x2="${W - 8}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text x="${x0 - 6}" y="${y(g) + 4}" class="ax" text-anchor="end">${g}</text>`;
  s += `<line x1="${x0}" x2="${W - 8}" y1="${y(78)}" y2="${y(78)}" class="tline"/><text x="${W - 10}" y="${y(78) - 4}" class="ax" text-anchor="end">target v3.0: 78–83</text>`;
  pts.forEach(([l, v], i) => {
    const x = x0 + 10 + i * (bw + gap);
    s += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y0 - y(v)}" rx="3" class="${i ? 'bar' : 'bar0'}"/><text x="${x + bw / 2}" y="${y(v) - 5}" class="val" text-anchor="middle">${v}</text><text x="${x + bw / 2}" y="${y0 + 15}" class="ax" text-anchor="middle">${l}</text>`;
  });
  return s + '</svg>';
}

export const sec9 = `
${H1('s9', '9 Peta Skor Rubrik Stage 3 (90 poin)')}
${P('Kolom "Audit" adalah skor 16 Okt 2026 dengan status resmi rubrik (Pass, Pass with Modification, Not Verified, Need Modification, Not Yet). "Target v3.1" adalah proyeksi konservatif bila milestone pemberi bukti lulus; "Target v3.0" dikutip dari dokumen sebelumnya. Ini perkiraan tim, **bukan skor juri**.')}
${trajectory()}
${P('Gambar 9.1 Proyeksi skor kumulatif per milestone (hanya berlaku bila gerbang lulus dengan bukti).')}
${SCORE.map((m) => `${H2('s9-' + m[0], `9.${m[0].slice(-1)} ${m[0]} ${m[1]} (30)`)}
${T(['Parameter', 'Maks', 'Status audit', 'Audit', 'Target v3.1', 'Target v3.0', 'Bukti yang harus ditunjukkan', 'Milestone'],
  [...m[2].map((p) => [p[0], String(p[1]), `[[${p[2]}]]`, String(p[3]), `**${p[4]}**`, p[5], p[6], p[7]]),
   [`**Subtotal**`, '**30**', '', `**${sum(m, 3)}**`, `**${sum(m, 4)}**`, m[0] === 'M01' ? '28' : '25–28', '', '']],
  { cls: 'score', widths: ['17%', '5%', '13%', '6%', '7%', '7%', '35%', '10%'] })}`).join('')}
${T(['', 'Audit 16 Okt', 'Target v3.1', 'Target v3.0'], [
  ['**Total (90)**', `**${tot(3)}** (${((100 * tot(3)) / 90).toFixed(1).replace('.', ',')}%)`, `**${tot(4)}** (${((100 * tot(4)) / 90).toFixed(1).replace('.', ',')}%); ${tot(4) + 3} bila IDR terkonfirmasi`, '78–83 (86–88 bila sebagian syarat nilai penuh terpenuhi)'],
])}
${note('Selisih terhadap 90', P('Berasal terutama dari transparansi GenAI (bergantung proporsi kode yang ditulis tim), deployment skala penuh (pilot satu koridor, bukan instansi), IDR (di luar kendali tim), aksesibilitas penuh (butuh suara/bahasa daerah), dan penilaian subjektif orisinalitas. Untuk mendekati 90: pelatihan benar-benar di GPU Intel dengan log, RAG lokal dengan OpenVINO GenAI/OPEA, bukti minat tertulis dari instansi atau wilayah kedua, dan pengakuan IDR.'))}
`;
if (tot(3) !== 25) throw new Error('audit total must be 25');

export const sec10 = `
${H1('s10', '10 Kerangka Pitch Deck (12 slide, bahasa Inggris)')}
${P('Wawancara Stage 3: 5 menit presentasi/demo + 15 menit tanya jawab (+10 menit bila memakai penerjemah). Deck adalah latar demo, bukan dibaca. Satu pesan per slide, angka bersitasi kecil di pojok, **tanpa angka yang belum diukur** — pakai "[measured: X]" sampai terisi; bila tidak terisi, hapus kalimatnya.')}
${T(['#', 'Judul', 'Isi', 'Visual', 'Speaker · waktu', 'Bergantung pada'], [
  ['1', 'Title', 'PAVEMENT-PINN: physics-grounded edge AI that turns citizen pothole photos into risk-ranked, budget-aware road repairs. Team, Indonesia, SDG 3.6 · 9.1 · 11.2 · 13.1', 'Foto lubang tergenang Narogong (milik tim, dikaburkan)', 'A · 10 dtk', 'Foto lokal'],
  ['2', 'A global, deadly problem', '1.16M road deaths/yr, 92% in LMICs [WHO 2026]. Indonesia 2024: 26,839 road deaths [Korlantas]; three of four crashes involve motorcycles [Korlantas 2024]. 3,021.5 km of national roads not in steady condition, Sem. I 2025 [Kementerian PU]', 'Tiga angka besar; sumber di footer', 'A · 30 dtk', 'M0 (sumber disimpan)'],
  ['3', 'Why it keeps happening', 'The fatal loop (Fig. 2.1). Most of Indonesia\'s road network is managed by local governments with the least survey capacity', 'Diagram siklus dengan empat titik pemutus', 'A · 20 dtk', '—'],
  ['4', 'One flow, four roles', 'Citizen report → Trust Gate + privacy blur + YOLO on Intel → verified physics + physics-informed surrogate → explainable risk score + budget optimiser → human approval → tracking code', 'Arsitektur 3.1 versi sederhana', 'A · 20 dtk', '—'],
  ['5', 'Live demo', '"Live on [laptop model], Wi-Fi off for field mode"', 'QR PWA untuk juri', 'C → B · 2:50', 'M3–M6'],
  ['6', 'Where AI is necessary, and where it is not', 'AI for perception, for uncertainty (thousands of physics simulations), for communication (local SLM, numbers filled by code). The physics reference needs no AI, and we say so', 'Tiga kolom + satu kolom abu-abu "not AI"', 'B · cadangan Q&A', '—'],
  ['7', 'Physics you can verify', 'Two independent solvers agree [measured: εt, εv]. Legacy formula was 1–2 orders too low; replaced. Dimensionless inputs → elastic similarity exact; monotonicity at collocation points; fallback outside domain. [measured: MAPE, p95, OOD]', 'Gambar perbandingan + tabel ablasi', 'B · cadangan Q&A', 'M1, M2'],
  ['8', 'Intel across the lifecycle', 'CPU data generation + sklearnex; [Arc iGPU / Tiber AI Cloud] training; NNCF INT8/INT4; NPU local SLM via OpenVINO GenAI; benchmark_app on this laptop: [measured table]', 'Garis siklus 8 tahap + ikon perangkat', 'B · 20 dtk', 'M2–M5'],
  ['9', 'Tested, with numbers', 'YOLO mAP before/after local fine-tune; Trust Gate FAR/FRR; surrogate error; SLM checker pass rate; SUS; Spearman vs engineers; pilot: [N] reports from [M] devices', 'Kartu angka — hanya yang terukur', 'A · 25 dtk', 'M5, M7'],
  ['10', 'Responsible by design (and what our own audit found)', 'Privacy pipeline; humans approve every action; equity correction; SLM cannot compute or act. "Our internal audit found simulated telemetry and a formula mislabelled as a PINN. We removed every unmeasured number and rebuilt on verifiable physics."', 'Sebelum/sesudah: 5 temuan P0 → ditutup', 'C · 25 dtk', 'M0'],
  ['11', 'Impact, scale, cost', 'KPIs + SDG mapping; second corridor by configuration only; estimated cost per km with assumptions; pathways: district public-works offices, rider communities, open source', 'Tabel SDG kecil + biaya', 'A · 20 dtk', 'M0, M7'],
  ['12', 'Next 12 months', 'Field validation with FWD data from a road agency; moisture model beyond soaked CBR; rutting from phone IMU; second city; open-source release. "Every pothole report should become a decision, not a complaint."', 'Peta jalan 4 kuartal', 'A · 15 dtk', '—'],
], { widths: ['3%', '14%', '38%', '17%', '12%', '16%'] })}
`;

export const sec11 = `
${H1('s11', '11 Naskah Demo 5 Menit dan Pembagian Bicara')}
${P('Semua anggota wajib hadir dan berbicara (poin dikurangi bila ada yang absen; mengganti/menambah anggota berujung diskualifikasi). A = Salman, B = Farel, C = anggota ke-3 (bila tim dua orang, A mengambil bagian C).')}
${T(['Waktu', 'Siapa', 'Di layar', 'Yang diucapkan (inti)', 'Fallback bila modul belum lulus gerbang'], [
  ['0:00–0:40', 'A', 'Slide 2–3', '"1.16 million people die on roads every year, 92% in countries like ours. In Indonesia, most crashes involve a motorcycle, and a hidden pothole after rain is exactly what hurts riders. Local governments manage most of our roads but rarely have structural data to decide what to fix first."', '—'],
  ['0:40–1:30', 'C', 'Ponsel (cermin): foto buram → ditolak dengan alasan; foto baik → terkirim; kode pelacakan', '"No app, no account. The phone checks blur first. On the server, our Trust Gate checks location and duplicates, then blurs faces and plates before anything is stored."', 'Tanpa M3: tunjukkan cek blur di ponsel + kode pelacakan; katakan deteksi adalah "next milestone"'],
  ['1:30–2:20', 'B', 'Dasbor Operator (skor + rincian); Insinyur: matikan Wi-Fi, buka penilaian', '"The queue is ordered by an explainable risk score. Now I am offline on an Intel Core Ultra laptop. The layered-elastic solver gives the critical strains; the physics-informed surrogate runs 2,000 simulations: life index P10 to P90, dry versus wet."', 'Tanpa M2: tampilkan εt/εv PyMastic saja, sebut MC sebagai target'],
  ['2:20–2:55', 'B', 'Opsi perbaikan; ringkasan SLM di NPU; pemeriksa lolos', '"The small language model on the NPU writes the brief, but every number is inserted by code and checked automatically. It is labelled AI-drafted and needs approval."', 'NPU gagal: jalankan di CPU dan **katakan** demikian'],
  ['2:55–3:20', 'B', 'Halaman Bukti', '"Every performance number on screen comes from measurements on this laptop: [YOLO INT8 ms], [surrogate batch time], [tokens per second on NPU]."', 'Bila kosong: "not measured yet" lebih baik daripada angka tanpa bukti'],
  ['3:20–4:05', 'A', 'Dasbor Perencana: anggaran → paket; peta keadilan', '"For the planner, we optimise which repairs to fund under a budget, and we flag areas with few reports so quiet neighbourhoods are not ignored."', 'Tanpa K2–K4: tampilkan antrian skor saja'],
  ['4:05–4:35', 'C', 'Slide 10', '"Responsible AI is built in. And honestly: our own audit found simulated numbers in an earlier version. We removed all of them and rebuilt on verifiable physics."', '—'],
  ['4:35–5:00', 'A', 'Slide 9 dan 11', '"In our pilot: [N] real reports, SUS [X], agreement with engineers ρ = [Y]. Every pothole report should become a decision, not a complaint. Thank you."', 'Tanpa data pilot: sebut metode dan "results pending", jangan menebak'],
], { widths: ['8%', '5%', '20%', '42%', '25%'] })}
${H3('Aturan demo')}
${OL([
  'Latih minimal 5 kali dengan stopwatch.',
  'Siapkan data contoh yang sudah dinilai bila inferensi lambat; model di-compile 10 menit sebelumnya.',
  'Bila sesuatu gagal, langsung putar rekaman cadangan dan jelaskan tanpa panik.',
  'Jangan menunjukkan fitur RENCANA atau yang belum lulus gerbang.',
  'Cerminkan ponsel ke laptop (mis. scrcpy) agar juri melihat alur warga.',
])}
`;
