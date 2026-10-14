import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  MapPin,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Target,
  BarChart2,
  Download,
  Share2,
  Plus,
  Minus,
  Navigation,
  Ruler,
  Layers,
  Sparkles,
  Flag,
  Filter,
  RotateCcw,
  X,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Cpu,
  Droplets,
  Truck,
  Activity,
  Calendar,
  Eye,
  Info,
  Sliders,
  CloudRain
} from 'lucide-react';
import { RoadSegment, SimulationResult, DamageReport } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import {
  StrategicMapLayer,
  PolicyScenario,
  StrategicCorridor,
  StrategicRegion,
  STRATEGIC_CORRIDORS,
  STRATEGIC_REGIONS,
  STRATEGIC_WIM_STATIONS,
  STRATEGIC_WEATHER_STATIONS,
  getPciColor,
  getPciCategoryName
} from './policyMapData';
import { SegmentHealthProfileCard } from './SegmentHealthProfileCard';
import { StrategicPolicyDrawers } from './StrategicPolicyDrawers';

interface StrategicPolicyMapViewProps {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  simulationResult: SimulationResult | null;
  communityReports: DamageReport[];
  currentAccount: UserAccount;
  onLaunchSimulation?: (segment: RoadSegment) => void;
  onNavigateToDetailedTab?: (tabName: string) => void;
}

export const StrategicPolicyMapView: React.FC<StrategicPolicyMapViewProps> = ({
  roadSegments,
  selectedSegment,
  onSelectSegment,
  simulationResult,
  communityReports,
  currentAccount,
  onLaunchSimulation,
  onNavigateToDetailedTab
}) => {
  // 1. Strategic Layer (5 Top Layer Switchers)
  const [activeLayer, setActiveLayer] = useState<StrategicMapLayer>('CURRENT');

  // 2. Policy Scenario (Interactive Policy Simulator)
  const [selectedScenario, setSelectedScenario] = useState<PolicyScenario>('NO_INTERVENTION');

  // 3. Multi-Physics Sub-layers toggles
  const [showWimLayer, setShowWimLayer] = useState<boolean>(true);
  const [showWeatherLayer, setShowWeatherLayer] = useState<boolean>(true);
  const [showStressHeatmap, setShowStressHeatmap] = useState<boolean>(false);
  const [baseMapStyle, setBaseMapStyle] = useState<'DARK' | 'SATELLITE' | 'LIGHT'>('LIGHT');

  // 4. Selected Entities
  const [selectedCorridor, setSelectedCorridor] = useState<StrategicCorridor>(STRATEGIC_CORRIDORS[0]);
  const [selectedRegion, setSelectedRegion] = useState<StrategicRegion>(STRATEGIC_REGIONS[0]);

  // 5. Filters
  const [provinceFilter, setProvinceFilter] = useState<string>('SEMUA');
  const [pciConditionFilter, setPciConditionFilter] = useState<string>('SEMUA');
  const [priorityFilter, setPriorityFilter] = useState<string>('SEMUA');

  // 6. Floating UI visibility states
  const [isKpiStripOpen, setIsKpiStripOpen] = useState<boolean>(true);
  const [isBottomDockOpen, setIsBottomDockOpen] = useState<boolean>(false);
  const [isSegmentCardOpen, setIsSegmentCardOpen] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);

  // 7. Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState<'INSIGHT' | 'PRIORITAS' | 'INVESTASI' | 'FILTER' | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const overlaysGroupRef = useRef<L.FeatureGroup | null>(null);

  // Scenario Details Labels & Modifiers
  const scenarioInfo = useMemo(() => {
    switch (selectedScenario) {
      case 'PREVENTIVE':
        return {
          title: 'Preservasi Preventif Dini',
          description: 'Mikro-overlay terjadwal & crack sealing sebelum kerusakan struktural menembus base.',
          rhiModifier: +14,
          ruasKritisModifier: -8,
          budgetMultiplier: 0.85,
          economicLossSavings: 28.5
        };
      case 'PRIORITY_1':
        return {
          title: 'Fokus Prioritas P1 Darurat',
          description: 'Alokasi penuh dana rekonstruksi pada koridor arteri paling kritis untuk mencegah putus jalur.',
          rhiModifier: +8,
          ruasKritisModifier: -5,
          budgetMultiplier: 0.70,
          economicLossSavings: 22.0
        };
      case 'STRICT_ODOL':
        return {
          title: 'Penegakan Hukum ODOL Diperketat',
          description: 'Sanksi denda digital WIM & pembatasan tonase muatan ≤10 Ton. Laju rusak turun 34%.',
          rhiModifier: +11,
          ruasKritisModifier: -6,
          budgetMultiplier: 0.55,
          economicLossSavings: 24.8
        };
      case 'PREVENTIVE_AND_ODOL':
        return {
          title: 'Preservasi + Penegakan ODOL (Optimal)',
          description: 'Rekomendasi Bappenas & PUPR: Kemantapan jalan 88%, BCR 2.8x, hemat Rp 38.5 Miliar.',
          rhiModifier: +19,
          ruasKritisModifier: -10,
          budgetMultiplier: 0.95,
          economicLossSavings: 38.5
        };
      case 'NO_INTERVENTION':
      default:
        return {
          title: 'Tanpa Intervensi (Base Case)',
          description: 'Laju degradasi cepat akibat akumulasi beban ODOL dan air hujan. RHI turun drastis ke 2030.',
          rhiModifier: 0,
          ruasKritisModifier: 0,
          budgetMultiplier: 1.0,
          economicLossSavings: 0
        };
    }
  }, [selectedScenario]);

  // Dynamic KPI calculations based on active layer & scenario
  const dynamicKpi = useMemo(() => {
    const baseRhi = selectedRegion.rhi;
    const computedRhi = Math.min(95, Math.max(35, baseRhi + scenarioInfo.rhiModifier));
    const computedRuasKritis = Math.max(2, selectedRegion.ruasKritis + scenarioInfo.ruasKritisModifier);

    return {
      rhi: computedRhi,
      rhiChange: scenarioInfo.rhiModifier >= 0 ? `+${scenarioInfo.rhiModifier}% dari base` : `${selectedRegion.rhiChange}% per tahun`,
      ruasKritis: computedRuasKritis,
      ruasKritisKm: `${(computedRuasKritis * 3.8).toFixed(1)} km`,
      kebutuhanInvestasi: `Rp ${(selectedRegion.investmentNeededM * scenarioInfo.budgetMultiplier).toFixed(1)} M`,
      potensiKerugian: selectedScenario === 'NO_INTERVENTION' ? 'Rp 18,4 M' : `Hemat Rp ${scenarioInfo.economicLossSavings} M`,
      prioritasCount: `${selectedRegion.priorityCounts.criticalP1 + selectedRegion.priorityCounts.highP2} Ruas`
    };
  }, [selectedRegion, scenarioInfo, selectedScenario]);

  // Bottom Chart Data: Dynamic PCI distribution
  const pciDistributionData = useMemo(() => {
    if (selectedScenario === 'PREVENTIVE_AND_ODOL' || selectedScenario === 'PREVENTIVE') {
      return [
        { name: 'Baik (≥ 70)', value: 58, color: '#22c55e' },
        { name: 'Sedang (50–69)', value: 30, color: '#eab308' },
        { name: 'Buruk (30–49)', value: 9, color: '#f97316' },
        { name: 'Sangat Buruk (< 30)', value: 3, color: '#ef4444' }
      ];
    }
    if (activeLayer === 'PROJECTION_5Y' && selectedScenario === 'NO_INTERVENTION') {
      return [
        { name: 'Baik (≥ 70)', value: 16, color: '#22c55e' },
        { name: 'Sedang (50–69)', value: 24, color: '#eab308' },
        { name: 'Buruk (30–49)', value: 36, color: '#f97316' },
        { name: 'Sangat Buruk (< 30)', value: 24, color: '#ef4444' }
      ];
    }
    return [
      { name: 'Baik (≥ 70)', value: 34, color: '#22c55e' },
      { name: 'Sedang (50–69)', value: 32, color: '#eab308' },
      { name: 'Buruk (30–49)', value: 22, color: '#f97316' },
      { name: 'Sangat Buruk (< 30)', value: 12, color: '#ef4444' }
    ];
  }, [activeLayer, selectedScenario]);

  // 5-Year Trend Data
  const pciTrendData = useMemo(() => {
    if (selectedScenario === 'PREVENTIVE_AND_ODOL') {
      return [
        { year: '2022', pci: 68 },
        { year: '2023', pci: 65 },
        { year: '2024', pci: 63 },
        { year: '2025', pci: 62 },
        { year: '2026', pci: 72 },
        { year: '2027', pci: 78 },
        { year: '2028', pci: 82 },
        { year: '2030', pci: 88 }
      ];
    }
    if (selectedScenario === 'PREVENTIVE') {
      return [
        { year: '2022', pci: 68 },
        { year: '2023', pci: 65 },
        { year: '2024', pci: 63 },
        { year: '2025', pci: 62 },
        { year: '2026', pci: 68 },
        { year: '2027', pci: 74 },
        { year: '2028', pci: 76 },
        { year: '2030', pci: 78 }
      ];
    }
    // No action
    return [
      { year: '2022', pci: 68 },
      { year: '2023', pci: 65 },
      { year: '2024', pci: 63 },
      { year: '2025', pci: 62 },
      { year: '2026', pci: 56 },
      { year: '2027', pci: 49 },
      { year: '2028', pci: 44 },
      { year: '2030', pci: 38 }
    ];
  }, [selectedScenario]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.2400, 106.9200],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    const tileUrl =
      baseMapStyle === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : baseMapStyle === 'LIGHT'
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        baseMapStyle === 'LIGHT'
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          : '&copy; <a href="https://www.esri.com/">Esri</a>'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    polylinesGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.featureGroup().addTo(map);
    overlaysGroupRef.current = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile on Style Change
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl =
      baseMapStyle === 'SATELLITE'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : baseMapStyle === 'LIGHT'
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    tileLayerRef.current.setUrl(tileUrl);
  }, [baseMapStyle]);

  // Render Polylines, Corridors, WIM Stations, and Weather Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesGroupRef.current || !markersGroupRef.current || !overlaysGroupRef.current)
      return;

    polylinesGroupRef.current.clearLayers();
    markersGroupRef.current.clearLayers();
    overlaysGroupRef.current.clearLayers();

    // 1. Render Corridors with Layer & Scenario-Aware Styling
    STRATEGIC_CORRIDORS.forEach((corr) => {
      // Determine line color based on active layer & scenario
      let strokeColor = '#22c55e';
      let strokeWidth = 5;
      let isGlowHalo = false;

      if (activeLayer === 'CURRENT') {
        strokeColor = getPciColor(corr.currentPci);
      } else if (activeLayer === 'PROJECTION_5Y') {
        const projectedPci =
          selectedScenario === 'NO_INTERVENTION'
            ? corr.projection2030NoAction
            : corr.projection2030WithAction;
        strokeColor = getPciColor(projectedPci);
      } else if (activeLayer === 'PRIORITY') {
        strokeColor = corr.priorityHaloColor;
        isGlowHalo = corr.priorityLevel === 'P1';
        strokeWidth = corr.priorityLevel === 'P1' ? 7 : 5;
      } else if (activeLayer === 'BUDGET') {
        // Higher budget needed = warmer color
        if (corr.budgetNeededM > 12) strokeColor = '#ef4444';
        else if (corr.budgetNeededM > 7) strokeColor = '#f97316';
        else if (corr.budgetNeededM > 4) strokeColor = '#eab308';
        else strokeColor = '#22c55e';
      } else if (activeLayer === 'ECONOMIC') {
        if (corr.economicLossWithoutActionM > 25) strokeColor = '#ef4444';
        else if (corr.economicLossWithoutActionM > 15) strokeColor = '#f97316';
        else strokeColor = '#22c55e';
      }

      // If P1 Priority Halo is active, draw glowing backdrop polyline
      if (isGlowHalo || corr.id === selectedCorridor.id) {
        const haloPoly = L.polyline(corr.polyline as [number, number][], {
          color: isGlowHalo ? '#ef4444' : '#f59e0b',
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        });
        polylinesGroupRef.current?.addLayer(haloPoly);
      }

      const polyline = L.polyline(corr.polyline as [number, number][], {
        color: strokeColor,
        weight: strokeWidth,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });

      polyline.on('click', () => {
        setSelectedCorridor(corr);
        setIsSegmentCardOpen(true);
        // Find matching region
        const matchingReg = STRATEGIC_REGIONS.find((r) => r.province === corr.province) || STRATEGIC_REGIONS[0];
        setSelectedRegion(matchingReg);
      });

      polyline.bindTooltip(
        `<div class="text-xs font-bold text-slate-900">
          <div>${corr.name}</div>
          <div class="text-[10px] font-normal text-slate-700">PCI: ${corr.currentPci} | Prioritas: ${corr.priorityLevel}</div>
        </div>`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      polylinesGroupRef.current?.addLayer(polyline);
    });

    // 2. Render Region Cluster Badges
    STRATEGIC_REGIONS.forEach((reg) => {
      const isSelected = selectedRegion.id === reg.id;
      const htmlBadge = `
        <div style="
          background-color: ${reg.clusterBadgeColor};
          color: #ffffff;
          border: 2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'};
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          border-radius: 9999px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          transform: scale(${isSelected ? '1.25' : '1.0'});
          transition: transform 0.2s ease;
        ">
          ${reg.badgeLabel}
        </div>
      `;

      const customIcon = L.divIcon({
        html: htmlBadge,
        className: 'custom-region-cluster-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(reg.coordinates, { icon: customIcon });

      marker.on('click', () => {
        setSelectedRegion(reg);
        // Also select corridor belonging to this region
        const matchingCorr = STRATEGIC_CORRIDORS.find((c) => c.province === reg.province) || STRATEGIC_CORRIDORS[0];
        setSelectedCorridor(matchingCorr);
        setIsSegmentCardOpen(true);
      });

      marker.bindTooltip(
        `<div class="text-xs font-bold text-slate-900">
          <div>${reg.name}</div>
          <div class="text-[10px] text-slate-600 font-normal">RHI: ${reg.rhi} | ${reg.ruasKritis} Ruas Kritis</div>
        </div>`,
        { direction: 'top', offset: [0, -18] }
      );

      markersGroupRef.current?.addLayer(marker);
    });

    // 3. Sub-layer: WIM Weigh-in-Motion Stations (Ikon Truk 🚚)
    if (showWimLayer) {
      STRATEGIC_WIM_STATIONS.forEach((wim) => {
        const severityBg =
          wim.severity === 'EXTREME'
            ? '#ef4444'
            : wim.severity === 'HEAVY'
            ? '#f97316'
            : wim.severity === 'MODERATE'
            ? '#eab308'
            : '#22c55e';

        const wimIconHtml = `
          <div style="
            background: #0f172a;
            border: 2px solid ${severityBg};
            color: ${severityBg};
            box-shadow: 0 4px 12px rgba(0,0,0,0.7);
            border-radius: 8px;
            padding: 3px 6px;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          ">
            <span>🚚</span>
            <span>${wim.axleLoadTon}T</span>
          </div>
        `;

        const wimIcon = L.divIcon({
          html: wimIconHtml,
          className: 'custom-wim-marker',
          iconSize: [60, 24],
          iconAnchor: [30, 12]
        });

        const marker = L.marker(wim.coordinates, { icon: wimIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4;">
            <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">${wim.name}</div>
            <div style="color: #64748b; font-size: 10px;">${wim.corridor}</div>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <div>Plat Truk: <strong>${wim.plateNumber}</strong></div>
            <div>Beban Gandar: <strong style="color: #ef4444;">${wim.axleLoadTon} Ton (+${wim.overloadPercent}% ODOL)</strong></div>
            <div>Batas Legal: 10.0 Ton &bull; Kecepatan: ${wim.speedKmh} km/jam</div>
          </div>
        `);

        overlaysGroupRef.current?.addLayer(marker);
      });
    }

    // 4. Sub-layer: Environmental / Weather Sensors (Ikon Cuaca 🌧️)
    if (showWeatherLayer) {
      STRATEGIC_WEATHER_STATIONS.forEach((wx) => {
        const wxColor = wx.floodRisk === 'FLOOD_RISK' ? '#ef4444' : '#38bdf8';
        const wxIconHtml = `
          <div style="
            background: #082f49;
            border: 2px solid ${wxColor};
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.7);
            border-radius: 9999px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
          ">
            🌧️
          </div>
        `;

        const wxIcon = L.divIcon({
          html: wxIconHtml,
          className: 'custom-wx-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker(wx.coordinates, { icon: wxIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4;">
            <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">${wx.name}</div>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <div>Curah Hujan: <strong style="color: #0284c7;">${wx.rainMmHr} mm/jam</strong></div>
            <div>Status Subgrade: <strong style="color: ${wx.waterloggedSubgrade ? '#dc2626' : '#16a34a'};">${wx.waterloggedSubgrade ? 'Jenuh Air (CBR Turun)' : 'Normal'}</strong></div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Sensor Telemetri PINN Live</div>
          </div>
        `);

        overlaysGroupRef.current?.addLayer(marker);
      });
    }
  }, [
    activeLayer,
    selectedScenario,
    selectedCorridor,
    selectedRegion,
    showWimLayer,
    showWeatherLayer,
    showStressHeatmap
  ]);

  // Recenter map handler
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([-6.2400, 106.9200], 10, { duration: 1.2 });
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Export PDF Dossier
  const handleDownloadPdf = () => {
    const sim = simulationResult || runPinnSimulation(
      {
        segmentId: selectedSegment.id,
        axleLoadTon: selectedCorridor.pinnHealthProfile.wimAxleLoadTon,
        rainIntensityMmHr: selectedCorridor.pinnHealthProfile.rainIntensityMmHr,
        floodDurationHours: 4,
        surfaceTemperatureC: 38,
        subgradeCbrPercent: selectedCorridor.pinnHealthProfile.subgradeCbrPercent,
        asphaltThicknessCm: 14,
        asphaltModulusMpa: 2400,
        targetDevice: 'iGPU',
        precisionMode: 'FP16'
      },
      selectedSegment
    );

    generateOfficialReportPdf(sim, 'POLICY_MAKER');
  };

  // Share link handler
  const handleShare = () => {
    setShareToastMessage('Tautan dashboard spasial disalin ke papan klip!');
    setTimeout(() => setShareToastMessage(null), 3500);
  };

  return (
    <div className="relative w-full h-[calc(100vh-68px)] bg-[#070b14] overflow-hidden select-none font-sans text-slate-100">
      {/* 1. FULL BLEED MAP CONTAINER */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Share Toast */}
      {shareToastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-2xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{shareToastMessage}</span>
        </div>
      )}

      {/* 2. FLOATING TOP STRATEGIC CONTROL BAR */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 bg-[#0d1424]/92 backdrop-blur-xl border border-slate-700/60 p-2.5 rounded-2xl shadow-2xl transition-all">
        {/* Left: 5 Strategic Layer Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setActiveLayer('CURRENT')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeLayer === 'CURRENT'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-[#141d33] text-slate-300 hover:bg-[#1b2644]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Kondisi Saat Ini</span>
          </button>

          <button
            onClick={() => setActiveLayer('PROJECTION_5Y')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeLayer === 'PROJECTION_5Y'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-[#141d33] text-slate-300 hover:bg-[#1b2644]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Proyeksi 5 Tahun</span>
          </button>

          <button
            onClick={() => setActiveLayer('PRIORITY')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeLayer === 'PRIORITY'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-[#141d33] text-slate-300 hover:bg-[#1b2644]'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-rose-300" />
            <span>Ruas Prioritas</span>
          </button>

          <button
            onClick={() => setActiveLayer('BUDGET')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeLayer === 'BUDGET'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-black'
                : 'bg-[#141d33] text-slate-300 hover:bg-[#1b2644]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
            <span>Anggaran</span>
          </button>

          <button
            onClick={() => setActiveLayer('ECONOMIC')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeLayer === 'ECONOMIC'
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30 font-black'
                : 'bg-[#141d33] text-slate-300 hover:bg-[#1b2644]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
            <span>Dampak Ekonomi</span>
          </button>
        </div>

        {/* Center/Right: Policy Scenario Selector & Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Policy Scenario Dropdown */}
          <div className="flex items-center space-x-1 bg-[#141d33] px-2.5 py-1.5 rounded-xl border border-slate-700/60">
            <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as PolicyScenario)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="NO_INTERVENTION" className="bg-[#0f172a] text-slate-200">
                Skenario: Tanpa Intervensi (Base)
              </option>
              <option value="PREVENTIVE" className="bg-[#0f172a] text-slate-200">
                Skenario: Preservasi Preventif Dini
              </option>
              <option value="PRIORITY_1" className="bg-[#0f172a] text-slate-200">
                Skenario: Fokus Prioritas P1 Darurat
              </option>
              <option value="STRICT_ODOL" className="bg-[#0f172a] text-slate-200">
                Skenario: Penegakan ODOL Diperketat
              </option>
              <option value="PREVENTIVE_AND_ODOL" className="bg-[#0f172a] text-slate-200">
                Skenario: Preservasi + Penegakan ODOL (Optimal)
              </option>
            </select>
          </div>

          {/* Quick PDF Report */}
          <button
            onClick={handleDownloadPdf}
            className="px-2.5 py-1.5 bg-[#141d33] hover:bg-[#1b2644] text-slate-300 hover:text-white rounded-xl border border-slate-700/60 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
            title="Unduh Dossier PDF"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-1.5 bg-[#141d33] hover:bg-[#1b2644] text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            title="Bagikan Tautan"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Toggle KPI strip */}
          <button
            onClick={() => setIsKpiStripOpen(!isKpiStripOpen)}
            className="px-2 py-1.5 rounded-xl bg-[#141d33] hover:bg-[#1b2644] text-slate-400 hover:text-white text-xs border border-slate-700/60"
            title="Sembunyikan/Tampilkan KPI"
          >
            <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${isKpiStripOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. FLOATING KPI CARDS STRIP */}
      {isKpiStripOpen && (
        <div className="absolute top-18 sm:top-18 left-3 right-3 sm:left-4 sm:right-4 z-20 grid grid-cols-2 md:grid-cols-5 gap-2 animate-fade-in pointer-events-auto">
          {/* 1. RHI Nasional */}
          <div className="bg-[#0d1424]/92 backdrop-blur-xl border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                RHI Wilayah
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xl font-black text-white">{dynamicKpi.rhi}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <span className="text-[9px] text-cyan-400 font-semibold mt-0.5 truncate">
                {dynamicKpi.rhiChange}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 ml-1">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Ruas Kritis */}
          <div className="bg-[#0d1424]/92 backdrop-blur-xl border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                Ruas Kritis
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xl font-black text-rose-400">{dynamicKpi.ruasKritis}</span>
                <span className="text-[10px] text-slate-400">Ruas</span>
              </div>
              <span className="text-[9px] text-rose-400 font-semibold mt-0.5 truncate">
                {dynamicKpi.ruasKritisKm} kritis
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 ml-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Kebutuhan Investasi */}
          <div className="bg-[#0d1424]/92 backdrop-blur-xl border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                Kebutuhan Pagu
              </span>
              <div className="flex items-baseline mt-0.5">
                <span className="text-lg font-black text-amber-400">{dynamicKpi.kebutuhanInvestasi}</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate">
                {scenarioInfo.title}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 ml-1">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          {/* 4. Dampak Ekonomi */}
          <div className="bg-[#0d1424]/92 backdrop-blur-xl border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                Dampak Ekonomi
              </span>
              <div className="flex items-baseline mt-0.5">
                <span className="text-lg font-black text-emerald-400">{dynamicKpi.potensiKerugian}</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate">
                BCR 2.4x Efisiensi
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 ml-1">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* 5. Prioritas 1 & 2 */}
          <div className="bg-[#0d1424]/92 backdrop-blur-xl border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between shadow-lg col-span-2 md:col-span-1">
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                Prioritas P1 &amp; P2
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xl font-black text-white">{dynamicKpi.prioritasCount}</span>
              </div>
              <span className="text-[9px] text-cyan-400 font-semibold truncate">
                Arteri Logistik Kritis
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 ml-1">
              <Target className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 4. LEFT FLOATING MAP TOOLBAR */}
      <div className="absolute top-36 sm:top-40 left-3 sm:left-4 z-20 flex flex-col space-y-1.5">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 bg-[#11192e]/90 hover:bg-[#1b2644] text-white rounded-xl border border-slate-700/60 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md"
          title="Perbesar Peta"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 bg-[#11192e]/90 hover:bg-[#1b2644] text-white rounded-xl border border-slate-700/60 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md"
          title="Perkecil Peta"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          className="w-9 h-9 bg-[#11192e]/90 hover:bg-[#1b2644] text-white rounded-xl border border-slate-700/60 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md"
          title="Pusatkan Koridor Nasional"
        >
          <Navigation className="w-4 h-4 text-amber-400" />
        </button>

        {/* Sub-layers & Basemap Picker */}
        <div className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className={`w-9 h-9 ${
              isLayerMenuOpen ? 'bg-amber-400 text-slate-950' : 'bg-[#11192e]/90 text-white'
            } hover:bg-[#1b2644] rounded-xl border border-slate-700/60 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md`}
            title="Layer & Overlays Multi-Fisika"
          >
            <Layers className="w-4 h-4" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute left-11 top-0 w-60 bg-[#11192e]/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl p-2.5 z-30 space-y-2 animate-fade-in text-xs">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider px-1 font-bold">
                Lapisan Multi-Fisika
              </div>

              {/* WIM Trucks Toggle */}
              <button
                onClick={() => setShowWimLayer(!showWimLayer)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  showWimLayer ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Stasiun WIM &amp; ODOL</span>
                </div>
                {showWimLayer && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              {/* Weather Sensor Toggle */}
              <button
                onClick={() => setShowWeatherLayer(!showWeatherLayer)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  showWeatherLayer ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Cuaca &amp; Genangan Air</span>
                </div>
                {showWeatherLayer && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <hr className="border-slate-800 my-1" />

              <div className="text-[10px] text-slate-400 uppercase tracking-wider px-1 font-bold">
                Tipe Peta Dasar
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setBaseMapStyle('LIGHT')}
                  className={`px-1.5 py-1 rounded-lg text-center font-bold text-[9.5px] ${
                    baseMapStyle === 'LIGHT' ? 'bg-amber-400 text-slate-950' : 'bg-[#141d33] text-slate-300'
                  }`}
                >
                  Light GIS
                </button>
                <button
                  onClick={() => setBaseMapStyle('DARK')}
                  className={`px-1.5 py-1 rounded-lg text-center font-bold text-[9.5px] ${
                    baseMapStyle === 'DARK' ? 'bg-amber-400 text-slate-950' : 'bg-[#141d33] text-slate-300'
                  }`}
                >
                  Dark GIS
                </button>
                <button
                  onClick={() => setBaseMapStyle('SATELLITE')}
                  className={`px-1.5 py-1 rounded-lg text-center font-bold text-[9.5px] ${
                    baseMapStyle === 'SATELLITE' ? 'bg-amber-400 text-slate-950' : 'bg-[#141d33] text-slate-300'
                  }`}
                >
                  Satelit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. FLOATING PCI & MULTI-PHYSICS LEGEND (BOTTOM-LEFT) */}
      <div className="absolute bottom-16 sm:bottom-20 left-3 sm:left-4 z-20 bg-[#0d1424]/95 backdrop-blur-xl border border-slate-700/60 p-2.5 rounded-2xl shadow-xl text-xs max-w-[220px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            Legenda Kondisi &amp; WIM
          </span>
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="text-slate-400 hover:text-white"
          >
            <ChevronDown className={`w-3 h-3 transform transition-transform ${isLegendOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isLegendOpen && (
          <div className="space-y-2 text-[10px]">
            {/* Road lines condition */}
            <div className="space-y-1">
              <div className="text-[8px] text-slate-400 uppercase font-semibold">Warna Garis (PCI / RHI):</div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300">Baik (&ge; 70)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1.5 rounded-full bg-amber-400"></span>
                <span className="text-slate-300">Sedang (50 - 69)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1.5 rounded-full bg-orange-500"></span>
                <span className="text-slate-300">Buruk (30 - 49)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-300">Sangat Buruk (&lt; 30)</span>
              </div>
            </div>

            {/* WIM Trucks legend */}
            <div className="pt-1.5 border-t border-slate-800 space-y-1">
              <div className="text-[8px] text-slate-400 uppercase font-semibold">Ikon Beban Truk WIM (🚚):</div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px]">🚚 🟢</span>
                <span className="text-slate-300">Normal (&le;10T)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px]">🚚 🟡</span>
                <span className="text-slate-300">Overload 5–20%</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px]">🚚 🔴</span>
                <span className="text-slate-300">Overload &gt;50%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. RIGHT FLOATING SEGMENT HEALTH PROFILE CARD */}
      <SegmentHealthProfileCard
        corridor={selectedCorridor}
        region={selectedRegion}
        isOpen={isSegmentCardOpen}
        onClose={() => setIsSegmentCardOpen(false)}
        onOpenDetails={() => setIsDetailModalOpen(true)}
        onOpenBudgetSimulation={() => setActiveDrawer('INVESTASI')}
        selectedScenario={scenarioInfo.title}
      />

      {/* Mini Toggle if card closed */}
      {!isSegmentCardOpen && (
        <button
          onClick={() => setIsSegmentCardOpen(true)}
          className="absolute top-36 sm:top-40 right-14 sm:right-16 z-20 px-3 py-2 rounded-xl bg-[#0d1424]/90 backdrop-blur-xl border border-slate-700/60 text-xs font-bold text-amber-400 shadow-xl flex items-center space-x-1.5 hover:bg-[#141d33] transition-all cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{selectedCorridor.name} (PCI {selectedCorridor.currentPci})</span>
        </button>
      )}

      {/* 7. RIGHTMOST VERTICAL FLOATING ACTION TOOLS */}
      <div className="absolute top-36 sm:top-40 right-3 sm:right-4 z-20 flex flex-col space-y-2">
        {/* Insight */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'INSIGHT' ? null : 'INSIGHT')}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[8px] font-bold border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
            activeDrawer === 'INSIGHT'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
              : 'bg-[#11192e]/90 text-amber-400 hover:bg-[#1b2644] border-slate-700/60'
          }`}
          title="AI Insight Kebijakan PINN"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Insight</span>
        </button>

        {/* Prioritas */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'PRIORITAS' ? null : 'PRIORITAS')}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[8px] font-bold border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
            activeDrawer === 'PRIORITAS'
              ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
              : 'bg-[#11192e]/90 text-rose-400 hover:bg-[#1b2644] border-slate-700/60'
          }`}
          title="Daftar Koridor Prioritas P1/P2/P3"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Prioritas</span>
        </button>

        {/* Investasi */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'INVESTASI' ? null : 'INVESTASI')}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[8px] font-bold border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
            activeDrawer === 'INVESTASI'
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
              : 'bg-[#11192e]/90 text-emerald-400 hover:bg-[#1b2644] border-slate-700/60'
          }`}
          title="Alokasi Pagu & Investasi"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Pagu</span>
        </button>

        {/* Filter */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'FILTER' ? null : 'FILTER')}
          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[8px] font-bold border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
            activeDrawer === 'FILTER'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/30'
              : 'bg-[#11192e]/90 text-cyan-400 hover:bg-[#1b2644] border-slate-700/60'
          }`}
          title="Filter Wilayah & Ambang PCI"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>

        {/* Reset */}
        <button
          onClick={() => {
            setProvinceFilter('SEMUA');
            setPciConditionFilter('SEMUA');
            setPriorityFilter('SEMUA');
            setActiveLayer('CURRENT');
            setSelectedScenario('NO_INTERVENTION');
            setSelectedCorridor(STRATEGIC_CORRIDORS[0]);
            setSelectedRegion(STRATEGIC_REGIONS[0]);
            handleRecenter();
          }}
          className="w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[8px] font-bold bg-[#11192e]/90 text-slate-400 hover:text-white hover:bg-[#1b2644] border border-slate-700/60 transition-all cursor-pointer backdrop-blur-md shadow-lg"
          title="Reset Skenario & Peta"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 8. BOTTOM FLOATING ANALYTICS DOCK */}
      <div className="absolute bottom-2.5 left-3 right-3 sm:left-4 sm:right-4 z-20 bg-[#0d1424]/95 backdrop-blur-2xl border border-slate-700/60 shadow-2xl rounded-2xl p-2.5 transition-all">
        {/* Toggle Bar Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-extrabold text-white text-xs sm:text-sm">
              Analitik Spasial &amp; Ekonomi ({scenarioInfo.title})
            </span>
            <span className="hidden md:inline text-[10px] text-slate-400 font-normal">
              | BCR: <strong className="text-cyan-400 font-bold">{selectedCorridor.benefitCostRatio}x</strong> &bull; Total Investasi: <strong className="text-amber-400 font-bold">{dynamicKpi.kebutuhanInvestasi}</strong>
            </span>
          </div>

          <button
            onClick={() => setIsBottomDockOpen(!isBottomDockOpen)}
            className="flex items-center space-x-1 text-xs font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
          >
            <span>{isBottomDockOpen ? 'Sembunyikan Grafik' : 'Buka Grafik Analitik'}</span>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${isBottomDockOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Graphics */}
        {isBottomDockOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs animate-fade-in">
            {/* 1. DISTRIBUSI PCI */}
            <div className="bg-[#11192e]/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Distribusi Kondisi PCI
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-20 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pciDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={18}
                        outerRadius={34}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pciDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-0.5 text-[9px] w-full min-w-0 font-medium">
                  {pciDistributionData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-slate-300 truncate">{item.name}</span>
                      <span className="font-bold text-white">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TREN PCI */}
            <div className="bg-[#11192e]/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Tren Degradasi PINN
                </span>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  2022 &ndash; 2030
                </span>
              </div>
              <div className="w-full h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pciTrendData} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 8 }} />
                    <YAxis domain={[30, 100]} stroke="#64748b" tick={{ fontSize: 8 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '10px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pci"
                      name="PCI Rata-rata"
                      stroke={selectedScenario === 'NO_INTERVENTION' ? '#ef4444' : '#22c55e'}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. ALOKASI PER PRIORITAS */}
            <div className="bg-[#11192e]/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Alokasi Pagu per Prioritas
              </div>
              <div className="space-y-1.5 my-auto">
                <div>
                  <div className="flex justify-between text-[9px] text-slate-300 font-semibold mb-0.5">
                    <span className="text-rose-400">P1 (Critical)</span>
                    <span>Rp 45,2 M (54%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '54%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-300 font-semibold mb-0.5">
                    <span className="text-orange-400">P2 (Rehabilitasi)</span>
                    <span>Rp 28,6 M (34%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '34%' }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-black pt-1 border-t border-slate-800 text-white">
                <span>Total Pagu</span>
                <span className="text-amber-400">{dynamicKpi.kebutuhanInvestasi}</span>
              </div>
            </div>

            {/* 4. DAMPAK EKONOMI & BCR */}
            <div className="bg-[#11192e]/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Dampak Ekonomi &amp; BCR
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Potensi Kerugian:</span>
                  <span className="font-black text-rose-400">Rp 18,4 M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Benefit-Cost Ratio:</span>
                  <span className="font-black text-cyan-400">{selectedCorridor.benefitCostRatio}x</span>
                </div>
              </div>
              <div className="mt-1 p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold text-center">
                1x Biaya Preservasi = Cegah 2.4x Rekonstruksi
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 9. SIDE DRAWERS & DEEP PINN MODAL */}
      <StrategicPolicyDrawers
        activeDrawer={activeDrawer}
        onCloseDrawer={() => setActiveDrawer(null)}
        isDetailModalOpen={isDetailModalOpen}
        onCloseDetailModal={() => setIsDetailModalOpen(false)}
        selectedCorridor={selectedCorridor}
        selectedRegion={selectedRegion}
        onSelectCorridor={(c) => {
          setSelectedCorridor(c);
          setIsSegmentCardOpen(true);
        }}
        onSelectRegion={(r) => {
          setSelectedRegion(r);
          setIsSegmentCardOpen(true);
        }}
        provinceFilter={provinceFilter}
        onProvinceFilterChange={setProvinceFilter}
        pciConditionFilter={pciConditionFilter}
        onPciConditionFilterChange={setPciConditionFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        onDownloadPdf={handleDownloadPdf}
        onOpenDetailedSimulation={() => {
          if (onLaunchSimulation) onLaunchSimulation(selectedSegment);
        }}
      />
    </div>
  );
};
