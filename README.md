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
