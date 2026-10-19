import { T, KV, P, UL, OL, note, H1, H2, H3, badge } from './h.mjs';

export const sec2 = `
${H1('s2', '2 Masalah: Isu Sosial Global, Bukti, dan Urgensi')}
${P('Masalah dibingkai sebagai isu sosial global yang dapat diukur: kerusakan permukaan jalan yang terlambat ditangani melukai dan membunuh pengguna jalan rentan, terutama pengendara motor di negara berpendapatan rendah-menengah, dan diperparah hujan ekstrem serta truk bermuatan lebih. Negara-negara inilah yang paling sedikit memiliki data kondisi jalan untuk memutuskan perbaikan mana yang didahulukan. Narogong adalah laboratorium nyata untuk masalah global ini, bukan batasnya.')}
${note('Perbaikan dari audit (M01 2.2 = 1/3, 2.3 = 0/3)', P('Penyebab skor rendah bukan kurangnya data, tetapi sitasi tidak ada di repo/deck dan beberapa angka hanya bersumber media. v3.1: (1) setiap angka diberi status verifikasi; (2) sumber primer wajib diunduh ke `evidence/01_sources/` sebelum wawancara; (3) angka yang bertentangan antar sumber ditampilkan berdampingan, bukan dipilih yang paling dramatis.'))}
${H2('s2-1', '2.1 Rumusan masalah (empat pertanyaan rubrik)')}
${T(['Pertanyaan rubrik', 'Jawaban (siap diucapkan)'], [
  ['Apa masalahnya?', 'Lubang dan retak struktural terdeteksi terlambat dan diperbaiki tanpa urutan berbasis risiko. Pemerintah daerah tidak punya data kondisi struktural yang murah dan cepat, sehingga perbaikan reaktif: menambal setelah viral atau ada korban, lalu tambalan gagal lagi saat musim hujan karena penyebab strukturalnya (beban berlebih, tanah dasar basah) tidak ditangani.'],
  ['Di mana?', 'Global: 92% kematian lalu lintas terjadi di negara berpendapatan rendah-menengah [1]. Indonesia: sebagian besar jaringan jalan adalah jalan kabupaten/kota (81,4% pada data BPS 2022 [11]) yang dikelola pemerintah dengan kapasitas survei paling kecil. Pilot: Jalan Raya Narogong (Bekasi–Bogor), arteri industri dengan truk berat dan genangan; koridor 2 Karawang Klari–Jatisari.'],
  ['Mengapa sekarang?', 'Target global menurunkan kematian lalu lintas 50% pada 2030 [1][3]; kebijakan Zero ODOL ditargetkan efektif 1 Januari 2027 dengan uji coba sepanjang 2026 [13]; jalan nasional tidak mantap tercatat naik pada Semester I 2025 [10]; musim hujan (±Oktober–April) adalah periode lubang terbentuk dan tertutup genangan.'],
  ['Bagaimana mengatasinya?', 'Menjadikan warga sensor yang diverifikasi AI, menilai dampak struktural dengan fisika pada kondisi basah dan beban nyata, lalu memberi petugas daftar perbaikan berbasis risiko yang dapat dijelaskan dan dioptimalkan terhadap anggaran, di laptop Intel yang terjangkau, juga offline di lapangan.'],
])}
${H2('s2-2', '2.2 Bukti global (dengan sitasi dan status verifikasi)')}
${T(['Fakta', 'Angka', 'Sumber', 'Status'], [
  ['Beban kematian lalu lintas', '±1,16 juta kematian/tahun; 20–50 juta cedera non-fatal; biaya ±3% PDB sebagian besar negara', 'WHO fact sheet, 20 Juli 2026 [1]', '[[TERVERIFIKASI]]'],
  ['Ketimpangan global', '92% kematian di negara berpendapatan rendah-menengah yang memiliki ±60% kendaraan dunia', 'WHO 2026 [1]', '[[TERVERIFIKASI]]'],
  ['Pengguna rentan', 'Lebih dari separuh kematian adalah pengguna rentan (pejalan kaki, pesepeda, pemotor); penyebab kematian utama usia 5–29 tahun', 'WHO 2026 [1]; GSRRS 2023 [2]', '[[TERVERIFIKASI]]'],
  ['Target waktu', 'Menurunkan kematian dan cedera lalu lintas 50% pada 2030 (SDG 3.6; Dekade Aksi 2021–2030)', 'A/RES/74/299 [3]; WHO [1]', '[[TERVERIFIKASI]]'],
  ['Lubang jalan sebagai penyebab kematian (India)', '1.481 (2021) → 1.856 (2022)', 'MoRTH via DT Next [4]', '[[TERVERIFIKASI SEKUNDER]]'],
  ['Negara maju tertinggal (Inggris & Wales)', 'Backlog perbaikan jalan lokal £18,62 miliar', 'ALARM Survey 2026 via Fleet World [5]', '[[TERVERIFIKASI SEKUNDER]]'],
  ['Amerika Serikat', 'Nilai jalan D+ (ASCE 2025)', 'ASCE Report Card 2025 [6]', '[[PERLU CEK]]'],
  ['Biaya menunda pemeliharaan', 'US$1 pemeliharaan tertunda → biaya operasi kendaraan US$2–3', 'SSATP/World Bank [7]', '[[PERLU CEK]]'],
  ['Iklim', 'Frekuensi dan intensitas hujan lebat meningkat sejak 1950-an di sebagian besar daratan', 'IPCC AR6 WG1 SPM [8]', '[[TERVERIFIKASI]]'],
  ['Data lintas negara', 'RDD2022: 47.420 citra dari 6 negara, > 55.000 anotasi, 4 kelas utama', 'Arya dkk. [9]', '[[TERVERIFIKASI]]'],
])}
${H2('s2-3', '2.3 Bukti Indonesia dan koridor pilot')}
${T(['Fakta', 'Angka', 'Sumber', 'Status / catatan'], [
  ['Korban kecelakaan 2024 (tahunan)', '150.096 kecelakaan; 26.839 korban meninggal (2024). Kakorlantas menyebut penurunan 6,16% kecelakaan dan 19,8% korban meninggal pada 2025', 'Rilis akhir tahun Korlantas via JawaPos [12a]', '[[TERVERIFIKASI SEKUNDER]] — gunakan angka 2024 yang eksplisit; jangan menghitung sendiri angka 2025'],
  ['Pangsa sepeda motor', '74% dari ±111.000 kecelakaan (data s.d. Sept 2024) melibatkan roda dua; 60% korban pengendara roda dua', 'Kakorlantas via detikOto [12]', '[[TERVERIFIKASI SEKUNDER]] — angka parsial tahun'],
  ['Jalan nasional tidak mantap', '3.021,5 km pada Semester I 2025 (naik dari 2.227,5 km pada 2024)', 'Buku Kondisi Jalan Nasional Sem. I 2025 via kumparan [10]', '[[TERVERIFIKASI SEKUNDER]] — sumber lain: kemantapan 95,22% dari 47.604 km (Maret 2025) [10b]. Tampilkan dengan periode yang jelas; simpan buku aslinya'],
  ['Siapa mengelola jalan', 'Total 549.161 km (2022): kabupaten/kota 446.787 km (81,4%), provinsi 54.557 km, nasional 47.817 km', 'BPS via Katadata [11]; tabel BPS 2023 tersedia [11b]', '[[TERVERIFIKASI SEKUNDER]] — perbarui ke tabel BPS 2023'],
  ['Truk ODOL', 'Pemerintah menyebut ±Rp41–43 triliun/tahun untuk perbaikan jalan rusak akibat ODOL; Zero ODOL efektif 1 Jan 2027; uji coba terbatas 27 Jan–31 Mei 2026', 'Republika, Katadata, Bisnis [13]', '[[TERVERIFIKASI SEKUNDER]] — status Perpres per Feb 2026 belum terbit; cek ulang sebelum wawancara'],
  ['Koridor Narogong', 'Arteri industri dan jalur truk; lubang, genangan, penerangan minim; dijuluki "jalur tengkorak" di media', 'Opini dan berita [14][15]', 'Konteks saja. **Wajib dilengkapi:** status ruas dari SK penetapan, data kecelakaan Satlantas/Polres, foto lapangan tim'],
])}
${note('Tugas verifikasi sebelum wawancara (anggota ke-3, gerbang M0)', UL([
  'Buka setiap sumber di Lampiran A; simpan PDF/tangkapan layar ke `evidence/01_sources/` dengan tanggal akses.',
  'Unduh Buku Kondisi Jalan Nasional Sem. I 2025 dan rilis tahunan Korlantas 2024/2025 dari kanal resmi bila tersedia; ganti sitasi media dengan primer.',
  'Narogong: status ruas (nasional/provinsi/kabupaten-kota), data kecelakaan Polres, berita perbaikan terbaru.',
  'Jangan memakai angka Blueprint v1 tanpa sumber primer (mis. "10–12% kecelakaan dari angkutan barang", "40% data uji kendaraan digital").',
]))}
${H2('s2-4', '2.4 Mengapa mendesak (bukti time-critical)')}
${UL([
  '**Tenggat global:** target 50% pada 2030 tinggal ±4 tahun [1][3].',
  '**Kebijakan nasional berjalan sekarang:** Zero ODOL efektif 1 Jan 2027, uji coba 2026 [13]; pemerintah butuh bukti segmen mana yang paling terdampak beban lebih. PAVEMENT-PINN menyediakan rasio ESAL aktual/normal per segmen (Modul E).',
  '**Tren kondisi:** jalan nasional tidak mantap naik pada Sem. I 2025 [10], padahal jalan nasional adalah kelas yang paling terawat; jalan kabupaten/kota lebih minim data.',
  '**Musiman:** lubang terbentuk dan memburuk pada musim hujan saat tanah dasar jenuh. Contoh perhitungan di 4.4 menunjukkan umur alur struktural turun ±4–5 kali saat CBR turun dari 6 ke 3 [[CONTOH DOKUMEN]].',
  '**Ekonomi:** menunda pemeliharaan menaikkan biaya pengguna jalan [7] [[PERLU CEK]].',
])}
${H2('s2-5', '2.5 Akar masalah: "siklus fatal"')}
<div class="loop">
  <div>Truk muatan lebih<br><small>daya rusak ∝ (beban)<sup>4</sup></small></div><div>Hujan + drainase buruk<br><small>tanah dasar melemah</small></div><div>Retak struktural<br><small>lalu lubang terbuka</small></div><div>Lubang tertutup genangan<br><small>pemotor terjatuh</small></div><div>Laporan tersebar<br><small>salah instansi, tanpa umpan balik</small></div><div>Data struktural tidak ada<br><small>survei mahal, jarang</small></div><div>Perbaikan reaktif<br><small>tambal yang viral dulu</small></div><div>Tambalan gagal lagi<br><small>penyebab tidak ditangani</small></div>
</div>
${P('Gambar 2.1 Siklus fatal. v3 memutus siklus di empat titik: verifikasi laporan dan pengarahan ke instansi yang benar (Modul A, D-17); data struktural murah dari fisika (Modul D); beban dari hitungan kendaraan (Modul E); urutan perbaikan berbasis risiko dan anggaran (Modul F).')}
${H2('s2-6', '2.6 Solusi yang sudah ada dan celahnya')}
${T(['Pendekatan', 'Kekuatan', 'Celah', 'Posisi PAVEMENT-PINN'], [
  ['Survei visual manual / IRMS', 'Standar resmi, menyeluruh', 'Mahal, jarang, sedikit di jalan kabupaten', 'Melengkapi di antara survei; data dapat diekspor'],
  ['FWD / survei struktural', 'Akurat secara struktural', 'Alat mahal, menutup lajur, titik-waktu', 'Tidak menggantikan FWD; penapis di mana FWD paling diperlukan'],
  ['Kanal aduan umum (LAPOR!, aplikasi kota)', 'Partisipasi warga', 'Tidak memverifikasi foto, tidak menilai struktur, tidak memprioritaskan', 'Menambah verifikasi AI, penilaian struktural, prioritas'],
  ['Deteksi dari kamera kendaraan (mis. Xweather RoadAI [16])', 'Cakupan luas', 'Langganan komersial, butuh armada, fokus permukaan', 'Berbasis warga, murah, menambah analisis struktural dan beban, offline, open source'],
  ['Model AI murni (black-box) untuk umur jalan', 'Cepat', 'Butuh data berlabel besar; dapat tidak masuk akal secara fisika', 'Fisika sebagai acuan; AI untuk persepsi, percepatan ketidakpastian, komunikasi'],
])}
${H3('Kebaruan yang dapat dipertahankan (empat klaim, bukan sepuluh)')}
${OL([
  '**Dari foto warga ke risiko struktural** dalam satu alur yang dapat diaudit.',
  '**Surrogate fisika dengan ketidakpastian di edge:** kesebangunan elastis terpenuhi pasti oleh konstruksi; ribuan simulasi per segmen di laptop Intel untuk P10–P90.',
  '**Keputusan di bawah batas anggaran yang dapat dijelaskan:** skor risiko transparan + optimasi paket + koreksi keadilan cakupan.',
  '**Tata kelola bawaan:** pengaburan privasi, pemeriksa angka GenAI lokal, persetujuan manusia, jejak audit, pelacakan status untuk warga.',
])}
`;

export const sec3 = `
${H1('s3', '3 Solusi: Produk, Arsitektur, dan Peran')}
${H2('s3-1', '3.1 Nilai unik dalam satu paragraf')}
${P('Warga memotret kerusakan jalan dari browser ponsel tanpa memasang aplikasi. Photo Trust Gate dan model YOLO terkuantisasi di perangkat Intel memverifikasi foto, mengaburkan wajah dan pelat, lalu mengklasifikasi jenis dan keparahan kerusakan. Untuk setiap segmen, mesin fisika (PyMastic sebagai acuan dan surrogate jaringan saraf berbasis fisika untuk simulasi massal) menghitung regangan kritis dan Indeks Umur Struktural Indikatif pada kondisi kering dan basah serta beban lalu lintas, lengkap dengan rentang ketidakpastian. Operator melihat antrian berdasarkan skor risiko yang dapat dijelaskan, insinyur membandingkan opsi perbaikan di lapangan tanpa internet, perencana mendapat paket perbaikan yang memaksimalkan pengurangan risiko dalam anggaran. Model bahasa kecil di NPU menulis ringkasan per peran dari angka yang diisi kode; setiap tindakan disetujui manusia dan tercatat.')}
${H2('s3-2', '3.2 Arsitektur v3.1')}
<div class="arch">
  <div class="lane"><div class="lh">Lapis 1 · Ponsel warga (PWA, tanpa instal)</div>
    <div class="boxes"><div>Kamera + GPS<br><small>kompres ≤ 500 KB</small></div><div>Cek awal di ponsel<br><small>blur, gelap, akurasi GPS</small></div><div>Kode pelacakan<br><small>status + instansi</small></div><div>Peta bahaya publik<br><small>tanpa data pelapor</small></div><div>Konfirmasi warga<br><small>masih ada / sudah diperbaiki</small></div></div></div>
  <div class="lane"><div class="lh">Lapis 2 · Layanan inferensi Python (FastAPI, <code>inference/</code>) di perangkat Intel</div>
    <div class="boxes"><div>A Trust Gate<br><small>CPU</small></div><div>B Privasi<br><small>EXIF, blur · OpenVINO CPU</small></div><div>C YOLO 4 kelas<br><small>OpenVINO INT8 · CPU/iGPU</small></div><div>D1 MLET PyMastic<br><small>Python · CPU</small></div><div>D2 PI-surrogate + MC<br><small>OpenVINO FP16/INT8 · CPU/iGPU</small></div><div>E Beban lalu lintas<br><small>VDF MDP 2017</small></div><div>G SLM lokal<br><small>OpenVINO GenAI INT4 · NPU</small></div><div>H Active learning<br><small>registri model</small></div></div></div>
  <div class="lane"><div class="lh">Lapis 3 · Keputusan dan tata kelola (Express API yang sudah ada)</div>
    <div class="boxes"><div>Operator<br><small>antrian skor (F), SLA, setujui</small></div><div>Insinyur<br><small>koreksi, penilaian, opsi, verifikasi</small></div><div>Perencana<br><small>anggaran, keadilan, KPI</small></div><div>Tata kelola<br><small>RBAC, audit, retensi</small></div><div>Halaman Bukti<br><small>/v1/measurements</small></div></div></div>
</div>
${P('Gambar 3.1 Arsitektur hibrida. Lapis 1 butuh internet (laporan dapat antri offline, M6). Lapis 2 berjalan di server CPU Intel untuk laporan warga dan di laptop Core Ultra untuk mode lapangan offline. Lapis 3 memakai state machine, RBAC, dan audit trail yang sudah terbukti.')}
${T(['Lapisan', 'Teknologi', 'Status 16 Okt', 'Catatan keputusan'], [
  ['Frontend', 'React 19 + Vite (ada), PWA + Service Worker, Leaflet/MapLibre 2D', '[[TERBUKTI]] (tanpa PWA)', 'Tidak pindah stack (AGENTS.md)'],
  ['API alur kerja', 'Express, state machine, RBAC, audit trail', '[[TERBUKTI]]', 'Tambah rute proxy ke layanan inferensi'],
  ['Layanan inferensi', 'Python 3.11/3.12 + FastAPI, OpenVINO Runtime, OpenVINO GenAI, NNCF, PyMastic, NumPy/SciPy, scikit-learn + sklearnex', '[[BELUM ADA]]', 'D-23; kontrak 4.9'],
  ['Pelatihan', 'PyTorch (XPU bila GPU Intel tersedia), Ultralytics YOLO', '[[BELUM ADA]]', 'Log perangkat pelatihan = bukti lifecycle'],
  ['Penyimpanan', 'Supabase (migrasi ada) **atau** satu VM + file store + cadangan', 'Lokal saja', 'Pilih satu sebelum M6 (D-18)'],
  ['Perangkat', 'Ponsel warga; laptop Core Ultra (CPU + Arc iGPU + NPU); VM CPU Xeon', 'Belum terdokumentasi', 'Gerbang D-21'],
])}
${H2('s3-3', '3.3 Alur ujung-ke-ujung (state machine)')}
<div class="flow"><span>SUBMITTED<small>warga</small></span><span>SCREENED<small>A + B + C</small></span><span>TRIAGED<small>operator</small></span><span>INSPECTED<small>insinyur</small></span><span>RECOMMENDED<small>insinyur + D</small></span><span>APPROVED<small>operator ≠ perekomendasi</small></span><span>REPAIRED<small>work order</small></span><span>VERIFIED<small>insinyur + warga</small></span></div>
${P('Status samping: `REJECTED_WITH_REASON` (disimpan 30 hari untuk audit), `NEEDS_REVIEW` (keyakinan rendah), `MERGED` (duplikat), `REFERRED` (bukan kewenangan instansi ini). Status utama sudah ada di kode (`applyCommand` dengan penjaga peran dan versi); v3 menambah SCREENED, REJECTED_WITH_REASON, MERGED, REFERRED. Setiap transisi mencatat aktor, waktu, alasan, versi model. **AI tidak pernah mengubah status.**')}
${H2('s3-4', '3.4 Peran dan fitur (prioritas, tier, status, kriteria lulus)')}
${P('Prio: P0 wajib sebelum wawancara, P1 sangat dianjurkan, P2 bila waktu cukup. Tier v3.1: **W** = Wajib untuk demo, **N** = Bisa nanti, **A** = Add-on. "Versi minimal" = batas terkecil yang jujur dan dapat didemokan.')}
${H3('Peran 0: Warga (tanpa login)')}
${T(['ID', 'Fitur dan logika', 'Kriteria lulus', 'Prio / Tier', 'Status 16 Okt'], [
  ['W1', 'Lapor 3 langkah: URL/QR → kamera belakang → GPS (akurasi dicatat) → kirim; kompres sisi panjang 1280 px, JPEG q≈0,8', 'Median waktu lapor ≤ 60 detik pada 10 penguji; unggah median ≤ 500 KB', 'P0 / W', '[[SEBAGIAN]] (lapor foto ada; kompresi & ukur waktu belum)'],
  ['W2', 'Cek kualitas di ponsel: varians Laplacian + kecerahan di canvas; GPS > 30 m → tunggu', 'Foto buram buatan (n=30) ditolak di ponsel ≥ 90%', 'P1 / **W** (momen demo pertama)', '[[BELUM]]'],
  ['W3', 'Antrian offline: Service Worker + IndexedDB + idempotency key', 'Mode pesawat → online: terkirim tepat sekali', 'P1 / N', '[[BELUM]]'],
  ['W4', 'Kode pelacakan (mis. NRG-7K3Q) + halaman status tanpa data pribadi', 'Status sama dengan state machine (tes integrasi)', 'P0 / W', '[[SEBAGIAN]] (ID laporan + tampilan publik ada)'],
  ['W5', 'Peta bahaya publik: titik terverifikasi, tanpa waktu tepat/identitas; tombol "buka di Google Maps"', 'Tidak ada field pribadi di respons API publik (tes)', 'P0 / N', '[[SEBAGIAN]] (peta ada)'],
  ['W6', 'Konfirmasi "masih ada" / "sudah diperbaiki", 1 per perangkat per titik', 'Konfirmasi menaikkan komponen C skor (tes unit)', 'P1 / N', '[[BELUM]]'],
  ['W7', 'Aksesibilitas: ID/EN, tombol besar, WCAG AA, ARIA, siap bahasa daerah', 'Lighthouse Accessibility ≥ 90; uji kontras lulus', 'P1 / N', '[[SEBAGIAN]] (ID/EN ada)'],
])}
${H3('Peran 1: Operator Pemeliharaan (Satker/UPTD/Dinas)')}
${T(['ID', 'Fitur dan logika', 'Kriteria lulus', 'Prio / Tier', 'Status 16 Okt'], [
  ['O1', 'Antrian berurut skor risiko 0–100 (Modul F) dengan rincian kontribusi; bobot dapat diubah dan tercatat', 'Urutan berubah sesuai bobot; perubahan bobot tercatat', 'P0 / W', '[[BELUM]] (antrian ada, skor belum)'],
  ['O2', 'Gabung duplikat: ≤ 30 m, ≤ 7 hari + pHash', 'Uji 20 pasangan duplikat buatan: ≥ 18 tergabung', 'P1 / N', '[[SEBAGIAN]] (petunjuk jarak/waktu ada)'],
  ['O3', 'Tinjauan manusia NEEDS_REVIEW dengan alasan', 'Tidak ada laporan dibuang diam-diam (tes)', 'P0 / W', '[[TERBUKTI]]'],
  ['O4', 'Tugaskan + SLA per tingkat bahaya', 'SLA terlambat ditandai merah', 'P1 / N', '[[SEBAGIAN]] (penugasan + tenggat ada)'],
  ['O5', 'Setujui work order; perekomendasi ≠ penyetuju; label "bukan SPK"', 'Tes "self-approval forbidden" tetap lulus', 'P0 / W', '[[TERBUKTI]]'],
  ['O6', 'Pengarahan kewenangan → REFERRED', 'Laporan di segmen kewenangan lain → REFERRED', 'P1 / N', '[[BELUM]]'],
])}
${H3('Peran 2: Insinyur Lapangan (mode lapangan di laptop Intel)')}
${T(['ID', 'Fitur dan logika', 'Kriteria lulus', 'Prio / Tier', 'Status 16 Okt'], [
  ['E1', 'Mode lapangan offline: YOLO, PyMastic, surrogate, SLM lokal; sinkron dengan cek versi', 'Demo Wi-Fi mati: alur inspeksi lengkap berjalan', 'P0 / W (versi minimal: layanan inferensi lokal)', '[[BELUM]]'],
  ['E2', 'Verifikasi dan koreksi deteksi → label baru (Modul H)', 'Koreksi muncul di dataset ekspor (tes)', 'P0 / N', '[[BELUM]]'],
  ['E3', 'Penilaian struktural: εt, εv (PyMastic), Indeks Umur P10/P50/P90, sensitivitas, penampang regangan', 'εt, εv ≤ 1% dari PyMastic; P10 ≤ P50 ≤ P90; label "indikatif" terlihat', 'P0 / W', '[[BELUM]] (rumus lama)'],
  ['E4', 'Bandingkan 2–4 opsi perbaikan; biaya per tahun umur tambahan', 'Opsi lebih tebal/kaku tidak pernah memberi umur lebih rendah', 'P1 / N', '[[BELUM]]'],
  ['E5', 'Rekomendasi + ringkasan SLM; insinyur menyunting dan menyetujui', 'Semua angka di ringkasan lolos pemeriksa', 'P0 / W', '[[SEBAGIAN]] (rekomendasi ada; SLM belum)'],
  ['E6', 'Verifikasi perbaikan dengan foto sesudah', 'Kasus tidak bisa VERIFIED tanpa foto sesudah', 'P1 / N', '[[SEBAGIAN]] (verifikasi ada; foto wajib belum)'],
  ['E7', 'Flag kerusakan dini untuk investigasi (D-15)', 'Teks flag tanpa kata tuduhan (tes daftar kata)', 'P2 / A', '[[BELUM]]'],
])}
${H3('Peran 3: Perencana / Pengambil Kebijakan')}
${T(['ID', 'Fitur dan logika', 'Kriteria lulus', 'Prio / Tier', 'Status 16 Okt'], [
  ['K1', 'Dasbor KPI koridor dari data nyata pilot', 'Setiap angka dapat ditelusuri ke query (tes)', 'P0 / N (butuh data pilot)', '[[SEBAGIAN]] (layar kebijakan lama berlabel ILUSTRATIF)'],
  ['K2', 'Optimasi paket anggaran: knapsack DP ≤ 500 kandidat + pembanding serakah', 'DP ≥ serakah pada 100 kasus acak', 'P1 / N', '[[BELUM]]'],
  ['K3', 'Kurva anggaran vs titik bahaya tinggi tersisa', 'Kurva tidak naik saat anggaran naik', 'P1 / N', '[[BELUM]]'],
  ['K4', 'Peta keadilan cakupan (laporan/km)', 'Segmen tanpa laporan tetap tampil', 'P1 / N', '[[BELUM]]'],
  ['K5', 'Ringkasan kebijakan + PDF dengan blok status dan penafian per halaman', 'Tes snapshot penafian lulus', 'P0 / N', '[[SEBAGIAN]] (PDF ada; penafian per halaman perlu dicek)'],
  ['K6', 'Panel mitra pengawasan beban (baca saja)', 'Tidak ada tombol tindakan penegakan', 'P2 / A', '[[BELUM]]'],
])}
${P('**Administrator** (P1/N): konfigurasi koridor dan segmen (geometri, instansi, lapisan dengan asal-usul), registri model, retensi, ekspor audit.')}
${H2('s3-5', '3.5 Matriks peran dan keputusan')}
${T(['Keputusan', 'Warga', 'Operator', 'Insinyur', 'Perencana', 'AI / sistem'], [
  ['Laporan diterima?', 'mengirim', 'memutuskan bila ragu', '', '', 'menyaring + menjelaskan alasan'],
  ['Urutan penanganan', '', 'memutuskan', '', 'menetapkan bobot kebijakan', 'menghitung skor + rincian'],
  ['Diagnosis struktural', '', '', 'memutuskan', '', 'menghitung + ketidakpastian'],
  ['Opsi perbaikan', '', 'menyetujui', 'merekomendasikan', '', 'membandingkan opsi'],
  ['Paket anggaran', '', '', '', 'memutuskan', 'mengoptimalkan + skenario'],
  ['Perbaikan selesai?', 'mengonfirmasi', 'menutup kasus', 'memverifikasi', '', 'memeriksa foto sesudah'],
])}
${P('Prinsip: AI tidak pernah mengubah status kasus atau mengirim perintah. Semua transisi dilakukan manusia dan tercatat.')}
`;
