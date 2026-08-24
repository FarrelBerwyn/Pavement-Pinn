import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  CloudRain,
  CheckCircle2,
  AlertCircle,
  Truck,
  Scale,
  Activity,
  ArrowRight,
  RefreshCw,
  Filter,
  Plus,
  Compass,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Ban,
  Navigation,
  Wrench,
  X,
  Info,
  Clock,
  Send,
  Check,
  Eye,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  Maximize2,
  Minimize2,
  Crosshair,
  Search,
  Sparkles,
  Sun,
  Moon,
  Satellite,
  Radio,
  Share2,
  Sliders,
  FileDown
} from 'lucide-react';
import { RoadSegment, SimulationResult, DamageReport } from '../types';
import { UserAccount } from '../data/userAccounts';
import confetti from 'canvas-confetti';

interface OperationsHomeViewProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment?: RoadSegment | null;
  onSelectSegment?: (segment: RoadSegment) => void;
  communityReports?: DamageReport[];
  simulationResult?: SimulationResult | null;
  onNavigateToWim?: () => void;
  onNavigateToWimDashboard?: () => void;
  onNavigateToSPK?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToMap?: () => void;
  onOpenSimulation?: (segment: RoadSegment) => void;
  onNavigateToAlerts?: () => void;
  onNavigateToTasks?: () => void;
  onNavigateToEngineering?: () => void;
  onNavigateToWeather?: () => void;
}

interface AlertItem {
  id: string;
  level: 'KRITIS' | 'SIAGA' | 'WASPADA' | 'NORMAL';
  title: string;
  location: string;
  meta: string;
  timeAgo: string;
  coordinates: [number, number];
  category: 'ODOL' | 'WEATHER' | 'FLOOD' | 'TRAFFIC';
  details: string;
  gvw?: string;
  maxLimit?: string;
  overloadPercent?: string;
  speed?: string;
  recommendedAction?: string;
}

export const OperationsHomeView: React.FC<OperationsHomeViewProps> = ({
  currentAccount,
  roadSegments = [],
  selectedSegment,
  onSelectSegment,
  communityReports = [],
  simulationResult,
  onNavigateToWim,
  onNavigateToWimDashboard,
  onNavigateToSPK,
  onNavigateToReports,
  onNavigateToMap,
  onOpenSimulation,
  onNavigateToAlerts,
  onNavigateToTasks,
  onNavigateToEngineering,
  onNavigateToWeather
}) => {
  const goToWim = onNavigateToWim || onNavigateToWimDashboard || (() => {});
  const goToMap = onNavigateToMap || (() => {});
  const goToReports = onNavigateToReports || (() => {});
  const goToSPK = onNavigateToSPK || (() => {});

  // Last update timestamp state
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('10:24 WIB');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Status Filter State for the Map
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'NORMAL' | 'WASPADA' | 'SIAGA' | 'KRITIS'>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);

  // Map Visual Style: Dark Mode, Satelit, Real Light
  const [mapTheme, setMapTheme] = useState<'DARK_MODE' | 'SATELLITE' | 'REAL_LIGHT'>('DARK_MODE');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);

  // Modals state
  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] = useState<boolean>(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionModalType, setActionModalType] = useState<'BATASI' | 'ALIHKAN' | 'KIRIM_TIM' | null>(null);
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<AlertItem | null>(null);
  const [isAllAlertsModalOpen, setIsAllAlertsModalOpen] = useState<boolean>(false);
  const [isAllActionsModalOpen, setIsAllActionsModalOpen] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New Alert Form state
  const [newAlertForm, setNewAlertForm] = useState({
    level: 'KRITIS' as 'KRITIS' | 'SIAGA' | 'WASPADA',
    title: '',
    location: 'Tol Jakarta - Cikampek KM 62+200',
    meta: '',
    details: '',
    category: 'ODOL' as 'ODOL' | 'WEATHER' | 'FLOOD' | 'TRAFFIC'
  });

  // Active Alerts matching the user's reference
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([
    {
      id: 'alert-1',
      level: 'KRITIS',
      title: 'Kritis - ODOL Terlampaui',
      location: 'KM 62 + 200, Tol Cikampek',
      meta: 'Beban berlebih: 67 ton',
      timeAgo: 'Baru saja',
      coordinates: [-6.385, 107.285],
      category: 'ODOL',
      gvw: '67.4 Ton',
      maxLimit: '40.0 Ton',
      overloadPercent: '+68.5%',
      speed: '42 km/jam',
      recommendedAction: 'Kirimkan instruksi penindakan ke Pos GTO Cikampek Utama & alihkan truk ke kantong parkir timbang.',
      details: 'Truk Golongan V terdeteksi sensor Weigh-In-Motion (WIM) dengan GVW 67.4 Ton (Beban Maksimum Izin: 40 Ton, Overload +68.5%). Kecepatan 42 km/jam di lajur 1 berpotensi merusak struktur perkerasan lentur.'
    },
    {
      id: 'alert-2',
      level: 'SIAGA',
      title: 'Siaga - Hujan Lebat',
      location: 'KM 48 + 800, Tol Jagorawi',
      meta: 'Intensitas: 78 mm/jam',
      timeAgo: '5 menit lalu',
      coordinates: [-6.582, 106.845],
      category: 'WEATHER',
      speed: '55 km/jam',
      recommendedAction: 'Aktifkan VMS batas kecepatan 60 km/jam dan siagakan unit patroli lampu rotator.',
      details: 'Curah hujan lebat terpantau melalui sensor AWS dengan intensitas 78 mm/jam. Permukaan aspal basah ekstrem, daya cengkeram ban menurun, kecepatan operasional disarankan maksimal 60 km/jam.'
    },
    {
      id: 'alert-3',
      level: 'WASPADA',
      title: 'Waspada - Genangan',
      location: 'KM 12 + 400, Tol JORR',
      meta: 'Kedalaman: 15 cm',
      timeAgo: '8 menit lalu',
      coordinates: [-6.295, 106.812],
      category: 'FLOOD',
      speed: '30 km/jam',
      recommendedAction: 'Kerahkan Tim Pompa Mobile Unit 2 dan pasang rambu peringatan genangan.',
      details: 'Genangan air setinggi 15 cm di lajur paling kiri akibat penyumbatan saluran drainase inlet box culvert. Tim pompa mobile telah disiagakan ke lokasi.'
    },
    {
      id: 'alert-4',
      level: 'NORMAL',
      title: 'Normal',
      location: 'Lalu lintas lancar',
      meta: 'Semua koridor utama',
      timeAgo: '20 menit lalu',
      coordinates: [-6.18, 106.825],
      category: 'TRAFFIC',
      speed: '82 km/jam',
      recommendedAction: 'Pertahankan pemantauan berkala sensor telemetri WIM dan drone CCTV.',
      details: 'Arus lalu lintas pada koridor Tol Dalam Kota, Tangerang-Merak, dan Desari terpantau ramai lancar dengan V/C Ratio 0.42 (Tingkat Pelayanan Jalan Kategori A/B).'
    }
  ]);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.2800, 106.9000],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    const tileUrl =
      mapTheme === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapTheme === 'REAL_LIGHT'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    polylinesGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer URL when Theme changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl =
      mapTheme === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapTheme === 'REAL_LIGHT'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [mapTheme]);

  // Corridors data with coordinates
  const roadCorridors = [
    {
      id: 'cikampek',
      name: 'Tol Jakarta - Cikampek KM 62',
      status: 'KRITIS',
      color: '#ef4444',
      coords: [
        [-6.2383, 106.9756],
        [-6.2750, 107.0500],
        [-6.3200, 107.1800],
        [-6.3850, 107.2850],
        [-6.4200, 107.4500]
      ] as [number, number][],
      info: 'ODOL Kritis (GVW 67.4 Ton, +68.5%)'
    },
    {
      id: 'jagorawi',
      name: 'Tol Jagorawi KM 48',
      status: 'SIAGA',
      color: '#f97316',
      coords: [
        [-6.2600, 106.8700],
        [-6.3800, 106.8600],
        [-6.4800, 106.8500],
        [-6.5820, 106.8450]
      ] as [number, number][],
      info: 'Hujan Lebat 78 mm/jam'
    },
    {
      id: 'jorr',
      name: 'Tol JORR Outer Ring KM 12',
      status: 'WASPADA',
      color: '#eab308',
      coords: [
        [-6.1800, 106.7400],
        [-6.2950, 106.8120],
        [-6.3100, 106.8700],
        [-6.2400, 106.9600]
      ] as [number, number][],
      info: 'Genangan Air 15 cm di Lajur 1'
    },
    {
      id: 'tangerang',
      name: 'Tol Tangerang - Merak',
      status: 'NORMAL',
      color: '#22c55e',
      coords: [
        [-6.1783, 106.6319],
        [-6.1950, 106.5000],
        [-6.1500, 106.3000],
        [-6.0200, 106.0500]
      ] as [number, number][],
      info: 'Lalu Lintas Lancar (Kecepatan 82 km/jam)'
    },
    {
      id: 'dalam_kota',
      name: 'Tol Dalam Kota (Inner Ring)',
      status: 'NORMAL',
      color: '#10b981',
      coords: [
        [-6.1800, 106.8200],
        [-6.2000, 106.8000],
        [-6.2400, 106.8300],
        [-6.2200, 106.8800],
        [-6.1600, 106.8700],
        [-6.1800, 106.8200]
      ] as [number, number][],
      info: 'Normal Operasional'
    },
    {
      id: 'desari',
      name: 'Tol Desari (Depok - Antasari)',
      status: 'WASPADA',
      color: '#eab308',
      coords: [
        [-6.2800, 106.8000],
        [-6.3400, 106.7900],
        [-6.4025, 106.7942]
      ] as [number, number][],
      info: 'Waspada Kecepatan Licin'
    },
    {
      id: 'priok',
      name: 'Arteri Pelabuhan Tanjung Priok',
      status: 'KRITIS',
      color: '#ef4444',
      coords: [
        [-6.1100, 106.8800],
        [-6.1250, 106.9100],
        [-6.1384, 106.8640]
      ] as [number, number][],
      info: 'Pos WIM Priok: Overload Kontainer 62 Ton'
    }
  ];

  // Render Polylines & Markers on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesGroupRef.current || !markersGroupRef.current) return;

    polylinesGroupRef.current.clearLayers();
    markersGroupRef.current.clearLayers();

    // 1. Draw Corridors
    roadCorridors.forEach((corr) => {
      if (selectedStatusFilter !== 'ALL' && corr.status !== selectedStatusFilter) {
        return;
      }

      // Outer glow for critical/warning
      if (corr.status === 'KRITIS' || corr.status === 'SIAGA') {
        const glow = L.polyline(corr.coords, {
          color: corr.color,
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        });
        polylinesGroupRef.current?.addLayer(glow);
      }

      const line = L.polyline(corr.coords, {
        color: corr.color,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      line.bindTooltip(
        `<div class="p-1 text-xs font-bold text-slate-900">
          <div class="font-extrabold">${corr.name}</div>
          <div class="text-[11px] text-slate-600">${corr.info}</div>
        </div>`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      polylinesGroupRef.current?.addLayer(line);
    });

    // 2. Draw Interactive Markers for Active Alerts
    activeAlerts.forEach((alert) => {
      if (selectedStatusFilter !== 'ALL' && alert.level !== selectedStatusFilter) {
        return;
      }

      let iconHtml = '';
      if (alert.level === 'KRITIS') {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <span class="absolute w-9 h-9 rounded-full bg-rose-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-black">
              !
            </div>
          </div>
        `;
      } else if (alert.level === 'SIAGA') {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <span class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-pulse"></span>
            <div class="w-7 h-7 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
              ⚠
            </div>
          </div>
        `;
      } else if (alert.level === 'WASPADA') {
        iconHtml = `
          <div class="flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <div class="w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 text-xs font-bold">
              ⚠
            </div>
          </div>
        `;
      } else {
        iconHtml = `
          <div class="flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
              ✓
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-alert-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(alert.coordinates, { icon: customIcon });
      marker.on('click', () => {
        setSelectedAlertDetail(alert);
      });

      marker.bindTooltip(
        `<div class="p-1 text-xs font-sans">
          <div class="font-extrabold text-slate-900">${alert.title}</div>
          <div class="text-[11px] text-slate-700">${alert.location}</div>
          <div class="text-[10px] text-slate-500 font-mono mt-0.5">${alert.meta}</div>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      markersGroupRef.current?.addLayer(marker);
    });

    // 3. Draw Extra WIM Station Markers for visual richness
    const extraWimPins = [
      { name: 'Pos WIM KM 62 Cikampek', coords: [-6.385, 107.285] as [number, number], odol: '67.4 Ton (+68.5%)', status: 'KRITIS' },
      { name: 'Pos WIM Priok Port', coords: [-6.1384, 106.8640] as [number, number], odol: '62.1 Ton (+55.2%)', status: 'KRITIS' },
      { name: 'Pos WIM Cikarang Barat', coords: [-6.2383, 106.9756] as [number, number], odol: 'Normal (34 Ton)', status: 'NORMAL' },
      { name: 'Pos WIM Tangerang Barat', coords: [-6.1783, 106.6319] as [number, number], odol: 'Normal (36 Ton)', status: 'NORMAL' },
      { name: 'Pos WIM Jagorawi Ciawi', coords: [-6.582, 106.845] as [number, number], odol: 'Waspada (42 Ton)', status: 'SIAGA' }
    ];

    extraWimPins.forEach((wim) => {
      if (selectedStatusFilter !== 'ALL' && wim.status !== selectedStatusFilter) {
        return;
      }

      const wimHtml = `
        <div class="flex items-center space-x-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-full border border-slate-700 shadow-md backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer">
          <span class="w-2 h-2 rounded-full ${wim.status === 'KRITIS' ? 'bg-rose-500 animate-ping' : wim.status === 'SIAGA' ? 'bg-orange-500' : 'bg-emerald-400'}"></span>
          <span>${wim.name.split(' ')[2] || 'WIM'}</span>
        </div>
      `;
      const wimIcon = L.divIcon({
        className: 'custom-wim-pin',
        html: wimHtml,
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      const wimMarker = L.marker(wim.coords, { icon: wimIcon });
      wimMarker.on('click', () => {
        const foundAlert = activeAlerts.find(a => a.location.includes('Cikampek')) || activeAlerts[0];
        setSelectedAlertDetail(foundAlert);
      });
      markersGroupRef.current?.addLayer(wimMarker);
    });

  }, [activeAlerts, selectedStatusFilter]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setLastUpdateTime(timeStr);
      setIsRefreshing(false);
      setActionSuccessMessage('Data telemetri WIM dan kondisi jalan berhasil diperbarui');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }, 600);
  };

  // Zoom helpers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-6.2800, 106.9000], 10, { animate: true });
    }
  };

  // Trigger Action Execution
  const handleExecuteQuickAction = (type: 'BATASI' | 'ALIHKAN' | 'KIRIM_TIM') => {
    setActionModalType(type);
    setIsActionModalOpen(true);
  };

  const handleConfirmAction = () => {
    let msg = '';
    if (actionModalType === 'BATASI') {
      msg = 'Instruksi Pembatasan Kendaraan Berat berhasil dikirim ke Gerbang Tol Cikampek Utama & Cikarang!';
    } else if (actionModalType === 'ALIHKAN') {
      msg = 'Instruksi Pengalihan Arus Lalu Lintas ke Koridor Alternatif berhasil diaktifkan pada VMS & Petugas Lapangan!';
    } else {
      msg = 'Surat Perintah Kerja (SPK) & Tim Pemeliharaan Darurat Bina Marga berhasil dikerahkan ke lokasi!';
    }

    setIsActionModalOpen(false);
    setActionSuccessMessage(msg);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => setActionSuccessMessage(null), 4500);
  };

  // Create new alert
  const handleCreateAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertForm.title) return;

    const newAlert: AlertItem = {
      id: `alert-${Date.now()}`,
      level: newAlertForm.level,
      title: newAlertForm.title,
      location: newAlertForm.location,
      meta: newAlertForm.meta || 'Peringatan manual operator',
      timeAgo: 'Baru saja',
      coordinates: [-6.25, 106.85],
      category: newAlertForm.category,
      details: newAlertForm.details || 'Peringatan darurat diterbitkan oleh Operations Manager.'
    };

    setActiveAlerts([newAlert, ...activeAlerts]);
    setIsCreateAlertModalOpen(false);
    setActionSuccessMessage(`Peringatan "${newAlert.title}" berhasil dipublikasikan.`);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  return (
    <div id="operations-home-root" className="w-full space-y-6 select-none font-sans text-slate-100 pb-12">
      {/* Toast Alert Success */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/40 flex items-center space-x-3 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER SECTION (Operations Manager + Realtime Update - Clean Dark Theme) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Pusat Kendali Operasi (Operations Manager)
              </h1>
              <span className="text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                WIM & Pengawasan Jalan
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pemantauan real-time kondisi jalan nasional, stasiun WIM, dan sinyal keputusan cepat
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* Intel OpenVINO Telemetry Chip */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-slate-300">OpenVINO Edge: <strong className="text-white">6.2 ms</strong></span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
            <span className="text-slate-400">Update:</span>
            <strong className="text-slate-200">{lastUpdateTime}</strong>
          </div>
          <button
            onClick={handleRefresh}
            title="Perbarui Data Realtime"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SECTION: LEAFLET MAP WIDGET (~65%) + PERINGATAN AKTIF (~35%) - DARK CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: INTERACTIVE LEAFLET MAP (8 cols on large screens) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col relative h-[460px] sm:h-[500px]">
          {/* Top Bar inside Map Card */}
          <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Status Filter Chips */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
              {/* Semua Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all cursor-pointer border border-slate-700"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedStatusFilter === 'ALL'
                      ? 'Semua Status'
                      : selectedStatusFilter === 'NORMAL'
                      ? 'Normal'
                      : selectedStatusFilter === 'WASPADA'
                      ? 'Waspada'
                      : selectedStatusFilter === 'SIAGA'
                      ? 'Siaga'
                      : 'Kritis'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 py-1.5 z-40 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('ALL');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span>Semua Status</span>
                      {selectedStatusFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('NORMAL');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Normal</span>
                      </span>
                      {selectedStatusFilter === 'NORMAL' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('WASPADA');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span>Waspada</span>
                      </span>
                      {selectedStatusFilter === 'WASPADA' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('SIAGA');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                        <span>Siaga</span>
                      </span>
                      {selectedStatusFilter === 'SIAGA' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('KRITIS');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span>Kritis</span>
                      </span>
                      {selectedStatusFilter === 'KRITIS' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Status Pills */}
              <button
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'NORMAL' ? 'ALL' : 'NORMAL')}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatusFilter === 'NORMAL'
                    ? 'bg-emerald-500/30 text-emerald-300 font-extrabold border border-emerald-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Normal</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'WASPADA' ? 'ALL' : 'WASPADA')}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatusFilter === 'WASPADA'
                    ? 'bg-amber-500/30 text-amber-300 font-extrabold border border-amber-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Waspada</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'SIAGA' ? 'ALL' : 'SIAGA')}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatusFilter === 'SIAGA'
                    ? 'bg-orange-500/30 text-orange-300 font-extrabold border border-orange-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                <span>Siaga</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'KRITIS' ? 'ALL' : 'KRITIS')}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatusFilter === 'KRITIS'
                    ? 'bg-rose-500/30 text-rose-300 font-extrabold border border-rose-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Kritis</span>
              </button>
            </div>

            {/* Right Controls: Theme Switcher & Full Map Shortcut */}
            <div className="flex items-center space-x-2 pointer-events-auto">
              {/* Map Theme Toggle (Dark Mode / Satelit / Real Light) */}
              <div className="relative">
                <button
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-xs font-bold text-slate-200 rounded-2xl border border-slate-700 shadow-md transition-all cursor-pointer"
                  title="Ganti Mode Warna Peta"
                >
                  {mapTheme === 'DARK_MODE' ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Dark Mode</span>
                    </>
                  ) : mapTheme === 'SATELLITE' ? (
                    <>
                      <Satellite className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Satelit</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Real Terang</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isThemeMenuOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-40 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 py-1.5 z-40 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setMapTheme('DARK_MODE');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dark Mode</span>
                      </span>
                      {mapTheme === 'DARK_MODE' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('SATELLITE');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Satellite className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Satelit</span>
                      </span>
                      {mapTheme === 'SATELLITE' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('REAL_LIGHT');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Real Terang</span>
                      </span>
                      {mapTheme === 'REAL_LIGHT' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Recenter Button */}
              <button
                onClick={handleRecenter}
                title="Pusatkan Peta Jabodetabek"
                className="p-1.5 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 shadow-md transition-all cursor-pointer"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Leaflet Map DOM Mount Node */}
          <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

          {/* Map Controls: Bottom Overlay Bar inside Leaflet Map */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Condition Legend */}
            <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-xl pointer-events-auto flex items-center space-x-4">
              <span className="text-[11px] font-bold text-slate-400">Kondisi Jalan:</span>
              <div className="flex items-center space-x-3 text-xs font-bold">
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Normal</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Waspada</span>
                </span>
                <span className="flex items-center space-x-1.5 text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>Siaga</span>
                </span>
                <span className="flex items-center space-x-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Kritis</span>
                </span>
              </div>
            </div>

            {/* Action Buttons: Zoom & "+ Buat Peringatan" (Yellow Button) */}
            <div className="flex items-center space-x-2 pointer-events-auto">
              <div className="flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700 shadow-xl">
                <button
                  onClick={handleZoomIn}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  +
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  -
                </button>
              </div>

              {/* Yellow "+ Buat Peringatan" Button */}
              <button
                onClick={() => setIsCreateAlertModalOpen(true)}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 border border-amber-300"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Peringatan</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PERINGATAN AKTIF (4 cols on large screens - Dark Card Theme) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-5 flex flex-col justify-between">
          <div>
            {/* Header: Peringatan Aktif */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white tracking-tight">
                  Peringatan Aktif
                </h3>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </div>
              <button
                onClick={() => setIsAllAlertsModalOpen(true)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Lihat Semua ({activeAlerts.length})
              </button>
            </div>

            {/* List of 4 Active Alerts */}
            <div className="mt-3.5 space-y-2.5">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertDetail(alert)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    alert.level === 'KRITIS'
                      ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/30'
                      : alert.level === 'SIAGA'
                      ? 'bg-orange-950/20 border-orange-500/30 hover:border-orange-400 hover:bg-orange-950/30'
                      : alert.level === 'WASPADA'
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/30'
                      : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 shrink-0 mt-0.5">
                        {alert.level === 'KRITIS' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                        {alert.level === 'SIAGA' && <CloudRain className="w-4 h-4 text-orange-400" />}
                        {alert.level === 'WASPADA' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {alert.level === 'NORMAL' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              alert.level === 'KRITIS'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : alert.level === 'SIAGA'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : alert.level === 'WASPADA'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {alert.level}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{alert.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium mt-1 truncate">
                          {alert.location}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{alert.meta}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{alert.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Footer Link inside Peringatan Aktif */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Sistem Tilang WIM Terintegrasi</span>
            <button
              onClick={goToWim}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Buka Data ODOL</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE SECTION: 6 METRIC CARDS (DARK THEME) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Kritis (3) */}
        <div
          onClick={() => setSelectedStatusFilter('KRITIS')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Kritis</span>
            <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">3</p>
          <p className="text-[10px] font-medium text-rose-400 mt-1">Perlu penanganan segera</p>
        </div>

        {/* Card 2: Siaga (6) */}
        <div
          onClick={() => setSelectedStatusFilter('SIAGA')}
          className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Siaga</span>
            <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
              <CloudRain className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">6</p>
          <p className="text-[10px] font-medium text-orange-400 mt-1">Pantau berkala</p>
        </div>

        {/* Card 3: Waspada (12) */}
        <div
          onClick={() => setSelectedStatusFilter('WASPADA')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Waspada</span>
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">12</p>
          <p className="text-[10px] font-medium text-amber-400 mt-1">Pengawasan</p>
        </div>

        {/* Card 4: Normal (32) */}
        <div
          onClick={() => setSelectedStatusFilter('NORMAL')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Normal</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">32</p>
          <p className="text-[10px] font-medium text-emerald-400 mt-1">Kondisi baik</p>
        </div>

        {/* Card 5: WIM Aktif (24) */}
        <div
          onClick={goToWim}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">WIM Aktif</span>
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">24</p>
          <p className="text-[10px] font-medium text-cyan-400 mt-1">Stasiun online</p>
        </div>

        {/* Card 6: Respon Rata-rata (12.4 m) */}
        <div
          onClick={goToSPK}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-3xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Respon Rata-rata</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1 mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">12.4</p>
            <span className="text-xs font-bold text-slate-400">menit</span>
          </div>
          <p className="text-[10px] font-medium text-indigo-400 mt-1">Baik</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM SECTION: 3 SUMMARY CARDS (DARK THEME) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD 1: ODOL MONITORING (WIM) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">ODOL Monitoring (WIM)</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                Live Sensor
              </span>
            </div>

            {/* Gauge Graphic + Pelanggaran stats */}
            <div className="my-5 flex flex-col items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#1e293b"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#f43f5e"
                    strokeWidth="10"
                    strokeDasharray="301.59"
                    strokeDashoffset={301.59 * (1 - 0.18)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white">18%</span>
                  <span className="text-[10px] font-bold text-slate-400">Over Limit</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                <span className="text-slate-400 text-[11px]">Total Pelanggaran</span>
                <p className="text-base font-extrabold text-white mt-0.5">128</p>
                <span className="text-[10px] text-rose-400 font-bold">Hari ini</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                <span className="text-slate-400 text-[11px]">Beban Berlebih</span>
                <p className="text-base font-extrabold text-white mt-0.5">5.842 Ton</p>
                <span className="text-[10px] text-amber-400 font-bold">Terdeteksi</span>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Kendaraan Ditimbang:</span>
              <strong className="text-white font-mono font-bold">12.456 Unit</strong>
            </div>
          </div>

          <button
            onClick={goToWim}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-2xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700"
          >
            <span>Lihat Detail Telemetri WIM</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CARD 2: LALU LINTAS & CUACA */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <CloudRain className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">Lalu Lintas & Cuaca</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                AWS Telemetry
              </span>
            </div>

            {/* Traffic Status */}
            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-300">Arus Lalu Lintas</span>
                  <span className="font-bold text-emerald-400">Lancar (48 km/jam)</span>
                </div>
                <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span>V/C Ratio: 0.42</span>
                  <span>Kepadatan: 42%</span>
                </div>
              </div>

              {/* Weather Status */}
              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                      <CloudRain className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Cuaca Terkini</h4>
                      <p className="text-[11px] text-slate-300">Hujan Sedang (28°C)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-orange-400 font-mono">78 mm/jam</span>
                    <p className="text-[10px] text-slate-400">Intensitas</p>
                  </div>
                </div>
              </div>

              {/* Road Skid Warning */}
              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start space-x-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200/90 text-[11px] leading-relaxed">
                  Peringatan jalan licin aktif di Tol Jagorawi KM 40-52. Batas kecepatan aman diturunkan ke 60 km/jam.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActionSuccessMessage('Data sensor cuaca AWS telah disinkronkan');
              setTimeout(() => setActionSuccessMessage(null), 3000);
            }}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-2xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700"
          >
            <span>Periksa Peta Radar Cuaca</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CARD 3: TINDAKAN CEPAT */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">Tindakan Cepat</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Operator Action
              </span>
            </div>

            {/* 3 Action Buttons */}
            <div className="mt-4 space-y-3">
              {/* Action 1: Batasi Kendaraan Berat */}
              <button
                onClick={() => handleExecuteQuickAction('BATASI')}
                className="w-full p-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                        Batasi Kendaraan Berat
                      </h4>
                      <p className="text-[10px] text-slate-400">Tol Cikampek KM 62 (+68.5% ODOL)</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Action 2: Alihkan Arus Lalu Lintas */}
              <button
                onClick={() => handleExecuteQuickAction('ALIHKAN')}
                className="w-full p-3 rounded-2xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Alihkan Arus Lalu Lintas
                      </h4>
                      <p className="text-[10px] text-slate-400">Aktifkan rambu VMS alternatif</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Action 3: Kirim Tim Pemeliharaan */}
              <button
                onClick={() => handleExecuteQuickAction('KIRIM_TIM')}
                className="w-full p-3 rounded-2xl bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        Kirim Tim Pemeliharaan
                      </h4>
                      <p className="text-[10px] text-slate-400">Kerahkan SPK Perbaikan Cepat</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsAllActionsModalOpen(true)}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-2xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-700"
          >
            <span>Semua Protokol Penanganan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: BUAT PERINGATAN BARU (YELLOW BUTTON MODAL - DARK THEME) */}
      {/* ========================================================================= */}
      {isCreateAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Buat Peringatan Baru</h3>
                  <p className="text-xs text-slate-400">Publikasikan sinyal peringatan ke VMS & Petugas Lapangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateAlertModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAlertSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tingkat Urgensi Peringatan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'KRITIS' })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      newAlertForm.level === 'KRITIS'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-extrabold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Kritis (Merah)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'SIAGA' })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      newAlertForm.level === 'SIAGA'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-extrabold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Siaga (Oranye)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'WASPADA' })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      newAlertForm.level === 'WASPADA'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Waspada (Kuning)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Kategori Masalah</label>
                <select
                  value={newAlertForm.category}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, category: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="ODOL">ODOL (Over Dimension Over Loading)</option>
                  <option value="WEATHER">Cuaca Ekstrem / Hujan Badai</option>
                  <option value="FLOOD">Genangan Air / Banjir Ruas</option>
                  <option value="TRAFFIC">Kepadatan Lalu Lintas / Kecelakaan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Judul Peringatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Kritis - Truk Tronton Overload 65 Ton"
                  value={newAlertForm.title}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Lokasi Ruas Jalan</label>
                <input
                  type="text"
                  placeholder="Contoh: KM 62 + 200, Tol Jakarta - Cikampek"
                  value={newAlertForm.location}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, location: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Data / Metadata Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Beban berlebih: 65 ton | Intensitas: 80 mm/jam"
                  value={newAlertForm.meta}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, meta: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Uraian & Instruksi Tindakan</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan kondisi perkerasan dan instruksi operasional bagi petugas gerbang / patroli..."
                  value={newAlertForm.details}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, details: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAlertModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
                >
                  Terbitkan Peringatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL PERINGATAN AKTIF (DARK THEME) */}
      {/* ========================================================================= */}
      {selectedAlertDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        selectedAlertDetail.level === 'KRITIS'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : selectedAlertDetail.level === 'SIAGA'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : selectedAlertDetail.level === 'WASPADA'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {selectedAlertDetail.level}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedAlertDetail.timeAgo}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-white mt-0.5">{selectedAlertDetail.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-[11px]">Lokasi Ruas:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedAlertDetail.location}</p>
                <p className="text-xs text-amber-400 font-semibold mt-1">{selectedAlertDetail.meta}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 mb-1">Rincian Laporan Telemetri:</h4>
                <p className="text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                  {selectedAlertDetail.details}
                </p>
              </div>

              {selectedAlertDetail.recommendedAction && (
                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Rekomendasi Tindakan Operasional:</span>
                  </div>
                  <p className="text-amber-200/90 text-xs leading-relaxed">
                    {selectedAlertDetail.recommendedAction}
                  </p>
                </div>
              )}

              {/* Action Buttons inside Detail */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedAlertDetail(null);
                    handleExecuteQuickAction('BATASI');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer"
                >
                  Tindak Langsung
                </button>
                <button
                  onClick={() => setSelectedAlertDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI TINDAKAN OPERASIONAL (DARK THEME) */}
      {/* ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-white">Konfirmasi Eksekusi Protokol</h3>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300 text-sm leading-relaxed">
                {actionModalType === 'BATASI' &&
                  'Apakah Anda yakin ingin mengirimkan instruksi pembatasan muatan berat ke Pos Jembatan Timbang & GTO Tol Cikampek Utama? Sanksi transfer muatan akan segera diberlakukan.'}
                {actionModalType === 'ALIHKAN' &&
                  'Apakah Anda yakin ingin mengaktifkan pengalihan arus ke rute arteri alternatif dan menyalakan display VMS otomatis?'}
                {actionModalType === 'KIRIM_TIM' &&
                  'Apakah Anda ingin menerbitkan SPK darurat dan mengerahkan Tim Pemeliharaan Cepat Bina Marga ke titik genangan KM 12 JORR?'}
              </p>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-[11px] text-slate-400">
                <p>Operator: <strong className="text-white">{currentAccount.name}</strong></p>
                <p>Hak Akses: <strong className="text-amber-400">RBAC Level 2 (Operations Dispatcher)</strong></p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
                >
                  Ya, Eksekusi Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SEMUA PERINGATAN (DARK THEME) */}
      {/* ========================================================================= */}
      {isAllAlertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Semua Peringatan Aktif & Riwayat</h3>
                  <p className="text-xs text-slate-400">Daftar lengkap anomali telemetri dan kondisi darurat</p>
                </div>
              </div>
              <button
                onClick={() => setIsAllAlertsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setIsAllAlertsModalOpen(false);
                    setSelectedAlertDetail(alert);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        alert.level === 'KRITIS'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : alert.level === 'SIAGA'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : alert.level === 'WASPADA'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {alert.level}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{alert.timeAgo}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{alert.location}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{alert.details}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAllAlertsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
