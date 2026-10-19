import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { attachMapResizeRecovery } from '../../components/maps/mapViewport';
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
  ChevronLeft,
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
  Share2,
  FileDown,
  PhoneCall,
  Sun,
  Moon,
  Satellite,
  Radio,
  Sliders,
  Flame,
  Zap
} from 'lucide-react';
import { RoadSegment, SimulationResult, DamageReport } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import confetti from 'canvas-confetti';
import { PavementMap } from '../../components/maps/PavementMap';

interface OperationsPosWimMapViewProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment?: RoadSegment | null;
  onSelectSegment?: (segment: RoadSegment) => void;
  communityReports?: DamageReport[];
  simulationResult?: SimulationResult | null;
  onNavigateToWim?: () => void;
  onNavigateToSPK?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToAlerts?: () => void;
  onOpenSimulation?: (segment: RoadSegment) => void;
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
  lane?: string;
  recommendedAction?: string;
}

interface WimStation {
  id: string;
  name: string;
  corridor: string;
  coords: [number, number];
  status: 'KRITIS' | 'SIAGA' | 'WASPADA' | 'NORMAL';
  liveVehicles: number;
  overloadCount: number;
  lastGvw: string;
  maxGvwToday: string;
  sensorHealth: string;
  laneCount: number;
}

export const OperationsPosWimMapView: React.FC<OperationsPosWimMapViewProps> = ({
  currentAccount,
  roadSegments = [],
  selectedSegment,
  onSelectSegment,
  communityReports = [],
  simulationResult,
  onNavigateToWim,
  onNavigateToSPK,
  onNavigateToReports,
  onNavigateToAlerts,
  onOpenSimulation
}) => {
  // Status Filter State
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'NORMAL' | 'WASPADA' | 'SIAGA' | 'KRITIS'>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [isLayerDropdownOpen, setIsLayerDropdownOpen] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<'STANDARD' | 'SATELLITE' | 'TRAFFIC' | 'WIM_HEATMAP'>('STANDARD');

  // Map Theme: Real Light (Default matching Reference 2), Satelit, Dark Mode
  const [mapTheme, setMapTheme] = useState<'DARK_MODE' | 'SATELLITE' | 'REAL_LIGHT'>('REAL_LIGHT');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);

  // Search Corridor / WIM
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Carousel scroll ref
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<AlertItem | null>(null);
  const [isAllAlertsModalOpen, setIsAllAlertsModalOpen] = useState<boolean>(false);
  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] = useState<boolean>(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionModalType, setActionModalType] = useState<'BATASI' | 'ALIHKAN' | 'KIRIM_TIM' | 'TILANG' | null>(null);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState<boolean>(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [selectedWimStation, setSelectedWimStation] = useState<WimStation | null>(null);

  // Form state for creating new alert
  const [newAlertForm, setNewAlertForm] = useState({
    level: 'KRITIS' as 'KRITIS' | 'SIAGA' | 'WASPADA',
    title: '',
    location: 'Tol Jakarta - Cikampek KM 62+200',
    meta: '',
    details: '',
    category: 'ODOL' as 'ODOL' | 'WEATHER' | 'FLOOD' | 'TRAFFIC'
  });

  // WIM Stations Data
  const [wimStations, setWimStations] = useState<WimStation[]>([
    {
      id: 'wim-1',
      name: 'Pos WIM KM 62 Cikampek',
      corridor: 'Tol Jakarta - Cikampek',
      coords: [-6.385, 107.285],
      status: 'KRITIS',
      liveVehicles: 1842,
      overloadCount: 142,
      lastGvw: '67.4 Ton (+68.5%)',
      maxGvwToday: '72.1 Ton',
      sensorHealth: '99.4% (Optik + Piezo)',
      laneCount: 4
    },
    {
      id: 'wim-2',
      name: 'Pos WIM Pelabuhan Priok',
      corridor: 'Arteri Tanjung Priok',
      coords: [-6.1384, 106.8640],
      status: 'KRITIS',
      liveVehicles: 2310,
      overloadCount: 188,
      lastGvw: '62.1 Ton (+55.2%)',
      maxGvwToday: '68.0 Ton',
      sensorHealth: '98.8% (Bending Plate)',
      laneCount: 3
    },
    {
      id: 'wim-3',
      name: 'Pos WIM Jagorawi Ciawi',
      corridor: 'Tol Jagorawi KM 48',
      coords: [-6.582, 106.845],
      status: 'SIAGA',
      liveVehicles: 1450,
      overloadCount: 48,
      lastGvw: '44.2 Ton (+10.5%)',
      maxGvwToday: '49.8 Ton',
      sensorHealth: '100% (High Speed)',
      laneCount: 3
    },
    {
      id: 'wim-4',
      name: 'Pos WIM JORR Lenteng Agung',
      corridor: 'Tol JORR KM 12',
      coords: [-6.295, 106.812],
      status: 'WASPADA',
      liveVehicles: 3120,
      overloadCount: 32,
      lastGvw: '41.8 Ton (+4.5%)',
      maxGvwToday: '46.0 Ton',
      sensorHealth: '97.6% (Piezoelektrik)',
      laneCount: 4
    },
    {
      id: 'wim-5',
      name: 'Pos WIM Tangerang Barat',
      corridor: 'Tol Tangerang - Merak KM 28',
      coords: [-6.1783, 106.6319],
      status: 'NORMAL',
      liveVehicles: 1980,
      overloadCount: 12,
      lastGvw: '36.5 Ton (Normal)',
      maxGvwToday: '39.8 Ton',
      sensorHealth: '100% (Dual Sensor)',
      laneCount: 4
    },
    {
      id: 'wim-6',
      name: 'Pos WIM Cikarang Utama',
      corridor: 'Tol Jakarta - Cikampek KM 30',
      coords: [-6.2750, 107.0500],
      status: 'NORMAL',
      liveVehicles: 2890,
      overloadCount: 18,
      lastGvw: '37.2 Ton (Normal)',
      maxGvwToday: '41.0 Ton',
      sensorHealth: '99.1% (High Speed)',
      laneCount: 4
    }
  ]);

  // Active Alerts matching the requested UI
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
      lane: 'Lajur 1 (Lambat)',
      recommendedAction: 'Kirimkan instruksi penindakan ke Pos GTO Cikampek Utama & alihkan truk ke kantong parkir timbang.',
      details: 'Truk Tronton Golongan V terdeteksi sensor High-Speed WIM piezoelektrik melintas dengan Gross Vehicle Weight 67.4 Ton (Batas Izin: 40 Ton). Tingkat kelebihan muatan +68.5% menghasilkan ESAL 8.4x normal yang mempercepat retak lelah aspal.'
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
      lane: 'Semua Lajur',
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
      lane: 'Lajur 1 & Bahu Jalan',
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
      lane: 'Semua Lajur',
      recommendedAction: 'Pertahankan pemantauan berkala sensor telemetri WIM dan drone CCTV.',
      details: 'Arus lalu lintas pada koridor Tol Dalam Kota, Tangerang-Merak, dan Desari terpantau ramai lancar dengan V/C Ratio 0.42 (Tingkat Pelayanan Jalan Kategori A/B).'
    }
  ]);

  // Camera focus & active highlight state for map interaction
  const [mapCenterTarget, setMapCenterTarget] = useState<{ coords: [number, number]; zoom?: number; timestamp: number } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const handleFocusIncident = (incidentId: string, coords: [number, number]) => {
    setActiveHighlightId(incidentId);
    setMapCenterTarget({
      coords,
      zoom: 15,
      timestamp: Date.now()
    });
  };

  // Combine communityReports with the active anomalies & WIM stations so all 4 cards have matching interactive pins
  const displayReports = useMemo<DamageReport[]>(() => {
    const anomalyPins: DamageReport[] = [
      {
        id: 'alert-1',
        reporterName: 'Sensor High-Speed WIM KM 62',
        reporterRole: 'Telemetri Otomatis',
        reporterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        timestamp: 'Baru saja',
        segmentId: 'JLN-KRW-KIIC-1',
        segmentName: 'KM 62 + 200, Tol Jakarta - Cikampek',
        corridor: 'Tol Jakarta - Cikampek',
        province: 'Jawa Barat',
        coordinates: [-6.385, 107.285],
        damageType: 'RUTTING',
        damageTypeLabel: 'ODOL Kritis (67.4 Ton)',
        severity: 'CRITICAL',
        estimatedDepthCm: 18,
        estimatedAreaM2: 25,
        photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
        description: 'Truk Tronton Golongan V terdeteksi GVW 67.4 Ton (+68.5% Overload). Kecepatan: 42 km/jam • Lajur 1 (Lambat).',
        status: 'PENDING',
        upvotesCount: 92,
        userUpvoted: true
      },
      {
        id: 'wim-2',
        reporterName: 'Pos WIM Pelabuhan Priok',
        reporterRole: 'Bina Marga WIM Sensor',
        reporterAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
        timestamp: '2 mnt lalu',
        segmentId: 'JLN-JKT-PRIOK',
        segmentName: 'Arteri Pelabuhan Tanjung Priok',
        corridor: 'Arteri Tanjung Priok',
        province: 'DKI Jakarta',
        coordinates: [-6.1384, 106.8640],
        damageType: 'RUTTING',
        damageTypeLabel: 'Pos WIM Pelabuhan Priok',
        severity: 'CRITICAL',
        estimatedDepthCm: 14,
        estimatedAreaM2: 20,
        photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
        description: 'Kontainer 40ft Gandeng terdeteksi 62.1 Ton (+55.2% Overload). Pelanggaran: 188 unit • Sensor 98.8%.',
        status: 'PENDING',
        upvotesCount: 78,
        userUpvoted: false
      },
      {
        id: 'alert-2',
        reporterName: 'Sensor AWS Jagorawi',
        reporterRole: 'Sensor Cuaca Otomatis',
        reporterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        timestamp: '5 mnt lalu',
        segmentId: 'JLN-BOGOR-JAGORAWI',
        segmentName: 'KM 48 + 800, Tol Jagorawi',
        corridor: 'Tol Jagorawi KM 48',
        province: 'Jawa Barat',
        coordinates: [-6.582, 106.845],
        damageType: 'POTHOLE',
        damageTypeLabel: 'Hujan Lebat AWS',
        severity: 'SEVERE',
        estimatedDepthCm: 10,
        estimatedAreaM2: 15,
        photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
        description: 'Intensitas hujan 78 mm/jam, resiko aquaplaning pada turunan Ciawi. Kecepatan Max: 60 km/jam • Visibilitas 300m.',
        status: 'PENDING',
        upvotesCount: 46,
        userUpvoted: false
      },
      {
        id: 'alert-3',
        reporterName: 'Unit Patroli Tol JORR',
        reporterRole: 'Petugas Lapangan',
        reporterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        timestamp: '8 mnt lalu',
        segmentId: 'JLN-JAKARTA-JORR',
        segmentName: 'KM 12 + 400, Tol JORR',
        corridor: 'Tol JORR KM 12',
        province: 'DKI Jakarta',
        coordinates: [-6.295, 106.812],
        damageType: 'POTHOLE',
        damageTypeLabel: 'Genangan Air Box Culvert',
        severity: 'MODERATE',
        estimatedDepthCm: 15,
        estimatedAreaM2: 12,
        photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
        description: 'Genangan setinggi 15 cm di lajur 1 akibat sumbatan sampah inlet. Pompa Mobile: Standby • Laju 30 km/jam.',
        status: 'PENDING',
        upvotesCount: 35,
        userUpvoted: false
      }
    ];

    const baseReports = communityReports || [];
    const existingIds = new Set(baseReports.map((r) => r.id));
    const nonDuplicated = anomalyPins.filter((pin) => !existingIds.has(pin.id));
    return [...nonDuplicated, ...baseReports];
  }, [communityReports]);

  // Search handler to focus on corridor, WIM station or alert
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    const matchedAlert = activeAlerts.find(
      (a) => a.location.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)
    );
    if (matchedAlert) {
      handleFocusIncident(matchedAlert.id, matchedAlert.coordinates);
      return;
    }
    const matchedWim = wimStations.find(
      (w) => w.name.toLowerCase().includes(q) || w.corridor.toLowerCase().includes(q)
    );
    if (matchedWim) {
      handleFocusIncident(matchedWim.id, matchedWim.coords);
      return;
    }
    const matchedReport = displayReports.find(
      (r) =>
        r.segmentName.toLowerCase().includes(q) ||
        r.damageTypeLabel.toLowerCase().includes(q) ||
        r.corridor.toLowerCase().includes(q)
    );
    if (matchedReport) {
      handleFocusIncident(matchedReport.id, matchedReport.coordinates);
    }
  };

  // Corridors data with coordinates
  const roadCorridors = [
    {
      id: 'cikampek',
      name: 'Tol Jakarta - Cikampek KM 62',
      status: 'KRITIS',
      color: '#d9655d',
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
      color: '#e2823d',
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
      color: '#e8b23a',
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
      color: '#57ae78',
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
      color: '#57ae78',
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
      color: '#e8b23a',
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
      color: '#d9655d',
      coords: [
        [-6.1100, 106.8800],
        [-6.1250, 106.9100],
        [-6.1384, 106.8640]
      ] as [number, number][],
      info: 'Pos WIM Priok: Overload Kontainer 62 Ton'
    }
  ];

  // Carousel Navigation Helpers
  const scrollCarouselLeft = () => {
    if (carouselContainerRef.current) {
      carouselContainerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollCarouselRight = () => {
    if (carouselContainerRef.current) {
      carouselContainerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  // Action Triggers
  const handleExecuteAction = (type: 'BATASI' | 'ALIHKAN' | 'KIRIM_TIM' | 'TILANG') => {
    setActionModalType(type);
    setIsActionModalOpen(true);
  };

  const handleConfirmAction = () => {
    let msg = '';
    if (actionModalType === 'BATASI') {
      msg = 'Instruksi Pembatasan Muatan Berat & Transfer Beban telah diteruskan ke Pos GTO!';
    } else if (actionModalType === 'ALIHKAN') {
      msg = 'Sistem VMS & Pengalihan Arus Otomatis telah diaktifkan!';
    } else if (actionModalType === 'TILANG') {
      msg = 'E-Tilang WIM Otomatis (ETLE Korlantas) berhasil diterbitkan untuk nomor plat B 9421 UYT!';
    } else {
      msg = 'Surat Perintah Kerja (SPK) Darurat berhasil diterbitkan ke Tim Bina Marga!';
    }

    setIsActionModalOpen(false);
    setActionSuccessMessage(msg);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Create new alert form submit
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
      coordinates: [-6.28, 106.88],
      category: newAlertForm.category,
      details: newAlertForm.details || 'Peringatan darurat diterbitkan oleh Operations Manager.'
    };

    setActiveAlerts([newAlert, ...activeAlerts]);
    setIsCreateAlertModalOpen(false);
    setActionSuccessMessage(`Peringatan "${newAlert.title}" berhasil dipublikasikan ke peta telemetri.`);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  return (
    <div id="operations-pos-wim-root" className="w-full h-full flex flex-col relative select-none font-sans text-slate-100 bg-canvas">
      {/* Toast Alert Success */}
      {actionSuccessMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP FLOATING TOOLBAR: INTEGRATED HEADER + SEARCH (M.O DESIGN SYSTEM) */}
      {/* ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-none">
        {/* Row 1: Header + Search on Left, Filter + Action on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Side: Single Unified Live Telemetry Card with Integrated Search */}
          <div className="flex items-center gap-3 pointer-events-auto max-w-full">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 bg-[#12151A]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#292D33] shadow-2xl">
              {/* Identity & Status */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-2 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
                  <Scale className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-semibold text-[#F0F1F3] tracking-tight">
                      Peta & POS WIM
                    </h1>
                    <span className="text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 tracking-wider">
                      LIVE TELEMETRI
                    </span>
                  </div>
                  <p className="text-xs text-[#757D8A]">Monitoring Sensor Beban Truk & Kondisi Koridor</p>
                </div>
              </div>

              {/* Vertical divider on desktop */}
              <div className="hidden sm:block w-px h-8 bg-[#292D33] shrink-0" />

              {/* Integrated Search Input (aligned center, standard control height) */}
              <form onSubmit={handleSearchSubmit} className="relative min-w-[200px] sm:w-60 md:w-68 lg:w-72 flex-1">
                <Search className="w-4 h-4 text-[#757D8A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari Koridor / Pos WIM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 text-xs bg-[#181B20] border border-[#292D33] text-[#F0F1F3] placeholder-[#757D8A] rounded-xl focus:border-[#E8B52B]/60 focus:ring-1 focus:ring-[#E8B52B]/40 outline-none transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#757D8A] hover:text-[#F0F1F3] p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Right Side: Status Filter Dropdown & Buat Peringatan Button */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Status Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center space-x-2 px-3.5 py-2 bg-[#12151A]/95 hover:bg-[#1E2228] text-xs font-semibold text-[#F0F1F3] rounded-2xl border border-[#292D33] shadow-xl transition-all cursor-pointer h-9"
              >
                <Layers className="w-4 h-4 text-[#E8B52B]" />
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
                <ChevronDown className="w-3 h-3 text-[#757D8A]" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#12151A] rounded-2xl shadow-2xl border border-[#292D33] py-2 z-40 animate-in fade-in duration-150">
                  <button
                    onClick={() => {
                      setSelectedStatusFilter('ALL');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#1E2228] text-[#F0F1F3] flex items-center justify-between cursor-pointer"
                  >
                    <span>Semua Status</span>
                    {selectedStatusFilter === 'ALL' && <Check className="w-4 h-4 text-[#E8B52B]" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStatusFilter('KRITIS');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#1E2228] text-[#F0F1F3] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Kritis (ODOL {'>'}50%)</span>
                    </span>
                    {selectedStatusFilter === 'KRITIS' && <Check className="w-4 h-4 text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStatusFilter('SIAGA');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#1E2228] text-[#F0F1F3] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>Siaga (Hujan/Cuaca)</span>
                    </span>
                    {selectedStatusFilter === 'SIAGA' && <Check className="w-4 h-4 text-orange-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStatusFilter('WASPADA');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#1E2228] text-[#F0F1F3] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>Waspada (Genangan)</span>
                    </span>
                    {selectedStatusFilter === 'WASPADA' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStatusFilter('NORMAL');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#1E2228] text-[#F0F1F3] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Normal</span>
                    </span>
                    {selectedStatusFilter === 'NORMAL' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* "+ Buat Peringatan" Yellow Button */}
            <button
              onClick={() => setIsCreateAlertModalOpen(true)}
              className="bg-[#E8B52B] hover:bg-[#d4a017] text-slate-950 font-bold text-xs px-4 rounded-2xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer active:scale-95 border border-amber-300 h-9"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Buat Peringatan</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Strip (Cleanly separated beneath the header, NO overlap) */}
        <div className="flex items-center pointer-events-none">
          <div className="flex items-center space-x-3 bg-[#12151A]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#292D33] shadow-xl pointer-events-auto text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-[#B0B5BE] font-medium">ODOL Kritis:</span>
              <strong className="text-rose-400 font-semibold font-mono">3 Lokasi</strong>
            </div>
            <div className="w-px h-3.5 bg-[#292D33]"></div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[#B0B5BE] font-medium">Stasiun WIM Aktif:</span>
              <strong className="text-emerald-400 font-semibold font-mono">24/24 Online</strong>
            </div>
            <div className="w-px h-3.5 bg-[#292D33]"></div>
            <div className="flex items-center space-x-2">
              <Scale className="w-3.5 h-3.5 text-[#E8B52B]" />
              <span className="text-[#B0B5BE] font-medium">Overload Rate:</span>
              <strong className="text-[#E8B52B] font-semibold font-mono">18.4%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN MAP CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full relative">
        <PavementMap
          compact={false}
          engine="globe"
          isTabActive={true}
          roadSegments={roadSegments}
          selectedSegment={selectedSegment ?? null}
          onSelectSegment={onSelectSegment ?? (() => {})}
          communityReports={displayReports}
          highlightReportId={activeHighlightId}
          mapCenterTarget={mapCenterTarget}
          onSelectReport={(report) => {
            handleFocusIncident(report.id, report.coordinates);
            const matchedAlert = activeAlerts.find((a) => a.id === report.id);
            if (matchedAlert) {
              setSelectedAlertDetail(matchedAlert);
            } else {
              const matchedWim = wimStations.find((w) => w.id === report.id);
              if (matchedWim) {
                setSelectedWimStation(matchedWim);
              }
            }
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FLOATING CONTAINER: 4 ANOMALY CARDS (GRID WITH PRECISION GAP) */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-2 bg-[#12151A]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#292D33] shadow-lg text-xs">
            <span className="font-semibold text-[#F0F1F3]">Anomali Terdeteksi & Pos WIM Prioritas</span>
            <span className="text-xs text-[#757D8A] font-mono">({activeAlerts.length} Insiden Aktif)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={scrollCarouselLeft}
              className="p-2 rounded-xl bg-[#12151A]/95 hover:bg-[#1E2228] text-[#F0F1F3] border border-[#292D33] shadow-lg cursor-pointer transition-colors"
              title="Sebelumnya"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollCarouselRight}
              className="p-2 rounded-xl bg-[#12151A]/95 hover:bg-[#1E2228] text-[#F0F1F3] border border-[#292D33] shadow-lg cursor-pointer transition-colors"
              title="Selanjutnya"
              aria-label="Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Cards Grid Layout with Consistent 14px Column Gap */}
        <div
          ref={carouselContainerRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full pointer-events-auto"
        >
          {/* Card 1: Critical ODOL Alert KM 62 */}
          <div
            onClick={() => handleFocusIncident('alert-1', activeAlerts[0].coordinates)}
            className={`w-full min-w-0 bg-[#12151A]/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group ${
              activeHighlightId === 'alert-1'
                ? 'border-rose-400 ring-2 ring-rose-500/30'
                : 'border-rose-500/40 hover:border-rose-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#292D33]">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full shrink-0">
                    KRITIS
                  </span>
                  <span className="text-xs font-bold text-[#F0F1F3] truncate">ODOL Terlampaui</span>
                </div>
                <span className="text-[11px] text-[#757D8A] font-mono shrink-0 ml-2">Baru saja</span>
              </div>

              <div className="mt-3 space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-rose-300 truncate">KM 62 + 200, Tol Jakarta - Cikampek</h4>
                <p className="text-xs text-[#B0B5BE] leading-relaxed line-clamp-2">
                  Truk Tronton Golongan V terdeteksi GVW <strong className="text-white">67.4 Ton</strong> (+68.5% Overload).
                </p>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#757D8A] pt-1">
                  <span>Kecepatan: 42 km/jam</span>
                  <span>•</span>
                  <span>Lajur 1 (Lambat)</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#292D33] flex items-center justify-between gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAlertDetail(activeAlerts[0]);
                  handleFocusIncident('alert-1', activeAlerts[0].coordinates);
                }}
                className="flex-1 py-2 bg-[#1E2228] hover:bg-[#292D33] text-[#F0F1F3] border border-[#292D33] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteAction('BATASI');
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                Batasi Truk
              </button>
            </div>
          </div>

          {/* Card 2: Priok Port Overload WIM */}
          <div
            onClick={() => handleFocusIncident('wim-2', wimStations[1].coords)}
            className={`w-full min-w-0 bg-[#12151A]/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group ${
              activeHighlightId === 'wim-2'
                ? 'border-rose-400 ring-2 ring-rose-500/30'
                : 'border-rose-500/40 hover:border-rose-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#292D33]">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full shrink-0">
                    KRITIS
                  </span>
                  <span className="text-xs font-bold text-[#F0F1F3] truncate">Pos WIM Pelabuhan Priok</span>
                </div>
                <span className="text-[11px] text-[#757D8A] font-mono shrink-0 ml-2">2 mnt lalu</span>
              </div>

              <div className="mt-3 space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-rose-300 truncate">Arteri Pelabuhan Tanjung Priok</h4>
                <p className="text-xs text-[#B0B5BE] leading-relaxed line-clamp-2">
                  Kontainer 40ft Gandeng terdeteksi <strong className="text-white">62.1 Ton</strong> (+55.2% Overload).
                </p>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#757D8A] pt-1">
                  <span>Pelanggaran: 188 unit</span>
                  <span>•</span>
                  <span>Sensor 98.8%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#292D33] flex items-center justify-between gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWimStation(wimStations[1]);
                  handleFocusIncident('wim-2', wimStations[1].coords);
                }}
                className="flex-1 py-2 bg-[#1E2228] hover:bg-[#292D33] text-[#F0F1F3] border border-[#292D33] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Telemetri
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteAction('TILANG');
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                E-Tilang WIM
              </button>
            </div>
          </div>

          {/* Card 3: Weather Alert Tol Jagorawi */}
          <div
            onClick={() => handleFocusIncident('alert-2', activeAlerts[1].coordinates)}
            className={`w-full min-w-0 bg-[#12151A]/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group ${
              activeHighlightId === 'alert-2'
                ? 'border-orange-400 ring-2 ring-orange-500/30'
                : 'border-orange-500/40 hover:border-orange-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#292D33]">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-[11px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full shrink-0">
                    SIAGA
                  </span>
                  <span className="text-xs font-bold text-[#F0F1F3] truncate">Hujan Lebat AWS</span>
                </div>
                <span className="text-[11px] text-[#757D8A] font-mono shrink-0 ml-2">5 mnt lalu</span>
              </div>

              <div className="mt-3 space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-orange-300 truncate">KM 48 + 800, Tol Jagorawi</h4>
                <p className="text-xs text-[#B0B5BE] leading-relaxed line-clamp-2">
                  Intensitas hujan <strong className="text-white">78 mm/jam</strong>, resiko aquaplaning pada turunan Ciawi.
                </p>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#757D8A] pt-1">
                  <span>Kecepatan Max: 60 km/jam</span>
                  <span>•</span>
                  <span>Visibilitas 300m</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#292D33] flex items-center justify-between gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAlertDetail(activeAlerts[1]);
                  handleFocusIncident('alert-2', activeAlerts[1].coordinates);
                }}
                className="flex-1 py-2 bg-[#1E2228] hover:bg-[#292D33] text-[#F0F1F3] border border-[#292D33] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteAction('ALIHKAN');
                }}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                VMS Peringatan
              </button>
            </div>
          </div>

          {/* Card 4: WIM Lenteng Agung */}
          <div
            onClick={() => handleFocusIncident('alert-3', activeAlerts[2].coordinates)}
            className={`w-full min-w-0 bg-[#12151A]/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group ${
              activeHighlightId === 'alert-3'
                ? 'border-amber-400 ring-2 ring-amber-500/30'
                : 'border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#292D33]">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                    WASPADA
                  </span>
                  <span className="text-xs font-bold text-[#F0F1F3] truncate">Genangan Air Box Culvert</span>
                </div>
                <span className="text-[11px] text-[#757D8A] font-mono shrink-0 ml-2">8 mnt lalu</span>
              </div>

              <div className="mt-3 space-y-1 min-w-0">
                <h4 className="text-xs font-bold text-amber-300 truncate">KM 12 + 400, Tol JORR</h4>
                <p className="text-xs text-[#B0B5BE] leading-relaxed line-clamp-2">
                  Genangan setinggi <strong className="text-white">15 cm</strong> di lajur 1 akibat sumbatan sampah inlet.
                </p>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-[#757D8A] pt-1">
                  <span>Pompa Mobile: Standby</span>
                  <span>•</span>
                  <span>Laju 30 km/jam</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#292D33] flex items-center justify-between gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAlertDetail(activeAlerts[2]);
                  handleFocusIncident('alert-3', activeAlerts[2].coordinates);
                }}
                className="flex-1 py-2 bg-[#1E2228] hover:bg-[#292D33] text-[#F0F1F3] border border-[#292D33] text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteAction('KIRIM_TIM');
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                SPK Tim Pompa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DETAIL POS WIM / TELEMETRI LENGKAP (DARK THEME) */}
      {/* ========================================================================= */}
      {selectedWimStation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full font-mono ${
                        selectedWimStation.status === 'KRITIS'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {selectedWimStation.status}
                    </span>
                    <span className="text-xs text-slate-400">{selectedWimStation.sensorHealth}</span>
                  </div>
                  <h3 className="font-semibold text-base text-white mt-1">{selectedWimStation.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedWimStation(null)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-xs">Koridor Ruas:</span>
                <p className="text-sm font-bold text-white mt-1">{selectedWimStation.corridor}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
                    <span className="text-slate-400 text-xs">Beban Terakhir:</span>
                    <p className="text-sm font-semibold text-rose-400 mt-1">{selectedWimStation.lastGvw}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
                    <span className="text-slate-400 text-xs">Truk Tertinggi Hari Ini:</span>
                    <p className="text-sm font-semibold text-amber-400 mt-1">{selectedWimStation.maxGvwToday}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-xs">Kendaraan Ditimbang</span>
                  <p className="text-base font-bold text-white mt-1 font-mono">{selectedWimStation.liveVehicles}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-xs">Pelanggaran ODOL</span>
                  <p className="text-base font-bold text-rose-400 mt-1 font-mono">{selectedWimStation.overloadCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-xs">Jumlah Lajur</span>
                  <p className="text-base font-bold text-white mt-1 font-mono">{selectedWimStation.laneCount} Lajur</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <p className="text-amber-200/90 text-xs leading-relaxed">
                  Kamera ANPR optik dan sensor timbang terhubung dengan sistem ETLE Korlantas Polri & Ditjen Perhubungan Darat.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedWimStation(null);
                    handleExecuteAction('TILANG');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer"
                >
                  Terbitkan E-Tilang
                </button>
                <button
                  onClick={() => setSelectedWimStation(null)}
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
      {/* MODAL 2: DETAIL INSIDEN / PERINGATAN (DARK THEME) */}
      {/* ========================================================================= */}
      {selectedAlertDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full font-mono ${
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
                  <h3 className="font-semibold text-base text-white mt-1">{selectedAlertDetail.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertDetail(null)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-xs">Lokasi Ruas:</span>
                <p className="text-sm font-bold text-white mt-1">{selectedAlertDetail.location}</p>
                <p className="text-xs text-amber-400 font-semibold mt-1">{selectedAlertDetail.meta}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 mb-1">Rincian Laporan Telemetri:</h4>
                <p className="text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                  {selectedAlertDetail.details}
                </p>
              </div>

              {selectedAlertDetail.recommendedAction && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Rekomendasi Tindakan Operasional:</span>
                  </div>
                  <p className="text-amber-200/90 text-xs leading-relaxed">
                    {selectedAlertDetail.recommendedAction}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedAlertDetail(null);
                    handleExecuteAction('BATASI');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer"
                >
                  Eksekusi Protokol
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
      {/* MODAL 3: BUAT PERINGATAN BARU (DARK THEME) */}
      {/* ========================================================================= */}
      {isCreateAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Buat Peringatan Baru</h3>
                  <p className="text-xs text-slate-400">Publikasikan sinyal peringatan ke VMS & Petugas Lapangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateAlertModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlertSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tingkat Urgensi Peringatan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAlertForm({ ...newAlertForm, level: 'KRITIS' })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      newAlertForm.level === 'KRITIS'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
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
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-semibold'
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
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
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
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
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
                  placeholder="Contoh: Kritis - Truk ODOL 68 Ton Cikampek"
                  value={newAlertForm.title}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                  required
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
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
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Data / Metadata Singkat</label>
                <input
                  type="text"
                  placeholder="Contoh: Beban berlebih: 68 ton | Kecepatan: 42 km/jam"
                  value={newAlertForm.meta}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, meta: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Uraian & Tindakan</label>
                <textarea
                  rows={3}
                  placeholder="Instruksi operasional bagi petugas gerbang / patroli..."
                  value={newAlertForm.details}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, details: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

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
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  Terbitkan Peringatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KONFIRMASI TINDAKAN OPERASIONAL (DARK THEME) */}
      {/* ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-white">Konfirmasi Tindakan Operasional</h3>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300 text-sm leading-relaxed">
                {actionModalType === 'BATASI' &&
                  'Apakah Anda yakin ingin mengirimkan instruksi pembatasan muatan berat ke Pos Jembatan Timbang & GTO Tol Cikampek Utama?'}
                {actionModalType === 'ALIHKAN' &&
                  'Apakah Anda yakin ingin mengaktifkan pengalihan arus ke rute arteri alternatif dan menyalakan display VMS otomatis?'}
                {actionModalType === 'TILANG' &&
                  'Apakah Anda yakin ingin menerbitkan tilang elektronik (ETLE WIM) dan meneruskannya ke Korlantas Polri?'}
                {actionModalType === 'KIRIM_TIM' &&
                  'Apakah Anda ingin menerbitkan SPK darurat dan mengerahkan Tim Pemeliharaan Cepat Bina Marga ke lokasi?'}
              </p>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-xs text-slate-400">
                <p>Dispatcher: <strong className="text-white">{currentAccount.name}</strong></p>
                <p>Hak Akses: <strong className="text-rose-400">Operations Manager (WIM & Dephub)</strong></p>
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
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  Ya, Eksekusi Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
