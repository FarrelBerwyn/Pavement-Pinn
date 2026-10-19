# PAVEMENT PINN — FORENSIC GLOBAL GAP & BACKGROUND CONSISTENCY AUDIT REPORT
**Single Source of Truth (SSOT): M.O Dashboard (`/operations/`)**  
**Execution Date:** 18 Oktober 2026 | **Runtime Environment:** Port 3000 (PID 35944)  
**TypeScript Status:** 0 Errors (`npx tsc --noEmit` PASS) | **Test Suite:** 313/313 PASS (`npm test`)

---

## 1. EXECUTIVE SUMMARY & SSOT BASELINE SPECIFICATION

Sesuai mandat penyelidikan forensik, halaman **Dashboard Operations Manager (M.O) pada route `/operations/`** telah diukur secara langsung di browser aktif pada resolusi desktop standar (**1536 × 800** dan **1920 × 950**) menggunakan pembacaan DOM dan computed CSS aktual. Hasil pengukuran ini ditetapkan sebagai **Single Source of Truth (SSOT)** tanpa asumsi atau estimasi visual.

### Baseline Dimensional & Coordinate Metrics (M.O Dashboard `/operations/`)
| Komponen Layout | Dimensi / Koordinat Aktual | Computed Value | Keterangan SSOT |
|---|---|---|---|
| **Sidebar Desktop** | `x: 0, y: 0, w: 192px` | `width: 192px` (collapsed: `72px`) | Fixed-width desktop navigation (`#080E1B`, border `#202B3B`) |
| **Global Top Bar** | `x: 192px, y: 0, h: 56px` | `height: 56px` (`h-14`) | Floating top bar di atas workspace, border-b `#202B3B` |
| **Main Content Container** | `x: 192px, y: 56px` | `w: 1344px` (1536) / `1728px` (1920) | Mengisi sisa viewport tanpa `max-width`, `margin: 0` |
| **Page Gutter (Kiri/Kanan)** | `20px` (`px-5` / `var(--space-5)`) | `padding-left: 20px, padding-right: 20px` | Ruang bernapas seragam antara sidebar dan elemen pertama |
| **First Content Panel Start** | **`x = 212px, y = 76px`** | `212px = 192px (sidebar) + 20px (gutter)` | **TARGET KOORDINAT ABSOLUT SEMUA ROUTE** |
| **Sidebar-to-Content Gap** | **Tepat `20px`** | `bounding.x - sidebar.right = 20px` | **TIDAK BOLEH BERUBAH ATAU MELAR PADA ULTRA-WIDE** |
| **Content Max-Width** | `none` (`w-full min-w-0`) | Tidak menggunakan `max-w-7xl mx-auto` | Mencegah konten melar ke tengah viewport |
| **Gap Antar-Section** | `16px` – `20px` | `space-y-4` / `space-y-5` | Konsisten antar-kelompok kontrol |

### Baseline Color Token Hierarchy (Computed CSS Values)
| Semantik Token | Token Name | Hex Code | Computed RGB Value | Peruntukan Elemen |
|---|---|---|---|---|
| **Workspace Background** | `bg-workspace` | `#0D0F12` | `rgb(13, 15, 18)` | Latar utama aplikasi, canvas root, page container |
| **Main Panel** | `bg-panel` | `#12151A` | `rgb(18, 21, 26)` | Header panel, container besar, filter card, section wrapper |
| **Nested Card** | `bg-card` | `#181B20` | `rgb(24, 27, 32)` | Kartu item laporan, KPI tile, log row, kartu WIM |
| **Raised Surface** | `bg-raised` | `#1E2228` | `rgb(30, 34, 40)` | Dropdown portal, popover filter, pill tab aktif |
| **Subtle Border** | `border-line-subtle` | `#292D33` | `rgb(41, 45, 51)` | Outline pemisah card, header bottom line, input outline |
| **Active Border** | `border-line-active` | `#3A4048` | `rgb(58, 64, 72)` | Status fokus, active card border, accent line |
| **Primary Text** | `text-ink` | `#F0F1F3` | `rgb(240, 241, 243)` | Page title, label penting, KPI value |
| **Secondary Text** | `text-ink-2` | `#A0A6AF` | `rgb(160, 166, 175)` | Subtitle, instruksi, metadata waktu & koridor |
| **Muted Text** | `text-ink-3` | `#747C87` | `rgb(116, 124, 135)` | Timestamp sekunder, ID laporan, watermark |
| **Brand Yellow Accent** | `bg-[#E8B52B]` / `text-[#E8B52B]` | `#E8B52B` | `rgb(232, 181, 43)` | Primary action CTA, status active badge, indikator PINN |

---

## 2. ROOT CAUSE INVESTIGATION (PENYEBAB UTAMA)

Audit forensik menemukan dua akar permasalahan teknis yang menyebabkan inkonsistensi visual di seluruh aplikasi:

### A. Root Cause Gap Tidak Konsisten (Sidebar-to-Content Variance)
1. **Pola `max-w-* mx-auto` pada Wrapper Halaman**:
   - Komponen `src/components/ui/PageOverlay.tsx`, `src/features/workflow/legacy/LegacyCaseBoard.tsx`, `src/features/engineering-dashboard/PavementPinnDashboard.tsx`, dan `src/features/policy-analysis/ExecutivePolicyView.tsx` membungkus konten dalam `max-w-7xl mx-auto`, `max-w-6xl mx-auto`, atau `max-w-[1600px] mx-auto`.
   - **Mekanisme Kegagalan:** Pada layar 1536px dan 1920px, CSS `margin-left: auto` secara otomatis menghitung `(viewport_width - 192px - max_width) / 2`. Pada 1536px, ini menambah margin liar 40px–64px. Pada layar 1920px, konten terdorong ke tengah dengan margin kiri **256px**, menciptakan celah kosong raksasa antara sidebar dan konten.
2. **Padding Ganda (`p-6`, `lg:p-8` vs `px-5`)**:
   - `PageOverlay.tsx` sebelumnya mendefinisikan `px-4 sm:px-6 lg:p-8` (32px padding), sedangkan `ModernAppLayout` dan `OperationsHomeView` menggunakan `px-5` (20px). Akibatnya, halaman yang dirender melalui `PageOverlay` bergeser sejauh 12px ke kanan pada desktop.
3. **Margin Komponen yang Mengompensasi Wrapper (`m-3 sm:m-4`)**:
   - Beberapa komponen anak (misalnya `WorkflowQueueSection.tsx` dan `DataNotice.tsx`) menggunakan `mx-3 sm:mx-4` (12px–16px) alih-alih `mx-4 sm:mx-5` (20px), menyebabkan ketidaksejajaran visual dengan header panel.

### B. Root Cause Background Berbeda & Hardcoded Surfaces
1. **Hardcoded Light Background pada Policy View**:
   - `src/features/policy-analysis/ExecutivePolicyView.tsx` secara eksplisit menetapkan class `bg-[#f8fafc]` pada root container. Ini menyebabkan tampilan Strategic Policy menjadi putih terang, bertabrakan secara ekstrem dengan tema dark mode GIS.
2. **Warna Terang di Balik Peta Operasional**:
   - `src/pages/operations/OperationsPage.tsx` pada baris 44 memiliki `bg-[#e8ecf1]` di latar belakang container peta, yang terlihat sekilas saat tile peta sedang dimuat.
3. **Residu Warna Legacy Navy & Slate**:
   - Komponen workflow (`LegacyCaseBoard.tsx`, `ReportWorkflowPanel.tsx`) masih menggunakan palette lawas: `#080E1B` (navy pekat), `#0A101D`, `#0E1726`, `#12141A`, dan `#16181F` alih-alih sistem token GIS (`#0D0F12` workspace, `#12151A` panel, `#181B20` card).

---

## 3. FILE YANG DIUBAH & PENJELASAN TEKNIS

| # | File Path | Perubahan Teknis yang Dilakukan | Rationale & Dampak |
|---|---|---|---|
| 1 | `src/components/ui/PageOverlay.tsx` | Mengganti `max-w-7xl mx-auto` dan `lg:p-8` menjadi `w-full h-full min-w-0 bg-workspace text-ink px-4 sm:px-5 py-5 pb-8 space-y-4`. Menstandarkan header panel menjadi `bg-panel border border-line-subtle px-4 py-3 sm:px-5 rounded-card` dengan judul `text-[20px] font-semibold tracking-tight`. | Menghilangkan pergeseran konten pada seluruh halaman yang menggunakan overlay. Konten kini selalu mulai pada `x = 212px` (20px dari sidebar). |
| 2 | `src/features/workflow/legacy/LegacyCaseBoard.tsx` | Menghapus `mx-auto w-full max-w-6xl px-4 py-6 sm:px-6`. Mengganti ke `w-full min-w-0 px-4 sm:px-5 py-5 pb-8 space-y-4`. Memperbarui background legacy `#080E1B` ke `bg-workspace`, `#0E1726` ke `bg-panel`, `#0A101D` ke `bg-card`. | Tab Tim & Tugas (M.O) dan penugasan SPK kini sejajar sempurna dengan header dan bebas warna navy lama. |
| 3 | `src/features/engineering-dashboard/PavementPinnDashboard.tsx` | Menghapus `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Mengganti ke `w-full min-w-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-8 space-y-4`. | Dashboard Rekayasa & Kondisi Jalan Field Engineer kini sejajar pada `x = 212px`. |
| 4 | `src/features/policy-analysis/ExecutivePolicyView.tsx` | Menghapus `bg-[#f8fafc]` dan `max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8` di 7 tab. Mengganti ke `w-full min-w-0 bg-workspace text-ink px-4 sm:px-5 py-5 pb-8 space-y-4`. | Menghilangkan background putih; seluruh halaman Policy kini menggunakan dark GIS theme `#0D0F12` dan sejajar 20px dari sidebar. |
| 5 | `src/features/wim/OperationsManagerAppView.tsx` | Menghapus `max-w-7xl mx-auto` pada sticky warning banner dan main container. Mengganti dengan `w-full min-w-0 px-4 sm:px-5 py-5 pb-8 space-y-4`. | Modul Kendali Operasional WIM & ODOL kini memenuhi lebar layar secara proporsional dengan gutter 20px. |
| 6 | `src/pages/operations/OperationsPage.tsx` | Mengganti `bg-[#e8ecf1]` di balik container peta dengan `bg-workspace`. | Menghilangkan kedipan putih saat tile peta MapLibre/Leaflet sedang dimuat. |
| 7 | `src/components/simulation-viewer/SimulationPanel.tsx` | Menghapus `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`. Mengganti ke `w-full min-w-0 space-y-4`. | Menghilangkan nesting wrapper yang menyebabkan margin ganda pada panel simulasi PINN. |
| 8 | `src/features/fwd/FieldEngineerDashboard.tsx` | Menghapus `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`. Mengganti ke `w-full min-w-0 space-y-4`. | Memastikan inner container F.E Dashboard mengikuti gutter 20px dari parent shell. |
| 9 | `src/features/wim/OperationsManagerDashboard.tsx` | Menghapus `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`. Mengganti ke `w-full min-w-0 space-y-4`. | Menghilangkan pembatas lebar pada dashboard WIM lama. |
| 10 | `src/features/policy-analysis/ExecutivePolicyDashboard.tsx` | Menghapus `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`. Mengganti ke `w-full min-w-0 space-y-4`. | Menyelaraskan inner dashboard kebijakan dengan SSOT. |
| 11 | `src/features/work-orders/MyTasksView.tsx` | Mengganti `max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8` menjadi `w-full min-w-0 px-4 sm:px-5 py-5 pb-8 space-y-4 bg-workspace text-ink`. | Halaman Tugas Saya (F.E) kini menggunakan dark background `#0D0F12` dan sejajar pada `x = 212px`. |
| 12 | `src/pages/workflow/WorkflowQueueSection.tsx` | Mengganti `m-3 sm:m-4` dengan `mx-4 sm:mx-5 my-3`. Mengganti border dan background lama ke `border-line-subtle bg-panel text-ink`. | Menyelaraskan antrean workflow dengan margin horizontal 20px. |
| 13 | `src/components/ui/DataNotice.tsx` | Mengganti `mx-3 sm:mx-4` menjadi `mx-4 sm:mx-5 my-2.5`. | Menjaga banner notice sejajar tepat dengan card konten di bawahnya. |
| 14 | `src/features/rbac/RoleHeaderBanner.tsx` | Menstandarkan styling banner role menjadi `bg-panel border-b border-line-subtle py-2 px-4 sm:px-5 w-full min-w-0`. | Mencegah banner role memiliki margin samping yang berbeda. |
| 15 | `src/features/workflow/ReportWorkflowPanel.tsx` | Mengganti warna arbitrary `#12141A`, `#101216`, `#16181F`, `#14161C` dengan token standar `bg-panel`, `bg-card`, `border-line-subtle`, `text-ink`. | Merapikan panel detail workflow dan riwayat tindakan. |
| 16 | `src/domain/workflow/stateMachine.ts` | Memperbaiki type typing `WorkOrder` fallback (`submissions: []`, `isOfficialDocument: false`). | Memastikan type checking TypeScript bersih 100% tanpa kompilasi error. |

---

## 4. TABEL AUDIT FORENSIK SELURUH ROLE & ROUTE

Pengukuran dilakukan pada browser aktif Chrome headless/CDP pada viewport **1536 × 800** dan **1920 × 950**:

| Route URL | Role Pengguna | Shell yang Digunakan | Lebar Sidebar | Start X Konten | Gap dari Sidebar | Background Root / Panel | Status Audit | Catatan Verifikasi |
|---|---|---|---|---|---|---|---|---|
| `/operations/` | Operations Manager (M.O) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS (SSOT)** | **Baseline referensi utama**. Peta Leaflet, KPI baris 1, tabel antrean terverifikasi. |
| `/operations/tasks/` | Operations Manager (M.O) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Header "Tim & Tugas", filter tabs, dan card laporan sejajar sempurna pada `x = 212px`. |
| `/operations/monitoring/wim/` | Operations Manager (M.O) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Notice banner simulasi WIM, header panel, dan grid kartu WIM sejajar pada `x = 212px`. |
| `/engine/prediction/` | Operations Manager (M.O) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Header panel "Riwayat Penanganan & Degradasi Koridor" sejajar pada `x = 212px`. |
| `/reports/` | Public / M.O | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Header "Laporan warga" dan grid 3-kolom kartu laporan warga sejajar pada `x = 212px`. |
| `/dashboard/` | Operations Manager (M.O) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Floating header overlay "Peta & POS WIM" dan bottom carousel insiden sejajar pada `x = 212px`. |
| `/engineering/` | Field Engineer (F.E) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Dashboard F.E dengan peta Leaflet, panel rekomendasi tindakan, dan filter bar sejajar pada `x = 212px`. |
| `/engineering/tasks/` | Field Engineer (F.E) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Halaman "Tugas Saya" sejajar pada `x = 212px`. Tombol "Sudah Selesai (Kirim Bukti)" aktif dan responsif. |
| `/policy/` | Policy Maker (D.M) | `ModernAppLayout` | `192px` | **`212px`** | **`20px`** | `#0D0F12` / `#12151A` | **PASS** | Background putih `#f8fafc` **berhasil dimusnahkan**. Tabel prioritas ruas kini menggunakan dark palette `#0D0F12` dan sejajar pada `x = 212px`. |
| `/login/` | Unauthenticated | Standalone Fullscreen | `0px` (N/A) | `0px` | N/A | `#040711` / `#0B0F19` | **EXCEPTION** | Halaman login sengaja tidak menggunakan shell navigasi sidebar; menggunakan hero 3D Java globe & login panel dark glass. |
| `/settings` | All Roles | Modal Overlay | `192px` | Centered Modal | N/A | `#12151A` / `#181B20` | **EXCEPTION** | Dialog modal `fixed inset-0 z-[1500]` dengan backdrop blur, sengaja berada di tengah layar sesuai standar UX. |

---

## 5. BUKTI VISUAL & VERIFIKASI PENGUKURAN BROWSER

Semua screenshot telah disimpan di direktori artefak dan diverifikasi secara langsung:

1. **Baseline M.O Dashboard (`/operations/` pada 1536×800)**:
   - File Artefak: `operations_mo_clean_1536x800_1792339002034.png`
   - Koordinat: Sidebar `[0, 192]`, First Panel `[212, 1516]`, Gap = **20px**.
   - Background: `rgb(13, 15, 18)` (`#0D0F12`).

2. **Tim & Tugas M.O (`/operations/tasks/` pada 1536×800)**:
   - File Artefak: `operations_tasks_1536x800_1792338663353.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.
   - Background: `rgb(13, 15, 18)` (`#0D0F12`).

3. **Tim & Tugas M.O pada Layar Ultra-Wide (1920×950)**:
   - File Artefak: `operations_tasks_1920x950_1792338730215.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1900]`, Gap = **20px**.
   - **Hasil Kunci:** Konten **TIDAK TERDORONG KE TENGAH** (margin 256px berhasil dihilangkan). Gap tetap persis 20px seperti baseline M.O.

4. **Kendali WIM & ODOL (`/operations/monitoring/wim/` pada 1536×800)**:
   - File Artefak: `monitoring_wim_1536x800_1792338681466.png`
   - Koordinat: Sidebar `[0, 192]`, First Panel `[212, 1516]`, Gap = **20px**.

5. **Riwayat Penanganan PINN (`/engine/prediction/` pada 1536×800)**:
   - File Artefak: `engine_prediction_1536x800_1792338690197.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.

6. **Laporan Warga (`/reports/` pada 1536×800)**:
   - File Artefak: `reports_1536x800_1792338698290.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.

7. **Peta & Pos WIM Analytics (`/dashboard/` pada 1536×800)**:
   - File Artefak: `analytics_1536x800_1792338706137.png`
   - Koordinat: Sidebar `[0, 192]`, Top Overlay Header `[212, 600]`, Bottom Carousel `[212, 1516]`, Gap = **20px**.

8. **Prioritas Ruas Berbasis Bukti Policy Maker (`/policy/` pada 1536×800)**:
   - File Artefak: `policy_view_1536x800_1792338796133.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.
   - **Hasil Kunci:** Background putih `#f8fafc` 100% musnah; berubah menjadi `#0D0F12` workspace dan `#12151A` panel.

9. **Dashboard Field Engineer (`/engineering/` pada 1536×800)**:
   - File Artefak: `engineering_fwd_1536x800_1792338840669.png`
   - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.

10. **Tugas Saya Field Engineer (`/engineering/tasks/` pada 1536×800)**:
    - File Artefak: `engineering_tasks_clean_1536x800_1792339046136.png`
    - Koordinat: Sidebar `[0, 192]`, Header Panel `[212, 1516]`, Gap = **20px**.

---

## 6. REGRESSION TESTING & HEALTH AUDIT

1. **TypeScript Type Safety**:
   - Perintah: `npx tsc --noEmit`
   - Hasil: **Exit Code 0 (0 errors)**.
   - Status: Lulus murni tanpa type suppression atau `@ts-ignore`.

2. **Automated Unit & Integration Test Suite**:
   - Perintah: `npm test` (`tsx --test "tests/**/*.test.ts"`)
   - Hasil:
     * **Total Tests: 313**
     * **Passed: 313 (100%)**
     * **Failed: 0**
     * **Duration: 27.9s**
   - Cakupan Pengujian:
     * Finite Element & PINN inference physics models (Fourth Power Law, Boussinesq deflection basin, Dynamic Tonnage).
     * State machine workflow, RBAC transitions (Operations Manager, Field Engineer, Policy Maker, Public Viewer).
     * Report ownership, anti-spoofing integrity, GIS coordinate projections, and session security.

3. **Runtime Stability**:
   - Development server direstart secara bersih via `npm run dev:restart` (PID 35944).
   - Status runtime: `ready · code SYNCED · fingerprint 391eb1057cee (54 files)` pada port 3000.
   - Tidak ada banner peringatan kompilasi atau kode basi yang tertinggal pada antarmuka.

---

## 7. DEFINITION OF DONE SIGN-OFF

- [x] Seluruh route dari router configuration telah diaudit.
- [x] Gap sidebar-to-content seragam tepat **20px** (`x = 212px`) pada seluruh route, identik dengan baseline M.O Dashboard.
- [x] Margin liar auto-centering (`max-w-* mx-auto`) telah dihapus secara menyeluruh.
- [x] Background workspace (`#0D0F12`), panel (`#12151A`), card (`#181B20`), dan border (`#292D33`) telah konsisten di seluruh role dan route.
- [x] Background putih `#f8fafc` pada Policy Maker telah diganti menjadi dark GIS theme.
- [x] Peta Leaflet/MapLibre, tabel, filter dropdown, modal, dan antrean tugas tetap berfungsi 100%.
- [x] Seluruh pengecualian (Login Standalone, Modal Dialog) telah didokumentasikan secara transparan.
- [x] Semua bukti didukung oleh computed styles DOM aktual, screenshot browser di 1536×800 & 1920×950, dan regression test 313/313 PASS.
