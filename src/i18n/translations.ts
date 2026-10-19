export type Language = 'id' | 'en';

export interface Translations {
  // Brand
  brandName: string;
  brandTagline: string;

  // Navigation
  navDashboard: string;
  navMap: string;
  navMyTasks: string;
  navReports: string;
  navSurvey: string;
  navRoadHistory: string;
  navTechnicalRef: string;
  navPolicyScenario: string;
  navBudgetMatrix: string;
  navAiBrief: string;
  navAnalytics: string;
  navSimulation: string;
  navAlerts: string;
  navSettings: string;
  navCollapse: string;
  navExpand: string;

  // Search & Filters
  searchPlaceholder: string;
  filterAll: string;
  filterCritical: string;
  filterModerate: string;
  filterMinor: string;
  filterHeatmap: string;

  // Stats
  statCriticalTitle: string;
  statCriticalDesc: string;
  statModerateTitle: string;
  statModerateDesc: string;
  statMinorTitle: string;
  statMinorDesc: string;
  statHealthTitle: string;
  statHealthDesc: string;
  statTotalReportsTitle: string;
  statTotalReportsDesc: string;

  // Actions
  reportDamageBtn: string;
  viewDetails: string;
  upvote: string;
  upvoted: string;
  share: string;
  copied: string;
  copy: string;
  save: string;
  saved: string;
  close: string;
  cancel: string;
  submit: string;
  simulate: string;
  recenter: string;
  viewAll: string;
  viewAnalysisPrediction: string;
  openDetailedComparison: string;
  approveLocation: string;
  selectedLocation: string;
  searchingRoad: string;
  roadNotIdentified: string;
  roadResolutionFailed: string;
  roadNotFoundInRange: string;
  roadFetchFailed: string;
  retry: string;
  roadAmbiguous: string;
  invalidCoordinates: string;
  tapToReport: string;

  // Drawer / Issue Details
  issueDetailsTitle: string;
  verifiedPothole: string;
  locationDetails: string;
  roadName: string;
  corridor: string;
  coordinates: string;
  estimatedDepth: string;
  estimatedArea: string;
  statusLabel: string;
  statusPending: string;
  statusVerified: string;
  statusRepaired: string;
  statusInProgress: string;
  statusUnderReview: string;
  underReviewNotice: string;
  descriptionLabel: string;
  reporterLabel: string;
  reportedOn: string;
  communityEndorsements: string;
  aiConfidence: string;
  severityAssessment: string;
  recentReportsTitle: string;

  // Create Report Modal
  createModalTitle: string;
  createModalSubtitle: string;
  selectRoadSegment: string;
  damageType: string;
  severityLevel: string;
  severityCritical: string;
  severitySevere: string;
  severityModerate: string;
  severityLight: string;
  depthCm: string;
  areaM2: string;
  descriptionPlaceholder: string;
  choosePhotoPreset: string;
  selectPointOnMapPrompt: string;

  // Notifications Dropdown
  notificationsTitle: string;
  markAllRead: string;
  noNotifications: string;
  notifVerifiedTitle: string;
  notifVerifiedBody: string;
  notifUpvoteTitle: string;
  notifUpvoteBody: string;
  notifAlertTitle: string;
  notifAlertBody: string;
  notifRepairTitle: string;
  notifRepairBody: string;

  // Theme & Language
  lightMode: string;
  darkMode: string;
  language: string;
  indonesian: string;
  english: string;

  // Account
  accountProfile: string;
  switchAccount: string;
  publicReporter: string;
  publicViewer: string;
  fieldEngineer: string;
  operationsManager: string;
  policyMaker: string;

  // Heatmap info & popups
  heatmapNotice: string;
  heatmapHotspots: string;
  heatmapDensityHigh: string;
  heatmapDensityMed: string;
  heatmapDensityLow: string;
  heatmapClusterTitle: string;
  heatmapClusterReports: string;
  heatmapClickToCompare: string;
  beforeAfterComparison: string;
  beforeLabel: string;
  afterLabel: string;
  repairMethodLabel: string;
  pciImprovementLabel: string;
  engineerNoteLabel: string;
  openGoogleMaps: string;
  focusOnMap: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  id: {
    brandName: 'PAVEMENT',
    brandTagline: 'Intelijen Kerusakan Jalan Cerdas',

    navDashboard: 'Dashboard',
    navMap: 'Peta & Kondisi Jalan',
    navMyTasks: 'Tugas Saya',
    navReports: 'Laporan',
    navSurvey: 'Survei & Periksa',
    navRoadHistory: 'Riwayat Jalan',
    navTechnicalRef: 'Referensi Teknis',
    navPolicyScenario: 'Skenario Kebijakan',
    navBudgetMatrix: 'Pagu & Koridor',
    navAiBrief: 'Intelijen AI',
    navAnalytics: 'Analitik',
    navSimulation: 'Simulasi PINN',
    navAlerts: 'Notifikasi',
    navSettings: 'Pengaturan',
    navCollapse: 'Ciutkan Menu',
    navExpand: 'Buka Menu',

    searchPlaceholder: 'Cari ruas jalan, koridor, atau koordinat...',
    filterAll: 'Semua Kerusakan',
    filterCritical: 'Kritis (Lubang Dalam)',
    filterModerate: 'Sedang (Alur / Amblas)',
    filterMinor: 'Ringan (Retak)',
    filterHeatmap: 'Heatmap',

    statCriticalTitle: 'Pothole Kritis',
    statCriticalDesc: 'Kedalaman > 10 cm & bahaya tinggi',
    statModerateTitle: 'Kerusakan Sedang',
    statModerateDesc: 'Alur roda & amblas jalan',
    statMinorTitle: 'Cacat Ringan',
    statMinorDesc: 'Retak halus & aus permukaan',
    statHealthTitle: 'Rata-rata Indeks PCI',
    statHealthDesc: 'Kondisi struktural jalan nasional',
    statTotalReportsTitle: 'Total Laporan Warga',
    statTotalReportsDesc: 'Bulan ini di seluruh koridor',

    reportDamageBtn: 'Laporkan Kerusakan Jalan',
    viewDetails: 'Lihat Detail Lengkap',
    upvote: 'Dukung Laporan',
    upvoted: 'Didukung',
    share: 'Bagi Lokasi',
    copied: 'Tersalin!',
    copy: 'Salin',
    save: 'Simpan',
    saved: 'Tersimpan',
    close: 'Tutup',
    cancel: 'Batal',
    submit: 'Kirim Laporan',
    simulate: 'Jalankan Simulasi PINN',
    recenter: 'Pusatkan ke Karawang',
    viewAll: 'Lihat Semua',
    viewAnalysisPrediction: 'Lihat Analisis & Prediksi',
    openDetailedComparison: 'Buka Komparasi Detail',
    approveLocation: 'Setujui Lokasi',
    selectedLocation: 'LOKASI TERPILIH',
    searchingRoad: 'Mencari ruas jalan...',
    roadNotIdentified: 'Ruas jalan belum teridentifikasi',
    roadResolutionFailed: 'Gagal memuat informasi ruas jalan',
    roadNotFoundInRange: 'Ruas jalan tidak ditemukan dalam jangkauan pencarian',
    roadFetchFailed: 'Gagal mengambil data ruas jalan',
    retry: 'Coba Lagi',
    roadAmbiguous: 'Ruas jalan terdeteksi ambigu',
    invalidCoordinates: 'Koordinat tidak valid',
    tapToReport: 'Ketuk untuk laporkan jalan rusak',

    issueDetailsTitle: 'Detail Kerusakan Jalan',
    verifiedPothole: 'Laporan Terverifikasi',
    locationDetails: 'Informasi Lokasi',
    roadName: 'Nama Ruas Jalan',
    corridor: 'Koridor',
    coordinates: 'Koordinat Geospasial',
    estimatedDepth: 'Estimasi Kedalaman',
    estimatedArea: 'Estimasi Luas Kerusakan',
    statusLabel: 'Status Penanganan',
    statusPending: 'Menunggu Verifikasi',
    statusVerified: 'Terverifikasi Instansi',
    statusRepaired: 'Selesai Diperbaiki',
    statusInProgress: 'Sedang Diperbaiki',
    statusUnderReview: 'Dalam Peninjauan',
    underReviewNotice: 'Laporan ini sedang ditinjau oleh tim pemeliharaan jalan.',
    descriptionLabel: 'Deskripsi & Kronologi',
    reporterLabel: 'Pelapor',
    reportedOn: 'Dilaporkan pada',
    communityEndorsements: 'Dukungan Warga',
    aiConfidence: 'Tingkat Keyakinan AI',
    severityAssessment: 'Penilaian Tingkat Keparahan',
    recentReportsTitle: 'Laporan Terkini',

    createModalTitle: 'Laporkan Titik Kerusakan Jalan',
    createModalSubtitle: 'Data laporan Anda membantu instansi mempercepat perbaikan jalan.',
    selectRoadSegment: 'Pilih Ruas Jalan Terdekat',
    damageType: 'Tipe Kerusakan Jalan',
    severityLevel: 'Tingkat Keparahan',
    severityCritical: 'Kritis (Lubang >10cm, Risiko Tinggi)',
    severitySevere: 'Parah (Amblas / Bergelombang Parah)',
    severityModerate: 'Sedang (Retak Buaya / Aus)',
    severityLight: 'Ringan (Retak Rambut)',
    depthCm: 'Estimasi Kedalaman (cm)',
    areaM2: 'Estimasi Luas (m²)',
    descriptionPlaceholder: 'Jelaskan kondisi lubang, posisi jalur (kiri/kanan), dan patokan terdekat...',
    choosePhotoPreset: 'Pilih Foto Dokumentasi Lapangan',
    selectPointOnMapPrompt: 'Klik pada peta untuk memilih titik koordinat presisi',

    notificationsTitle: 'Pusat Notifikasi',
    markAllRead: 'Tandai Semua Dibaca',
    noNotifications: 'Tidak ada notifikasi baru',
    notifVerifiedTitle: 'Laporan Diverifikasi Petugas',
    notifVerifiedBody: 'Laporan lubang di Ruas Akses KIIC Karawang telah diverifikasi oleh tim teknis.',
    notifUpvoteTitle: '5 Warga Mendukung Laporan Anda',
    notifUpvoteBody: 'Laporan kerusakan di Tol Cikampek KM 48 Karawang menerima perhatian komunitas.',
    notifAlertTitle: 'Peringatan Titik Kritis Baru',
    notifAlertBody: 'Terdeteksi akumulasi lubang parah di Kawasan Industri Suryacipta Karawang.',
    notifRepairTitle: 'Penambalan Jalan Selesai',
    notifRepairBody: 'Perbaikan jalan di Jl. Ahmad Yani Bypass Karawang telah rampung dilaksanakan.',

    lightMode: 'Mode Terang',
    darkMode: 'Mode Gelap',
    language: 'Bahasa',
    indonesian: 'Indonesia',
    english: 'English',

    accountProfile: 'Profil Akun',
    switchAccount: 'Ganti Profil Akun',
    publicReporter: 'Pelapor Warga',
    publicViewer: 'Pengamat Komunitas',
    fieldEngineer: 'Civil Engineer PUPR',
    operationsManager: 'Operations Manager WIM',
    policyMaker: 'Pembuat Kebijakan',

    heatmapNotice: 'Mode Heatmap Aktif: Menampilkan konsentrasi kerapatan titik kerusakan jalan.',
    heatmapHotspots: 'Titik Hotspot Kerusakan',
    heatmapDensityHigh: 'Kerapatan Tinggi',
    heatmapDensityMed: 'Kerapatan Sedang',
    heatmapDensityLow: 'Kerapatan Ringan',
    heatmapClusterTitle: 'Akumulasi Kerusakan Jalan',
    heatmapClusterReports: 'Total Laporan',
    heatmapClickToCompare: 'Klik tombol di bawah untuk melihat komparasi foto sebelum dan sesudah penanganan.',
    beforeAfterComparison: 'Komparasi Foto Kerusakan (Sebelum vs. Sesudah Perbaikan)',
    beforeLabel: 'SEBELUM (Laporan Awal)',
    afterLabel: 'SESUDAH (Hasil Penanganan)',
    repairMethodLabel: 'Metode Perbaikan',
    pciImprovementLabel: 'Peningkatan Indeks PCI',
    engineerNoteLabel: 'Catatan Engineer PUPR',
    openGoogleMaps: 'Buka di Google Maps',
    focusOnMap: 'Fokus Titik di Peta'
  },
  en: {
    brandName: 'PAVEMENT',
    brandTagline: 'Smart Road Damage Intelligence',

    navDashboard: 'Dashboard',
    navMap: 'Map & Road Condition',
    navMyTasks: 'My Tasks',
    navReports: 'Reports',
    navSurvey: 'Survey & Inspect',
    navRoadHistory: 'Road History',
    navTechnicalRef: 'Technical Reference',
    navPolicyScenario: 'Policy Scenarios',
    navBudgetMatrix: 'Budget & Corridors',
    navAiBrief: 'AI Briefing',
    navAnalytics: 'Analytics',
    navSimulation: 'PINN Simulator',
    navAlerts: 'Notifications',
    navSettings: 'Settings',
    navCollapse: 'Collapse Menu',
    navExpand: 'Expand Menu',

    searchPlaceholder: 'Search road segment, corridor, or coordinates...',
    filterAll: 'All Issues',
    filterCritical: 'Critical (Deep Potholes)',
    filterModerate: 'Moderate (Rutting / Dip)',
    filterMinor: 'Minor (Cracks)',
    filterHeatmap: 'Heatmap',

    statCriticalTitle: 'Critical Potholes',
    statCriticalDesc: 'Depth > 10 cm & high hazard',
    statModerateTitle: 'Moderate Issues',
    statModerateDesc: 'Wheel rutting & surface dips',
    statMinorTitle: 'Minor Defects',
    statMinorDesc: 'Fine cracks & minor wear',
    statHealthTitle: 'Avg PCI Health Index',
    statHealthDesc: 'Structural road condition index',
    statTotalReportsTitle: 'Total Community Reports',
    statTotalReportsDesc: 'This month across all corridors',

    reportDamageBtn: 'Report Road Issue',
    viewDetails: 'View Full Details',
    upvote: 'Upvote Report',
    upvoted: 'Upvoted',
    share: 'Share Location',
    copied: 'Copied!',
    copy: 'Copy',
    save: 'Save',
    saved: 'Saved',
    close: 'Close',
    cancel: 'Cancel',
    submit: 'Submit Report',
    simulate: 'Run PINN Simulation',
    recenter: 'Recenter to Karawang',
    viewAll: 'View All',
    viewAnalysisPrediction: 'View Analysis & Prediction',
    openDetailedComparison: 'Open Detailed Comparison',
    approveLocation: 'Approve Location',
    selectedLocation: 'SELECTED LOCATION',
    searchingRoad: 'Searching road corridor...',
    roadNotIdentified: 'Road corridor not identified',
    roadResolutionFailed: 'Failed to resolve road corridor',
    roadNotFoundInRange: 'Road segment not found within search range',
    roadFetchFailed: 'Failed to fetch road data',
    retry: 'Retry',
    roadAmbiguous: 'Ambiguous road segment detected',
    invalidCoordinates: 'Invalid coordinates',
    tapToReport: 'Tap to report a road problem',

    issueDetailsTitle: 'Road Damage Details',
    verifiedPothole: 'Verified Community Report',
    locationDetails: 'Location Details',
    roadName: 'Road Segment Name',
    corridor: 'Corridor',
    coordinates: 'Geospatial Coordinates',
    estimatedDepth: 'Estimated Depth',
    estimatedArea: 'Estimated Damage Area',
    statusLabel: 'Resolution Status',
    statusPending: 'Pending Review',
    statusVerified: 'Verified by Agency',
    statusRepaired: 'Repaired & Cleared',
    statusInProgress: 'In Progress / Maintenance',
    statusUnderReview: 'Under Review',
    underReviewNotice: 'This issue is being reviewed by our road maintenance team.',
    descriptionLabel: 'Description & Details',
    reporterLabel: 'Reported by',
    reportedOn: 'Reported on',
    communityEndorsements: 'Community Upvotes',
    aiConfidence: 'AI Confidence',
    severityAssessment: 'Severity Assessment',
    recentReportsTitle: 'Recent Reports',

    createModalTitle: 'Report Road Damage Location',
    createModalSubtitle: 'Your report directly alerts road maintenance agencies for faster repair.',
    selectRoadSegment: 'Select Nearest Road Corridor',
    damageType: 'Damage Type',
    severityLevel: 'Severity Level',
    severityCritical: 'Critical (Pothole >10cm, Severe Hazard)',
    severitySevere: 'Severe (Major Rutting / Dip)',
    severityModerate: 'Moderate (Alligator Cracks / Wear)',
    severityLight: 'Light (Hairline Cracking)',
    depthCm: 'Estimated Depth (cm)',
    areaM2: 'Estimated Area (m²)',
    descriptionPlaceholder: 'Describe the pothole condition, lane position (left/right), landmarks...',
    choosePhotoPreset: 'Choose Documentation Photo',
    selectPointOnMapPrompt: 'Click on the map to select precise coordinates',

    notificationsTitle: 'Notifications Center',
    markAllRead: 'Mark All Read',
    noNotifications: 'No new notifications',
    notifVerifiedTitle: 'Report Verified by Agency',
    notifVerifiedBody: 'Pothole report at KIIC Access Karawang has been verified by the engineering team.',
    notifUpvoteTitle: '5 Citizens Upvoted Your Report',
    notifUpvoteBody: 'Your road damage report on Tol Cikampek KM 48 Karawang gained community traction.',
    notifAlertTitle: 'New Critical Hotspot Alert',
    notifAlertBody: 'High concentration of severe potholes detected at Suryacipta Industrial Area Karawang.',
    notifRepairTitle: 'Road Patching Completed',
    notifRepairBody: 'Asphalt resurfacing at Jl. Ahmad Yani Bypass Karawang has been completed.',

    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    language: 'Language',
    indonesian: 'Indonesian',
    english: 'English',

    accountProfile: 'Account Profile',
    switchAccount: 'Switch User Account',
    publicReporter: 'Public Reporter',
    publicViewer: 'Public Viewer',
    fieldEngineer: 'Civil Engineer (PUPR)',
    operationsManager: 'WIM Operations Manager',
    policyMaker: 'Policy Executive',

    heatmapNotice: 'Heatmap Mode Active: Highlighting thermal density concentrations of road damage.',
    heatmapHotspots: 'Damage Hotspot Clusters',
    heatmapDensityHigh: 'High Density',
    heatmapDensityMed: 'Medium Density',
    heatmapDensityLow: 'Light Density',
    heatmapClusterTitle: 'Damage Cluster Concentration',
    heatmapClusterReports: 'Total Reports',
    heatmapClickToCompare: 'Click the button below to view detailed before & after comparison photo evidence.',
    beforeAfterComparison: 'Damage Photo Comparison (Before vs. After Repair)',
    beforeLabel: 'BEFORE (Initial Report)',
    afterLabel: 'AFTER (Agency Repair Result)',
    repairMethodLabel: 'Repair Method',
    pciImprovementLabel: 'PCI Index Improvement',
    engineerNoteLabel: 'PUPR Engineer Note',
    openGoogleMaps: 'Open in Google Maps',
    focusOnMap: 'Focus Point on Map'
  }
};

