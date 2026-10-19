import { T, KV, P, UL, OL, note, H1, H2, H3, md, badge } from './h.mjs';

export const cover = `
<div class="cover">
  <div class="kicker">Intel® AI Global Impact Festival 2026 · AI Changemakers · Stage 3</div>
  <div class="title">PAVEMENT-PINN v3.1</div>
  <div class="subtitle">Dokumen Induk: Spesifikasi Aplikasi untuk Developer, Riset Masalah Global, Roadmap Berbasis Bukti, Pemetaan Rubrik 90 Poin, dan Persiapan Pitch &amp; Wawancara Stage 3</div>
  <div class="tags"><span>Edge AI untuk keselamatan jalan</span><span>Fisika perkerasan yang dapat diverifikasi</span><span>Intel Core Ultra · OpenVINO · NPU</span><span>Responsible AI</span></div>
  ${KV([
    ['Versi', 'v3.1 · 16 Oktober 2026 (revisi v3.0 tanggal 15 Oktober 2026)'],
    ['Tim', 'Muhammad Salman Al Farisi (ketua) · Farel (developer) · anggota ke-3 bila ada'],
    ['Dasar revisi', 'Audit Rubrik AI Changemaker 16 Okt 2026 (skor baseline **25/90**), audit forensik PAVEMENT-PINN-AUDIT-001 (14 Okt 2026), rubrik resmi Stage 3 (hal. 4–8 Interview Tips Deck 2026), pemeriksaan repositori dan verifikasi ulang sumber'],
    ['Menggantikan', 'Dokumen Induk v3.0. Bila bertentangan dengan blueprint v1, dokumen finalis v2, spesifikasi v2.2 atau v3.0, **dokumen ini yang berlaku** (D-01).'],
    ['Aturan dokumen', 'Setiap klaim berstatus [[TERBUKTI]], [[TARGET]], [[RENCANA]], [[CONTOH DOKUMEN]] atau [[DILARANG]]. Tidak ada angka hasil (akurasi, latensi, token/detik, SUS, ρ) yang ditulis sebagai fakta sebelum ada file bukti di repositori tim.'],
    ['Pengungkapan', 'Dokumen v3.0 dan revisi v3.1 ini disusun dengan bantuan Claude (Anthropic) dan wajib dicantumkan di lembar pengungkapan GenAI (Bagian 6.6).'],
  ], 'cover-kv')}
</div>`;

export const changelog = `
${H1('s-changes', 'Apa yang Berubah di v3.1')}
${P('v3.0 sudah menjadi rencana yang baik, tetapi audit rubrik 16 Oktober 2026 menunjukkan jarak yang besar antara rencana dan kondisi aplikasi: skor terukur hari ini **25 dari 90 (27,8%)**, dengan Metric 03 (Intel) hanya **1/30**. v3.1 tidak mengubah arah teknis v3.0; v3.1 mengubah cara dokumen ini dipakai: setiap target dikaitkan ke bukti yang harus ada, setiap milestone punya gerbang lulus, dan angka yang belum terverifikasi diberi label.')}
${T(['Area', 'v3.0', 'v3.1 (dokumen ini)', 'Alasan (temuan audit)'], [
  ['Titik awal', 'Ringkasan audit forensik 14 Okt (226 tes)', 'Kondisi repositori 16 Okt: 229 tes lulus, Fase 0 sebagian, belum ada layanan Python/Intel (1.2)', 'Rencana harus mulai dari kondisi nyata'],
  ['Skor', 'Target 78–83/90 tanpa baseline', 'Baseline **25/90** per parameter + proyeksi per milestone; target konservatif **74/90** (+3 bila IDR terkonfirmasi) (Bagian 9)', 'Rubrik: jangan memberi poin tanpa bukti'],
  ['Roadmap', 'Sprint per hari', 'Milestone M0–M7 dengan gerbang lulus, bukti, pemilik, dan parameter rubrik yang dibuka (8.1); sprint 14 hari dan darurat 7 hari dipertahankan', 'Status Need Modification/Not Yet di 17 dari 30 parameter'],
  ['Prioritas fitur', 'P0/P1/P2 per fitur', 'Ditambah tier **Wajib / Bisa nanti / Add-on** dan "versi minimal" untuk demo (1.4, 3.4)', 'Waktu terbatas sebelum wawancara'],
  ['Sumber', 'Daftar sumber', 'Setiap sumber diberi status verifikasi; data Korlantas 2024 tahunan ditambahkan; angka jalan nasional tidak mantap diberi pembanding (Lampiran A, 2.3)', 'M01 2.2–2.3 bernilai 1 dan 0'],
  ['Intel', 'Peta siklus', 'Peta siklus + **status hari ini** + prasyarat perangkat sebagai bloker + versi perangkat lunak terkini (OpenVINO 2026.x, Ultralytics `quantize=8`) (5.1, 5.6)', 'M03 = 1/30'],
  ['GenAI disclosure', 'Templat kosong', 'Draf terisi + usulan trailer commit `Assisted-by` (D-19, perlu persetujuan tim) + target realistis 2/4 (6.6)', 'M02 3 = 0/4'],
  ['Keputusan', 'D-01..D-18', 'D-19..D-24 baru: atribusi GenAI, lisensi detektor, gerbang perangkat, target skor bersyarat, lingkungan Python, kebijakan bukti (1.3)', 'Konflik yang belum diputuskan'],
  ['Q&A', '40 pertanyaan', '48 pertanyaan; tambahan tentang audit, status saat ini, lisensi AGPL, data Narogong, dan "apa yang belum Anda ukur" (Bagian 12)', 'Juri Stage 3 menguji kejujuran'],
  ['Baru', '—', 'Register risiko eksekusi (8.6), matriks keterlacakan temuan audit → bagian (Lampiran E)', 'Agar tidak ada temuan yang tertinggal'],
])}
`;

export const sec0 = `
${H1('s0', '0 Ringkasan untuk Tim (baca ini dulu)')}
${P('Aplikasi Anda punya fondasi yang jarang dimiliki finalis: alur kerja multi-peran yang berjalan dan teruji (229 tes lulus pada 16 Okt 2026), RBAC di server, pemisahan wewenang, jejak audit, dan label status data yang jujur. Yang **belum ada** adalah bagian yang dinilai paling berat oleh juri Intel: inferensi AI nyata, mesin fisika yang benar, dan pemakaian teknologi Intel yang terukur. Dokumen ini adalah kontrak kerja untuk menutup jarak itu dengan bukti, bukan dengan klaim.')}
<div class="stats">
  <div><b>1,16 juta</b><span>kematian lalu lintas per tahun di dunia; 92% di negara berpendapatan rendah-menengah (WHO, fact sheet 20 Juli 2026) [1]</span></div>
  <div><b>26.839</b><span>korban meninggal kecelakaan lalu lintas di Indonesia tahun 2024; 150.096 kecelakaan (Korlantas, rilis akhir tahun) [12a]</span></div>
  <div><b>3.021,5 km</b><span>jalan nasional tidak mantap, Semester I 2025 (Buku Kondisi Jalan Nasional, via kumparan) [10] — ${badge('TERVERIFIKASI SEKUNDER')}</span></div>
</div>
${H2('s0-1', '0.1 Posisi hari ini dalam satu tabel')}
${T(['Metrik rubrik', 'Skor audit 16 Okt', 'Penyebab utama', 'Milestone yang membuka poin', 'Target konservatif'], [
  ['M01 Enriching Lives – Impact & Inclusion', '**12/30**', 'Sitasi, urgensi, SDG, biaya per pengguna belum ada di repo/deck; pilot tidak konsisten', 'M0 (dokumen + koridor), M7 (KPI pilot)', '26/30'],
  ['M02 AI Innovation – Application & Implementation', '**12/30**', 'Tidak ada inferensi AI nyata; tidak ada pengungkapan GenAI; belum deploy', 'M1–M4, M6', '25/30'],
  ['M03 Use of Intel Technologies', '**1/30**', 'Tidak ada OpenVINO/NNCF/OpenVINO GenAI/benchmark; perangkat belum terdokumentasi; IDR belum dikonfirmasi', 'M2–M5', '23/30 (+3 IDR)'],
  ['**Total**', '**25/90**', '', '', '**74/90** (77 dengan IDR)'],
])}
${note('Tentang target skor', P('Tidak ada dokumen yang dapat menjamin skor; juri menilai bukti yang Anda tunjukkan. Angka 74/90 adalah proyeksi **bila** gerbang M0–M7 lulus dengan bukti tersimpan. v3.0 menyebut 78–83; selisihnya berasal dari parameter yang bergantung pada penilaian subjektif (orisinalitas, aksesibilitas penuh) dan faktor di luar kendali tim (deployment instansi, IDR). Jangan menyebut angka skor di depan juri.'))}
${H2('s0-2', '0.2 Delapan hal terpenting')}
${P('**Satu kalimat proyek (v3.1):** PAVEMENT-PINN mengubah foto lubang dari warga menjadi daftar perbaikan berbasis risiko yang dapat diaudit: AI di perangkat Intel memverifikasi dan mengukur kerusakan, mesin fisika perkerasan yang dapat diverifikasi menilai seberapa cepat struktur gagal pada kondisi basah dan beban truk, lalu petugas memutuskan dengan bukti, bahkan tanpa internet di lapangan.')}
${OL([
  '**Perangkat dulu.** Pastikan laptop Intel Core Ultra dengan NPU (yang akan dipakai saat wawancara) dan lingkungan Python 3.11/3.12 tersedia. Tanpa keduanya, M2–M5 tidak bisa dimulai dan Metric 03 tetap mendekati nol (D-21, D-23).',
  '**Selesaikan Fase 0 hari ini.** Sebagian sudah dikerjakan di working tree (file OpenVINO/WIM simulasi dihapus, `no-fake-claims.test.ts` ditambahkan, tidak ada `Math.random` di `src/` dan `server/`). Sisa: koridor Narogong, `DECISION_LOG.md`, sitasi + SDG + biaya di repo, lembar pengungkapan GenAI, commit yang rapi.',
  '**Fisika yang benar sebelum AI.** PyMastic (Apache-2.0, dibandingkan dengan KENPAVE dan WESLEA oleh pembuatnya [18]) menjadi acuan. Tes acuan εt ≈ 303 µε dan εv ≈ 793 µε adalah [[CONTOH DOKUMEN]] sampai dijalankan ulang di repo tim.',
  '**"PINN" didefinisikan jujur** sebagai physics-informed neural surrogate (D-02): dilatih dari solusi PyMastic, fisika masuk lewat variabel tanpa dimensi dan loss monotonisitas, dengan pengaman kembali ke solver di luar domain.',
  '**AI nyata yang terlihat juri:** deteksi YOLO yang diekspor ke OpenVINO INT8, Monte Carlo P10/P50/P90 lewat surrogate OpenVINO, dan ringkasan SLM lokal di NPU dengan pemeriksa angka.',
  '**Halaman Bukti** hanya membaca `measurements/*.json` dari laptop wawancara. Selama file belum ada, UI menulis "belum diukur" (D-11).',
  '**Bawa audit Anda sendiri.** Slide "Apa yang kami temukan dan perbaiki" mengubah temuan P0 menjadi bukti Responsible AI.',
  '**Jangan mendemokan yang belum lulus gerbang.** Fitur yang belum lulus disebut TARGET/RENCANA; siapkan rekaman cadangan.',
])}
${H2('s0-3', '0.3 Peta dokumen untuk tiap anggota')}
${T(['Pembaca', 'Bagian wajib', 'Keluaran yang diharapkan'], [
  ['Farel (developer)', '1.2–1.4, 3, 4, 5, 8, Lampiran B dan E', 'Gerbang M0–M6 lulus; `measurements/`, `models/registry.json`, tes hijau'],
  ['Salman (ketua, pitch)', '0, 1, 2, 3.1, 6, 7, 9–13, Lampiran A dan D', 'Deck 12 slide, naskah demo, jawaban Q&A, email IDR, lembar GenAI'],
  ['Anggota ke-3', '2.3, 6, 7.2, 8.4, 12', 'Verifikasi sumber, foto lokal + persetujuan, survei lalu lintas, uji pengguna (SUS), peringkat buta'],
])}
`;

export const sec1 = `
${H1('s1', '1 Keputusan v3.1 dan Aturan Kejujuran')}
${H2('s1-1', '1.1 Legenda status klaim')}
${T(['Status', 'Arti', 'Cara menyebut di pitch/wawancara'], [
  ['[[TERBUKTI]]', 'Berjalan di repositori tim dan ada bukti (log, tes, rekaman, file pengukuran).', 'Sebut sebagai fakta; siap menunjukkan buktinya.'],
  ['[[TARGET]]', 'Ambang yang ingin dicapai; belum diukur.', '"Target kami X; hasil saat ini Y / belum diukur."'],
  ['[[RENCANA]]', 'Fitur masa depan; belum dibangun.', 'Peta jalan; tidak masuk demo.'],
  ['[[CONTOH DOKUMEN]]', 'Angka yang dihitung saat menyusun dokumen v3.0 di lingkungan lain.', 'Tidak boleh disebut sebagai hasil tim sebelum dijalankan ulang di repo + perangkat tim.'],
  ['[[DILARANG]]', 'Klaim yang bertentangan dengan bukti audit.', 'Tidak diucapkan sama sekali (1.5).'],
  ['[[TERVERIFIKASI SEKUNDER]]', 'Sumber ditemukan lewat media/agregator, belum dokumen primer.', 'Boleh dipakai dengan sitasi; simpan PDF primer sebelum wawancara.'],
])}
${H2('s1-2', '1.2 Kondisi aplikasi per 16 Oktober 2026')}
${P('Dasar: pemeriksaan branch `feature/m1-report-ownership` (commit terakhir `4a9b4fc` + perubahan working tree yang belum di-commit) dan `npm test` yang dijalankan 16 Okt 2026: **229 tes, 229 lulus, 0 gagal**. Stack: React 19 + Vite, Express API, file store JSON atomik, migrasi Supabase/PostGIS tertulis tetapi belum diterapkan.')}
${T(['Komponen', 'Status', 'Bukti di repo hari ini', 'Keputusan v3.1'], [
  ['Alur kerja multi-peran, RBAC, pemisahan wewenang, audit trail', '[[TERBUKTI]]', 'Golden path browser 12 event audit; `tests/unit/rbac.test.ts`, `workflow.test.ts`', 'Pertahankan; tulang punggung semua peran'],
  ['Label status jujur (RULE_BASED, DEMO, SYNTHETIC)', '[[TERBUKTI]]', '`no-fake-claims.test.ts`; CV DEMO tidak pernah auto-pass (`screening.ts`)', 'Jadikan standar di semua layar'],
  ['ESAL, sumbu standar 8,16 t', '[[TERBUKTI]]', '`esal.ts`', 'Satu-satunya konstanta sumbu (F-08)'],
  ['What-If tersimpan', '[[TERBUKTI]]', 'Commit `4a9b4fc`; tes persistensi SIMULATED', 'Sambungkan ke mesin baru (M2)'],
  ['Bilingual ID/EN, mobile 375 px, mode "DEMO OFFLINE" GitHub Pages', '[[TERBUKTI]]', '`src/i18n/translations.ts`; `docs/FINAL_AUDIT.md`', 'Pertahankan; tambah PWA (M6)'],
  ['Telemetri/benchmark OpenVINO simulasi, modal WIM palsu', '[[SEBAGIAN]] dihapus', 'File berstatus dihapus di working tree; belum di-commit', 'Commit di M0; rute → 404'],
  ['Mesin "PINN"', '[[BELUM]]', '`pinnEngine.ts` rumus deterministik RULE_BASED; regangan 1–2 orde terlalu kecil (audit F-03)', 'Ganti dengan MLET + PI-surrogate (M1–M2)'],
  ['Deteksi kerusakan (CV)', '[[BELUM]]', 'Classifier aturan DEMO; notebook YOLOv8n-seg 1 kelas tanpa bobot', 'YOLO 4 kelas + OpenVINO INT8 (M3)'],
  ['Trust Gate, hapus EXIF, pengaburan', '[[BELUM]]', 'Hanya validasi magic-byte ≤ 5 MB + petunjuk duplikat 30 m / 7 hari', 'Modul A + B (M3)'],
  ['Narasi GenAI', 'Gemini cloud opsional', '`server/services/narrativeService.ts` dengan fallback offline', 'Ganti SLM lokal di NPU (M4)'],
  ['Koridor pilot', '[[BELUM]] sesuai D-03', 'Hanya Karawang KRW-001..004; laporan Narogong ditandai `OUT_OF_SCOPE`', 'Narogong koridor 1 sebagai konfigurasi (M0)'],
  ['Layanan inferensi Python, `measurements/`, `models/`, `evidence/`', '[[BELUM ADA]]', 'Folder tidak ada; Python belum terpasang di mesin dev yang diaudit', 'M1 dan prasyarat 5.6'],
  ['Deployment', '[[SEBAGIAN]]', 'Bundle Node teruji lokal; GitHub Pages statis tanpa persistensi', 'PWA live publik (M6)'],
])}
${H2('s1-3', '1.3 Log keputusan')}
${P('D-01 sampai D-18 dari v3.0 tetap berlaku (ringkasan di bawah). D-19 sampai D-24 baru di v3.1. Salin seluruh tabel ke `docs/DECISION_LOG.md`.')}
${T(['ID', 'Keputusan', 'Isi dan alasan', 'Menutup'], [
  ['D-01', 'Dokumen acuan tunggal', 'Dokumen induk versi terbaru mengatur bila sumber lama bertentangan.', 'F-15'],
  ['D-02', 'Arti "PINN"', 'Physics-informed neural surrogate untuk respons elastis berlapis; **bukan** PINN yang menyelesaikan PDE dari residu kolokasi. Ucapkan perbedaan ini.', 'F-01'],
  ['D-03', 'Koridor pilot', 'Koridor 1: Jalan Raya Narogong. Koridor 2: Karawang Klari–Jatisari. Koridor = konfigurasi, bukan kode.', 'F-15'],
  ['D-04', 'Mesin struktural', 'Acuan MLET via PyMastic; PI-surrogate OpenVINO untuk Monte Carlo; pengaman ke PyMastic bila di luar domain atau uji silang > 10%.', 'F-03, F-09'],
  ['D-05', 'Umur struktural', 'Fungsi transfer terpilih dan disitasi; Indeks Umur Struktural Indikatif P10/P50/P90 (tahun), label "indikatif, bukan desain". Horizon lubang dihapus.', 'F-06, F-07'],
  ['D-06', 'Kondisi permukaan', 'Tidak memproyeksikan PCI; catat kondisi teramati yang dikonfirmasi insinyur.', 'F-07'],
  ['D-07', 'Deteksi kerusakan', 'YOLO 4 kelas (D00/D10/D20/D40), RDD2022 + foto lokal, OpenVINO INT8; keyakinan hanya dari model berversi. Lisensi lihat D-20.', 'F-05'],
  ['D-08', 'Anti-spoofing', 'Menjadi Photo Trust Gate berlapis dengan FAR/FRR terukur.', 'F-17'],
  ['D-09', 'Privasi', 'EXIF dihapus, wajah/pelat dikaburkan sebelum simpan; foto mentah ≤ 7 hari.', 'Etika'],
  ['D-10', 'GenAI', 'SLM lokal INT4 via OpenVINO GenAI di NPU; input JSON berskema; angka diisi kode; pemeriksa; templat cadangan; panggilan cloud dimatikan.', 'F-15'],
  ['D-11', 'Telemetri', 'Semua angka performa hanya dari `measurements/*.json`; selain itu "belum diukur".', 'F-02, F-12, F-14'],
  ['D-12', 'Beban lalu lintas', '"Virtual WIM" dihapus; hitungan kendaraan terklasifikasi × VDF MDP 2017 (normal vs aktual).', 'F-25'],
  ['D-13', 'Peran Dishub', 'Panel penasihat baca-saja; tanpa perintah atau batas tonase dinamis.', 'Keselamatan'],
  ['D-14', 'Rekomendasi material', 'Perbandingan Opsi Perbaikan (umur indikatif + biaya); arahan "PMA ≥ 8,5 cm" dihapus.', 'F-18'],
  ['D-15', 'Audit mutu', 'Flag Kerusakan Dini untuk Investigasi; netral; ≥ 3 laporan + konfirmasi insinyur.', 'F-26'],
  ['D-16', 'Visualisasi', 'Peta 2D + penampang regangan dari grid MLET; twin 3D dihapus.', 'F-29'],
  ['D-17', 'Kewenangan jalan', 'Segmen menyimpan instansi pengelola dari SK status ruas; laporan diarahkan (REFERRED).', 'Baru'],
  ['D-18', 'Deployment', 'PWA warga live di URL publik selama pilot; Supabase **atau** satu VM + cadangan harian.', 'F-24'],
  ['D-19 [[BARU]]', 'Atribusi GenAI di commit (**usulan, perlu persetujuan tim**)', 'Usulan: setiap commit yang dibantu AI memakai trailer `Assisted-by: <alat>` (sesuai AGENTS.md), sehingga riwayat commit konsisten dengan lembar pengungkapan. Aturan trailer yang berlaku saat ini di repo berbeda; tim memutuskan sebelum M0 selesai. Riwayat lama tidak diubah; lembar pengungkapan menjelaskannya.', 'M02 3'],
  ['D-20 [[BARU]]', 'Lisensi detektor', 'Ultralytics berlisensi AGPL-3.0 [20]. Pilihan: (a) pakai dan rilis kode layanan inferensi sebagai open source yang kompatibel; atau (b) detektor permisif. Tim memutuskan sebelum M3 dan mencatatnya; default dokumen ini: (a) karena rencana open source sudah ada di 7.5.', 'Lisensi'],
  ['D-21 [[BARU]]', 'Gerbang perangkat', 'Benchmark dan demo hanya di laptop Intel Core Ultra ber-NPU yang dipakai saat wawancara. Bila tidak tersedia sampai H3, Metric 03 diproyeksikan ulang tanpa poin NPU dan keputusan dicatat.', 'M03 2.x'],
  ['D-22 [[BARU]]', 'Target skor bersyarat', 'Target skor hanya dikomunikasikan internal, per milestone, dari Bagian 9. Tidak ada angka skor di deck.', 'Kejujuran'],
  ['D-23 [[BARU]]', 'Lingkungan Python', 'Layanan inferensi memakai Python 3.11/3.12 dalam `.venv` di `inference/`; versi paket dikunci di `inference/requirements.lock`; Express memanggil lewat `INFERENCE_URL` (default `http://127.0.0.1:8100`).', 'M1'],
  ['D-24 [[BARU]]', 'Kebijakan bukti', 'Setiap gerbang milestone lulus hanya bila buktinya tersimpan di `evidence/` dengan tanggal + hash commit (8.4).', 'Semua'],
], { widths: ['9%', '17%', '60%', '14%'] })}
${H2('s1-4', '1.4 Keputusan fitur: hapus, ubah, pertahankan, tambah')}
${T(['Fitur', 'Keputusan', 'Tier v3.1', 'Alasan'], [
  ['Telemetri acak, "8,4 ms", loss, "FWD Validated", stasiun WIM, persentase kontribusi acak, ekspor IR buatan', 'HAPUS', '—', 'Bukti palsu; risiko diskualifikasi etika (F-02, F-04, F-13, F-16, F-20)'],
  ['Horizon lubang (hari), proyeksi PCI, kerugian/penghematan APBN per segmen', 'HAPUS', '—', 'Tanpa dasar struktural (F-07, F-22); angka makro tetap sebagai konteks bersitasi'],
  ['Batas tonase dinamis, "alihkan truk > 12 t"', 'HAPUS', '—', 'Di luar kewenangan, tidak tervalidasi'],
  ['Rekomendasi material / audit mutu', 'UBAH', 'Bisa nanti / Add-on', 'Menjadi Perbandingan Opsi (D-14) dan Flag Investigasi (D-15)'],
  ['Peta, antrian, penugasan, persetujuan, verifikasi, audit log, What-If', 'PERTAHANKAN', 'Sudah ada', 'Teruji; kerangka seluruh peran'],
  ['MLET PyMastic, PI-surrogate + Monte Carlo, YOLO OpenVINO INT8, SLM NPU, Halaman Bukti, Trust Gate + EXIF + blur, skor prioritas, demo offline', 'TAMBAH', '**Wajib**', 'Inti AI + Intel yang dinilai juri'],
  ['Antrian offline warga, konfirmasi warga, gabung duplikat pHash, SLA, REFERRED, optimasi anggaran, peta keadilan, opsi perbaikan, PWA live, uji pengguna', 'TAMBAH', '**Bisa nanti**', 'Memperkuat dampak dan deployment; tidak menghambat demo inti'],
  ['RAG "Tanya Pedoman" (OpenVINO GenAI/OPEA), flag kerusakan dini, panel Dishub, active learning, klasifikasi adegan, pelatihan XPU, hitung video, bahasa daerah/suara', 'OPSIONAL', '**Add-on**', 'Hanya setelah semua Wajib lulus gerbang'],
  ['Rutting/stripping dari satu foto, tekanan air pori, twin 3D', 'RENCANA', 'Tidak dikerjakan', 'Butuh sensor/model lain; sebut sebagai peta jalan'],
])}
${H2('s1-5', '1.5 Klaim yang dilarang sampai ada bukti')}
${UL([
  '"Model kami adalah PINN yang menyelesaikan persamaan Burmister", "setara FEM", "< 10 ms", "8,4 ms".',
  'Angka latensi, daya, utilisasi NPU, akurasi, mAP, token/detik, SUS atau ρ yang tidak berasal dari file pengukuran di repo tim.',
  'Angka [[CONTOH DOKUMEN]] (303/793 µε, uji kelayakan surrogate, Rp58 juta/tahun) sebagai hasil tim sebelum dijalankan ulang.',
  '"Divalidasi dengan data FWD/WIM/lapangan"; "jalan ini aman" atau "melebihi batas izin" dari keluaran model.',
  'Sisa umur dalam hari, horizon lubang, penghematan APBN dari pilot.',
  '"Data dari/diakui oleh Bina Marga, Kementerian PU, Kemenhub, BMKG, Polri atau Intel" tanpa izin tertulis.',
  '"Mendeteksi kontraktor nakal", "korupsi", atau kesimpulan kesalahan pihak mana pun.',
  '"100% offline" untuk seluruh sistem (yang offline hanya mode lapangan insinyur).',
  '"Kami peserta program Intel X" tanpa bukti (5.5); "kemitraan dengan dinas" tanpa surat (7.5).',
  '"Seluruh kode ditulis tim" bila riwayat commit menunjukkan bantuan AI (6.6).',
])}
`;
