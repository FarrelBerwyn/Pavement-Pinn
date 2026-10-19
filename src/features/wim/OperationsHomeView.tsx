import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { attachMapResizeRecovery } from '../../components/maps/mapViewport';
import { PavementMap } from '../../components/maps/PavementMap';
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
  FileDown,
  Camera,
  HardHat,
  ShieldCheck
} from 'lucide-react';
import { RoadSegment, SimulationResult, DamageReport } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
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
  onOpenCreateTask?: (report: DamageReport) => void;
  onOpenVerifyTask?: (report: DamageReport) => void;
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
  onNavigateToWeather,
  onOpenCreateTask,
  onOpenVerifyTask
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
  const [reportFilterTab, setReportFilterTab] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'VERIFIED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map Visual Style: Natural Light (Default matching Reference 2), Dark GIS, Satelit
  const [mapTheme, setMapTheme] = useState<'REAL_LIGHT' | 'DARK_MODE' | 'SATELLITE'>('REAL_LIGHT');
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
      center: [-6.3200, 107.0200],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    const tileUrl =
      mapTheme === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapTheme === 'DARK_MODE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        mapTheme === 'REAL_LIGHT'
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          : '&copy; <a href="https://www.esri.com/">Esri</a>'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    polylinesGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;
    const detachResizeRecovery = attachMapResizeRecovery(map, mapContainerRef.current);

    return () => {
      detachResizeRecovery();
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
        : mapTheme === 'DARK_MODE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [mapTheme]);

  // Corridors data with coordinates and professional GIS status colors
  const roadCorridors = [
    {
      id: 'cikampek',
      name: 'Tol Jakarta - Cikampek KM 62',
      status: 'KRITIS',
      color: '#D96B5F',
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
      color: '#D88A45',
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
      color: '#D7A84B',
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
      color: '#50A878',
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
      color: '#50A878',
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
      color: '#D7A84B',
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
      color: '#D96B5F',
      coords: [
        [-6.1100, 106.8800],
        [-6.1250, 106.9100],
        [-6.1384, 106.8640]
      ] as [number, number][],
      info: 'Pos WIM Priok: Overload Kontainer 62 Ton'
    }
  ];

  // Render Polylines & Markers on Leaflet Map (Clean GIS without glow or neon)
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesGroupRef.current || !markersGroupRef.current) return;

    polylinesGroupRef.current.clearLayers();
    markersGroupRef.current.clearLayers();

    // 1. Draw Corridors (Solid, clean lines without glow)
    roadCorridors.forEach((corr) => {
      if (selectedStatusFilter !== 'ALL' && corr.status !== selectedStatusFilter) {
        return;
      }

      const line = L.polyline(corr.coords, {
        color: corr.color,
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      line.bindTooltip(
        `<div class="px-2 py-1.5 text-xs font-sans bg-card text-ink border border-line-subtle rounded-md shadow-lg">
          <div class="font-semibold">${corr.name}</div>
          <div class="text-[11px] text-ink-2 mt-0.5">${corr.info}</div>
        </div>`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      polylinesGroupRef.current?.addLayer(line);
    });

    // 2. Draw Interactive Markers for Active Alerts (Clean GIS markers, no ping/glow)
    activeAlerts.forEach((alert) => {
      if (selectedStatusFilter !== 'ALL' && alert.level !== selectedStatusFilter) {
        return;
      }

      const levelColor =
        alert.level === 'KRITIS'
          ? '#D96B5F'
          : alert.level === 'SIAGA'
          ? '#D88A45'
          : alert.level === 'WASPADA'
          ? '#D7A84B'
          : '#50A878';

      const shortTitle = alert.title.includes(' - ') ? alert.title.split(' - ')[1] : alert.title;
      const isSelected = selectedAlertDetail?.id === alert.id || alert.level === 'KRITIS';

      const iconHtml = isSelected
        ? `
        <div class="flex items-center space-x-2 bg-[#11110F] text-ink pl-2 pr-3 py-1.5 rounded-xl border border-line-subtle shadow-xl hover:border-[#E8B52B] transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
          <div class="w-6 h-6 rounded-lg bg-card flex items-center justify-center shrink-0">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${levelColor};"></span>
          </div>
          <div>
            <div class="text-[11px] font-bold font-mono text-ink leading-tight">#${shortTitle}</div>
            <div class="text-[10px] text-ink-2 leading-tight">${alert.meta || alert.location.split(',')[0]}</div>
          </div>
        </div>
      `
        : `
        <div class="flex items-center space-x-1.5 bg-[#11110F]/95 text-ink px-2.5 py-1 rounded-full border border-line-subtle shadow-md hover:border-[#E8B52B] transition-transform hover:scale-105 cursor-pointer whitespace-nowrap">
          <span class="w-2 h-2 rounded-full" style="background-color: ${levelColor};"></span>
          <span class="text-[11px] font-semibold text-ink font-sans">${shortTitle}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-alert-icon',
        html: iconHtml,
        iconSize: isSelected ? [175, 38] : [120, 26],
        iconAnchor: isSelected ? [87, 19] : [60, 13]
      });

      const marker = L.marker(alert.coordinates, { icon: customIcon });
      marker.on('click', () => {
        setSelectedAlertDetail(alert);
      });

      marker.bindTooltip(
        `<div class="px-2.5 py-1.5 text-xs font-sans bg-panel text-ink border border-line-subtle rounded-lg shadow-lg">
          <div class="font-semibold">${alert.title}</div>
          <div class="text-[11px] text-ink-2">${alert.location}</div>
          <div class="text-[10px] text-ink-3 font-mono mt-0.5">${alert.meta}</div>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      markersGroupRef.current?.addLayer(marker);
    });

    // 3. Draw Extra WIM Station Markers (Clean pill badge without ping)
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

      const wimStatusColor = wim.status === 'KRITIS' ? '#D96B5F' : wim.status === 'SIAGA' ? '#D88A45' : '#50A878';
      const wimHtml = `
        <div class="flex items-center space-x-1.5 bg-[#11110F]/95 text-ink px-2.5 py-1 rounded-full border border-line-subtle shadow-md hover:border-[#E8B52B] transition-all cursor-pointer whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${wimStatusColor};"></span>
          <span class="text-[10px] font-mono font-medium">${wim.name.replace('Pos WIM ', '')}</span>
        </div>
      `;
      const wimIcon = L.divIcon({
        className: 'custom-wim-pin',
        html: wimHtml,
        iconSize: [88, 22],
        iconAnchor: [44, 11]
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
      mapInstanceRef.current.setView([-6.3200, 107.0200], 10, { animate: true });
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
    <div id="operations-home-root" className="ops-dashboard select-none font-sans text-slate-100">
      {/* Toast Alert Success */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-4 rounded-card shadow-2xl flex items-center space-x-3 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HEADER SECTION: Pusat Operasi Jalan (Reference 2 Layout) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel border border-line-subtle px-4 py-3 sm:px-5 rounded-card">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 flex items-center justify-center bg-card text-[#E8B52B] rounded-lg shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-[20px] font-semibold text-ink tracking-tight leading-tight">
                Pusat Operasi Jalan
              </h1>
              <span className="text-[11px] font-mono text-ink-3 bg-card px-1.5 py-0.5 rounded-md">
                Jabodetabek & Trans-Jawa
              </span>
            </div>
            <p className="text-[11px] text-ink-2 mt-0.5">
              Wilayah kerja Koridor Nasional & Tol · Pembaruan terkini {lastUpdateTime}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Telemetry Status Chips */}
          <div className="hidden md:flex items-center space-x-2 h-8 px-2.5 rounded-lg bg-card text-xs">
            <span className="w-2 h-2 rounded-full bg-[#50A878]"></span>
            <span className="text-ink-2">OpenVINO Edge: <strong className="text-ink font-mono">6.2 ms</strong></span>
          </div>

          <div className="flex items-center space-x-2 h-8 px-2.5 rounded-lg bg-card text-xs">
            <span className="text-ink-2">WIM:</span>
            <strong className="text-ink">24 Stasiun</strong>
          </div>

          <button
            onClick={handleRefresh}
            title="Perbarui Data Realtime"
            className="w-8 h-8 rounded-lg bg-card hover:bg-raised flex items-center justify-center text-ink-2 hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E8B52B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SECTION: PETA KONDISI JALAN (~65%) + PERLU DITANGANI (~35%) */}
      {/* ========================================================================= */}
      <div className="ops-dashboard__main">
        {/* LEFT COLUMN: PETA KONDISI JALAN (8 cols - Reference 2 Large Natural Map) */}
        <div className="ops-dashboard__map bg-panel border border-line-subtle rounded-map overflow-hidden flex flex-col relative isolate">
          {/* Top Floating Controls inside Map (Reference 2 Style) */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
            {/* Search Input + Status Filter Pill */}
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
              <div className="ops-map-control gap-2 px-3 text-xs text-ink">
                <Search className="w-3.5 h-3.5 text-ink-2" />
                <input
                  type="text"
                  placeholder="Cari koridor tol, ruas, KM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-ink placeholder-ink-3 w-36 sm:w-52"
                />
              </div>

              {/* Status Filter Pill Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="ops-map-control gap-1.5 px-3 text-xs font-medium text-ink hover:border-line-active transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-[#E8B52B]" />
                  <span>
                    Status: {selectedStatusFilter === 'ALL'
                      ? 'Semua'
                      : selectedStatusFilter === 'NORMAL'
                      ? 'Normal'
                      : selectedStatusFilter === 'WASPADA'
                      ? 'Waspada'
                      : selectedStatusFilter === 'SIAGA'
                      ? 'Siaga'
                      : 'Kritis'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-ink-2" />
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-panel rounded-lg shadow-lg border border-line-subtle py-1 z-40">
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('ALL');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span>Semua Status</span>
                      {selectedStatusFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-[#E8B52B]" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('NORMAL');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#50A878]"></span>
                        <span>Normal</span>
                      </span>
                      {selectedStatusFilter === 'NORMAL' && <Check className="w-3.5 h-3.5 text-[#50A878]" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('WASPADA');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#D7A84B]"></span>
                        <span>Waspada</span>
                      </span>
                      {selectedStatusFilter === 'WASPADA' && <Check className="w-3.5 h-3.5 text-[#D7A84B]" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('SIAGA');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#D88A45]"></span>
                        <span>Siaga</span>
                      </span>
                      {selectedStatusFilter === 'SIAGA' && <Check className="w-3.5 h-3.5 text-[#D88A45]" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStatusFilter('KRITIS');
                        setIsFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#D96B5F]"></span>
                        <span>Kritis</span>
                      </span>
                      {selectedStatusFilter === 'KRITIS' && <Check className="w-3.5 h-3.5 text-[#D96B5F]" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls: Theme Switcher & Recenter */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Theme Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="ops-map-control gap-1.5 px-3 text-xs font-medium text-ink hover:border-line-active transition-colors cursor-pointer"
                  title="Ganti Mode Basemap"
                >
                  {mapTheme === 'REAL_LIGHT' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#E8B52B]" />
                      <span className="hidden sm:inline">Peta Terang</span>
                    </>
                  ) : mapTheme === 'SATELLITE' ? (
                    <>
                      <Satellite className="w-3.5 h-3.5 text-[#50A878]" />
                      <span className="hidden sm:inline">Satelit</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#E8B52B]" />
                      <span className="hidden sm:inline">Dark GIS</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-ink-2" />
                </button>

                {isThemeMenuOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-44 bg-panel rounded-lg shadow-lg border border-line-subtle py-1 z-40">
                    <button
                      onClick={() => {
                        setMapTheme('REAL_LIGHT');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Sun className="w-3.5 h-3.5 text-[#E8B52B]" />
                        <span>Peta Terang (Default)</span>
                      </span>
                      {mapTheme === 'REAL_LIGHT' && <Check className="w-3.5 h-3.5 text-[#E8B52B]" />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('DARK_MODE');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Moon className="w-3.5 h-3.5 text-ink-2" />
                        <span>Dark GIS</span>
                      </span>
                      {mapTheme === 'DARK_MODE' && <Check className="w-3.5 h-3.5 text-[#E8B52B]" />}
                    </button>
                    <button
                      onClick={() => {
                        setMapTheme('SATELLITE');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-card text-ink flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Satellite className="w-3.5 h-3.5 text-[#50A878]" />
                        <span>Satelit ArcGIS</span>
                      </span>
                      {mapTheme === 'SATELLITE' && <Check className="w-3.5 h-3.5 text-[#50A878]" />}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Shared globe tile (MapLibre): same engine, reports and coordinates as the map tabs */}
          <div className="relative w-full h-full flex-1 min-h-0 z-0">
            <PavementMap compact engine="globe" roadSegments={roadSegments ?? []} selectedSegment={selectedSegment ?? null} onSelectSegment={onSelectSegment ?? (() => {})} communityReports={communityReports ?? []} />
          </div>

          {/* Bottom-left: "+ Catat Kejadian" (the globe has its own zoom control) */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
            <button
              onClick={() => setIsCreateAlertModalOpen(true)}
              className="bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs px-3 h-8 rounded-control shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Catat Kejadian</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PERLU DITANGANI / DAFTAR PRIORITAS (Actionable Alerts Only) */}
        {(() => {
          const actionableAlerts = activeAlerts.filter((a) => a.level !== 'NORMAL');
          const criticalCount = actionableAlerts.filter((a) => a.level === 'KRITIS').length;
          // Status colour only where it means something: the badge. The badge already says the level,
          // so a title like "Kritis - ODOL Terlampaui" is shown without repeating it.
          const levelBadge: Record<string, string> = {
            KRITIS: 'bg-[#D86660]/14 text-[#E07B75]',
            SIAGA: 'bg-[#D98A45]/14 text-[#E09A5C]',
            WASPADA: 'bg-[#D7A449]/14 text-[#DDB25F]'
          };
          const shortTitle = (title: string) => title.replace(/^(kritis|siaga|waspada)\s*[-–—:]\s*/i, '');

          return (
            <div className="ops-dashboard__panel bg-panel border border-line-subtle rounded-panel p-4 flex flex-col min-h-0">
              <div className="shrink-0">
                {/* Header: label, count (the figure to read first), link to the full list */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-ink-2 leading-5">Perlu ditangani</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-[26px] font-semibold text-ink leading-none tracking-tight tabular-nums">
                        {actionableAlerts.length}
                      </span>
                      <span className="text-[12px] text-ink-2">
                        kejadian
                        {criticalCount > 0 && <span className="text-[#E07B75]"> · {criticalCount} kritis</span>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAllAlertsModalOpen(true)}
                    className="shrink-0 text-[12px] font-medium text-[#E8B52B] hover:text-[#f3be48] transition-colors cursor-pointer leading-5"
                  >
                    Lihat semua ({actionableAlerts.length})
                  </button>
                </div>

                <div className="mt-3 mb-2">
                  <h4 className="text-[13px] font-medium text-ink leading-tight">Daftar prioritas operasional</h4>
                  <p className="text-[11px] text-ink-3 leading-tight mt-0.5">Urutan: urgensi, dampak struktur, disposisi</p>
                </div>
              </div>

              {/* Priority list (Normal excluded); scrolls inside the panel when it outgrows it */}
              <div className="flex-1 min-h-0 overflow-y-auto pinn-scrollable -mr-2 pr-2">
                <ul className="space-y-2">
                  {actionableAlerts.map((alert) => (
                    <li
                      key={alert.id}
                      onClick={() => setSelectedAlertDetail(alert)}
                      className="px-3.5 py-2.5 rounded-nested bg-card border border-line-subtle hover:bg-raised hover:border-line-active transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 px-1.5 py-px rounded-md text-[10px] font-semibold tracking-wide leading-4 ${levelBadge[alert.level] ?? 'bg-raised text-ink-2'}`}>
                          {alert.level}
                        </span>
                        <h5 className="flex-1 min-w-0 truncate text-[12px] font-medium text-ink leading-[1.4]" title={alert.title}>
                          {shortTitle(alert.title)}
                        </h5>
                        <span className="shrink-0 text-[11px] text-ink-3 leading-[1.4]">{alert.timeAgo}</span>
                      </div>
                      <p className="mt-2 truncate text-[12px] text-ink-2 leading-[1.4]">{alert.location}</p>
                      <p className="mt-1 truncate text-[11px] text-ink-3 leading-[1.4] tabular-nums">{alert.meta}</p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-3 leading-none">Menunggu disposisi</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteQuickAction(
                              alert.category === 'ODOL' ? 'BATASI' : alert.category === 'WEATHER' ? 'ALIHKAN' : 'KIRIM_TIM'
                            );
                          }}
                          className="h-7 px-2.5 rounded-md bg-raised hover:bg-raised-hover border border-line-subtle text-ink font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          Tindak cepat
                          <ChevronRight className="w-3 h-3 text-ink-2" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer link */}
              <div className="shrink-0 mt-3 pt-3 border-t border-line-subtle flex items-center justify-between gap-3 text-[12px]">
                <span className="text-ink-3 text-[11px]">Sistem tilang WIM terintegrasi</span>
                <button
                  onClick={goToWim}
                  className="text-[#E8B52B] hover:text-[#f3be48] font-medium inline-flex items-center gap-1 cursor-pointer text-[12px]"
                >
                  Buka data ODOL
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* 3. OPERATIONAL METRICS: 6 Cohesive Cards (Section 2.C Prioritized Order) */}
      {/* ========================================================================= */}
      {(() => {
        const pendingReportsCount = communityReports.filter((r) => r.status === 'PENDING').length;
        const scheduledReportsCount = communityReports.filter((r) => r.status === 'SCHEDULED_FOR_REPAIR').length;
        const resolvedReportsCount = communityReports.filter(
          (r) => r.status === 'REPAIRED' || r.status === 'CLOSED' || r.status === 'VERIFIED_BY_ENGINEER'
        ).length;

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Kejadian Kritis */}
            <div
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'KRITIS' ? 'ALL' : 'KRITIS')}
              className={`bg-panel border rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between ${
                selectedStatusFilter === 'KRITIS'
                  ? 'border-[#D96B5F]/60 bg-raised'
                  : 'border-line-subtle hover:border-line-active'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">Kejadian Kritis</span>
                <span className="w-2 h-2 rounded-full bg-[#D96B5F]" />
              </div>
              <div className="my-1.5">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">
                  {activeAlerts.filter((a) => a.level === 'KRITIS').length || 3}
                </p>
              </div>
              <p className="text-[11px] text-[#D96B5F] truncate">Perlu tindakan segera</p>
            </div>

            {/* Card 2: Belum Ditugaskan */}
            <div
              onClick={() => setReportFilterTab('PENDING')}
              className={`bg-panel border rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between ${
                reportFilterTab === 'PENDING'
                  ? 'border-[#D7A84B]/60 bg-raised'
                  : 'border-line-subtle hover:border-line-active'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">Belum Ditugaskan</span>
                <span className="w-2 h-2 rounded-full bg-[#D7A84B]" />
              </div>
              <div className="my-1.5">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">
                  {pendingReportsCount}
                </p>
              </div>
              <p className="text-[11px] text-ink-2 truncate">Laporan warga menunggu SPK</p>
            </div>

            {/* Card 3: Sedang Ditangani */}
            <div
              onClick={() => setReportFilterTab('SCHEDULED')}
              className={`bg-panel border rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between ${
                reportFilterTab === 'SCHEDULED'
                  ? 'border-[#D88A45]/60 bg-raised'
                  : 'border-line-subtle hover:border-line-active'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">Sedang Ditangani</span>
                <span className="w-2 h-2 rounded-full bg-[#D88A45]" />
              </div>
              <div className="my-1.5">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">
                  {scheduledReportsCount}
                </p>
              </div>
              <p className="text-[11px] text-[#D88A45] truncate">SPK aktif di lapangan</p>
            </div>

            {/* Card 4: Selesai & Valid */}
            <div
              onClick={() => setReportFilterTab('RESOLVED')}
              className={`bg-panel border rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between ${
                reportFilterTab === 'RESOLVED'
                  ? 'border-[#50A878]/60 bg-raised'
                  : 'border-line-subtle hover:border-line-active'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">Selesai & Valid</span>
                <span className="w-2 h-2 rounded-full bg-[#50A878]" />
              </div>
              <div className="my-1.5">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">
                  {resolvedReportsCount}
                </p>
              </div>
              <p className="text-[11px] text-[#50A878] truncate">Perbaikan terverifikasi</p>
            </div>

            {/* Card 5: WIM Aktif */}
            <div
              onClick={goToWim}
              className="bg-panel border border-line-subtle hover:border-line-active rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">WIM Aktif</span>
                <Scale className="w-3.5 h-3.5 text-ink-2 group-hover:text-ink transition-colors" />
              </div>
              <div className="my-1.5">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">24</p>
              </div>
              <p className="text-[11px] text-[#50A878] truncate">Stasiun sensor online</p>
            </div>

            {/* Card 6: Waktu Respons */}
            <div
              onClick={goToSPK}
              className="bg-panel border border-line-subtle hover:border-line-active rounded-card px-4 py-3.5 min-h-[88px] transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-2">Waktu Respons</span>
                <Clock className="w-3.5 h-3.5 text-ink-2 group-hover:text-ink transition-colors" />
              </div>
              <div className="my-1.5 flex items-baseline space-x-1">
                <p className="text-[26px] font-semibold text-ink tracking-tight leading-none">12,4</p>
                <span className="text-xs font-normal text-ink-2">menit</span>
              </div>
              <p className="text-[11px] text-[#50A878] truncate">Target &lt; 15 mnt (Baik)</p>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. ANTREAN LAPORAN KERUSAKAN & PENUGASAN (Reference 2 Orders Table) */}
      {/* ========================================================================= */}
      <div className="bg-panel border border-line-subtle rounded-panel p-4 sm:p-5 space-y-3">
        {/* Header Section with Reference 2 Segmented Status Tabs */}
        {(() => {
          const pendingCount = communityReports.filter((r) => r.status === 'PENDING').length;
          const scheduledCount = communityReports.filter((r) => r.status === 'SCHEDULED_FOR_REPAIR').length;
          const evidenceCount = communityReports.filter((r) => r.status === 'VERIFIED_BY_ENGINEER').length;
          const resolvedCount = communityReports.filter((r) => r.status === 'REPAIRED' || r.status === 'CLOSED').length;

          return (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-line-subtle">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 flex items-center justify-center bg-card text-ink-2 rounded-lg shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-semibold text-[15px] text-ink">
                      Laporan Kerusakan Warga & Penugasan SPK
                    </h3>
                  </div>
                  <p className="text-[11px] text-ink-2 mt-0.5">
                    Antrean terintegrasi · verifikasi insinyur · disposisi tim penanganan cepat
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills (Reference 2 Orders Style) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center flex-wrap gap-1">
                  <button
                    onClick={() => setReportFilterTab('ALL')}
                    className={`h-[30px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      reportFilterTab === 'ALL'
                        ? 'bg-[#E6E1D3] text-[#1C1C1A] border-[#E6E1D3]'
                        : 'border-line-subtle text-ink-2 hover:text-ink hover:bg-card'
                    }`}
                  >
                    Semua ({communityReports.length})
                  </button>
                  <button
                    onClick={() => setReportFilterTab('PENDING')}
                    className={`h-[30px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      reportFilterTab === 'PENDING'
                        ? 'bg-[#E6E1D3] text-[#1C1C1A] border-[#E6E1D3]'
                        : 'border-line-subtle text-ink-2 hover:text-ink hover:bg-card'
                    }`}
                  >
                    Belum Ditugaskan ({pendingCount})
                  </button>
                  <button
                    onClick={() => setReportFilterTab('SCHEDULED')}
                    className={`h-[30px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      reportFilterTab === 'SCHEDULED'
                        ? 'bg-[#E6E1D3] text-[#1C1C1A] border-[#E6E1D3]'
                        : 'border-line-subtle text-ink-2 hover:text-ink hover:bg-card'
                    }`}
                  >
                    SPK Ditugaskan ({scheduledCount})
                  </button>
                  <button
                    onClick={() => setReportFilterTab('VERIFIED')}
                    className={`h-[30px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      reportFilterTab === 'VERIFIED'
                        ? 'bg-[#E6E1D3] text-[#1C1C1A] border-[#E6E1D3]'
                        : 'border-line-subtle text-ink-2 hover:text-ink hover:bg-card'
                    }`}
                  >
                    Bukti Masuk ({evidenceCount})
                  </button>
                  <button
                    onClick={() => setReportFilterTab('RESOLVED')}
                    className={`h-[30px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      reportFilterTab === 'RESOLVED'
                        ? 'bg-[#E6E1D3] text-[#1C1C1A] border-[#E6E1D3]'
                        : 'border-line-subtle text-ink-2 hover:text-ink hover:bg-card'
                    }`}
                  >
                    Selesai ({resolvedCount})
                  </button>
                </div>

                <button
                  onClick={goToReports}
                  className="h-[30px] px-3 rounded-lg bg-transparent hover:bg-card text-ink font-medium text-xs flex items-center space-x-1 border border-line-subtle transition-colors cursor-pointer ml-auto"
                >
                  <span>Buka Antrean Lengkap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {(() => {
          const filteredReports = communityReports.filter((report) => {
            if (reportFilterTab === 'PENDING') return report.status === 'PENDING';
            if (reportFilterTab === 'SCHEDULED') return report.status === 'SCHEDULED_FOR_REPAIR';
            if (reportFilterTab === 'VERIFIED') return report.status === 'VERIFIED_BY_ENGINEER';
            if (reportFilterTab === 'RESOLVED') return report.status === 'REPAIRED' || report.status === 'CLOSED';
            return true;
          });

          if (filteredReports.length === 0) {
            return (
              <div className="py-10 text-center text-ink-2 text-xs">
                Tidak ada laporan kerusakan dalam status ini.
              </div>
            );
          }

          return (
            <>
              {/* Desktop Table View (Matching Reference 2 Orders) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-ink-3 font-medium uppercase text-[10.5px] tracking-wider border-b border-line-subtle whitespace-nowrap">
                      <th className="py-2.5 px-3.5">ID Laporan</th>
                      <th className="py-2.5 px-3.5">Jenis Kerusakan</th>
                      <th className="py-2.5 px-3.5">Lokasi & Koridor</th>
                      <th className="py-2.5 px-3.5">Waktu Laporan</th>
                      <th className="py-2.5 px-3.5">Prioritas</th>
                      <th className="py-2.5 px-3.5">Status Penugasan</th>
                      <th className="py-2.5 px-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A27]">
                    {filteredReports.slice(0, 5).map((report) => {
                      const isUnassigned = report.status === 'PENDING';
                      const isScheduled = report.status === 'SCHEDULED_FOR_REPAIR';
                      const isEvidenceReady = report.status === 'VERIFIED_BY_ENGINEER';
                      const isResolved = report.status === 'REPAIRED' || report.status === 'CLOSED';

                      return (
                        <tr key={report.id} className="hover:bg-card transition-colors">
                          <td className="py-2 px-3.5">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-3.5 h-3.5 text-ink-2 shrink-0" />
                              <span className="font-mono text-ink font-semibold">
                                #{report.id.slice(-5).toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3.5">
                            <div className="flex items-center space-x-3">
                              <img
                                src={report.photoUrl}
                                alt={report.damageTypeLabel}
                                className="w-8 h-8 rounded-md object-cover shrink-0 bg-[#11110F]"
                              />
                              <span className="font-medium text-ink truncate max-w-[150px]">
                                {report.damageTypeLabel}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3.5">
                            <div className="flex items-center space-x-1.5 text-ink">
                              <MapPin className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                              <span className="truncate max-w-[220px] xl:max-w-[260px]">{report.segmentName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3.5 font-mono text-ink-2 whitespace-nowrap">
                            {report.timestamp}
                          </td>
                          <td className="py-2 px-3.5">
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-pill ${
                                report.severity === 'CRITICAL'
                                  ? 'bg-[#D96B5F]/15 text-[#D96B5F]'
                                  : 'bg-[#D7A84B]/15 text-[#D7A84B]'
                              }`}
                            >
                              {report.severity === 'CRITICAL' ? 'KRITIS' : 'SEDANG'}
                            </span>
                          </td>
                          <td className="py-2 px-3.5">
                            {isUnassigned ? (
                              <span className="font-medium text-[#D7A84B] flex items-center gap-1.5 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D7A84B]" />
                                Belum Ditugaskan
                              </span>
                            ) : isScheduled ? (
                              <span className="font-medium text-ink flex items-center gap-1.5">
                                <HardHat className="w-3.5 h-3.5 text-[#E8B52B] shrink-0" />
                                SPK Ditugaskan
                              </span>
                            ) : isEvidenceReady ? (
                              <span className="font-medium text-[#50A878] flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#50A878]" />
                                Bukti Masuk (Verifikasi)
                              </span>
                            ) : isResolved ? (
                              <span className="font-medium text-[#50A878] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#50A878]" />
                                Selesai & Valid
                              </span>
                            ) : (
                              <span className="text-ink-2">{report.status}</span>
                            )}
                          </td>
                          <td className="py-2 px-3.5 text-right whitespace-nowrap">
                            {isUnassigned ? (
                              <button
                                onClick={() => onOpenCreateTask && onOpenCreateTask(report)}
                                className="h-[30px] px-3 rounded-lg bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                              >
                                <HardHat className="w-3.5 h-3.5" />
                                <span>Tugaskan Petugas</span>
                              </button>
                            ) : isEvidenceReady ? (
                              <button
                                onClick={() => onOpenVerifyTask && onOpenVerifyTask(report)}
                                className="h-[30px] px-3 rounded-lg bg-[#50A878] hover:bg-[#439569] text-white font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verifikasi Hasil</span>
                              </button>
                            ) : (
                              <button
                                onClick={goToReports}
                                className="h-[30px] px-3 rounded-lg bg-transparent hover:bg-card text-ink font-medium text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer border border-line-subtle"
                              >
                                <span>Lihat Detail</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Fallback */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredReports.slice(0, 3).map((report) => {
                  const isUnassigned = report.status === 'PENDING';
                  const isScheduled = report.status === 'SCHEDULED_FOR_REPAIR';
                  const isEvidenceReady = report.status === 'VERIFIED_BY_ENGINEER';

                  return (
                    <div
                      key={report.id}
                      className="p-3.5 rounded-nested bg-card border border-line-subtle space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img
                            src={report.reporterAvatar || currentAccount.avatarUrl}
                            alt={report.reporterName}
                            className="w-5 h-5 rounded-full object-cover border border-line-subtle"
                          />
                          <span className="text-xs font-semibold text-ink truncate max-w-[120px]">
                            {report.reporterName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-pill ${
                            report.severity === 'CRITICAL'
                              ? 'bg-[#D96B5F]/15 text-[#D96B5F]'
                              : 'bg-[#D7A84B]/15 text-[#D7A84B]'
                          }`}
                        >
                          {report.severity === 'CRITICAL' ? 'KRITIS' : 'SEDANG'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <img
                          src={report.photoUrl}
                          alt={report.damageTypeLabel}
                          className="w-14 h-14 rounded-lg object-cover border border-line-subtle shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-xs font-semibold text-ink truncate">{report.damageTypeLabel}</h4>
                          <p className="text-[11px] text-ink-2 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#E8B52B] shrink-0" />
                            <span>{report.segmentName}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{report.timestamp}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line-subtle">
                        {isUnassigned ? (
                          <button
                            onClick={() => onOpenCreateTask && onOpenCreateTask(report)}
                            className="w-full py-2 px-3 rounded-lg bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <HardHat className="w-3.5 h-3.5" />
                            <span>Tugaskan Petugas</span>
                          </button>
                        ) : isEvidenceReady ? (
                          <button
                            onClick={() => onOpenVerifyTask && onOpenVerifyTask(report)}
                            className="w-full py-2 px-3 rounded-lg bg-[#50A878] hover:bg-[#439569] text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verifikasi Hasil</span>
                          </button>
                        ) : (
                          <button
                            onClick={goToReports}
                            className="w-full py-2 px-3 rounded-lg bg-panel hover:bg-card text-ink font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-line-subtle"
                          >
                            <span>Lihat Detail Laporan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>



      {/* ========================================================================= */}
      {/* MODAL 1: BUAT PERINGATAN BARU (DARK GIS THEME) */}
      {/* ========================================================================= */}
      {isCreateAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#11110F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-line-subtle w-full max-w-lg rounded-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#E8B52B]/15 text-[#E8B52B]">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-ink">Catat Kejadian Baru</h3>
                  <p className="text-[11px] text-ink-2">Publikasikan sinyal peringatan ke VMS & Petugas Lapangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateAlertModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-raised text-ink-2 hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAlertSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Tingkat Urgensi Peringatan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'KRITIS' })}
                    className={`py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                      newAlertForm.level === 'KRITIS'
                        ? 'bg-[#D96B5F]/20 border-[#D96B5F] text-[#D96B5F]'
                        : 'bg-raised border-line-subtle text-ink-2'
                    }`}
                  >
                    Kritis (Merah)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'SIAGA' })}
                    className={`py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                      newAlertForm.level === 'SIAGA'
                        ? 'bg-[#D88A45]/20 border-[#D88A45] text-[#D88A45]'
                        : 'bg-raised border-line-subtle text-ink-2'
                    }`}
                  >
                    Siaga (Oranye)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'WASPADA' })}
                    className={`py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                      newAlertForm.level === 'WASPADA'
                        ? 'bg-[#D7A84B]/20 border-[#D7A84B] text-[#D7A84B]'
                        : 'bg-raised border-line-subtle text-ink-2'
                    }`}
                  >
                    Waspada (Kuning)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Kategori Masalah</label>
                <select
                  value={newAlertForm.category}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, category: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-line-subtle bg-raised text-ink font-medium focus:border-[#E8B52B] outline-none"
                >
                  <option value="ODOL">ODOL (Over Dimension Over Loading)</option>
                  <option value="WEATHER">Cuaca Ekstrem / Hujan Badai</option>
                  <option value="FLOOD">Genangan Air / Banjir Ruas</option>
                  <option value="TRAFFIC">Kepadatan Lalu Lintas / Rekayasa</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Judul Kejadian</label>
                <input
                  type="text"
                  placeholder="Contoh: Kritis - Truk Tronton ODOL 65 Ton"
                  value={newAlertForm.title}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-line-subtle bg-raised text-ink font-medium focus:border-[#E8B52B] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Lokasi Ruas Jalan</label>
                <input
                  type="text"
                  placeholder="Contoh: KM 62 + 200, Tol Jakarta - Cikampek"
                  value={newAlertForm.location}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, location: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-lg border border-line-subtle bg-raised text-ink font-medium focus:border-[#E8B52B] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Data / Metadata Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Beban berlebih: 65 ton | Intensitas: 80 mm/jam"
                  value={newAlertForm.meta}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, meta: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-line-subtle bg-raised text-ink font-medium focus:border-[#E8B52B] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Uraian & Instruksi Tindakan</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan kondisi perkerasan dan instruksi operasional bagi petugas gerbang / patroli..."
                  value={newAlertForm.details}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, details: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-line-subtle bg-raised text-ink font-medium focus:border-[#E8B52B] outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-line-subtle flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAlertModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-raised hover:bg-raised-hover text-ink-2 hover:text-ink font-medium transition-colors cursor-pointer border border-line-subtle"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-semibold transition-colors cursor-pointer"
                >
                  Terbitkan Peringatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL PERINGATAN AKTIF (DARK GIS THEME) */}
      {/* ========================================================================= */}
      {selectedAlertDetail && (
        <div className="fixed inset-0 z-50 bg-[#11110F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-line-subtle w-full max-w-lg rounded-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-raised text-[#E8B52B] border border-line-subtle">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        selectedAlertDetail.level === 'KRITIS'
                          ? 'bg-[#D96B5F]/15 text-[#D96B5F]'
                          : selectedAlertDetail.level === 'SIAGA'
                          ? 'bg-[#D88A45]/15 text-[#D88A45]'
                          : selectedAlertDetail.level === 'WASPADA'
                          ? 'bg-[#D7A84B]/15 text-[#D7A84B]'
                          : 'bg-[#50A878]/20 text-[#50A878] border border-[#50A878]/30'
                      }`}
                    >
                      {selectedAlertDetail.level}
                    </span>
                    <span className="text-xs text-ink-2 font-mono">{selectedAlertDetail.timeAgo}</span>
                  </div>
                  <h3 className="font-semibold text-base text-ink mt-0.5">{selectedAlertDetail.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertDetail(null)}
                className="p-1.5 rounded-lg hover:bg-raised text-ink-2 hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-lg bg-raised border border-line-subtle">
                <span className="text-ink-2 text-[11px]">Lokasi Ruas:</span>
                <p className="text-sm font-semibold text-ink mt-0.5">{selectedAlertDetail.location}</p>
                <p className="text-[11px] text-[#E8B52B] font-medium mt-0.5">{selectedAlertDetail.meta}</p>
              </div>

              <div>
                <h4 className="font-medium text-ink mb-1">Rincian Laporan Telemetri:</h4>
                <p className="text-ink-2 leading-relaxed bg-raised/60 p-3 rounded-lg border border-line-subtle">
                  {selectedAlertDetail.details}
                </p>
              </div>

              {selectedAlertDetail.recommendedAction && (
                <div className="p-3.5 rounded-lg bg-raised border border-line-subtle">
                  <div className="flex items-center space-x-1.5 text-[#E8B52B] font-semibold mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Rekomendasi Tindakan Operasional:</span>
                  </div>
                  <p className="text-ink text-xs leading-relaxed">
                    {selectedAlertDetail.recommendedAction}
                  </p>
                </div>
              )}

              {/* Action Buttons inside Detail */}
              <div className="pt-3 border-t border-line-subtle flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedAlertDetail(null);
                    handleExecuteQuickAction('BATASI');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#D96B5F] hover:bg-[#cb584c] text-white font-medium transition-colors cursor-pointer"
                >
                  Tindak Langsung
                </button>
                <button
                  onClick={() => setSelectedAlertDetail(null)}
                  className="px-4 py-2 rounded-lg bg-raised hover:bg-raised-hover text-ink-2 hover:text-ink font-medium transition-colors cursor-pointer border border-line-subtle"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI TINDAKAN OPERASIONAL (DARK GIS THEME) */}
      {/* ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#11110F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-line-subtle w-full max-w-md rounded-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#E8B52B]/15 text-[#E8B52B]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-ink">Konfirmasi Eksekusi Protokol</h3>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-raised text-ink-2 hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <p className="text-ink-2 leading-relaxed">
                {actionModalType === 'BATASI' &&
                  'Apakah Anda yakin ingin mengirimkan instruksi pembatasan muatan berat ke Pos Jembatan Timbang & GTO Tol Cikampek Utama? Sanksi transfer muatan akan segera diberlakukan.'}
                {actionModalType === 'ALIHKAN' &&
                  'Apakah Anda yakin ingin mengaktifkan pengalihan arus ke rute arteri alternatif dan menyalakan display VMS otomatis?'}
                {actionModalType === 'KIRIM_TIM' &&
                  'Apakah Anda ingin menerbitkan SPK darurat dan mengerahkan Tim Pemeliharaan Cepat Bina Marga ke titik genangan KM 12 JORR?'}
              </p>

              <div className="p-3 rounded-lg bg-raised border border-line-subtle text-xs text-ink-2 space-y-0.5">
                <p>Operator: <strong className="text-ink">{currentAccount.name}</strong></p>
                <p>Hak Akses: <strong className="text-[#E8B52B]">RBAC Level 2 (Operations Dispatcher)</strong></p>
              </div>

              <div className="pt-3 border-t border-line-subtle flex items-center justify-end space-x-2">
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-raised hover:bg-raised-hover text-ink-2 hover:text-ink font-medium transition-colors cursor-pointer border border-line-subtle"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-4 py-2 rounded-lg bg-[#E8B52B] hover:bg-[#d49e29] text-[#11110F] font-semibold transition-colors cursor-pointer"
                >
                  Ya, Eksekusi Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SEMUA PERINGATAN (DARK GIS THEME) */}
      {/* ========================================================================= */}
      {isAllAlertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#11110F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-line-subtle w-full max-w-2xl rounded-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#E8B52B]/15 text-[#E8B52B]">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-ink">Semua Peringatan & Riwayat Kejadian</h3>
                  <p className="text-[11px] text-ink-2">Daftar anomali telemetri sensor dan kondisi operasional</p>
                </div>
              </div>
              <button
                onClick={() => setIsAllAlertsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-raised text-ink-2 hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setIsAllAlertsModalOpen(false);
                    setSelectedAlertDetail(alert);
                  }}
                  className="p-3 rounded-lg bg-raised hover:bg-raised/80 border border-line-subtle hover:border-slate-500 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        alert.level === 'KRITIS'
                          ? 'bg-[#D96B5F]/15 text-[#D96B5F]'
                          : alert.level === 'SIAGA'
                          ? 'bg-[#D88A45]/15 text-[#D88A45]'
                          : alert.level === 'WASPADA'
                          ? 'bg-[#D7A84B]/15 text-[#D7A84B]'
                          : 'bg-[#50A878]/20 text-[#50A878] border border-[#50A878]/30'
                      }`}
                    >
                      {alert.level}
                    </span>
                    <span className="text-[11px] font-mono text-ink-2">{alert.timeAgo}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-ink">{alert.title}</h4>
                  <p className="text-[11px] text-ink-2 mt-0.5">{alert.location}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{alert.details}</p>
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t border-line-subtle flex justify-end">
              <button
                onClick={() => setIsAllAlertsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-raised hover:bg-raised-hover text-ink text-xs font-medium transition-colors cursor-pointer border border-line-subtle"
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
