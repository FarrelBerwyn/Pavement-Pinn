import { T, KV, P, UL, OL, note, H1, H2, H3, pre, badge } from './h.mjs';

export const sec4 = `
${H1('s4', '4 Spesifikasi Teknis AI dan Fisika (untuk Developer)')}
${P('Bagian ini adalah kontrak kerja developer. Setiap modul memuat tujuan, algoritma, data, metrik, kriteria lulus, apa yang boleh diklaim, dan **status hari ini**. Kode referensi ada di Lampiran B (`docs/v3/_build/reference_code/`, salin ke `inference/core/`).')}
${note('Status kode referensi (dibaca jujur)', P('Paket referensi menandai `pavement_core.py`, `test_core.py`, `trust_gate.py`, `gen_mlet_dataset.py`, `mc_life.py` sebagai **DIUJI di lingkungan penyusun v3.0**, dan `train_pi_surrogate.py`, `train_yolo.py`, `slm_brief.py`, `bench_tools.py` sebagai **BELUM DIUJI**. Audit 16 Okt tidak dapat menjalankan satu pun karena Python belum terpasang di mesin yang diaudit. Bagi tim, **semua berstatus [[BELUM DIUJI]] sampai `python test_core.py` mencetak `ALL TESTS PASSED` di repo tim** (gerbang M1).'), 'warn')}
${H3('Prinsip desain yang tidak boleh dilanggar')}
${OL([
  '**Fisika adalah acuan, AI adalah percepatan dan persepsi.** Setiap angka struktural dapat dihitung ulang dengan PyMastic.',
  '**Tidak ada angka tanpa asal-usul.** Setiap keluaran menyimpan versi model, perangkat, input dan satuan, serta label `MEASURED | COMPUTED | DEFAULT | ASSUMED`.',
  '**Gagal dengan jujur.** Model tidak yakin atau input di luar rentang → sistem mengatakannya dan meminta manusia.',
  '**Deterministik.** Input sama → output sama, termasuk Monte Carlo (seed = hash id segmen + versi) (F-21).',
  '**Tidak ada laporan yang dibuang diam-diam.**',
])}
${H2('s4-1', '4.1 Modul A: Photo Trust Gate')}
${P('Tujuan: menolak foto yang tidak dapat dipakai dan menahan foto meragukan untuk ditinjau manusia, tanpa mengklaim "anti-spoofing sempurna" (F-17). **Status:** [[BELUM]]; logika dasar ada di `trust_gate.py` (referensi).')}
${T(['#', 'Pemeriksaan', 'Metode', 'Ambang awal (kalibrasi!)', 'Bila gagal', 'Tier'], [
  ['1', 'Tangkapan langsung', 'UI hanya membuka kamera; waktu tangkap klien vs terima server; EXIF dibaca sebelum dihapus', 'selisih ≤ 10 menit (antrian offline: waktu tangkap lokal bertanda sesi)', 'REVIEW', 'N'],
  ['2', 'Ketajaman', 'Varians Laplacian, abu-abu, sisi panjang 640 px', 'τ_blur ≈ 60 (tetapkan dari ROC 100 tajam vs 100 buram)', 'REJECT + alasan', 'W'],
  ['3', 'Pencahayaan', 'Rata-rata dan persentil 5/95 kecerahan', 'rata-rata 40–220', 'REJECT + alasan', 'W'],
  ['4', 'Lokasi', 'Buffer 50 m dari polyline koridor; akurasi GPS ≤ 30 m', 'di luar koridor → REFERRED bila wilayah instansi lain', 'REJECT / REFERRED', 'W'],
  ['5', 'Duplikat', 'pHash 64-bit + jarak geografis', 'Hamming ≤ 8, ≤ 30 m, ≤ 7 hari', 'MERGED', 'N'],
  ['6', 'Laju', 'Hash perangkat bergaram (diputar bulanan)', '≤ 5 laporan/jam', 'REVIEW', 'N'],
  ['7', 'Jenis adegan', 'Klasifikasi jalan/bukan jalan/foto layar (MobileNetV3-small, OpenVINO INT8)', 'p(jalan) ≥ 0,7 lolos; 0,4–0,7 REVIEW', 'REJECT / REVIEW', 'A'],
  ['8', 'Ada kerusakan?', 'Modul C tanpa deteksi keyakinan ≥ 0,25', '—', 'REVIEW', 'W'],
])}
${P('**Metrik:** FAR (foto buruk diterima) dan FRR (foto baik ditolak) pada set uji terpisah per kelas. [[TARGET]] FAR ≤ 5%, FRR ≤ 5% untuk buram/gelap; FAR foto layar ≤ 10%. Laporkan apa adanya bila tidak tercapai. **Klaim yang boleh:** "gerbang berlapis yang mengukur salah terima dan salah tolak; foto meragukan selalu ditinjau manusia; tidak ada laporan dibuang diam-diam." **Jangan:** "mendeteksi semua foto palsu".')}
${H2('s4-2', '4.2 Modul B: Privasi (pengaburan dan penghapusan)')}
${UL([
  '**Urutan wajib:** terima foto → hapus EXIF → kaburkan wajah dan pelat → simpan versi kabur → hapus foto mentah ≤ 7 hari (job terjadwal dengan log). Foto mentah hanya untuk peran insinyur selama periode itu.',
  '**Deteksi wajah/pelat:** model berlisensi jelas, mis. YuNet (OpenCV Zoo) untuk wajah; detektor pelat dari Open Model Zoo bila masih tersedia untuk versi OpenVINO yang dipakai — **cek ketersediaan dan lisensi sebelum M3**. Kotak diperbesar 20%, Gaussian blur kuat.',
  '**Peta publik tidak menampilkan foto.** Foto kabur hanya untuk peran internal.',
  '**Metrik:** recall pengaburan pada 50 foto uji berwajah/berpelat (hitung manual). [[TARGET]] ≥ 95%; foto yang lolos tanpa terkaburkan menjadi kasus regresi.',
  '**Versi minimal untuk demo (Wajib):** hapus EXIF di server + blur wajah; pelat menyusul bila model pelat tidak tersedia (sebutkan sebagai keterbatasan).',
])}
${H2('s4-3', '4.3 Modul C: Deteksi kerusakan (YOLO + OpenVINO)')}
${T(['Aspek', 'Spesifikasi'], [
  ['Kelas', 'Retak memanjang (D00), melintang (D10), buaya (D20), lubang (D40). Kelas lain RDD2022 dibuang.'],
  ['Data', 'RDD2022 (lisensi tercatat CC BY-SA 4.0 di katalog sekunder — **verifikasi di halaman resmi** dan cantumkan atribusi) [9] + foto lokal koridor. [[TARGET]] ≥ 300 foto lokal berlabel (ideal 500), ≥ 30% basah/sore/malam, diambil dengan persetujuan. Versi minimal demo: ≥ 100 foto lokal.'],
  ['Pelabelan', 'CVAT atau Label Studio; dua anotator pada 20% sampel (IoU ≥ 0,5; Cohen κ untuk keparahan); `docs/labeling_guide.md`.'],
  ['Pembagian data', 'Per lokasi/segmen dan hari pengambilan, bukan acak per foto. Set uji lokal ≥ 100 foto yang tidak pernah dilatih.'],
  ['Model', 'Ultralytics YOLO nano/small (mis. YOLO11n atau YOLO26n), imgsz 640, ±100 epoch, seed tetap. Lisensi AGPL-3.0 → D-20.'],
  ['Perangkat latih', 'Prioritas PyTorch XPU di GPU Intel (Arc/iGPU) atau Intel Tiber AI Cloud; catat `torch.xpu.get_device_name()`. Bila memakai GPU lain, ungkapkan; poin lifecycle Intel berkurang.'],
  ['Ekspor', 'Ultralytics ≥ 8.4.80: `model.export(format="openvino", quantize=8, data=...)`; argumen lama `int8=True` masih diterima dengan peringatan deprecation [20]. Kuantisasi INT8 = NNCF post-training dengan data kalibrasi lokal.'],
  ['Keparahan', 'Aturan transparan dari rasio luas kotak; panduan foto di UI (±2 langkah, kamera ±45°). Ambang awal: lubang < 0,5% Low, 0,5–2% Medium, > 2% High; buaya < 2%, 2–8%, > 8%; memanjang/melintang < 15%, 15–40%, > 40% lebar citra. Kalibrasi ulang ke κ label konsensus.'],
  ['Metrik wajib', 'mAP@0,5 dan mAP@0,5:0,95 per kelas pada set uji lokal; FP32 vs INT8; per kondisi; latensi p50/p95 per perangkat; κ keparahan.'],
  ['Kriteria lulus', 'Model berversi `yolo-rdd-local@YYYYMMDD+hash` dimuat layanan; keyakinan yang tampil berasal dari model; penurunan mAP INT8 dilaporkan apa adanya; UI warga tanpa nama model/persen.'],
])}
${note('Ekspektasi realistis', P('Model deteksi kerusakan jalan publik umumnya mencapai mAP@0,5 kisaran sedang, terutama lemah pada retak tipis; lubang biasanya paling mudah. Jangan menargetkan angka tinggi di slide. Targetkan peningkatan terukur setelah fine-tune lokal dan tunjukkan kurva "mAP vs jumlah foto lokal".'))}
${H2('s4-4', '4.4 Modul D: Mesin struktural (MLET + PI-surrogate + Indeks Umur)')}
${H3('D1. Acuan fisika: teori elastis berlapis (MLET) dengan PyMastic')}
${P('Asumsi: lapisan linear-elastis, isotropik, homogen, antarmuka terikat penuh, beban lingkaran seragam tekanan q (default 0,55 MPa), tanah dasar setengah ruang. Keluaran: εt di dasar lapis aspal (retak lelah) dan εv di puncak tanah dasar (alur struktural). PyMastic berlisensi Apache-2.0 dan README-nya membandingkan hasil dengan KENPAVE dan WESLEA [18]. Catatan risiko: repositori PyMastic terakhir diperbarui 2020; kunci versinya dengan hash commit dan uji tiap pembaruan.')}
${note('Verifikasi silang dari v3.0 [[CONTOH DOKUMEN]]', P('Segmen default (AC 100 mm/2500 MPa; base 150 mm/200 MPa; CBR 6 → 60 MPa; ν 0,35/0,35/0,45; 4 ban terisolasi 0,55 MPa): εt = 303 µε, εv = 793 µε pada sumbu 10 t; 274/663 µε pada 8,16 t; sama dengan solver independen audit. Uji kesebangunan: semua modulus × 3 → regangan ÷ 3. Mesin lama memberi 20/17 µε. **Tim wajib menjalankan ulang (`test_core.py`) sebelum menyebutnya** — gerbang M1.'))}
${UL([
  'PyMastic mengalikan E dengan 1000: bila E dalam MPa, berikan q dalam kPa (0,55 MPa → 550).',
  'Konvensi tanda: tekan positif → `εt = −Strain_R`.',
  'Normalisasi panjang dengan jari-jari kontak a; pakai `iteration=20` (40 menghasilkan NaN pada ±45% struktur tebal di uji v3.0). Selalu periksa NaN dan tolak.',
  'Roda ganda: hitung di x = 0, d/2, d (d default 330 mm, dapat disunting), superposisikan, ambil maksimum.',
])}
${H3('D2. PI-surrogate: jaringan saraf berbasis fisika')}
${P('**Mengapa perlu?** Keputusan jujur butuh ketidakpastian: Monte Carlo 2.000 sampel × 3 kondisi × 4 opsi × 200 segmen = 4,8 juta evaluasi. Dengan MLET (±13 ms/kasus pada uji v3.0 [[CONTOH DOKUMEN]]) ±17 jam CPU; surrogate memungkinkan ini interaktif di laptop. Waktu nyata **wajib diukur ulang** di perangkat tim (M5).')}
${OL([
  '**Analisis dimensi (pasti):** x = [ln(h1/a), ln(h2/a), ln(E1/E3), ln(E2/E3)], y = [ln(εt·E3/q), ln(εv·E3/q)] → kesebangunan elastis dan kelinearan terhadap q terpenuhi apa pun bobotnya; regangan selalu positif.',
  '**Loss monotonisitas pada titik kolokasi (autograd):** L = MSE + λ_m·mean(ReLU(−s_jk·∂y_k/∂x_j)²), λ_m ≈ 0,1. Aktifkan hanya arah yang konsisten 100% pada data PyMastic (pemeriksaan B.9). Kandidat: εv turun bila h1, h2, E1/E3, E2/E3 naik; εt turun bila E2/E3 naik. Jangan paksa εt terhadap h1.',
  '**Pengaman:** di luar kotak domain latih atau uji silang acak 1-dari-50 berselisih > 10% → pakai PyMastic dan tandai.',
])}
${P('**Data latih:** 5.000–20.000 solusi PyMastic, Latin hypercube: sumbu 6–25 t, q 0,5–0,8 MPa, h1 50–250 mm, h2 100–400 mm, E1 1.000–5.000 MPa, E2 100–500 MPa, CBR 2–15 (E3 = k·CBR, k default 10 berlabel ASSUMED).')}
${P('**Validasi wajib:** (1) uji acak 20%: R², MAPE, galat p95; (2) uji di luar distribusi (latih CBR ≥ 4 dan h1 ≤ 180 mm; uji CBR < 3 atau h1 > 200 mm); (3) kesebangunan; (4) % titik kolokasi melanggar arah; (5) **ablasi** MLP biasa vs PI-surrogate. Simpan `models/pi_surrogate_metrics.json`.')}
${T(['Uji kelayakan v3.0 [[CONTOH DOKUMEN]] (1.978 solusi, MLP 3×64, sklearn, tanpa loss monotonisitas)', 'PI-surrogate (tanpa dimensi)', 'MLP biasa (input mentah)'], [
  ['Uji acak εt: R² / MAPE / galat p95', '0,998 / 1,6% / 3,7%', '0,998 / 1,4% / 4,0%'],
  ['Uji acak εv: R² / MAPE / galat p95', '0,9997 / 0,9% / 2,2%', '0,998 / 2,4% / 7,0%'],
  ['Di luar distribusi: MAPE εt / εv', '4,8% / 5,4%', '4,3% / 6,3%'],
  ['Kesebangunan: E × 3 → rasio regangan (harus 0,333)', 'tepat 0,333 (konstruksi)', 'median 0,283; rentang −1,66 s.d. 0,62'],
])}
${P('Cara membaca jujur: akurasi dalam rentang hampir sama; keunggulan yang terbukti adalah **konsistensi fisika** (tidak pernah regangan negatif atau melanggar kesebangunan) dan εv lebih akurat. Di luar distribusi galat p95 naik (±17–20%), sehingga pengaman wajib. Kalimat wawancara: "kami mengukur kapan surrogate boleh dipercaya dan kapan tidak."')}
${H3('D3. Dari regangan ke Indeks Umur Struktural Indikatif')}
${pre(`Asphalt Institute:  N_f = 0,0796 · εt^(−3,291) · E1^(−0,854)   [E1 psi, ε in/in]
                    N_d = 1,365×10⁻⁹ · εv^(−4,477)
Austroads (bentuk 2004): N_d = (9300/µεv)^7 ;  N_f = SF·[6918(0,856·Vb + 1,08) / (S_mix^0,36 · µεt)]^5
  → verifikasi konstanta dengan edisi Austroads / MDP 2017 yang disitasi
Indeks Umur (tahun): L = ln(1 + N·g / ESAL₀) / ln(1 + g),  N = min(N_f, N_d)·(1 − D_terpakai)
D_terpakai = Σ ESAL historis / N (Miner); 0 bila tahun pasang tidak diketahui → label ASSUMED`)}
${note('Peringatan kriteria (temuan v3.0)', P('Untuk segmen default roda ganda 8,16 t, kriteria alur Asphalt Institute memberi N_d ≈ 6,7×10⁴ sedangkan bentuk Austroads 2004 ≈ 1,5×10⁷ (±200×) [[CONTOH DOKUMEN]]. Maka: kriteria wajib dipilih dan disitasi, UI menampilkan kriteria, Indeks Umur dipakai untuk **membandingkan** segmen dan opsi, bukan meramal tanggal kegagalan.'), 'warn')}
${T(['Variabel Monte Carlo', 'Distribusi default (ASSUMED, dapat disunting)'], [
  ['Tebal aspal h1', 'Normal(nilai catatan, σ = 10 mm); tanpa catatan: Uniform(rentang standar kelas jalan) berlabel DEFAULT'],
  ['Modulus aspal E1', 'Lognormal(median katalog, CV 25%); penuaan bila umur > 5 tahun'],
  ['Modulus base E2', 'Lognormal(median, CV 30%)'],
  ['CBR tanah dasar', 'Lognormal(median catatan, CV 35%); basah: × faktor soaked/unsoaked (default 0,5; ganti dengan uji CBR rendaman bila ada)'],
  ['Lalu lintas', 'ESAL/hari dari Modul E sebagai P10–P90 (Triangular)'],
])}
${P('2.000 sampel per segmen per skenario, seed tetap. Keluaran: P10/P50/P90 dan sensitivitas (Spearman tiap input, diagram tornado). **Kriteria lulus:** P10 ≤ P50 ≤ P90; deterministik; kering → basah menurunkan umur; input searah fisika menggeser umur searah.')}
${H2('s4-5', '4.5 Modul E: Estimator beban lalu lintas (pengganti "Virtual WIM")')}
${pre(`ESAL/hari = Σ_kelas LHR_kelas × VDF_kelas ;  ESAL lajur/tahun = ESAL/hari × 365 × DD × DL
CESA(n, i) = ESAL lajur/tahun × R,  R = ((1 + i)^n − 1) / i   (bentuk MDP 2017)`)}
${UL([
  '**Data:** survei klasifikasi manual tim di koridor (minimal 2 × 12 jam hari kerja; ideal 3 × 24 jam) dengan formulir golongan Bina Marga. Video + YOLO hanya Add-on, verifikasi manual 10%, wajah/pelat tidak disimpan.',
  '**VDF:** tabel MDP 2017 untuk wilayah sesuai, versi beban normal dan aktual. Rasio aktual/normal = indikator dampak muatan lebih.',
  '**Contoh v3.0** (VDF ilustratif): 600 truk 2 sumbu, 250 truk 3 sumbu, 80 trailer/hari → ESAL normal 1.360/hari, aktual 2.930/hari, rasio 2,15 [[CONTOH DOKUMEN]]. Ganti dengan tabel MDP.',
  '**Tanpa survei:** data lalu lintas resmi terbaru berlabel ASSUMED. `esal.ts` yang ada tetap konstanta sumbu standar.',
  '**Kriteria lulus:** perhitungan dapat diulang dari formulir; DD, DL, i, VDF tercantum dengan sumber di layar.',
])}
${H2('s4-6', '4.6 Modul F: Skor prioritas dan optimasi anggaran')}
${pre(`Skor = 100 × ( w_H·H + w_S·S + w_C·C + w_Q·Q ),  default w = (0,5; 0,3; 0,1; 0,1)
H = min(1, b(kelas, keparahan) × [0,5 + 0,5·min(1, LHR_norm)·(0,6 + 0,4·pangsa_motor)] × (1,2 bila tanpa penerangan))
S = clip(1 − IndeksUmur_P50 / 10 tahun, 0, 1);  0,5 bila belum dinilai (berlabel)
C = 1 − exp(−n_konfirmasi_independen / 2);   Q = 1 bila segmen di bawah median laporan/km, selain itu 0`)}
${T(['b(kelas, keparahan)', 'Low', 'Medium', 'High', 'Alasan'], [
  ['Lubang', '0,4', '0,7', '1,0', 'Bahaya langsung bagi roda dua'],
  ['Retak buaya', '0,2', '0,4', '0,6', 'Calon lubang; urgensi utama lewat S'],
  ['Retak memanjang/melintang', '0,15', '0,15', '0,3', 'Bahaya rendah, jalan masuk air'],
])}
${P('Bobot ditetapkan kebijakan (tidak ada label "prioritas benar" untuk ML), ditampilkan per baris, perubahan tercatat. **Validasi:** 2–3 insinyur/dosen sipil memeringkat 15–20 titik secara buta; Spearman ρ dengan skor sistem. [[TARGET]] ρ ≥ 0,6. **Versi minimal demo:** skor dengan S = 0,5 berlabel "belum dinilai" sampai Modul D aktif.')}
${P('**Optimasi paket (K2):** maksimalkan Σ x_i·manfaat_i dengan Σ x_i·biaya_i ≤ Anggaran, x_i ∈ {0,1}; manfaat_i = Skor_i × fraksi_pengurangan_risiko(opsi) × min(1, umur_tambahan/5 tahun). DP tepat (biaya dibulatkan Rp1 juta, ≤ 500 kandidat) + pembanding serakah. Harga satuan dari HSPK daerah atau wawancara, berlabel ASSUMED bila belum.')}
${H2('s4-7', '4.7 Modul G: Model bahasa kecil lokal (NPU) dengan pemeriksa angka')}
${T(['Aspek', 'Spesifikasi'], [
  ['Model', 'Qwen2.5-1.5B-Instruct (tercantum didukung NPU sejak OpenVINO 2026.0 [19]) atau Phi-3.5-mini-instruct; bobot INT4: `optimum-cli export openvino --weight-format int4`. OpenVINO 2026.3 sudah tersedia dan menambah model NPU lain — pilih versi yang dikunci di `requirements.lock` dan catat. Periksa lisensi model.'],
  ['Runtime', '`openvino_genai.LLMPipeline(model_dir, "NPU")`; cadangan GPU lalu CPU. Greedy, `max_new_tokens` ±220.'],
  ['Input', 'Hanya JSON berskema (peran, kelas, keparahan, εt, εv, P10/P50/P90, kriteria, ESAL, opsi). Tidak pernah teks bebas warga (mencegah prompt injection).'],
  ['Angka diisi kode', 'SLM menulis placeholder `[ET] [EV] [L10] [L50] [L90] [ESAL]`; kode mengisi; `check_brief` menolak angka lain dan kata terlarang ("aman", "dijamin", "pasti", "korupsi", "lalai", "nakal").'],
  ['Gaya peran', 'Insinyur (teknis + kriteria), Operator (tindakan + SLA), Perencana (non-teknis). Label wajib: "Disusun AI dari data sistem. Perlu persetujuan manusia."'],
  ['Cadangan', 'Gagal 2× → templat statis. Tidak ada panggilan cloud. Gemini di `narrativeService.ts` dimatikan setelah M4.'],
  ['Metrik', '% lolos pemeriksa pada 50 kasus uji; kejelasan 1–5 oleh 3 penilai; token/detik dan latensi token pertama di NPU vs CPU vs GPU; memori puncak.'],
])}
${P('**Mengapa bukan "wrapper API":** model berjalan lokal di NPU, input dibatasi skema, angka dijamin kode, keluaran diverifikasi otomatis, dan sistem tetap berfungsi bila SLM dimatikan.')}
${P('**Add-on: "Tanya Pedoman" (RAG lokal).** Pertanyaan insinyur atas dokumen teknis publik (mis. MDP 2017) dengan embedding lokal (mis. Qwen3-Embedding-0.6B, didukung NPU sejak 2026.0 [19]), jawaban dengan kutipan halaman atau "tidak ditemukan di pedoman". Evaluasi 30 pertanyaan berkunci: hit@3 dan akurasi. Dengan OpenVINO GenAI atau OPEA. Ini satu-satunya jalan ke kriteria "OpenVINO GenAI/OPEA for RAG" di M03 3.3 — kerjakan hanya setelah semua Wajib lulus.')}
${H2('s4-8', '4.8 Modul H: Active learning dan registri model')}
${UL([
  'Setiap koreksi insinyur disimpan bersama versi model asal dan id foto kabur; ekspor mingguan ke format YOLO.',
  'Model baru dipromosikan hanya bila mAP set uji lokal tetap tidak turun. Simpan kurva "mAP vs jumlah foto lokal".',
  '`models/registry.json`: nama, versi, hash, tanggal, data latih, metrik, perangkat pelatihan, status. Model Card per model (6.3).',
  'Prioritas pelabelan: keyakinan 0,25–0,5 atau ketidaksepakatan model–insinyur (uncertainty sampling).',
])}
${H2('s4-9', '4.9 Model data dan kontrak API layanan inferensi')}
${T(['Tabel', 'Kolom penting (tambahan terhadap migrasi Supabase yang ada)'], [
  ['corridors', 'id, nama, geometri buffer, instansi_default, bahasa'],
  ['segments', 'id, corridor_id, geometri, instansi_pengelola, kelas_jalan, lapisan (jsonb: h_mm, E_mpa, nu, sumber, tanggal), cbr_median, cbr_sumber, tahun_pasang, lhr (jsonb + sumber)'],
  ['reports', 'id, kode_pelacakan, segment_id, lokasi, akurasi_gps_m, waktu_tangkap, hash_perangkat_bergaram, status, alasan'],
  ['photos', 'report_id, url_kabur, url_mentah (null setelah dihapus), dihapus_pada, phash'],
  ['trust_checks', 'report_id, blur_var, kecerahan, dalam_koridor, p_jalan, p_layar, keputusan, alasan, versi_model'],
  ['detections', 'report_id, kelas, kotak, keyakinan, keparahan, versi_model, perangkat, dikoreksi_oleh, koreksi'],
  ['assessments', 'segment_id, input (jsonb + satuan + asal-usul), et_ue, ev_ue, kriteria, umur_p10/p50/p90, d_terpakai, sensitivitas, metode, perangkat, label_status'],
  ['confirmations · priority_snapshots · traffic_counts', 'konfirmasi warga; skor + rincian + versi bobot; hitungan per golongan + metode + surveyor'],
  ['measurements', 'model, versi, perangkat, presisi, openvino_version, p50_ms, p95_ms, throughput, memori, akurasi, tanggal, file_log'],
  ['audit_log (ada)', '+ perubahan bobot, promosi model, penghapusan data'],
])}
${pre(`POST /v1/screen   multipart(image, lat, lon, gps_acc, captured_at)
  → {trust:{blur_var, brightness, in_corridor, p_road, p_screen, decision, reasons[]},
     privacy:{faces, plates, blurred_path}, detections:[{cls, conf, box, severity}],
     model_versions:{trust, yolo, privacy}, device}
POST /v1/assess   {segment_id, layers:[{h_mm,E_mpa,nu,source}], subgrade:{cbr,state},
                   traffic:{esal_day_p10,p50,p90, growth}, criterion:"AI"|"AUS", n_mc:2000, seed}
  → {mlet:{et_ue, ev_ue, method:"PyMastic@commit"}, life_years:{p10,p50,p90}, damage_used,
     sensitivity:{...}, surrogate:{version, in_domain, crosscheck_err}, status_label:"COMPUTED", device}
POST /v1/options  {segment_id, options:[{type, t_mm, E_mpa, unit_cost}]} → [{option, life_p50, cost, cost_per_year}]
POST /v1/brief    {role:"engineer"|"operator"|"planner", facts:{...}}
  → {text, checker:{ok, unmatched_numbers[], forbidden_words[]}, model, device, tokens_per_s}
GET  /v1/measurements → daftar hasil benchmark (sumber tunggal Halaman Bukti)
GET  /v1/health       → {python, openvino_version, available_devices[], models_loaded[]}`)}
${P('Express memanggil layanan lewat `INFERENCE_URL`; validasi skema di Express dan FastAPI; input di luar rentang ditolak 422, bukan di-clamp (F-28). `/v1/health` baru di v3.1 agar Halaman Bukti dapat menampilkan perangkat yang benar (F-12).')}
${H2('s4-10', '4.10 Daftar perbaikan kode dari audit (dengan status 16 Okt)')}
${T(['Temuan', 'Prio', 'Tindakan', 'Bukti selesai', 'Status', 'Milestone'], [
  ['F-01', 'P0', 'Ganti teks "PINN Solver/neural" di layar lama, README, PDF dengan status aktual; setelah M2 label "PI-surrogate vX (dilatih dari MLET)"', 'Tes grep CI', '[[SEBAGIAN]]', 'M0'],
  ['F-02, F-21', 'P0', 'Hapus `Math.random`/konstanta di jalur telemetri/loss/benchmark; "belum diukur"', 'grep kosong; payload deterministik', '[[SEBAGIAN]] (grep `Math.random` kosong di src/server)', 'M0'],
  ['F-03, F-09', 'P0', 'Ganti `runPinnSimulation` dengan `/v1/assess`; kontrak input penuh', 'Grid acuan ≤ 1% vs PyMastic; kesebangunan', '[[BELUM]]', 'M1'],
  ['F-04, F-13', 'P0', 'Hapus modal WIM training dan ekspor IR palsu', 'Rute 404', '[[SEBAGIAN]] (file dihapus, belum commit)', 'M0'],
  ['F-05', 'P0', 'Hapus klasifikasi kata kunci; "belum diklasifikasi" sampai Modul C', 'Keyakinan hanya bila modelStatus=REAL', '[[SEBAGIAN]]', 'M0/M3'],
  ['F-06', 'P0', 'Hapus ambang 180/200/250/350, banner "+22,5%", placeholder 245/380', 'Register ambang bersitasi', '[[PERLU CEK]]', 'M0'],
  ['F-07, F-18, F-22', 'P0', 'Hapus RUL/horizon/PCI proyeksi/overlay lookup/kerugian', 'Tidak ada field lama di API', '[[PERLU CEK]]', 'M1–M2'],
  ['F-08', 'P1', 'Satu konstanta sumbu 8,16 t', 'Tes lintas modul', '[[SEBAGIAN]]', 'M1'],
  ['F-10', 'P1', 'Ganti faktor hujan linear dengan kondisi kering/basah (CBR soaked)', 'Sumber atau ASSUMED', '[[BELUM]]', 'M2'],
  ['F-11, F-28', 'P1', 'Pensiunkan `/api/simulate`; validasi skema; tolak di luar rentang', 'Tes 400/422', '[[BELUM]]', 'M1'],
  ['F-12', 'P0', 'Deteksi perangkat hanya dari `core.available_devices`; browser "tidak diketahui"', 'Tes tanpa WebGL', '[[SEBAGIAN]] (README: tidak mengklaim NPU)', 'M5'],
  ['F-14', 'P0', 'Skrip benchmark mengisi `measurements/`', 'Register benchmark terisi', '[[BELUM]]', 'M5'],
  ['F-15', 'P0', '`DECISION_LOG.md` D-01..D-24; koridor Narogong', 'Laporan Narogong tidak OUT_OF_SCOPE', '[[BELUM]]', 'M0'],
  ['F-16', 'P0', 'Hapus "FWD Validated" dan stasiun WIM; inventaris data', 'Lampiran inventaris data', '[[PERLU CEK]]', 'M0'],
  ['F-17', 'P1', 'Modul A', 'FAR/FRR terukur', '[[BELUM]]', 'M3'],
  ['F-19', 'P0', 'PDF: blok status, sumber, penafian di setiap halaman; tanpa nama instansi', 'Tes snapshot PDF', '[[PERLU CEK]]', 'M0'],
  ['F-20', 'P0', 'Hapus persentase kontribusi acak', 'grep kosong', '[[PERLU CEK]]', 'M0'],
  ['F-23', 'P1', 'Komponen label status di setiap halaman keluaran model', 'Tes lint UI', '[[SEBAGIAN]]', 'M2'],
  ['F-24', 'P1', 'Migrasi Supabase atau VM + identitas nyata peran internal', 'Tes integrasi DB', '[[BELUM]]', 'M6'],
  ['F-25', 'P1', 'Ganti provider cuaca/lalu lintas demo dengan skenario + Modul E', 'Label sumber di layar', '[[BELUM]]', 'M2'],
  ['F-26', 'P2', 'Flag Kerusakan Dini (E7)', 'Tes daftar kata', '[[BELUM]]', 'Add-on'],
  ['F-27', 'P1', 'Tes acuan MLET di CI + Playwright golden path', 'CI hijau', '[[BELUM]]', 'M1, M6'],
  ['F-29, F-30, F-31', 'P2', 'Penampang dari input nyata; README/nama paket (`react-example`); whitelist parameter', 'Review', '[[BELUM]]', 'M2/M6'],
])}
`;
