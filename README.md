# PAVEMENT-PINN — Physics-Informed Neural Network Decision Support System

PAVEMENT-PINN, teknologi yang dibutuhkan sebenarnya bisa dibagi menjadi beberapa fungsi. Supaya gampang dipahami, bayangkan sistem ini seperti **“dokter untuk jalan”**: jalan adalah pasien, data kendaraan/cuaca adalah hasil pemeriksaan, PINN adalah dokter yang mendiagnosis, dan dashboard adalah hasil konsultasinya.

---

### 🌐 1. Web App / Dashboard

**Fungsi:** Tempat pengguna memasukkan kondisi jalan dan melihat hasil analisis.

> **Analogi Sederhana:** Seperti aplikasi dokter → kamu memasukkan keluhan pasien, lalu melihat hasil pemeriksaan.

**Contoh di PAVEMENT-PINN:**  
Pilih Jalan Pantura KM 62 → masukkan beban truk 22 ton → hujan 50 mm/jam → klik **Simulasi**.

---

### 🔐 2. RBAC — Role-Based Access Control

**Fungsi:** Memberikan tampilan dan informasi berbeda sesuai pengguna.

> **Analogi:** Seperti rumah sakit:
> - **Dokter:** melihat hasil pemeriksaan lengkap.
> - **Perawat:** melihat informasi yang diperlukan untuk tindakan.
> - **Direktur:** melihat statistik rumah sakit.

**Di PAVEMENT-PINN:**
- **Field Engineer:** detail teknis jalan (regangan asphalt, defleksi FWD, overlay).
- **Operations Manager:** alert truk ODOL real-time WIM.
- **Policy Maker:** proyeksi anggaran APBN 5 tahun dan kondisi jalan.
- **Masyarakat / Warga:** pelaporan kerusakan jalan & korelasi WIM.

---

### 🧠 3. PINN — Physics-Informed Neural Network

**Fungsi Utama:** Memprediksi bagaimana kondisi jalan berubah berdasarkan beban, cuaca, dan struktur jalan, sambil tetap mengikuti hukum fisika perkerasan.

> **Analogi Sederhana:** Bayangkan dokter yang bukan cuma melihat riwayat pasien, tapi juga memahami aturan kerja tubuh manusia.

```
Truk makin berat + Hujan makin deras + Tanah dasar lemah
                        ↓
                  PINN menghitung
                        ↓
          Risiko kerusakan jalan meningkat
```

PINN menggabungkan data lapangan + *physics loss*, sehingga prediksi tidak hanya berdasarkan pola data.

---

### ⚙️ 4. OpenVINO™

**Fungsi:** Membuat model AI bisa menjalankan prediksi dengan cepat dan efisien di perangkat Intel.

> **Analogi:**
> - **PINN** = Otaknya.
> - **OpenVINO** = Mesin yang membuat otak tersebut bekerja cepat.

**Contoh:**  
Petugas membawa laptop Intel ke jembatan timbang. Tidak perlu selalu mengirim data ke cloud. Model bisa melakukan inferensi langsung di perangkat.

Target inferensi **< 10 ms** per skenario, yang dibuktikan melalui benchmarking hardware Intel.

---

### 💻 5. Intel CPU / iGPU / NPU

**Fungsi:** Hardware untuk menjalankan AI.

> **Analogi:** Seperti mobil punya beberapa mode mesin:
> - **CPU:** mode umum / fallback.
> - **iGPU:** membantu workload tertentu.
> - **NPU:** dibuat khusus untuk workload AI yang efisien.

OpenVINO memungkinkan model diarahkan ke CPU, iGPU, atau NPU secara dinamis.

---

### 🚚 6. WIM — Weigh-in-Motion

**Fungsi:** Mengetahui beban kendaraan ketika kendaraan sedang berjalan.

> **Analogi:** Seperti timbangan otomatis di jalan.

**Contoh:**  
Truk lewat → sensor membaca beban sumbu → sistem mendapatkan 22 ton → data tersebut dikirim ke PAVEMENT-PINN.

Sistem tidak berhenti pada: *“Truk ini ODOL.”* tetapi menjawab:
> *“Kalau truk ini lewat terus, seberapa besar dampaknya terhadap jalan ini?”*

Data WIM digunakan sebagai input skenario PINN.

---

### 🌧️ 7. Data Cuaca

**Fungsi:** Mengetahui pengaruh hujan, genangan, dan temperatur terhadap kondisi jalan.

> **Analogi:** Seperti dokter mempertimbangkan lingkungan pasien.

**Contoh:**  
- Jalan normal + truk 20 ton → risiko sedang
- Jalan sama + truk 20 ton + hujan ekstrem → risiko lebih tinggi

Proposal memasukkan intensitas hujan, durasi genangan, dan suhu permukaan sebagai parameter lingkungan.

---

### 🛣️ 8. Data Struktur Jalan

**Fungsi:** Memberi tahu AI *“jalan ini terbuat dari apa dan sekuat apa”*.

**Parameter:**
- Ketebalan aspal
- Jenis campuran
- Modulus material
- CBR tanah dasar

> **Analogi:** Dua orang membawa beban yang sama, tetapi orang dengan kondisi fisik berbeda bisa mengalami dampak berbeda.

Begitu juga: **Truk 20 ton di jalan dengan struktur kuat ≠ truk 20 ton di jalan dengan tanah dasar lemah.**

---

### 📊 9. FWD / Data Historis

**Fungsi:** Memberikan data nyata untuk membantu melatih dan memvalidasi PINN.

> **Analogi:** Kalau PINN adalah dokter, FWD seperti hasil pemeriksaan laboratorium yang digunakan untuk memastikan diagnosisnya tidak asal.

Data FWD digunakan sebagai referensi untuk *data loss*.

---

### 🧮 10. Rule Engine

**Fungsi:** Mengubah hasil numerik AI menjadi keputusan sederhana berdasarkan aturan / threshold.

> **Analogi:** Seperti lampu lalu lintas:
> - Kondisi aman → 🟢
> - Mulai berisiko → 🟡
> - Berbahaya → 🔴

Operations Manager tidak perlu membaca tensor tegangan. Sistem cukup mengatakan:  
🔴 **BAHAYA** — beban kendaraan melebihi ambang untuk kondisi jalan saat ini.

---

### 🤖 11. Small Language Model / GenAI

**Fungsi:** Menerjemahkan angka teknis menjadi bahasa manusia yang mudah dipahami.

> **Analogi:** PINN berbicara dalam bahasa matematika, sedangkan GenAI menjadi penerjemahnya.

- **PINN:** `PCI = 62, εt = ..., εv = ...`
- **GenAI:** *“Kondisi ruas diperkirakan mengalami penurunan kualitas dalam 3 tahun ke depan. Penanganan preventif disarankan sebelum kerusakan meningkat.”*

Menggunakan SLM on-device, sehingga narasi dapat dibuat tanpa mengirim data infrastruktur sensitif ke cloud.

---

### 🗺️ 12. Visualisasi / Simulation Viewer

**Fungsi:** Memperlihatkan apa yang terjadi di dalam struktur jalan.

> **Analogi:** Seperti CT Scan, bukan cuma melihat kulit luar, tetapi melihat bagian dalam.

Visualisasi penampang melintang 2D/3D:  
`Truk → Aspal → Agregat → Tanah`  
sistem menunjukkan area dengan tegangan/deformasi tinggi.

---

### 📈 13. PCI Prediction

**Fungsi:** Memprediksi bagaimana kondisi jalan akan berkembang.

> **Analogi:** Bukan hanya *“Jalan ini rusak sekarang.”*, tetapi *“Kalau tidak diperbaiki, kira-kira kondisinya akan menjadi seperti apa 1–5 tahun ke depan?”*

Ini terutama berguna untuk Policy Maker dalam perencanaan fiskal & APBN.

---

### 📄 14. PDF / JSON Export

**Fungsi:** Membawa hasil analisis keluar dari dashboard.

> **Analogi:** Seperti dokter memberikan surat hasil pemeriksaan.

- **Engineer:** PDF desain overlay & FWD basin curve.
- **Operations:** laporan alert WIM / rekomendasi penindakan.
- **Policy Maker:** executive report anggaran APBN.

---

### 🗺️ 15. GIS & Pemetaan Spasial — Leaflet

**Fungsi:** Menyajikan visualisasi geospasial interaktif untuk memetakan koridor jalan nasional, posisi stasiun sensor WIM, heatmap sebaran lubang jalan, dan titik laporan kerusakan masyarakat di seluruh Indonesia.

> **Analogi:** Seperti peta anatomi tubuh pada rekam medis digital — menunjukkan titik koordinat presisi organ mana yang mengalami peradangan dan seberapa luas kerusakannya.

- **Teknologi GIS Utama:** Menggunakan **Leaflet** (`L.map`, `L.tileLayer`, `L.featureGroup`, `L.divIcon`, `L.polyline`) sebagai pustaka dan *engine* GIS utama aplikasi.
- **Interaktivitas:** Leaflet menangani kontrol zoom, interaktivitas klik peta untuk penentuan koordinat laporan warga, animasi viewport (*flyTo* & *panTo*), rendering polyline koridor jalan nasional, klastering marker, serta visualisasi thermal heatmap kerusakan.
- **Korelasi Terpadu:** Setiap titik koordinat di peta Leaflet secara otomatis terhubung dengan data stasiun WIM terdekat dan menjadi input parameter bagi simulasi model PINN.

---

## 💡 Alur Ringkas Seluruh Teknologi

```
🚚 Truk → WIM (“Beratnya berapa?”)
🌧️ Cuaca (“Hujannya seberapa parah?”)
🛣️ Data Jalan (“Struktur jalannya sekuat apa?”)
                    ↓
                 🧠 PINN
   (“Kalau semua kondisi ini terjadi, apa yang terjadi pada jalan?”)
                    ↓
     ⚡ OpenVINO + Intel NPU/CPU/iGPU
   (“Hitung dengan cepat di perangkat.”)
                    ↓
              🧮 Rule Engine
   (“Ini aman, waspada, atau bahaya?”)
                    ↓
             🤖 SLM / GenAI
   (“Jelaskan hasilnya dengan bahasa manusia.”)
                    ↓
                 👥 RBAC
   (“Siapa yang melihat informasi ini?”)
                    ↓
👷 Engineer → Bagaimana memperbaiki?
Police / Operations → Kendaraan mana yang harus ditindak?
🏛️ Policy Maker → Jalan mana yang harus diprioritaskan dan berapa anggarannya?
```

Itulah inti **PAVEMENT-PINN**: bukan sekadar AI untuk mendeteksi jalan rusak, tetapi AI untuk memprediksi kerusakan dan mengubah prediksi tersebut menjadi keputusan yang tepat untuk setiap *stakeholder*.


---

## 🧭 Panduan Developer: Menjalankan, Struktur Kode, dan Rute

Bagian di atas menjelaskan konsep. Bagian ini menjelaskan kode yang ada di repositori.

### Menjalankan

```bash
npm install
```

```bash
npm run dev
```

Server Express dan Vite berjalan di `http://localhost:3000/PavementPinn/`.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan (Express dan Vite middleware) |
| `npm run lint` | pemeriksaan tipe (`tsc --noEmit`) |
| `npm test` | 106 tes otomatis: regresi dan audit matematis PINN, kontrak API, rute, RBAC, batas modul, status laporan, peta |
| `npm run build` | build produksi ke `dist/` (termasuk `404.html` untuk GitHub Pages) |
| `npm start` | menjalankan build produksi |

Variabel lingkungan opsional: `PORT` (bawaan 3000), `VITE_BASE_PATH` (bawaan
`/PavementPinn/`), `GEMINI_API_KEY` (hanya di server). Lihat `.env.example`.

### Struktur kode

```text
server/            backend Express: routes, controllers, services, repositories, integrations
src/app/           router, tabel rute, guard, provider, dua shell aplikasi
src/pages/         komposisi tingkat rute
src/features/      alur kerja per pemangku kepentingan (laporan warga, WIM, kebijakan, FWD, ...)
src/engines/       logika numerik (PINN) dan taksonomi computer vision, tanpa React
src/runtime/       deteksi perangkat keras dan benchmark OpenVINO (simulasi)
src/services/      klien API, PDF, pipeline WIM (simulasi)
src/components/    komponen bersama (peta, panel simulasi, kerangka halaman)
src/data/          data referensi dan data demonstrasi
src/types/         kontrak tipe, dipakai juga oleh server
tests/             tes unit, integrasi, dan validasi fisika
docs/              dokumentasi arsitektur, API, dan validasi
```

### Rute utama

`/dashboard/`, `/reports/`, `/roads/:roadId/`, `/login/`, `/settings/`,
`/engine/` (`pinn`, `simulation`, `fwd`, `prediction`),
`/computer-vision/` (`detection`, `history`),
`/engineering/`, `/operations/`, `/policy/`.

### Status kemampuan (penting untuk dibaca)

Agar tidak ada klaim yang berlebihan, status tiap kemampuan dicatat apa adanya:

- **Mesin PINN** saat ini adalah perhitungan deterministik berbentuk rumus tertutup
  (lihat `/engine/pinn/`). Jaringan saraf terlatih belum ada di repositori.
- **Telemetri OpenVINO, benchmark perangkat, ekspor model IR, klasifikasi computer
  vision, dan pipeline WIM Bina Marga** bersifat simulasi.
- **Login** adalah pemilih akun demo, bukan autentikasi. Backend belum memiliki otorisasi.
- **Tidak ada basis data**: laporan dan jejak audit tersimpan di memori dan hilang saat halaman dimuat ulang.

### Dokumentasi

| Dokumen | Isi |
|---|---|
| `docs/architecture/BASELINE_AUDIT.md` | kondisi repositori sebelum restrukturisasi |
| `docs/architecture/ROUTE_MAP.md` | semua URL, komponen, dan aturan akses |
| `docs/architecture/DEPENDENCY_MAP.md` | struktur akhir, aturan dependensi, tabel migrasi berkas |
| `docs/architecture/RBAC_MATRIX.md` | matriks peran terhadap rute dan aksi, serta batasannya |
| `docs/architecture/FEATURE_PRESERVATION_MATRIX.md` | status setiap fitur setelah restrukturisasi |
| `docs/api/API_INVENTORY.md` | kontrak keenam endpoint |
| `docs/validation/PINN_REGRESSION_REPORT.md` | rumus, konstanta, dan hasil regresi numerik |
| `docs/validation/RESTRUCTURE_TEST_REPORT.md` | perintah, hasil uji, celah verifikasi, dan cara rollback |
| `docs/validation/POST_RESTRUCTURE_HARDENING.md` | hasil pengerasan: perbaikan, keamanan backend, audit Git, daftar kesiapan |
| `docs/validation/PINN_VALIDATION_GAP.md` | celah validasi ilmiah: klasifikasi model, ambang regangan, data minimum yang dibutuhkan |
