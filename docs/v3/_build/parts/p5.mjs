import { T, KV, P, UL, OL, note, H1, H2, H3, pre } from './h.mjs';

export const sec5 = `
${H1('s5', '5 Teknologi Intel di Seluruh Siklus Proyek (Metric 03, 30 poin)')}
${note('Posisi audit: 1/30', P('Satu-satunya poin datang dari rencana tertulis (M03 1.2). Tidak ada dependensi Intel di `package.json`, tidak ada layanan Python, tidak ada model IR, tidak ada benchmark, perangkat pengembangan tidak terdokumentasi, IDR belum dikonfirmasi. Metric 03 adalah tempat poin paling banyak dan paling **terukur**: setiap tahap siklus memakai teknologi Intel yang memang diperlukan, alasannya jelas, dan buktinya (log, file pengukuran) menyebut nama perangkat dan versi perangkat lunak.'), 'warn')}
${H2('s5-1', '5.1 Peta siklus hidup (target dan status hari ini)')}
${T(['Tahap', 'Teknologi Intel', 'Hardware', 'Peran nyata', 'Status 16 Okt', 'Bukti yang disimpan', 'Milestone'], [
  ['Pelingkupan', 'Materi Intel Digital Readiness / festival; tutorial & notebook OpenVINO', '—', 'Kerangka masalah, rubrik RAI, pendekatan edge', '[[BELUM]]', 'Sertifikat/lencana, catatan belajar', 'M0'],
  ['Akuisisi data', 'OpenVINO Runtime (Trust Gate + pengaburan) saat kurasi foto lokal', 'Core Ultra CPU', 'Menyaring foto buruk dan mengaburkan sebelum masuk dataset', '[[BELUM]]', 'Log kurasi dengan perangkat', 'M3'],
  ['Pembuatan data fisika', 'Python + NumPy/SciPy (PyMastic) multi-core', 'CPU Intel (Core Ultra/Xeon)', '5.000–20.000 solusi MLET', '[[BELUM]]', 'Log waktu + lscpu/Info Sistem', 'M2'],
  ['Eksplorasi data', 'Intel Extension for Scikit-learn (`sklearnex.patch_sklearn()`)', 'CPU Intel', 'Lalu lintas, baseline regresi, ablasi MLP', '[[BELUM]]', 'Notebook + waktu dengan/tanpa patch', 'M2'],
  ['Pemodelan', 'PyTorch XPU, Ultralytics YOLO', 'Arc iGPU Core Ultra / Intel Tiber AI Cloud', 'Fine-tune YOLO; latih PI-surrogate', '[[BELUM]]', 'Log `torch.xpu.get_device_name()`', 'M2–M3'],
  ['Optimasi', 'NNCF (INT8 PTQ, kontrol akurasi), Optimum Intel (INT4 SLM)', 'CPU Intel', 'Kompresi YOLO, surrogate, SLM', '[[BELUM]]', 'Tabel FP32/FP16/INT8/INT4', 'M2–M4'],
  ['Evaluasi', '`benchmark_app`, skrip benchmark, accuracy check', 'CPU, iGPU, NPU', 'p50/p95, throughput, deviasi vs FP32', '[[BELUM]] (simulasi lama dihapus)', '`measurements/*.json`', 'M5'],
  ['Deployment', 'OpenVINO Runtime (AUTO/CPU/GPU), OpenVINO GenAI (NPU)', 'Core Ultra (lapangan, offline); VM Xeon (warga)', 'Inferensi semua model; SLM di NPU; mode CPU-saja', '[[BELUM]]', 'Rekaman demo offline; lscpu VM', 'M4–M6'],
])}
${P('Rubrik menilai **cakupan siklus** (M03 1.1, 2.3, 3.3 = 11 poin): satu tahap saja = nilai rendah. Gerbang minimal v3.1: Intel terbukti di **≥ 4 tahap** (data fisika, optimasi, evaluasi, deployment) dengan log perangkat.')}
${H2('s5-2', '5.2 Pembagian beban kerja per perangkat (ukur, jangan berasumsi)')}
${T(['Beban kerja', 'Perangkat utama', 'Alasan', 'Yang diukur'], [
  ['YOLO INT8 (foto)', 'iGPU atau CPU; NPU dicoba bila didukung', 'Konvolusi teratur; iGPU mempercepat tanpa GPU diskrit', 'p50/p95 ms per foto; mAP INT8 vs FP32'],
  ['PI-surrogate batch Monte Carlo', 'CPU atau iGPU (batch besar)', 'MLP kecil: CPU sering tercepat untuk batch kecil, iGPU untuk 10⁴–10⁵', 'Waktu 2.000 dan 100.000 sampel; deviasi FP16/INT8 vs FP32 dan vs PyMastic'],
  ['SLM INT4', 'NPU', 'Hemat daya di lapangan; CPU/iGPU bebas untuk UI dan YOLO', 'Token/detik, latensi token pertama, memori puncak; vs CPU/GPU'],
  ['Trust Gate + privasi', 'CPU', 'Harus jalan juga di server CPU', 'ms per foto'],
  ['Layanan warga', 'VM CPU Intel Xeon', 'Foto warga tidak menunggu laptop petugas', 'Laporan/menit, p95 ujung-ke-ujung'],
])}
${H2('s5-3', '5.3 Alasan memilih teknologi Intel (M03 1.2, 4 poin)')}
${OL([
  '**Satu runtime untuk CPU, iGPU, NPU.** Laptop dinas dan kampus umumnya tanpa GPU diskrit. OpenVINO menjalankan model yang sama di ketiga unit (AUTO), sehingga satu basis kode melayani laptop biasa (mode CPU-saja) maupun AI PC.',
  '**Kuantisasi dengan kontrol akurasi (NNCF).** Galat regangan diperbesar oleh fungsi transfer berpangkat 3–7; deviasi tiap presisi harus diukur. Bila INT8 merusak akurasi surrogate, tetap di FP16 dan laporkan.',
  '**GenAI lokal di NPU (OpenVINO GenAI).** Data infrastruktur dan lokasi tidak keluar perangkat; berfungsi tanpa internet; hemat daya.',
  '**Ekosistem siklus penuh.** sklearnex untuk analisis, PyTorch XPU untuk pelatihan di GPU Intel, Optimum Intel untuk ekspor SLM, `benchmark_app` untuk bukti.',
  '**Perbandingan yang adil.** TensorRT butuh GPU NVIDIA; ONNX Runtime dapat memakai OpenVINO sebagai execution provider. Klaim "lebih cepat" hanya dari benchmark sendiri (PyTorch CPU vs OpenVINO FP32/FP16/INT8 pada perangkat yang sama).',
])}
${P('Agar dapat nilai penuh, setiap alasan harus dipasangkan dengan **angka terukur** di Halaman Bukti (mis. alasan 1 ↔ latensi mode CPU-saja vs AUTO; alasan 2 ↔ tabel deviasi INT8; alasan 3 ↔ token/detik NPU + demo Wi-Fi mati).')}
${H2('s5-4', '5.4 Protokol benchmark (wajib sebelum menyebut angka apa pun)')}
${P('Hash model tetap; versi OpenVINO; keluaran `core.available_devices`; versi driver GPU/NPU; presisi dan konfigurasi NNCF; batch dan bentuk input; 50 putaran pemanasan; ≥ 1.000 putaran terukur; waktu cold start; p50/p95/p99; throughput; memori puncak; deviasi maksimum absolut dan relatif terhadap FP32 pada set validasi tetap; daya diukur dengan alat yang disebutkan atau ditulis "tidak diukur".')}
${pre(`benchmark_app -m models/yolo_int8/model.xml -d CPU -hint latency -t 30 -report_type no_counters -report_folder measurements/yolo_cpu
benchmark_app -m models/yolo_int8/model.xml -d GPU -hint latency -t 30 -report_folder measurements/yolo_gpu
benchmark_app -m models/pi_surrogate_fp16.xml -d CPU -shape "x[2000,4]" -hint throughput -t 20
python inference/bench/bench_llm.py --model models/qwen2.5-1.5b-int4-ov --device NPU --prompts eval/briefs.jsonl --out measurements/slm_npu.json`)}
${T(['Register benchmark (kosong = "belum diukur")', 'Presisi', 'Perangkat', 'p50 ms', 'p95 ms', 'Throughput', 'Akurasi / deviasi', 'Tanggal'], [
  ['YOLO (PyTorch)', 'FP32', 'CPU', '', '', '', 'mAP@0,5 =', ''],
  ['YOLO (OpenVINO)', 'FP32 / INT8', 'CPU', '', '', '', 'mAP@0,5 =', ''],
  ['YOLO (OpenVINO)', 'INT8', 'GPU / NPU', '', '', '', '', ''],
  ['PI-surrogate', 'FP32 / FP16 / INT8', 'CPU / GPU', '', '', 'sampel/detik', 'maks dev vs FP32; MAPE vs PyMastic', ''],
  ['PyMastic (acuan)', 'FP64', 'CPU', '', '', 'kasus/detik', 'acuan', ''],
  ['SLM', 'INT4', 'NPU / CPU / GPU', 'TTFT', '', 'token/detik', '% lolos pemeriksa', ''],
  ['Ujung-ke-ujung laporan', '—', 'VM Xeon', '', '', 'laporan/menit', '—', ''],
])}
${H2('s5-5', '5.5 Partisipasi program Intel (M03 4, 3 poin)')}
${UL([
  'Halaman resmi Intel Digital Readiness Programs mencantumkan AI Global Impact Festival sebagai salah satu programnya [17] [[TERVERIFIKASI]]. Proyek ini dibuat untuk festival tersebut; nyatakan fakta itu dengan tepat.',
  '**Tindakan M0:** kirim email singkat ke penyelenggara: apakah keikutsertaan festival dihitung sebagai partisipasi program Intel, dan apakah ada modul yang dapat diikuti sebelum wawancara. Simpan balasan di `evidence/15_idr/`.',
  'Ikuti materi Intel yang benar-benar tersedia (tutorial/notebook OpenVINO; modul AI for Youth bila memenuhi syarat), simpan sertifikat, dan tunjukkan **apa yang diterapkan** dari materi itu.',
  'Skor diproyeksikan **0** sampai ada konfirmasi tertulis. Jangan mengklaim partisipasi yang tidak terjadi.',
])}
${H2('s5-6', '5.6 Prasyarat perangkat dan perangkat lunak (bloker M2–M5, baru)')}
${T(['Prasyarat', 'Spesifikasi minimum', 'Status 16 Okt', 'Pemilik', 'Batas waktu'], [
  ['Laptop wawancara', 'Intel Core Ultra dengan NPU (seri 1/2 atau lebih baru), RAM ≥ 16 GB, driver NPU & GPU terbaru', '[[BELUM]] terkonfirmasi', 'Salman', 'H1 (pinjam kampus/dosen/komunitas bila perlu)'],
  ['Python', '3.11 atau 3.12 di `.venv` (D-23)', '[[BELUM]] terpasang di mesin dev yang diaudit', 'Farel', 'H1'],
  ['Paket inti', '`fastapi uvicorn numpy scipy opencv-python pytest`', '[[BELUM]]', 'Farel', 'H1'],
  ['Paket Intel', '`openvino` (2026.x; kunci versi), `openvino-genai`, `nncf`, `optimum[openvino]`, `scikit-learn-intelex`, `torch` (XPU bila ada)', '[[BELUM]]', 'Farel', 'H2'],
  ['PyMastic', '`git clone` repo Apache-2.0; catat hash commit', '[[BELUM]]', 'Farel', 'H1'],
  ['Ultralytics', '≥ 8.4.80 (argumen `quantize`); keputusan lisensi D-20', '[[BELUM]]', 'Tim', 'Sebelum M3'],
  ['Data', 'RDD2022 subset; ≥ 100–300 foto lokal + formulir persetujuan', '[[BELUM]]', 'Anggota 3', 'H2–H5'],
  ['Server warga', 'VM CPU Intel Xeon atau setara; HTTPS', '[[BELUM]]', 'Farel', 'Sebelum M6'],
])}
${pre(`# Windows (PowerShell) — dari root repo
py -3.12 -m venv inference\\.venv ; inference\\.venv\\Scripts\\Activate.ps1
pip install fastapi uvicorn numpy scipy opencv-python pytest
pip install openvino openvino-genai nncf "optimum[openvino]" scikit-learn-intelex ultralytics torch
git clone https://github.com/Mostafa-Nakhaei/PyMastic ..\\PyMastic
$env:PYMASTIC="..\\PyMastic"; python docs\\v3\\_build\\reference_code\\test_core.py   # harus: ALL TESTS PASSED
python -c "import openvino as ov; print(ov.__version__, ov.Core().available_devices)"   # simpan ke evidence/08_benchmarks/devices.txt
pip freeze > inference\\requirements.lock`)}
`;

export const sec6 = `
${H1('s6', '6 Responsible AI dan Tata Kelola Data')}
${P('Rubrik menilai kesadaran etika di seluruh siklus (privasi, bias, diskriminasi, ketidakadilan, keberlanjutan lingkungan, transparansi, keamanan, keselamatan), risiko khusus GenAI/agentic, dan transparansi alat GenAI. Audit memberi M02 2.4 = 2/3 (kuat: privasi tampilan publik, pemisahan wewenang, label jujur; kurang: EXIF, bias dataset, dokumen etika terpadu) dan M02 3 = 0/4.')}
${H2('s6-1', '6.1 Register risiko')}
${T(['Risiko', 'Mitigasi di desain', 'Indikator terukur', 'Status 16 Okt'], [
  ['Privasi foto (wajah, pelat)', 'Pengaburan sebelum simpan, EXIF dihapus, mentah ≤ 7 hari, peta publik tanpa foto', 'Recall pengaburan; log penghapusan', '[[BELUM]] (EXIF belum di-strip)'],
  ['Lokasi warga', 'Simpan titik kerusakan, bukan jejak; tanpa akun; hash perangkat bergaram diputar bulanan', 'Audit field API publik', '[[SEBAGIAN]] (tampilan publik tanpa identitas staf teruji)'],
  ['Keselamatan pelapor', 'Peringatan "berhenti di tempat aman" sebelum kamera; tanpa gamifikasi', 'Teks muncul sebelum kamera', '[[BELUM]]'],
  ['Bias cakupan', 'Komponen keadilan Q; peta keadilan; segmen tanpa laporan ≠ baik', 'Rasio laporan/km', '[[BELUM]]'],
  ['Bias model visual (basah, malam, aspal tua; dataset non-Indonesia)', '≥ 30% data lokal kondisi sulit; metrik per kondisi; keyakinan rendah → manusia', 'mAP per kondisi', '[[BELUM]]'],
  ['Kesenjangan digital', 'Jalur laporan komunitas (RT/RW, ojol); survei aktif petugas', 'Pangsa laporan komunitas', '[[BELUM]]'],
  ['Tuduhan keliru', 'Flag hanya pemicu investigasi, ≥ 3 laporan, kata netral', '% flag terkonfirmasi', 'Add-on'],
  ['Kepercayaan berlebihan pada angka fisika', 'P10–P90, kriteria dan asumsi ditampilkan, label "indikatif", tombol "tidak setuju"', '% rekomendasi ditimpa insinyur', '[[SEBAGIAN]] (label RULE_BASED ada)'],
  ['Halusinasi SLM', 'Placeholder, pemeriksa angka/kata, templat cadangan, label "disusun AI"', '% lolos pemeriksa', '[[BELUM]]'],
  ['Spam / foto palsu', 'Trust Gate berlapis, pembatas laju, tinjauan manusia', 'FAR/FRR', '[[SEBAGIAN]] (rate limit + magic-byte ada)'],
  ['Keamanan sistem', 'Token sesi dari server, RBAC domain, validasi skema, rate limit, kunci di env, whitelist parameter (F-31), cadangan', 'Tes otorisasi; checklist keamanan', '[[SEBAGIAN]] (`api-hardening.test.ts`)'],
  ['Lingkungan', 'Inferensi lokal terkuantisasi; tanpa cloud LLM; cache per segmen', 'Energi bila alat ukur ada; selain itu "tidak diukur"', '[[BELUM]]'],
  ['Keselamatan keputusan', 'AI tidak mengubah status atau memberi perintah; work order bukan SPK; panel Dishub hanya saran', 'Tindakan tanpa persetujuan manusia = 0', '[[TERBUKTI]] (state machine + tes)'],
])}
${H2('s6-2', '6.2 Siklus hidup data')}
${T(['Tahap', 'Kebijakan'], [
  ['Pengumpulan', 'Foto kamera langsung + titik + waktu; teks persetujuan singkat ID/EN (tujuan, retensi, cara minta hapus dengan kode pelacakan); tanpa registrasi.'],
  ['Pemrosesan', 'EXIF dihapus → Trust Gate → pengaburan → deteksi. Hanya versi kabur yang masuk penyimpanan utama.'],
  ['Penyimpanan', 'HTTPS; enkripsi saat diam di penyimpanan terkelola; akses berbasis peran; mentah ≤ 7 hari; laporan ditolak 30 hari lalu dihapus.'],
  ['Pelatihan', 'Hanya foto kabur berlabel; tanpa identitas; dataset berversi; foto relawan dengan persetujuan tertulis.'],
  ['Data sintetis', 'Solusi PyMastic dan nilai DEFAULT ditandai jelas, tidak pernah disajikan sebagai data lapangan.'],
  ['Penghapusan', 'Job terjadwal dengan log; permintaan hapus via kode pelacakan dilayani ≤ 7 hari.'],
  ['Dasar hukum', 'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi [25]: persetujuan, pembatasan tujuan, minimisasi, retensi terbatas, hak subjek data.'],
])}
${H2('s6-3', '6.3 Model Card ringkas')}
${T(['Model', 'Tujuan', 'Data latih', 'Metrik', 'Keterbatasan / tidak boleh dipakai untuk'], [
  ['YOLO INT8', 'Deteksi 4 kelas kerusakan', 'RDD2022 subset + foto lokal (jumlah, tanggal, lisensi)', 'mAP per kelas/kondisi, latensi', 'Bukan untuk alur roda/pengelupasan; kurang andal pada genangan dalam dan malam; keparahan dari foto = perkiraan'],
  ['Klasifikasi adegan (Add-on)', 'Jalan / bukan jalan / foto layar', 'RDD2022, foto tim, foto layar ≥ 5 perangkat', 'FAR/FRR', 'Bukan detektor pemalsuan forensik'],
  ['PI-surrogate', 'Percepatan regangan MLET untuk Monte Carlo', 'Solusi PyMastic (sintetis) pada rentang tercatat', 'MAPE/p95 vs PyMastic, OOD, pelanggaran arah', 'Tidak di luar rentang latih; tidak lebih benar dari MLET; tidak menggantikan uji lapangan/FWD'],
  ['SLM INT4', 'Ringkasan per peran', 'Model pralatih tanpa fine-tune', '% lolos pemeriksa, kejelasan, token/detik', 'Tidak boleh menghitung, memutuskan, atau membaca teks bebas warga'],
])}
${H2('s6-4', '6.4 Risiko khusus GenAI/agentic')}
${UL([
  '**Halusinasi angka:** dicegah secara struktural (placeholder + pemeriksa).',
  '**Prompt injection:** SLM tidak menerima teks bebas warga; input hanya JSON berskema.',
  '**Tindakan otonom:** SLM tidak memiliki tool apa pun; tidak ada agen yang mengubah status.',
  '**Kebocoran data:** model lokal di perangkat; tanpa API pihak ketiga setelah M4.',
  '**Nada menyesatkan:** daftar kata terlarang dan label wajib.',
])}
${H2('s6-5', '6.5 Lisensi pihak ketiga (cek sebelum rilis publik)')}
${T(['Komponen', 'Lisensi', 'Status verifikasi', 'Konsekuensi'], [
  ['PyMastic', 'Apache-2.0', '[[TERVERIFIKASI]] (GitHub API, 16 Okt 2026)', 'Atribusi; kunci hash commit'],
  ['Ultralytics YOLO', 'AGPL-3.0 (atau lisensi enterprise)', '[[TERVERIFIKASI]] [20]', 'Layanan jaringan → kode layanan dibuka dengan lisensi kompatibel (D-20)'],
  ['RDD2022', 'CC BY-SA 4.0 (katalog sekunder)', '[[PERLU CEK]] di halaman resmi', 'Atribusi; share-alike untuk turunan dataset'],
  ['SLM (Qwen2.5 / Phi-3.5)', 'Lihat kartu model', '[[PERLU CEK]]', 'Cantumkan di Model Card'],
  ['OpenVINO, NNCF, OpenVINO GenAI', 'Apache-2.0', '[[TERVERIFIKASI]]', 'Atribusi'],
  ['YuNet / model Open Model Zoo', 'Lihat repositori masing-masing', '[[PERLU CEK]]', 'Atribusi; ketersediaan per versi OpenVINO'],
])}
${H2('s6-6', '6.6 Transparansi pemakaian alat GenAI (M02 3, 4 poin)')}
${P('Skor rubrik: 0 tanpa pengungkapan; 1 bila GenAI metode pengembangan utama; 2 bila GenAI untuk brainstorming dan umpan balik; 3 bila mayoritas kode orisinal; 4 bila seluruh pekerjaan orisinal. Juri dapat bertanya langsung dan memeriksa riwayat commit. **Target realistis: 2/4**, naik ke 3 hanya bila modul ilmiah inti benar-benar ditulis tim dan riwayat commit menunjukkannya. Ketidakjujuran yang terungkap merusak skor etika dan kredibilitas seluruh presentasi.')}
${T(['Alat', 'Dipakai untuk', 'Bagian yang dibantu AI', 'Bagian orisinal tim / cara verifikasi'], [
  ['Claude / Claude Code (Anthropic)', 'Audit forensik repositori; audit rubrik; penyusunan dokumen v3.0 dan v3.1; [isi jujur: bagian kode yang dibantu]', '[isi: mis. draf dokumen, sebagian kode UI/tes]', '[isi: keputusan desain, verifikasi angka, pengujian]'],
  ['[Kiro / Cursor / Copilot — sebut yang benar]', '[isi]', '[isi]', '[isi]'],
  ['Google Gemini', 'Narasi runtime di prototipe (`narrativeService.ts`)', 'Teks narasi', 'Diganti SLM lokal di NPU (M4)'],
  ['[alat lain]', '', '', ''],
])}
${note('Cara menaikkan skor secara sah mulai hari ini', UL([
  'Tulis sendiri modul ilmiah inti: pembungkus PyMastic, pembangkit data dan pelatihan surrogate, fungsi transfer dan Monte Carlo, evaluasi dan benchmark, aturan keparahan, skor prioritas. Kode referensi boleh dibaca dan diuji, tetapi tulis ulang dan pahami baris per baris.',
  'Commit kecil atas nama anggota yang menulis, pesan menyebut ID temuan/fitur (`feat(E3): ...`).',
  'Terapkan keputusan D-19 (setelah disetujui tim) agar riwayat commit dan lembar pengungkapan konsisten.',
  'Simpan lembar di `evidence/13_genai_disclosure.md`; teks siap pakai di Lampiran D.3.',
]))}
`;
