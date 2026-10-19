import { T, KV, P, UL, OL, note, H1, H2, H3, pre, md } from './h.mjs';

export const sec7 = `
${H1('s7', '7 Dampak, Inklusi, Skalabilitas, dan Biaya')}
${H2('s7-1', '7.1 Teori perubahan')}
<div class="toc-chain"><div><b>Input</b><small>foto warga · data segmen · hitungan lalu lintas · laptop Intel</small></div><div><b>Aktivitas AI</b><small>verifikasi + deteksi · fisika + ketidakpastian · skor + optimasi · ringkasan per peran</small></div><div><b>Output</b><small>laporan terverifikasi · daftar prioritas · paket anggaran · status untuk warga</small></div><div><b>Hasil (outcome)</b><small>triase lebih cepat · titik bahaya tinggi lebih dulu · perbaikan lebih tahan</small></div><div><b>Dampak</b><small>lebih sedikit korban roda dua (SDG 3.6) · jalan andal (9.1) · lembaga akuntabel (16.6)</small></div></div>
${P('Gambar 7.1 Pilot mengukur output dan outcome. Dampak pada korban hanya dapat diklaim setelah data jangka panjang bersama instansi, **tidak dari pilot**.')}
${H2('s7-2', '7.2 KPI pilot (definisi, cara ukur, target, pemilik)')}
${T(['KPI', 'Definisi', 'Cara ukur / baseline', 'Target', 'Pemilik', 'Bukti'], [
  ['Waktu lapor warga', 'Detik dari buka halaman sampai terkirim', 'Log sisi klien', '[[TARGET]] median ≤ 60 dtk', 'Farel', 'evidence/10_users'],
  ['Waktu triase', 'Laporan masuk → terprioritaskan dengan penilaian', 'Log sistem vs proses manual dari wawancara 1–2 petugas (baseline)', '[[TARGET]] dari hari menjadi menit', 'Salman', 'evidence/10_users'],
  ['Presisi laporan valid', '% lolos gate dan dikonfirmasi peninjau', 'Tinjauan manusia atas sampel', '[[TARGET]] ≥ 85%', 'Anggota 3', 'evidence/06'],
  ['Kesepakatan prioritas', 'Spearman ρ skor sistem vs peringkat buta insinyur', '15–20 titik, 2–3 penilai', '[[TARGET]] ρ ≥ 0,6', 'Anggota 3', 'evidence/10_users'],
  ['Kualitas deteksi', 'mAP@0,5 set uji lokal sebelum vs sesudah fine-tune', 'Evaluasi Modul C', '[[TARGET]] naik terukur', 'Farel', 'evidence/05_yolo'],
  ['Kegunaan', 'System Usability Scale', '≥ 10 warga + ≥ 3 pengguna internal (mahasiswa/dosen sipil)', '[[TARGET]] SUS ≥ 70', 'Salman', 'evidence/10_users'],
  ['Keadilan cakupan', 'Rasio laporan/km; segmen "perlu survei aktif"', 'Peta K4', 'Dilaporkan apa adanya', 'Farel', 'evidence/11_pilot'],
  ['Penggunaan nyata', 'Laporan nyata dan perangkat unik selama pilot', 'Data produksi', '[[TARGET]] ≥ 50 laporan dari ≥ 20 perangkat dalam 10 hari', 'Tim', 'evidence/11_pilot'],
])}
${P('Audit M01 1.1 = 1/3 karena "tidak ada metrik perbaikan terukur". KPI di atas adalah jawaban, tetapi poin baru naik saat **angka nyata** ada. Bila pilot belum selesai saat wawancara, sebut metode + angka sementara dengan n yang jelas.')}
${H2('s7-3', '7.3 Keselarasan SDG (M01 1.4)')}
${T(['Target SDG', 'Kontribusi PAVEMENT-PINN', 'KPI bukti di pilot', 'Mengapa butuh AI'], [
  ['**3.6** — separuh kematian/cedera lalu lintas pada 2030', 'Titik bahaya bagi roda dua ditangani lebih dulu; warga melihat titik bahaya terverifikasi', 'Waktu triase titik bahaya tinggi; SLA tinggi terpenuhi', 'Verifikasi ribuan foto tak terkontrol tidak mungkin dengan aturan manual'],
  ['**9.1** — infrastruktur andal, berkelanjutan, tangguh', 'Penilaian struktural murah di antara survei resmi; opsi perbaikan yang lebih tahan', 'Kesepakatan prioritas; umur indikatif opsi terpilih', 'Ketidakpastian Monte Carlo per segmen butuh surrogate cepat di edge'],
  ['**11.2** — transportasi aman dan terjangkau', 'Pangsa motor masuk skor bahaya; fokus pengguna rentan', 'Titik bahaya tinggi tersisa per skenario anggaran', 'Optimasi paket dan peringkat dinamis'],
  ['**13.1** — ketahanan terhadap bahaya iklim', 'Skenario basah menunjukkan segmen paling rentan musim hujan', 'Daftar segmen dengan penurunan umur terbesar kering → basah', 'Perbandingan skenario massal'],
  ['**16.6** (pendukung) — lembaga efektif, akuntabel, transparan', 'Kode pelacakan, jejak audit, alasan skor terlihat', '% laporan dengan status diperbarui ≤ SLA', 'Ringkasan per peran membantu komunikasi'],
])}
${P('**Tindakan M0:** tabel ini masuk ke README, halaman "Tentang" aplikasi, dan slide 11 (audit: SDG hanya ada di blueprint).')}
${H2('s7-4', '7.4 Aksesibilitas dan kegunaan (M01 3.2)')}
${T(['Pertanyaan rubrik', 'Jawaban', 'Bukti', 'Status 16 Okt'], [
  ['UX setara untuk semua?', 'Tanpa akun/instal; ID/EN; tombol besar; kontras AA; teks dapat diperbesar; jalur laporan komunitas', 'Lighthouse, uji kontras, SUS', '[[SEBAGIAN]] (ID/EN, fokus terlihat, reduced motion)'],
  ['Offline / bandwidth rendah?', 'Foto ≤ 500 KB; antrian offline (W3); mode lapangan insinyur lokal (E1)', 'Uji "Slow 3G" dan mode pesawat', '[[SEBAGIAN]] (DEMO OFFLINE GitHub Pages; belum PWA)'],
  ['Perangkat murah?', 'Warga: ponsel apa pun dengan browser. Petugas: mode CPU-saja di laptop biasa; mode penuh di AI PC', 'Latensi mode CPU-saja', '[[BELUM]] diukur'],
  ['Multibahasa / multimodal?', 'Foto + lokasi + teks; ID/EN; file terjemahan siap bahasa daerah; ringkasan per peran', 'Daftar bahasa', '[[SEBAGIAN]]'],
])}
${H2('s7-5', '7.5 Skalabilitas dan jalur penerapan (M01 3.3)')}
${UL([
  '**Modular per koridor:** menambah koridor = menambah konfigurasi (geometri, instansi, data lapisan). Dibuktikan dengan dua koridor (Narogong, Karawang) tanpa perubahan kode — **gerbang M0**.',
  '**Modular per negara:** model visual dari RDD2022 yang multinasional; fungsi transfer dipilih per standar nasional; teks UI dan templat SLM per bahasa.',
  '**Jalur penerapan spesifik:** (1) Dinas PU kabupaten/kota dan UPTD jalan provinsi sebagai pengguna internal; (2) komunitas ojol, RT/RW, kampus sebagai jaringan pelapor; (3) rilis open source (juga memenuhi AGPL bila Ultralytics dipakai, D-20). Status kerja sama ditulis apa adanya: "dalam penjajakan" sampai ada surat.',
  '**Biaya marginal rendah:** warga memakai perangkat sendiri; satu server CPU melayani banyak koridor; inferensi lapangan di laptop yang memang dibutuhkan petugas.',
])}
${H2('s7-6', '7.6 Estimasi biaya per pengguna (asumsi eksplisit)')}
${T(['Komponen (1 kabupaten: 10 koridor, 500 km, 10 pengguna internal)', 'Asumsi (ganti dengan penawaran harga nyata)', 'Biaya/tahun'], [
  ['Server VM CPU Intel Xeon 4 vCPU + penyimpanan', '±Rp1 juta/bulan', 'Rp12 juta'],
  ['Laptop Core Ultra insinyur', '5 unit × Rp20 juta, umur 4 tahun', 'Rp25 juta'],
  ['Pelabelan dan pelatihan ulang', '40 jam/koridor/tahun × Rp50 ribu × 10 koridor', 'Rp20 juta'],
  ['Domain, operasional', '—', 'Rp1 juta'],
  ['**Total**', '', '**Rp58 juta**'],
  ['Per km jalan per tahun', 'Rp58 juta / 500 km', '±Rp116 ribu'],
  ['Per pengguna internal per tahun', 'Rp58 juta / 10', '±Rp5,8 juta'],
  ['Per warga pelapor per tahun', 'bila 20.000 warga aktif', '±Rp2.900'],
])}
${P('Semua angka adalah [[CONTOH DOKUMEN]] untuk menunjukkan metode. **Tindakan:** ambil 2–3 penawaran harga nyata (VM, laptop) dan, bila mungkin, biaya survei kondisi konvensional per km dari instansi/literatur sebagai pembanding. Tanpa pembanding, sebut "estimasi", bukan "penghematan".')}
`;

const MS = [
  ['M0', 'Kejujuran, dokumen, koridor', 'H1–H2 (D1)', 'Commit penghapusan simulasi; `DECISION_LOG.md` D-01..D-24; `config/corridors/narogong.json` + karawang; sitasi + SDG + biaya di README & aplikasi; lembar GenAI; email IDR; prasyarat 5.6 dipenuhi', '`npm test` + `npm run lint` hijau; tes grep frasa terlarang lulus; laporan di Narogong tidak lagi `OUT_OF_SCOPE`; `evidence/01_sources` terisi; `13_genai_disclosure.md` ada; `available_devices` laptop tersimpan', 'M01 1.2, 1.3, 1.4, 2.1–2.3, 3.3; M02 3; M03 1.2, 4', '25 → 36'],
  ['M1', 'Layanan inferensi + MLET', 'H2–H3 (D2)', '`inference/` FastAPI; `/v1/health`; `/v1/assess` versi MLET (roda ganda); Express memanggil `INFERENCE_URL`; pensiunkan `/api/simulate`; satu konstanta 8,16 t', '`pytest` hijau; tes acuan 303/793 µε ±1% **dijalankan di repo tim**; uji kesebangunan; tes 422 untuk input di luar rentang', 'M02 2.1; M03 1.1', '36 → 38'],
  ['M2', 'PI-surrogate + Monte Carlo + Indeks Umur', 'H3–H4 (D4)', '`gen_mlet_dataset.py` ≥ 5.000; pemeriksaan arah B.9; `train_pi_surrogate.py`; ekspor OpenVINO FP32/FP16 (+INT8 NNCF bila deviasi wajar); MC 2.000; UI insinyur E3; sklearnex untuk ablasi', '`models/pi_surrogate_metrics.json` (acak + OOD + ablasi); P10 ≤ P50 ≤ P90; deterministik; kering→basah menurunkan umur; log perangkat pelatihan', 'M02 1.1, 1.3, 2.1; M03 1.1, 2.3, 3.1–3.3', '38 → 47'],
  ['M3', 'Foto warga: privasi, Trust Gate, YOLO OpenVINO INT8', 'H5–H6 (D3)', '`/v1/screen`: EXIF → gate → blur → YOLO INT8; status SCREENED/REJECTED_WITH_REASON/MERGED/REFERRED; job hapus mentah ≤ 7 hari; W2 cek di ponsel; W4 kode pelacakan', 'mAP per kelas/kondisi + FP32 vs INT8 tersimpan; FAR/FRR; recall pengaburan; tes "no silent drop"; respons publik tanpa field pribadi', 'M02 1.2, 2.3, 2.4, 4.1; M03 2.3, 3.1; M01 3.2', '47 → 56'],
  ['M4', 'SLM lokal di NPU', 'H7 (D5)', '`/v1/brief` dengan Qwen2.5-1.5B INT4 via OpenVINO GenAI; placeholder + `check_brief`; fallback NPU→GPU→CPU; matikan Gemini', '% lolos pemeriksa pada 50 kasus; token/detik per perangkat tersimpan; tidak ada panggilan cloud (tes)', 'M02 1.2, 2.4; M03 2.2, 3.2, 3.3', '56 → 62'],
  ['M5', 'Benchmark + Halaman Bukti', 'H8 (D5)', '`bench_tools.py` + `benchmark_app` YOLO/surrogate/SLM di CPU/GPU/NPU **di laptop wawancara**; Halaman Bukti hanya dari `/v1/measurements`; skor prioritas O1', 'Register 5.4 terisi dengan perangkat, versi OpenVINO, driver, tanggal; perbandingan PyTorch vs OpenVINO pada perangkat yang sama', 'M03 1.2, 2.1, 2.3; M02 4.2; M01 1.1', '62 → 68'],
  ['M6', 'Keputusan per peran + deployment', 'H8–H11 (D6)', 'O1–O6, E2/E4/E6, K2–K4, W3/W6; PWA warga di URL publik; Supabase atau VM; Playwright golden path; demo offline E1', 'URL publik hidup; Playwright hijau; demo Wi-Fi mati lulus; statistik laporan nyata mulai tercatat', 'M02 4.3; M01 3.1–3.3', '68 → 71'],
  ['M7', 'Pilot, uji pengguna, paket bukti', 'H9–H13 (D6–D7)', 'SUS ≥ 10 warga + 3 internal; peringkat buta + Spearman; KPI pilot; Model Card; rekaman demo cadangan; latihan wawancara', '`evidence/00_readme.md` lengkap dengan commit + tanggal; semua slide angka terisi dari bukti', 'M01 1.1, 3.1; M02 2.2, 4.2', '71 → 74'],
];

export const sec8 = `
${H1('s8', '8 Roadmap Implementasi Menuju Wawancara')}
${P('Tanggal wawancara belum tercantum dalam dokumen yang diterima; rencana memakai hari relatif (H1 = hari mulai). Bila wawancara kurang dari 8 hari lagi, pakai rencana darurat (8.3). Prinsip: **hapus klaim palsu dulu, lalu bangun bukti dari yang paling bernilai rubrik**. Setiap milestone selesai hanya bila `npm test`, `npm run lint` dan `pytest` hijau dan buktinya tersimpan (D-24).')}
${H2('s8-1', '8.1 Milestone dengan gerbang lulus')}
${MS.map((m) => `<div class="ms"><div class="msh"><span class="msid">${m[0]}</span><span class="msn">${md(m[1])}</span><span class="msd">${md(m[2])}</span><span class="mss">skor proyeksi ${md(m[6])}</span></div>${KV([['Pekerjaan', m[3]], ['Gerbang lulus (acceptance)', m[4]], ['Parameter rubrik yang dibuka', m[5]]])}</div>`).join('')}
${P('Skor proyeksi kumulatif bersifat perkiraan konservatif (Bagian 9) dan hanya berlaku bila gerbang lulus dengan bukti.')}
${H2('s8-2', '8.2 Sprint 14 hari (pembagian peran)')}
${T(['Hari', 'Farel (developer)', 'Salman (ketua)', 'Anggota 3'], [
  ['H1', 'M0: commit penghapusan simulasi; DECISION_LOG; koridor Narogong; pasang Python + PyMastic; `test_core.py`', 'Kunci keputusan D-19..D-24; email IDR; pastikan laptop Core Ultra', 'Verifikasi sumber Lampiran A; rencana foto + formulir persetujuan'],
  ['H2', 'M1: FastAPI + `/v1/assess` MLET + tes acuan; paket Intel terpasang; `available_devices` disimpan', 'Kerangka deck (Bagian 10); sitasi + SDG ke README', 'Foto lokal hari 1 (≥ 150, kondisi beragam)'],
  ['H3', 'M2: data PyMastic ≥ 5.000; latih PI-surrogate; ekspor OpenVINO; uji OOD', 'Halaman etika di aplikasi (6.1–6.4)', 'Survei hitung lalu lintas 12 jam #1'],
  ['H4', 'M2: Monte Carlo + Indeks Umur di UI insinyur; hapus RUL/PCI lama', 'Wawancara 1–2 petugas/insinyur (baseline triase, harga satuan)', 'Pelabelan foto (CVAT), 2 anotator pada 20%'],
  ['H5', 'M3: pelatihan YOLO (RDD2022 subset + lokal) dengan log perangkat; evaluasi', 'Formulir SUS + skenario uji', 'Survei lalu lintas #2; foto lokal hari 2'],
  ['H6', 'M3: ekspor INT8; `/v1/screen` (EXIF, gate, blur); deteksi nyata di alur warga', 'Konten 4 klaim kebaruan', 'Hitung ESAL dari survei (VDF MDP)'],
  ['H7', 'M4: SLM INT4 di NPU + pemeriksa; `/v1/brief`; matikan Gemini', 'Uji internal alur warga → verifikasi', 'Foto layar untuk klasifikasi adegan (Add-on)'],
  ['H8', 'M5: benchmark CPU/GPU/NPU di laptop wawancara; Halaman Bukti; O1', 'M6: deploy PWA publik; sebarkan ke komunitas', 'Mulai pilot live; pantau laporan'],
  ['H9', 'M6: gabung duplikat; REFERRED; SLA', 'Uji pengguna SUS sesi 1', 'Peringkat buta oleh 2–3 insinyur/dosen'],
  ['H10', 'M6: optimasi anggaran K2–K3; peta keadilan K4; PDF berpenafian', 'Uji SUS sesi 2', 'Hitung Spearman, SUS, presisi laporan'],
  ['H11', 'M6: mode lapangan offline E1; Playwright golden path', 'Isi Bagian 9 dengan bukti; slide hasil', 'Model Card + inventaris data'],
  ['H12', 'Add-on bila semua Wajib lulus (active learning, RAG); perbaiki bug', 'Latihan demo #1, #2', 'Lembar GenAI final'],
  ['H13', 'Bekukan fitur; rekam video demo penuh; cadangan model + data di dua tempat', 'Wawancara simulasi 20 menit dengan mentor', 'Cetak checklist hari-H'],
  ['H14', 'Hanya perbaikan kritis', 'Latihan terakhir; cek perangkat', 'Cek lokasi, cahaya, audio'],
])}
${H2('s8-3', '8.3 Rencana darurat 7 hari')}
${T(['Hari', 'Wajib selesai', 'Versi minimal yang dapat diterima'], [
  ['D1', 'M0 penuh; slide "apa yang kami temukan dan perbaiki"', '—'],
  ['D2', 'M1: MLET PyMastic tersambung ke UI insinyur; tes acuan', 'Tanpa roda ganda bila waktu habis (sebutkan)'],
  ['D3', 'M3: YOLO RDD2022 + ≥ 100 foto lokal; INT8; deteksi nyata di alur warga', 'Lubang saja bila 4 kelas belum stabil (sebutkan)'],
  ['D4', 'M2: PI-surrogate + MC + Indeks Umur; EXIF + blur wajah', 'Surrogate FP16 tanpa INT8'],
  ['D5', 'M4 + M5: SLM di NPU + pemeriksa; benchmark CPU/GPU/NPU; Halaman Bukti', 'SLM di CPU bila NPU gagal — **laporkan apa adanya**'],
  ['D6', 'M6: PWA live; uji pengguna ≥ 5 orang; rekam demo cadangan', 'URL publik + statistik apa adanya'],
  ['D7', 'Latihan wawancara penuh dua kali', '—'],
])}
${P('Ditunda bila waktu tidak cukup (sebut RENCANA): klasifikasi adegan, optimasi anggaran (tampilkan antrian skor saja), RAG, hitung video, active learning.')}
${H2('s8-4', '8.4 Paket bukti (folder yang harus siap dibuka saat wawancara)')}
${T(['Folder `evidence/`', 'Isi', 'Milestone', 'Status 16 Okt'], [
  ['00_readme.md', 'Indeks bukti + tanggal + hash commit', 'M7', '[[BELUM]]'],
  ['01_sources/', 'PDF/tangkapan layar semua sitasi Lampiran A', 'M0', '[[BELUM]]'],
  ['02_audit/', 'Audit forensik, audit rubrik 16 Okt, daftar temuan yang ditutup (commit per temuan)', 'M0', '[[SEBAGIAN]] (`docs/audit/`)'],
  ['03_mlet_verification/', 'Tes 303/793 µε, kesebangunan, perbandingan grid', 'M1', '[[BELUM]]'],
  ['04_surrogate/', 'Log pelatihan, metrik acak + OOD, ablasi, file model + hash', 'M2', '[[BELUM]]'],
  ['05_yolo/', 'Data card, kurva latih, mAP per kelas/kondisi, FP32 vs INT8', 'M3', '[[BELUM]]'],
  ['06_trust_privacy/', 'FAR/FRR, recall pengaburan, contoh sebelum/sesudah (dikaburkan)', 'M3', '[[BELUM]]'],
  ['07_slm/', '50 kasus uji, % lolos pemeriksa, token/detik per perangkat', 'M4', '[[BELUM]]'],
  ['08_benchmarks/', '`measurements/*.json` + keluaran `benchmark_app` mentah + `devices.txt`', 'M5', '[[BELUM]]'],
  ['09_field/', 'Formulir hitung lalu lintas, ESAL, foto survei (tanpa wajah)', 'M2–M3', '[[BELUM]]'],
  ['10_users/', 'SUS mentah + ringkasan, peringkat buta + Spearman, catatan wawancara pengguna', 'M7', '[[BELUM]]'],
  ['11_pilot/', 'Statistik laporan live, tangkapan layar status warga', 'M6–M7', '[[BELUM]]'],
  ['12_ethics/', 'Register risiko, siklus data, Model Card, lisensi', 'M7', '[[SEBAGIAN]] (dokumen ini)'],
  ['13_genai_disclosure.md', 'Lembar pengungkapan jujur', 'M0', '[[BELUM]]'],
  ['14_demo_backup.mp4', 'Rekaman demo penuh', 'M7', '[[BELUM]]'],
  ['15_idr/', 'Email penyelenggara, sertifikat materi Intel', 'M0', '[[BELUM]]'],
])}
${H2('s8-5', '8.5 Definition of Done untuk demo')}
${UL([
  '☐ Tidak ada angka di layar dari konstanta atau `Math.random` (tes CI lulus).',
  '☐ Foto baru dari ponsel melewati gate, dikaburkan, dideteksi model berversi, masuk antrian dengan skor yang dapat dijelaskan.',
  '☐ Penilaian struktural: εt/εv dari PyMastic, Indeks Umur P10/P50/P90, kriteria tercantum, label "indikatif".',
  '☐ Laptop dengan Wi-Fi mati tetap dapat menilai dan menulis ringkasan di NPU.',
  '☐ Halaman Bukti menampilkan benchmark nyata (nama perangkat, versi OpenVINO, tanggal).',
  '☐ Semua tes (npm + pytest + Playwright) hijau; rekaman demo cadangan tersimpan lokal.',
])}
${H2('s8-6', '8.6 Register risiko eksekusi (baru)')}
${T(['Risiko', 'Kemungkinan', 'Dampak', 'Mitigasi', 'Pemicu keputusan'], [
  ['Laptop dengan NPU tidak tersedia', 'Sedang', 'Tinggi (M03 2.2, 3.2; demo NPU)', 'Pinjam sejak H1; mode CPU/iGPU tetap diukur', 'Belum ada pada H3 → proyeksi ulang tanpa NPU (D-21)'],
  ['Perubahan API OpenVINO/Ultralytics/NNCF', 'Tinggi', 'Sedang', 'Kunci versi di `requirements.lock`; uji skrip BELUM DIUJI lebih awal (H2)', 'Gagal > 1 hari → pakai FP16 tanpa INT8, laporkan'],
  ['PyMastic NaN/instabilitas', 'Sedang', 'Tinggi', '`iteration=20`, normalisasi a, tolak NaN; kunci hash commit', 'Tes acuan gagal → berhenti, tanya mentor'],
  ['Foto lokal terlalu sedikit', 'Sedang', 'Sedang', 'Mulai H2; relawan komunitas; RDD2022 sebagai dasar', '< 100 foto pada H5 → lapor apa adanya, fokus kelas lubang'],
  ['mAP rendah', 'Tinggi', 'Rendah–sedang', 'Tunjukkan peningkatan setelah fine-tune, bukan angka absolut', '—'],
  ['Inferensi lambat saat demo', 'Sedang', 'Tinggi', 'Model di-compile & hangat 10 menit sebelum; data contoh tersimpan; rekaman cadangan', 'Gagal saat demo → putar rekaman'],
  ['Lisensi AGPL', 'Pasti (bila Ultralytics)', 'Sedang', 'Keputusan D-20 sebelum M3', '—'],
  ['Waktu tidak cukup', 'Tinggi', 'Tinggi', 'Urutan milestone menurut nilai rubrik; versi minimal; rencana darurat', 'Wawancara < 8 hari → 8.3'],
  ['Satu orang (developer) menjadi titik tunggal', 'Tinggi', 'Tinggi', 'Anggota lain memegang data, survei, uji pengguna, deck; dokumentasi per modul', '—'],
])}
`;
