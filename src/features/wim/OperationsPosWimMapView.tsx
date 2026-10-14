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

  // Map Theme: Dark Mode (Default), Satelit, Real Light
  const [mapTheme, setMapTheme] = useState<'DARK_MODE' | 'SATELLITE' | 'REAL_LIGHT'>('DARK_MODE');
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
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

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
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

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
      if (searchQuery && !corr.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      // Outer glow for critical/warning
      if (corr.status === 'KRITIS' || corr.status === 'SIAGA') {
        const glow = L.polyline(corr.coords, {
          color: corr.color,
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        });
        polylinesGroupRef.current?.addLayer(glow);
      }

      const line = L.polyline(corr.coords, {
        color: corr.color,
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      line.bindTooltip(
        `<div class="p-1 text-xs font-bold text-slate-900">
          <div class="font-extrabold">${corr.name}</div>
          <div class="text-[11px] text-slate-600">${corr.info}</div>
        </div>`,
        { sticky: true }
      );

      polylinesGroupRef.current?.addLayer(line);
    });

    // 2. Draw WIM Station Badges & Pins
    wimStations.forEach((stn) => {
      if (selectedStatusFilter !== 'ALL' && stn.status !== selectedStatusFilter) {
        return;
      }
      if (searchQuery && !stn.name.toLowerCase().includes(searchQuery.toLowerCase()) && !stn.corridor.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const isCritical = stn.status === 'KRITIS';
      const isSiaga = stn.status === 'SIAGA';

      const wimHtml = `
        <div class="relative flex items-center space-x-1.5 bg-slate-900/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-2xl border ${
          isCritical ? 'border-rose-500 shadow-rose-500/50' : isSiaga ? 'border-orange-500 shadow-orange-500/50' : 'border-emerald-500/80 shadow-emerald-500/30'
        } shadow-lg backdrop-blur-md hover:scale-110 transition-transform cursor-pointer">
          <span class="w-2.5 h-2.5 rounded-full ${
            isCritical ? 'bg-rose-500 animate-ping' : isSiaga ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400'
          }"></span>
          <span class="truncate max-w-[120px]">${stn.name}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded font-mono ${
            isCritical ? 'bg-rose-500/30 text-rose-300' : isSiaga ? 'bg-orange-500/30 text-orange-300' : 'bg-emerald-500/30 text-emerald-300'
          }">${stn.lastGvw.split(' ')[0]}</span>
        </div>
      `;

      const wimIcon = L.divIcon({
        className: 'custom-wim-interactive-pin',
        html: wimHtml,
        iconSize: [160, 32],
        iconAnchor: [80, 16]
      });

      const marker = L.marker(stn.coords, { icon: wimIcon });
      marker.on('click', () => {
        setSelectedWimStation(stn);
      });

      marker.bindTooltip(
        `<div class="p-1 text-xs">
          <div class="font-extrabold text-slate-900">${stn.name}</div>
          <div class="text-slate-700">${stn.corridor}</div>
          <div class="text-slate-500 font-mono text-[10px] mt-0.5">Beban Terakhir: ${stn.lastGvw}</div>
        </div>`,
        { direction: 'top', offset: [0, -14] }
      );

      markersGroupRef.current?.addLayer(marker);
    });

    // 3. Draw Incident Alert Pins
    activeAlerts.forEach((alert) => {
      if (selectedStatusFilter !== 'ALL' && alert.level !== selectedStatusFilter) {
        return;
      }
      if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) && !alert.location.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      let iconHtml = '';
      if (alert.level === 'KRITIS') {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
            <span class="absolute w-10 h-10 rounded-full bg-rose-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-black">
              !
            </div>
          </div>
        `;
      } else if (alert.level === 'SIAGA') {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
            <span class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-pulse"></span>
            <div class="w-7 h-7 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
              ⚠
            </div>
          </div>
        `;
      } else if (alert.level === 'WASPADA') {
        iconHtml = `
          <div class="flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
            <div class="w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 text-xs font-bold">
              ⚠
            </div>
          </div>
        `;
      } else {
        iconHtml = `
          <div class="flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
            <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
              ✓
            </div>
          </div>
        `;
      }

      const alertIcon = L.divIcon({
        className: 'custom-alert-pin',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(alert.coordinates, { icon: alertIcon });
      marker.on('click', () => {
        setSelectedAlertDetail(alert);
      });

      markersGroupRef.current?.addLayer(marker);
    });

  }, [activeAlerts, wimStations, selectedStatusFilter, searchQuery]);

  // Carousel Navigation Helpers
  const scrollCarouselLeft = () => {
    if (carouselContainerRef.current) {
      carouselContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollCarouselRight = () => {
    if (carouselContainerRef.current) {
      carouselContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  // Zoom & Recenter
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
    <div id="operations-pos-wim-root" className="w-full h-full flex flex-col relative select-none font-sans text-slate-100 bg-[#07090e]">
      {/* Toast Alert Success */}
      {actionSuccessMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/40 flex items-center space-x-3 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP FLOATING TOOLBAR (Operations Center Dark Header & Filters) */}
      {/* ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Side: Brand Title & Quick Search */}
        <div className="flex flex-wrap items-center gap-2.5 pointer-events-auto">
          {/* Main Title Badge */}
          <div className="flex items-center space-x-3 bg-slate-900/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Peta & POS WIM
                </h1>
                <span className="text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                  LIVE TELEMETRI
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Monitoring Sensor Beban Truk & Kondisi Koridor</p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Koridor / Pos WIM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-white placeholder-slate-500 rounded-2xl w-56 focus:w-64 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Status Filter, Layer Switcher, Map Theme & Actions */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800 text-xs font-bold text-slate-200 rounded-2xl border border-slate-800 shadow-xl transition-all cursor-pointer"
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
              <div className="absolute top-full right-0 mt-1.5 w-44 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-1.5 z-40 animate-in fade-in duration-150">
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
                    setSelectedStatusFilter('KRITIS');
                    setIsFilterDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Kritis (ODOL {'>'}50%)</span>
                  </span>
                  {selectedStatusFilter === 'KRITIS' && <Check className="w-3.5 h-3.5 text-rose-400" />}
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
                    <span>Siaga (Hujan/Cuaca)</span>
                  </span>
                  {selectedStatusFilter === 'SIAGA' && <Check className="w-3.5 h-3.5 text-orange-400" />}
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
                    <span>Waspada (Genangan)</span>
                  </span>
                  {selectedStatusFilter === 'WASPADA' && <Check className="w-3.5 h-3.5 text-amber-400" />}
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
              </div>
            )}
          </div>

          {/* Map Theme Toggle (Dark Mode / Satelit / Real Light) */}
          <div className="relative">
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800 text-xs font-bold text-slate-200 rounded-2xl border border-slate-800 shadow-xl transition-all cursor-pointer"
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
              <div className="absolute top-full right-0 mt-1.5 w-40 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-1.5 z-40 animate-in fade-in duration-150">
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
            title="Pusatkan Peta"
            className="p-2.5 bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800 text-cyan-400 rounded-2xl border border-slate-800 shadow-xl transition-all cursor-pointer"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* "+ Buat Peringatan" Yellow Button */}
          <button
            onClick={() => setIsCreateAlertModalOpen(true)}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 border border-amber-300"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Buat Peringatan</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP FLOATING KPI STATS RIBBON (Dark Mode) */}
      {/* ========================================================================= */}
      <div className="absolute top-20 left-4 z-20 hidden md:flex items-center space-x-2 pointer-events-none">
        <div className="flex items-center space-x-3 bg-slate-900/90 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto">
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-slate-400 font-medium">ODOL Kritis:</span>
            <strong className="text-rose-400 font-extrabold font-mono">3 Lokasi</strong>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400 font-medium">Stasiun WIM Aktif:</span>
            <strong className="text-emerald-400 font-extrabold font-mono">24/24 Online</strong>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center space-x-1.5 text-xs">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Overload Rate:</span>
            <strong className="text-amber-400 font-extrabold font-mono">18.4%</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN LEAFLET MAP CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

        {/* Zoom Controls floating bottom right */}
        <div className="absolute right-4 bottom-48 sm:bottom-40 z-20 flex flex-col space-y-1 bg-slate-900/90 backdrop-blur-xl p-1 rounded-2xl border border-slate-800 shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-all cursor-pointer"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-all cursor-pointer"
          >
            -
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FLOATING CAROUSEL OF ACTIVE ALERTS & POS WIM (DARK CARDS) */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col space-y-2 pointer-events-none">
        {/* Carousel Header Bar */}
        <div className="flex items-center justify-between px-1 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg text-xs">
            <span className="font-extrabold text-white">Anomali Terdeteksi & Pos WIM Prioritas</span>
            <span className="text-[10px] text-slate-400 font-mono">({activeAlerts.length} Insiden Aktif)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={scrollCarouselLeft}
              className="p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollCarouselRight}
              className="p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-xl hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Cards Container */}
        <div
          ref={carouselContainerRef}
          className="flex items-stretch space-x-3 overflow-x-auto pb-1 pointer-events-auto custom-scrollbar scroll-smooth"
        >
          {/* Card 1: Critical ODOL Alert KM 62 */}
          <div className="min-w-[320px] max-w-[340px] bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 rounded-3xl shadow-2xl p-4 flex flex-col justify-between hover:border-rose-400 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                    KRITIS
                  </span>
                  <span className="text-xs font-bold text-white">ODOL Terlampaui</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Baru saja</span>
              </div>

              <div className="mt-2.5 space-y-1">
                <h4 className="text-xs font-bold text-rose-300">KM 62 + 200, Tol Jakarta - Cikampek</h4>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Truk Tronton Golongan V terdeteksi GVW <strong className="text-white">67.4 Ton</strong> (+68.5% Overload).
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Kecepatan: 42 km/jam</span>
                  <span>•</span>
                  <span>Lajur 1 (Lambat)</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedAlertDetail(activeAlerts[0])}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={() => handleExecuteAction('BATASI')}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer text-center"
              >
                Batasi Truk
              </button>
            </div>
          </div>

          {/* Card 2: Priok Port Overload WIM */}
          <div className="min-w-[320px] max-w-[340px] bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 rounded-3xl shadow-2xl p-4 flex flex-col justify-between hover:border-rose-400 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                    KRITIS
                  </span>
                  <span className="text-xs font-bold text-white">Pos WIM Pelabuhan Priok</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">2 mnt lalu</span>
              </div>

              <div className="mt-2.5 space-y-1">
                <h4 className="text-xs font-bold text-rose-300">Arteri Pelabuhan Tanjung Priok</h4>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Kontainer 40ft Gandeng terdeteksi <strong className="text-white">62.1 Ton</strong> (+55.2% Overload).
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Pelanggaran: 188 unit</span>
                  <span>•</span>
                  <span>Sensor 98.8%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedWimStation(wimStations[1])}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Telemetri
              </button>
              <button
                onClick={() => handleExecuteAction('TILANG')}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer text-center"
              >
                E-Tilang WIM
              </button>
            </div>
          </div>

          {/* Card 3: Weather Alert Tol Jagorawi */}
          <div className="min-w-[320px] max-w-[340px] bg-slate-900/95 backdrop-blur-xl border border-orange-500/40 rounded-3xl shadow-2xl p-4 flex flex-col justify-between hover:border-orange-400 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">
                    SIAGA
                  </span>
                  <span className="text-xs font-bold text-white">Hujan Lebat AWS</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">5 mnt lalu</span>
              </div>

              <div className="mt-2.5 space-y-1">
                <h4 className="text-xs font-bold text-orange-300">KM 48 + 800, Tol Jagorawi</h4>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Intensitas hujan <strong className="text-white">78 mm/jam</strong>, resiko aquaplaning pada turunan Ciawi.
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Kecepatan Max: 60 km/jam</span>
                  <span>•</span>
                  <span>Visibilitas 300m</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedAlertDetail(activeAlerts[1])}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={() => handleExecuteAction('ALIHKAN')}
                className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer text-center"
              >
                VMS Peringatan
              </button>
            </div>
          </div>

          {/* Card 4: WIM Lenteng Agung */}
          <div className="min-w-[320px] max-w-[340px] bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl shadow-2xl p-4 flex flex-col justify-between hover:border-amber-400 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    WASPADA
                  </span>
                  <span className="text-xs font-bold text-white">Genangan Air Box Culvert</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">8 mnt lalu</span>
              </div>

              <div className="mt-2.5 space-y-1">
                <h4 className="text-xs font-bold text-amber-300">KM 12 + 400, Tol JORR</h4>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Genangan setinggi <strong className="text-white">15 cm</strong> di lajur 1 akibat sumbatan sampah inlet.
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Pompa Mobile: Standby</span>
                  <span>•</span>
                  <span>Laju 30 km/jam</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedAlertDetail(activeAlerts[2])}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Rincian
              </button>
              <button
                onClick={() => handleExecuteAction('KIRIM_TIM')}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-center"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        selectedWimStation.status === 'KRITIS'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {selectedWimStation.status}
                    </span>
                    <span className="text-xs text-slate-400">{selectedWimStation.sensorHealth}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-white mt-0.5">{selectedWimStation.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedWimStation(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-[11px]">Koridor Ruas:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedWimStation.corridor}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                    <span className="text-slate-400 text-[10px]">Beban Terakhir:</span>
                    <p className="text-sm font-extrabold text-rose-400 mt-0.5">{selectedWimStation.lastGvw}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                    <span className="text-slate-400 text-[10px]">Truk Tertinggi Hari Ini:</span>
                    <p className="text-sm font-extrabold text-amber-400 mt-0.5">{selectedWimStation.maxGvwToday}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-[10px]">Kendaraan Ditimbang</span>
                  <p className="text-base font-bold text-white mt-0.5 font-mono">{selectedWimStation.liveVehicles}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-[10px]">Pelanggaran ODOL</span>
                  <p className="text-base font-bold text-rose-400 mt-0.5 font-mono">{selectedWimStation.overloadCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-slate-400 text-[10px]">Jumlah Lajur</span>
                  <p className="text-base font-bold text-white mt-0.5 font-mono">{selectedWimStation.laneCount} Lajur</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                  placeholder="Contoh: Kritis - Truk ODOL 68 Ton Cikampek"
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
                  placeholder="Contoh: Beban berlebih: 68 ton | Kecepatan: 42 km/jam"
                  value={newAlertForm.meta}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, meta: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Uraian & Tindakan</label>
                <textarea
                  rows={3}
                  placeholder="Instruksi operasional bagi petugas gerbang / patroli..."
                  value={newAlertForm.details}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, details: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
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
      {/* MODAL 4: KONFIRMASI TINDAKAN OPERASIONAL (DARK THEME) */}
      {/* ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-white">Konfirmasi Tindakan Operasional</h3>
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
                  'Apakah Anda yakin ingin mengirimkan instruksi pembatasan muatan berat ke Pos Jembatan Timbang & GTO Tol Cikampek Utama?'}
                {actionModalType === 'ALIHKAN' &&
                  'Apakah Anda yakin ingin mengaktifkan pengalihan arus ke rute arteri alternatif dan menyalakan display VMS otomatis?'}
                {actionModalType === 'TILANG' &&
                  'Apakah Anda yakin ingin menerbitkan tilang elektronik (ETLE WIM) dan meneruskannya ke Korlantas Polri?'}
                {actionModalType === 'KIRIM_TIM' &&
                  'Apakah Anda ingin menerbitkan SPK darurat dan mengerahkan Tim Pemeliharaan Cepat Bina Marga ke lokasi?'}
              </p>

              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/70 text-[11px] text-slate-400">
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
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
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
