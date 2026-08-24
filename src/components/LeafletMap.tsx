import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { DamageReport, DamageType, ReportSeverity, RoadSegment, UserRole } from '../types';
import { UserAccount } from '../data/userAccounts';
import { ALL_BINA_MARGA_WIM_STATIONS } from '../data/indonesianRoads';
import { ReportDetailModal } from './ReportDetailModal';
import { Language, TRANSLATIONS } from '../utils/i18n';
import {
  Filter,
  Search,
  Sparkles,
  BarChart2,
  AlertTriangle,
  Truck,
  MapPin,
  ShieldAlert,
  Camera,
  PlusCircle,
  Send,
  ThumbsUp,
  X,
  Info,
  ChevronDown,
  CheckCircle
} from 'lucide-react';

interface LeafletMapProps {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment | null;
  onSelectSegment: (segment: RoadSegment) => void;
  onLaunchSimulation?: (segment: RoadSegment) => void;
  activeRole?: UserRole;
  onNavigateToDashboard?: () => void;
  communityReports?: DamageReport[];
  onAddReport?: (newReport: DamageReport) => void;
  onUpvoteReport?: (reportId: string) => void;
  currentAccount?: UserAccount;
  isCommunityReportCardOpen?: boolean;
  onToggleCommunityReportCard?: () => void;
  onOpenReportModalWithLocation?: (segment: RoadSegment, coords: [number, number]) => void;
  activeFilter?: string;
  theme?: 'light' | 'dark';
  language?: Language;
  baseMapStyle?: 'DARK' | 'SATELLITE' | 'LIGHT';
  onSelectReport?: (report: DamageReport) => void;
  recenterKey?: number;
  highlightReportId?: string | null;
  mapCenterTarget?: { coords: [number, number]; zoom?: number; timestamp: number } | null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  roadSegments,
  selectedSegment,
  onSelectSegment,
  onLaunchSimulation = (_segment: RoadSegment) => {},
  activeRole = 'FIELD_ENGINEER',
  onNavigateToDashboard = () => {},
  communityReports = [],
  onAddReport,
  onUpvoteReport,
  currentAccount,
  isCommunityReportCardOpen,
  onToggleCommunityReportCard,
  onOpenReportModalWithLocation,
  activeFilter = 'ALL',
  theme = 'dark',
  language = 'id',
  baseMapStyle = 'LIGHT',
  onSelectReport,
  recenterKey = 0,
  highlightReportId = null,
  mapCenterTarget = null
}) => {
  const t = TRANSLATIONS[language];
  const isEn = language === 'en';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Filters State
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [showWimOnly, setShowWimOnly] = useState<boolean>(false);
  const [showCommunityReports, setShowCommunityReports] = useState<boolean>(true);
  const [showAllCommunityReports, setShowAllCommunityReports] = useState<boolean>(false);
  const [wimStatusFilter, setWimStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile Card Collapse State - Hidden by default on mobile screen format
  const [isMobileCardCollapsed, setIsMobileCardCollapsed] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Sync mobile report card state when toggled from Navbar disamping Dashboard button
  useEffect(() => {
    if (isCommunityReportCardOpen !== undefined) {
      setIsMobileCardCollapsed(!isCommunityReportCardOpen);
    }
  }, [isCommunityReportCardOpen]);

  // Report Detail Modal State
  const [detailModalReport, setDetailModalReport] = useState<DamageReport | null>(null);

  // Active Animation States for Newly Created Reports (Zoom-out Karawang -> Fly-in -> Sprout / Grow Pin)
  const [hiddenPinReportId, setHiddenPinReportId] = useState<string | null>(null);
  const [sproutingPinReportId, setSproutingPinReportId] = useState<string | null>(null);
  const [activeBlinkReportId, setActiveBlinkReportId] = useState<string | null>(highlightReportId);

  // Center & zoom map when mapCenterTarget is set (With cinematic zoom-out from Karawang -> zoom-in to position -> sprout pin)
  useEffect(() => {
    if (mapCenterTarget && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      const targetZoom = mapCenterTarget.zoom || 17;
      let targetCoords: [number, number] = mapCenterTarget.coords;

      if (isMobile) {
        // Project coordinates into pixel space to calculate an exact vertical offset for mobile.
        // On mobile, the bottom card occupies ~48% of screen height.
        // Offsetting the map center downwards along the Y-axis by ~195px ensures the pin point
        // is positioned perfectly in the upper visible section of the map, clearly above the top of the bottom card.
        const targetPoint = map.project(mapCenterTarget.coords, targetZoom);
        const offsetPoint = L.point(targetPoint.x, targetPoint.y + 195);
        const unprojected = map.unproject(offsetPoint, targetZoom);
        targetCoords = [unprojected.lat, unprojected.lng];
      }

      if (highlightReportId) {
        // Step 1: Hide the new pin initially so the map flies into an empty coordinate without pin
        setHiddenPinReportId(highlightReportId);
        setSproutingPinReportId(null);
        setActiveBlinkReportId(null);

        // Step 2: Set map view to zoomed-out Karawang regional view (Karawang default center: [-6.305, 107.300], zoom 11)
        map.setView([-6.305, 107.300], 11, { animate: false });

        // Step 3: Fly from Karawang regional view into the target location with close range (Zoom in)
        const flyTimeout = setTimeout(() => {
          map.flyTo(targetCoords, targetZoom, {
            duration: 2.2,
            easeLinearity: 0.25
          });
        }, 120);

        // Step 4: After zoom-in finishes (2400ms), reveal and sprout / grow the pin point at the location
        const sproutTimeout = setTimeout(() => {
          setHiddenPinReportId(null);
          setSproutingPinReportId(highlightReportId);
          setActiveBlinkReportId(highlightReportId);
        }, 2450);

        // Step 5: Settle to normal pin state after animation finishes
        const settleTimeout = setTimeout(() => {
          setSproutingPinReportId(null);
          setActiveBlinkReportId(null);
        }, 8000);

        return () => {
          clearTimeout(flyTimeout);
          clearTimeout(sproutTimeout);
          clearTimeout(settleTimeout);
        };
      } else {
        // Standard navigation flyTo
        map.flyTo(targetCoords, targetZoom, {
          duration: 1.4
        });
      }
    }
  }, [mapCenterTarget, highlightReportId]);

  // Report Modal Form State & Click-on-Map Custom Coordinates
  const [isReportFormOpen, setIsReportFormOpen] = useState<boolean>(false);
  const [customCoordinates, setCustomCoordinates] = useState<[number, number] | null>(null);
  const [formSegmentId, setFormSegmentId] = useState<string>(roadSegments[0]?.id || '');
  const [formDamageType, setFormDamageType] = useState<DamageType>('POTHOLE');
  const [formSeverity, setFormSeverity] = useState<ReportSeverity>('SEVERE');
  const [formEstimatedDepth, setFormEstimatedDepth] = useState<number>(12);
  const [formEstimatedArea, setFormEstimatedArea] = useState<number>(4.5);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPhotoIndex, setFormPhotoIndex] = useState<number>(0);

  // Selected Segment for Form WIM Correlation
  const activeFormSegment = roadSegments.find((s) => s.id === formSegmentId) || roadSegments[0] || selectedSegment;

  const matchedWimStation =
    ALL_BINA_MARGA_WIM_STATIONS.find(
      (wim) =>
        (activeFormSegment?.corridor &&
          wim.corridor.toLowerCase().includes(activeFormSegment.corridor.toLowerCase().split(' ')[0])) ||
        wim.province === activeFormSegment?.province
    ) || ALL_BINA_MARGA_WIM_STATIONS[0];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      alert('Mohon masukkan deskripsi kerusakan jalan!');
      return;
    }

    const damageLabels: Record<DamageType, string> = {
      POTHOLE: 'Lubang Dalam (Pothole)',
      ALLIGATOR_CRACK: 'Retak Buaya (Alligator Cracking)',
      RUTTING: 'Ambles & Deformasi Alur (Rutting)',
      CORRUGATION: 'Kerusakan Gelombang (Corrugation)',
      SUBSIDENCE: 'Penurunan Pondasi (Subsidence)',
      CRACK: 'Retak Permukaan (Surface Crack)',
      SURFACE_DAMAGE: 'Kerusakan Permukaan (Surface Damage)',
      ROAD_DEFORMATION: 'Deformasi Jalan (Road Deformation)',
      DEPRESSION: 'Ambles Lokal (Depression)',
      PATCHING: 'Tambalan (Patching)'
    };

    const photoPresets = [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600'
    ];

    const newReport: DamageReport = {
      id: `REP-${Date.now().toString().slice(-6)}`,
      reporterName: currentAccount?.name || 'Masyarakat Pelapor',
      reporterRole:
        activeRole === 'PUBLIC_REPORTER'
          ? 'Pelapor Terverifikasi'
          : activeRole === 'PUBLIC_VIEWER'
          ? 'Pengamat Komunitas'
          : 'Petugas Lapangan',
      reporterAvatar:
        currentAccount?.avatarUrl ||
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      timestamp: new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      segmentId: activeFormSegment.id,
      segmentName: activeFormSegment.name,
      corridor: activeFormSegment.corridor,
      province: activeFormSegment.province,
      coordinates: customCoordinates || activeFormSegment.coordinates,
      damageType: formDamageType,
      damageTypeLabel: damageLabels[formDamageType],
      severity: formSeverity,
      estimatedDepthCm: Number(formEstimatedDepth),
      estimatedAreaM2: Number(formEstimatedArea),
      photoUrl: photoPresets[formPhotoIndex] || photoPresets[0],
      description: formDescription,
      status: 'PENDING',
      upvotesCount: 1,
      userUpvoted: true,
      wimCorrelation: {
        hasWimData: true,
        stationId: matchedWimStation.stationId,
        stationName: matchedWimStation.stationName,
        corridor: matchedWimStation.corridor,
        recentTruckPlate: matchedWimStation.licensePlate,
        recentTruckClass: matchedWimStation.vehicleClass,
        maxAxleLoadTon: matchedWimStation.maxAxleLoadTon,
        legalLimitTon: matchedWimStation.legalLimitTon,
        overloadPercent: matchedWimStation.overloadPercent,
        overloadCategory: matchedWimStation.overloadCategory || 'EXTREME',
        correlatedOverloadTrucksCount: Math.floor(110 + Math.random() * 110),
        estimatedPinnContributionPercent: Math.floor(75 + Math.random() * 20),
        causeAnalysisSummary: `Korelasi PINN & WIM Otomatis: Laporan kerusakan di ${activeFormSegment.name} dikorelasikan dengan lintasan truk ${matchedWimStation.vehicleClass} (${matchedWimStation.licensePlate}) berbeban ${matchedWimStation.maxAxleLoadTon} Ton (+${matchedWimStation.overloadPercent}% Overload) dari Stasiun WIM ${matchedWimStation.stationName}.`
      }
    };

    if (onAddReport) {
      onAddReport(newReport);
    }

    setIsReportFormOpen(false);
    setFormDescription('');
  };

  // Filtered Segments
  const filteredSegments = roadSegments.filter((seg) => {
    const matchProvince = provinceFilter === 'ALL' || seg.province === provinceFilter;
    const matchCondition =
      conditionFilter === 'ALL' || seg.conditionCategory === conditionFilter;
    const matchWim = !showWimOnly || seg.hasWimStation;
    const matchSearch =
      searchQuery === '' ||
      seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.corridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.province.toLowerCase().includes(searchQuery.toLowerCase());
    return matchProvince && matchCondition && matchWim && matchSearch;
  });

  // Filtered WIM Stations
  const filteredWimStations = ALL_BINA_MARGA_WIM_STATIONS.filter((wim) => {
    if (!showWimOnly) return false;

    const matchProvince = provinceFilter === 'ALL' || wim.province === provinceFilter;
    const matchSearch =
      searchQuery === '' ||
      wim.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wim.corridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wim.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wim.stationId.toLowerCase().includes(searchQuery.toLowerCase());

    let matchStatus = true;
    if (wimStatusFilter === 'EXTREME') {
      matchStatus = wim.overloadCategory === 'EXTREME' || wim.overloadPercent > 100;
    } else if (wimStatusFilter === 'HEAVY') {
      matchStatus = wim.overloadCategory === 'HEAVY' || (wim.overloadPercent > 50 && wim.overloadPercent <= 100);
    } else if (wimStatusFilter === 'MODERATE') {
      matchStatus = wim.overloadCategory === 'MODERATE' || (wim.overloadPercent > 20 && wim.overloadPercent <= 50);
    } else if (wimStatusFilter === 'LIGHT') {
      matchStatus = wim.overloadCategory === 'LIGHT' || (wim.overloadPercent > 0 && wim.overloadPercent <= 20);
    } else if (wimStatusFilter === 'NONE') {
      matchStatus = wim.overloadCategory === 'NONE' || wim.overloadPercent === 0;
    }

    return matchProvince && matchSearch && matchStatus;
  });

  // Calculate Map Summary Metrics
  const totalLengthKm = roadSegments.reduce((sum, s) => sum + (s.lengthKm || 0), 0) || 1;
  const damagedKm = roadSegments
    .filter((s) => s.conditionCategory === 'LIGHT_DAMAGE' || s.conditionCategory === 'HEAVY_DAMAGE')
    .reduce((sum, s) => sum + (s.lengthKm || 0), 0);
  const damagedPercent = ((damagedKm / totalLengthKm) * 100).toFixed(1);
  const activeRedAlertsCount = roadSegments.filter((s) => s.activeOdolAlert === 'RED').length;
  const avgPci = roadSegments.length
    ? Math.round(roadSegments.reduce((sum, s) => sum + (s.currentPci || 0), 0) / roadSegments.length)
    : 0;

  // Map Click Location Selection State
  const [mapSelectedPoint, setMapSelectedPoint] = useState<{
    coordinates: [number, number];
    nearestSegment: RoadSegment;
  } | null>(null);

  const tempMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-6.3050, 107.3180],
        zoom: 12,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Select tile URL based on baseMapStyle (DARK, SATELLITE, LIGHT)
      const tileUrl =
        baseMapStyle === 'SATELLITE'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : baseMapStyle === 'LIGHT'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Map click event listener: Select point and set mapSelectedPoint
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));

        // Pan map smoothly to the clicked location
        map.panTo([clickedLat, clickedLng], { animate: true, duration: 0.8 });

        // Find nearest road segment
        let nearestSeg = roadSegments[0];
        let minDistance = Infinity;
        roadSegments.forEach((seg) => {
          const segLat = seg.coordinates[0];
          const segLng = seg.coordinates[1];
          const dist = Math.hypot(segLat - clickedLat, segLng - clickedLng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestSeg = seg;
          }
        });

        setMapSelectedPoint({
          coordinates: [clickedLat, clickedLng],
          nearestSegment: nearestSeg
        });
      });

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer url when baseMapStyle or theme changes
  useEffect(() => {
    if (tileLayerRef.current) {
      const tileUrl =
        baseMapStyle === 'SATELLITE'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : baseMapStyle === 'LIGHT'
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [baseMapStyle, theme]);

  // Render Polylines and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    filteredSegments.forEach((segment) => {
      const color =
        segment.conditionCategory === 'GOOD'
          ? '#10b981'
          : segment.conditionCategory === 'MODERATE'
          ? '#f59e0b'
          : segment.conditionCategory === 'LIGHT_DAMAGE'
          ? '#f97316'
          : '#ef4444';

      // Render location pin marker with white circular background behind layer icon (No polyline paths)
      const customIconHtml = `
        <div style="position: relative; width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.38)); transition: transform 0.15s ease;">
          <!-- SVG Map Pin Shape -->
          <svg viewBox="0 0 384 512" width="32" height="42" fill="${color}" xmlns="http://www.w3.org/2000/svg">
            <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0s192 85.961 192 0 192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          </svg>
          <!-- Background Bulat Putih Dibelakang Layer Icon -->
          <div style="
            position: absolute;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.25);
            z-index: 2;
          ">
            <span style="
              color: ${color};
              font-weight: 900;
              font-size: 10px;
              font-family: monospace;
              line-height: 1;
            ">
              ${segment.currentPci}
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [34, 44],
        iconAnchor: [17, 42]
      });

      const marker = L.marker(segment.coordinates, { icon: customIcon }).addTo(layerGroup);
      marker.on('click', () => {
        onSelectSegment(segment);
      });

      // If segment has WIM station, render dedicated WIM Sensor Station Marker (ONLY for Official Roles)
      if (!isRegularUser && segment.hasWimStation && segment.wimDetails) {
        const wim = segment.wimDetails;
        const wimAlertColor =
          wim.alertSeverity === 'RED'
            ? '#ef4444'
            : wim.alertSeverity === 'YELLOW'
            ? '#f59e0b'
            : '#10b981';

        const wimIconHtml = `
          <div style="
            position: relative;
            background-color: #0f172a;
            border: 2px solid ${wimAlertColor};
            border-radius: 12px;
            padding: 3px 6px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 10px ${wimAlertColor}80;
            display: flex;
            align-items: center;
            gap: 4px;
            color: white;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            cursor: pointer;
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: ${wimAlertColor};
              display: inline-block;
              box-shadow: 0 0 8px ${wimAlertColor};
            "></span>
            <span>⚖️ WIM: ${wim.stationId}</span>
          </div>
        `;

        const wimIcon = L.divIcon({
          html: wimIconHtml,
          className: 'custom-wim-leaflet-marker',
          iconSize: [110, 24],
          iconAnchor: [55, 12]
        });

        const wimMarker = L.marker(wim.coordinates, { icon: wimIcon }).addTo(layerGroup);

        const wimPopupHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; width: 280px; color: #0f172a;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-b: 1px solid #e2e8f0; padding-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="background-color: #3b82f615; color: #1d4ed8; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px; font-family: monospace;">
                  ${wim.stationId}
                </span>
                <span style="font-size: 10px; font-weight: 700; color: #64748b;">STASIUN SENSOR WIM</span>
              </div>
              <span style="background-color: ${wimAlertColor}20; color: ${wimAlertColor}; border: 1px solid ${wimAlertColor}50; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 12px;">
                ${wim.alertSeverity === 'RED' ? '🔴 RED ALERT (ODOL)' : wim.alertSeverity === 'YELLOW' ? '🟡 WARNING' : '🟢 NORMAL PASS'}
              </span>
            </div>

            <!-- Station Title & Location -->
            <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0;">${wim.stationName}</h4>
            <p style="font-size: 10.5px; color: #475569; margin: 0 0 8px 0; font-family: monospace;">
              📍 GPS: <strong style="color: #0284c7;">${wim.coordinates[0].toFixed(4)}, ${wim.coordinates[1].toFixed(4)}</strong> (${wim.province})
            </p>

            <!-- ANPR & Vehicle Load Telemetry -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; font-size: 11px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                <span style="color: #64748b;">Truk / ANPR:</span>
                <span style="font-weight: 800; color: #0f172a; font-family: monospace;">${wim.licensePlate} (${wim.speedKmh} km/h)</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Golongan:</span>
                <span style="font-weight: 700; color: #334155; font-size: 10px;">${wim.vehicleClass}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Beban Sumbu Maks:</span>
                <span style="font-weight: 800; color: ${wim.maxAxleLoadTon > 10 ? '#dc2626' : '#16a34a'};">
                  ${wim.maxAxleLoadTon} Ton ${wim.maxAxleLoadTon > 10 ? `(+${wim.overloadPercent}% ODOL)` : ''}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Gross Weight:</span>
                <span style="font-weight: 700; color: #1e293b;">${wim.grossWeightTon} Ton (MST ${wim.legalLimitTon} Ton)</span>
              </div>
            </div>

            <!-- PINN Engineering Impact Correlation -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 8px; font-size: 10.5px; color: #1e40af; margin-bottom: 8px;">
              <div style="font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>🧠 KORELASI PINN FISIKA PERKERASAN</span>
                <span style="font-size: 9px; background-color: #2563eb; color: white; padding: 1px 5px; border-radius: 8px;">FWD Validated</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Defleksi Permukaan FWD:</span>
                <strong>${wim.fwdDeflectionMicron} µm</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Indeks Induksi Kerusakan:</span>
                <strong style="color: #b91c1c;">${wim.pinnDamageImpactIndex} / 100</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Rekomendasi Overlay AC-WC:</span>
                <strong>${wim.overlayRecommendationCm} cm</strong>
              </div>
            </div>

            <div style="display: flex; gap: 4px;">
              <button id="btn-wim-sim-${segment.id}" style="
                flex: 1;
                background: linear-gradient(135deg, #4f46e5, #0284c7);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 7px 10px;
                font-size: 10.5px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);
              ">
                ⚡ Jalankan Simulasi PINN
              </button>
            </div>
          </div>
        `;

        wimMarker.bindPopup(wimPopupHtml);

        wimMarker.on('popupopen', () => {
          onSelectSegment(segment);
          const btnWimSim = document.getElementById(`btn-wim-sim-${segment.id}`);
          if (btnWimSim) {
            btnWimSim.onclick = () => onLaunchSimulation(segment);
          }
        });
      }

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 260px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">${segment.corridor}</span>
            <span style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">
              PCI: ${segment.currentPci} (${segment.conditionCategory})
            </span>
          </div>
          <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0;">${segment.name}</h4>
          <p style="font-size: 10.5px; color: #475569; margin: 0 0 8px 0; font-family: monospace;">
            📍 Koordinat GPS: <strong style="color: #2563eb;">${segment.coordinates[0].toFixed(4)}, ${segment.coordinates[1].toFixed(4)}</strong> | ${segment.kmPost}
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; font-size: 11px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #64748b;">Subgrade CBR:</span>
              <span style="font-weight: 700; color: #1e293b;">${segment.defaultCbrPercent}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #64748b;">LHR Traffic:</span>
              <span style="font-weight: 700; color: #1e293b;">${(segment.dailyTrafficVolumeLhr ?? 0).toLocaleString('id-ID')} Kend/Hari</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Beban Sumbu Rata-rata:</span>
              <span style="font-weight: 700; color: ${segment.defaultAxleLoadTon > 18 ? '#dc2626' : '#2563eb'};">
                ${segment.defaultAxleLoadTon} Ton ${segment.defaultAxleLoadTon > 10 ? '(ODOL)' : ''}
              </span>
            </div>
          </div>

          ${
            !isRegularUser && segment.hasWimStation && segment.wimDetails
              ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 6px 8px; font-size: 10.5px; color: #991b1b; margin-bottom: 8px;">
                  <div style="display: flex; items-center; justify-content: space-between; margin-bottom: 2px;">
                    <span style="font-weight: 800;">⚖️ ${segment.wimDetails.stationName}</span>
                    <span style="background-color: #ef4444; color: white; padding: 1px 5px; border-radius: 8px; font-weight: bold; font-size: 8.5px;">WIM ACTIVE</span>
                  </div>
                  <div style="font-size: 9.5px; color: #7f1d1d; font-family: monospace;">
                    📍 Sensor Lat/Lng: ${segment.wimDetails.coordinates[0].toFixed(4)}, ${segment.wimDetails.coordinates[1].toFixed(4)}
                  </div>
                  <div style="font-size: 9.5px; color: #991b1b; font-weight: bold; margin-top: 2px;">
                    Truk Terakhir: ${segment.wimDetails.licensePlate} (${segment.wimDetails.maxAxleLoadTon} Ton - ODOL +${segment.wimDetails.overloadPercent}%)
                  </div>
                </div>`
              : ''
          }

          <div style="display: flex; gap: 4px;">
            <button id="btn-sim-${segment.id}" style="
              flex: 1;
              background: linear-gradient(135deg, #6366f1, #4f46e5);
              color: white;
              border: none;
              border-radius: 10px;
              padding: 8px 10px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
            ">
              ⚡ Simulasi PINN
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        onSelectSegment(segment);
        const btnSim = document.getElementById(`btn-sim-${segment.id}`);
        if (btnSim) {
          btnSim.onclick = () => onLaunchSimulation(segment);
        }
      });
    });

    // Render Bina Marga National WIM Station Pin Points when showWimOnly is enabled (ONLY for Official Roles)
    if (!isRegularUser && showWimOnly) {
      filteredWimStations.forEach((wim) => {
        const pinColor =
          wim.overloadCategory === 'EXTREME' || wim.overloadPercent > 100
            ? '#ef4444' // Red
            : wim.overloadCategory === 'HEAVY' || wim.overloadPercent > 50
            ? '#a855f7' // Purple
            : wim.overloadCategory === 'MODERATE' || wim.overloadPercent > 20
            ? '#f97316' // Orange
            : wim.overloadCategory === 'LIGHT' || wim.overloadPercent > 0
            ? '#eab308' // Yellow
            : '#10b981'; // Green

        const pinCategoryText =
          wim.overloadCategory === 'EXTREME' || wim.overloadPercent > 100
            ? 'Overload Ekstrim (>100%)'
            : wim.overloadCategory === 'HEAVY' || wim.overloadPercent > 50
            ? 'Overload Berat (>50%)'
            : wim.overloadCategory === 'MODERATE' || wim.overloadPercent > 20
            ? 'Overload Sedang (20-50%)'
            : wim.overloadCategory === 'LIGHT' || wim.overloadPercent > 0
            ? 'Overload Ringan (5-20%)'
            : 'Tidak Overload';

        // Pin marker HTML (custom SVG pin matching Bina Marga Dashboard style)
        const wimPinHtml = `
          <div style="position: relative; width: 30px; height: 38px; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">
            <svg viewBox="0 0 384 512" width="30" height="38" fill="${pinColor}" xmlns="http://www.w3.org/2000/svg">
              <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
            </svg>
            <div style="
              position: absolute;
              top: 5px;
              left: 50%;
              transform: translateX(-50%);
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background-color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
            ">
              ⚖️
            </div>
          </div>
        `;

        const wimPinIcon = L.divIcon({
          html: wimPinHtml,
          className: 'bina-marga-wim-pin-marker',
          iconSize: [30, 38],
          iconAnchor: [15, 38]
        });

        const wimPinMarker = L.marker(wim.coordinates, { icon: wimPinIcon }).addTo(layerGroup);

        const wimPopupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; width: 285px; color: #0f172a;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="background-color: #3b82f615; color: #1d4ed8; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px; font-family: monospace;">
                  ${wim.stationId}
                </span>
                <span style="font-size: 10px; font-weight: 700; color: #64748b;">STASIUN WIM BINA MARGA</span>
              </div>
              <span style="background-color: ${pinColor}20; color: ${pinColor}; border: 1px solid ${pinColor}50; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 12px;">
                ${pinCategoryText}
              </span>
            </div>

            <!-- Station Name & Corridor -->
            <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0;">${wim.stationName}</h4>
            <p style="font-size: 10px; color: #64748b; font-weight: 600; margin: 0 0 4px 0;">${wim.corridor}</p>
            <p style="font-size: 10.5px; color: #475569; margin: 0 0 8px 0; font-family: monospace;">
              📍 GPS: <strong style="color: #0284c7;">${wim.coordinates[0].toFixed(4)}, ${wim.coordinates[1].toFixed(4)}</strong> (${wim.province})
            </p>

            <!-- Telemetry -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; font-size: 11px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                <span style="color: #64748b;">Truk / ANPR:</span>
                <span style="font-weight: 800; color: #0f172a; font-family: monospace;">${wim.licensePlate} (${wim.speedKmh} km/h)</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Kelas Kendaraan:</span>
                <span style="font-weight: 700; color: #334155; font-size: 10px;">${wim.vehicleClass}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Beban Sumbu Maks:</span>
                <span style="font-weight: 800; color: ${wim.maxAxleLoadTon > 10 ? '#dc2626' : '#16a34a'};">
                  ${wim.maxAxleLoadTon} Ton ${wim.overloadPercent > 0 ? `(+${wim.overloadPercent}%)` : ''}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Gross Weight:</span>
                <span style="font-weight: 700; color: #1e293b;">${wim.grossWeightTon} Ton (MST ${wim.legalLimitTon} Ton)</span>
              </div>
            </div>

            <!-- PINN Physics Impact -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 8px; font-size: 10.5px; color: #1e40af;">
              <div style="font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>🧠 KORELASI PINN FISIKA PERKERASAN</span>
                <span style="font-size: 9px; background-color: #2563eb; color: white; padding: 1px 5px; border-radius: 8px;">FWD Validated</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Defleksi Permukaan FWD:</span>
                <strong>${wim.fwdDeflectionMicron} µm</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Indeks Kerusakan Struktural:</span>
                <strong style="color: #b91c1c;">${wim.pinnDamageImpactIndex} / 100</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Rekomendasi Tebal Overlay:</span>
                <strong>${wim.overlayRecommendationCm} cm</strong>
              </div>
            </div>
          </div>
        `;

        wimPinMarker.bindPopup(wimPopupContent);
      });
    }

    // Filter community reports based on activeFilter from public interface
    const visibleReports = (communityReports || []).filter((report) => {
      if (activeFilter === 'CRITICAL') return report.severity === 'CRITICAL';
      if (activeFilter === 'MODERATE') return report.severity === 'SEVERE' || report.severity === 'MODERATE';
      if (activeFilter === 'MINOR') return report.severity === 'LIGHT';
      return true; // 'ALL' or 'HEATMAP'
    });

    // OFFICIAL LEAFLET.HEAT PLUGIN IMPLEMENTATION: L.heatLayer(points, options)
    if (activeFilter === 'HEATMAP' && visibleReports.length > 0) {
      // 1. Prepare data points using [latitude, longitude, intensity]
      const heatPoints: [number, number, number][] = visibleReports.map((rep) => {
        const intensity =
          rep.severity === 'CRITICAL' ? 1.0 : rep.severity === 'SEVERE' ? 0.75 : rep.severity === 'MODERATE' ? 0.5 : 0.3;
        return [rep.coordinates[0], rep.coordinates[1], intensity];
      });

      // 2. Initialize Leaflet.heat layer and pass data points into L.heatLayer()
      const heatLayerFn = (L as any).heatLayer || (window as any).L?.heatLayer;
      if (typeof heatLayerFn === 'function') {
        const heatLayer = heatLayerFn(heatPoints, {
          radius: 35,
          blur: 22,
          maxZoom: 16,
          max: 1.0,
          minOpacity: 0.35,
          gradient: {
            0.2: '#06b6d4',
            0.4: '#22c55e',
            0.6: '#eab308',
            0.8: '#f97316',
            1.0: '#ef4444'
          }
        });
        // 3. Add the heat layer to map/layerGroup
        heatLayer.addTo(layerGroup);
      }

      interface HeatCluster {
        center: [number, number];
        count: number;
        criticalCount: number;
        severeCount: number;
        moderateCount: number;
        lightCount: number;
        totalWeight: number;
        areaName: string;
        reports: DamageReport[];
      }

      const clusters: HeatCluster[] = [];
      const CLUSTER_RADIUS_DEG = 0.038; // ~4.2km cluster radius for organic density grouping

      visibleReports.forEach((rep) => {
        const repWeight =
          rep.severity === 'CRITICAL' ? 4 : rep.severity === 'SEVERE' ? 3 : rep.severity === 'MODERATE' ? 2 : 1;

        let matched = clusters.find((c) => {
          const dist = Math.hypot(c.center[0] - rep.coordinates[0], c.center[1] - rep.coordinates[1]);
          return dist <= CLUSTER_RADIUS_DEG;
        });

        if (matched) {
          matched.reports.push(rep);
          matched.count += 1;
          matched.totalWeight += repWeight;
          if (rep.severity === 'CRITICAL') matched.criticalCount += 1;
          else if (rep.severity === 'SEVERE') matched.severeCount += 1;
          else if (rep.severity === 'MODERATE') matched.moderateCount += 1;
          else matched.lightCount += 1;

          matched.center = [
            (matched.center[0] * (matched.count - 1) + rep.coordinates[0]) / matched.count,
            (matched.center[1] * (matched.count - 1) + rep.coordinates[1]) / matched.count
          ];
        } else {
          clusters.push({
            center: [rep.coordinates[0], rep.coordinates[1]],
            count: 1,
            criticalCount: rep.severity === 'CRITICAL' ? 1 : 0,
            severeCount: rep.severity === 'SEVERE' ? 1 : 0,
            moderateCount: rep.severity === 'MODERATE' ? 1 : 0,
            lightCount: rep.severity === 'LIGHT' ? 1 : 0,
            totalWeight: repWeight,
            areaName: rep.segmentName || rep.corridor || 'Wilayah Laporan',
            reports: [rep]
          });
        }
      });

      // Render interactive hotspot markers and comparison story badges
      clusters.forEach((cluster, clusterIdx) => {
        const representativeReport = cluster.reports[0];
        const previewPhoto = representativeReport.photoUrl;
        const shortTitle = cluster.areaName.split('(')[0].trim();

        // 1. Heatmap Pinpoint Marker (Pin Lokasi + Icon Tingkat Kerusakan dengan Background Bulat Putih)
        const heatmapPinHtml = `
          <div style="position: relative; width: 36px; height: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(220,38,38,0.55)); transition: transform 0.15s ease;">
            <!-- SVG Map Pin in Crimson Red -->
            <svg viewBox="0 0 384 512" width="34" height="44" fill="#dc2626" xmlns="http://www.w3.org/2000/svg">
              <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
            </svg>
            <!-- Background Bulat Putih Dibelakang Layer Icon -->
            <div style="
              position: absolute;
              top: 5px;
              left: 50%;
              transform: translateX(-50%);
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              z-index: 2;
            ">
              <!-- Icon Tingkat Kerusakan Hotspot -->
              <span style="font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center;">
                🔥
              </span>
            </div>
          </div>
        `;

        const heatmapPinIcon = L.divIcon({
          html: heatmapPinHtml,
          className: 'heatmap-cluster-pinpoint',
          iconSize: [36, 46],
          iconAnchor: [18, 44]
        });

        const pinMarker = L.marker(cluster.center, { icon: heatmapPinIcon }).addTo(layerGroup);

        // 2. Floating Story Chip Badge
        const snapchatChipHtml = `
          <div class="snapchat-story-chip" style="
            display: flex;
            align-items: center;
            gap: 8px;
            background: #ffffff;
            border-radius: 9999px;
            padding: 4px 12px 4px 4px;
            box-shadow: 0 12px 28px rgba(0,0,0,0.35), 0 0 16px rgba(239,68,68,0.4);
            border: 2px solid #ffffff;
            cursor: pointer;
            transform: translateY(-50%);
            white-space: nowrap;
          ">
            <img src="${previewPhoto}" alt="${shortTitle}" class="snapchat-story-avatar" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #ef4444;
            " />
            <div style="text-align: left; line-height: 1.2;">
              <div style="font-size: 11px; font-weight: 800; color: #0f172a; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
                ${shortTitle}
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 9px; font-weight: 800; color: #ef4444;">🔥 ${cluster.count} ${isEn ? 'REPORTS' : 'LAPORAN'}</span>
                <span style="font-size: 8.5px; color: #64748b;">• HOTSPOT</span>
              </div>
            </div>
          </div>
        `;

        const snapchatIcon = L.divIcon({
          html: snapchatChipHtml,
          className: 'snapchat-heatmap-story-marker',
          iconSize: [180, 42],
          iconAnchor: [90, 21]
        });

        const snapMarker = L.marker(cluster.center, { icon: snapchatIcon }).addTo(layerGroup);

        // 3. Interactive Leaflet Popup for 2-step verification before opening full comparison modal
        const heatmapPopupContainer = document.createElement('div');
        heatmapPopupContainer.style.width = '290px';
        heatmapPopupContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        heatmapPopupContainer.style.padding = '4px';
        heatmapPopupContainer.style.color = '#0f172a';

        heatmapPopupContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <span style="background-color: #fef2f2; color: #dc2626; font-weight: 800; font-size: 10.5px; padding: 2.5px 8px; border-radius: 12px; border: 1px solid #fecaca; display: flex; align-items: center; gap: 4px;">
              🔥 ${t.heatmapHotspots}
            </span>
            <span style="font-size: 10px; font-weight: 800; color: #475569; background: #f1f5f9; padding: 2px 7px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${cluster.count} ${isEn ? 'Reports' : 'Laporan'}
            </span>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
            <img src="${previewPhoto}" alt="${shortTitle}" style="width: 76px; height: 60px; object-fit: cover; border-radius: 8px; border: 1.5px solid #ef4444; flex-shrink: 0;" />
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; line-height: 1.3;">${shortTitle}</h4>
              <p style="font-size: 10px; color: #64748b; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cluster.areaName}</p>
              <div style="font-size: 9.5px; font-weight: 800; color: #dc2626; font-family: monospace;">
                ${cluster.criticalCount} ${isEn ? 'Critical Potholes' : 'Lubang Kritis'}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 4px; margin-bottom: 8px; font-size: 9.5px; font-weight: 700; font-family: monospace; flex-wrap: wrap;">
            ${cluster.criticalCount > 0 ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; border: 1px solid #fecaca;">🔴 ${cluster.criticalCount} ${isEn ? 'Critical' : 'Kritis'}</span>` : ''}
            ${cluster.severeCount > 0 ? `<span style="background: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; border: 1px solid #fed7aa;">🟠 ${cluster.severeCount} ${isEn ? 'Severe' : 'Parah'}</span>` : ''}
            ${cluster.moderateCount > 0 ? `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a;">🟡 ${cluster.moderateCount} ${isEn ? 'Moderate' : 'Sedang'}</span>` : ''}
            ${cluster.lightCount > 0 ? `<span style="background: #e0f2fe; color: #075985; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">🔵 ${cluster.lightCount} ${isEn ? 'Light' : 'Ringan'}</span>` : ''}
          </div>

          <p style="font-size: 10px; color: #475569; margin: 0 0 8px 0; line-height: 1.35; background: #f8fafc; padding: 5px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${t.heatmapClickToCompare}
          </p>

          <button id="btn-open-compare-${clusterIdx}" style="
            width: 100%;
            background: linear-gradient(135deg, #4f46e5, #06b6d4);
            color: #ffffff;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);
          ">
            <span>🔍 ${t.openDetailedComparison}</span>
          </button>
        `;

        const compareBtn = heatmapPopupContainer.querySelector(`#btn-open-compare-${clusterIdx}`);
        if (compareBtn) {
          compareBtn.addEventListener('click', () => {
            if (onSelectReport) {
              onSelectReport(representativeReport);
            } else {
              setDetailModalReport(representativeReport);
            }
            mapInstanceRef.current?.closePopup();
          });
        }

        pinMarker.bindPopup(heatmapPopupContainer, { maxWidth: 320 });
        snapMarker.bindPopup(heatmapPopupContainer, { maxWidth: 320 });
      });
    }

    // Render Community Damage Report Markers (Pin Point Format Sesuai Gambar: Circular Photo + Severity Border + Pointer + Count Badge + Heat Glow)
    if (showCommunityReports && visibleReports.length > 0 && activeFilter !== 'HEATMAP') {
      visibleReports.forEach((report, index) => {
        // Hide newly created pin during initial map zoom flight from Karawang overview
        if (hiddenPinReportId && report.id === hiddenPinReportId) {
          return;
        }

        const isRepaired = report.status === 'REPAIRED';

        const reportColor = isRepaired
          ? '#10b981'
          : report.severity === 'CRITICAL'
          ? '#ef4444'
          : report.severity === 'SEVERE'
          ? '#f97316'
          : report.severity === 'MODERATE'
          ? '#f59e0b'
          : '#10b981';

        const glowColor = isRepaired
          ? 'rgba(16, 185, 129, 0.4)'
          : report.severity === 'CRITICAL'
          ? 'rgba(239, 68, 68, 0.45)'
          : report.severity === 'SEVERE'
          ? 'rgba(249, 115, 22, 0.4)'
          : report.severity === 'MODERATE'
          ? 'rgba(245, 158, 11, 0.42)'
          : 'rgba(16, 185, 129, 0.38)';

        // Count badge representation (matching sample in image: 12, 5, 2)
        const badgeCount =
          report.severity === 'CRITICAL'
            ? 12
            : report.severity === 'SEVERE' || report.severity === 'MODERATE'
            ? 5
            : 2;

        // Check if this pin is sprouting or newly created
        const isSprouting = report.id === sproutingPinReportId;
        const isNewlyCreated = report.id === activeBlinkReportId || isSprouting;

        // Custom Pin Point with photo, border ring, pointer tip, top-right count badge, and soft heatmap aura
        const pinHtml = `
          <div class="${isSprouting ? 'newly-created-pin-sprout' : isNewlyCreated ? 'newly-created-pin-drop' : ''}" style="position: relative; width: 60px; height: 68px; display: flex; align-items: center; justify-content: center; cursor: pointer; transform-origin: bottom center;">
            <!-- Expanding Ping Halo Rings for Newly Created Pin -->
            ${isNewlyCreated ? `
              <div class="newly-created-pin-ring"></div>
              <div class="newly-created-pin-ring-delay"></div>
            ` : ''}

            <!-- Radial Heat Aura Glow behind pin -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -46%);
              width: ${isNewlyCreated ? '88px' : '68px'};
              height: ${isNewlyCreated ? '88px' : '68px'};
              border-radius: 50%;
              background: radial-gradient(circle, ${isNewlyCreated ? 'rgba(245,158,11,0.75)' : glowColor} 0%, rgba(255,255,255,0) 70%);
              pointer-events: none;
              z-index: 1;
            "></div>

            <!-- Main Pin Body with optional blink highlight -->
            <div class="${isNewlyCreated ? 'newly-created-pin-blink' : ''}" style="
              position: relative;
              z-index: 2;
              display: flex;
              flex-direction: column;
              align-items: center;
              filter: drop-shadow(0 6px 12px rgba(0,0,0,0.32));
              transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
              <!-- Newly Created Top Floating Badge -->
              ${
                isNewlyCreated
                  ? `
                <div style="
                  position: absolute;
                  top: -16px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: #f59e0b;
                  color: #0f172a;
                  font-size: 8px;
                  font-weight: 900;
                  padding: 1px 6px;
                  border-radius: 999px;
                  white-space: nowrap;
                  border: 1.5px solid #ffffff;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                  z-index: 30;
                  letter-spacing: 0.5px;
                ">
                  BARU DIBUAT
                </div>
              `
                  : ''
              }

              <!-- Pin Circular Head with Photo -->
              <div style="
                position: relative;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: #ffffff;
                border: 3.5px solid ${isNewlyCreated ? '#f59e0b' : reportColor};
                box-shadow: ${isNewlyCreated ? '0 0 16px rgba(245,158,11,0.9)' : '0 2px 8px rgba(0,0,0,0.22)'};
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <img
                  src="${report.photoUrl}"
                  alt="${report.damageTypeLabel}"
                  style="
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                  "
                />

                <!-- Top Right Number Badge Pill (e.g. 12, 5, 2) -->
                <div style="
                  position: absolute;
                  top: -5px;
                  right: -5px;
                  min-width: 18px;
                  height: 18px;
                  padding: 0 4px;
                  border-radius: 999px;
                  background-color: ${reportColor};
                  color: ${reportColor === '#f59e0b' ? '#0f172a' : '#ffffff'};
                  font-size: 10px;
                  font-weight: 900;
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #ffffff;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                  z-index: 10;
                  line-height: 1;
                ">
                  ${badgeCount}
                </div>
              </div>

              <!-- Pin Pointer Tip Triangle -->
              <div style="
                width: 0;
                height: 0;
                border-left: 6.5px solid transparent;
                border-right: 6.5px solid transparent;
                border-top: 8px solid ${isNewlyCreated ? '#f59e0b' : reportColor};
                margin-top: -1.5px;
              "></div>
            </div>
          </div>
        `;

        const reportIcon = L.divIcon({
          html: pinHtml,
          className: `clean-damage-pin-marker ${isSprouting ? 'newly-created-pin-sprout' : ''} ${isNewlyCreated ? 'newly-created-pin-blink' : ''}`,
          iconSize: [60, 68],
          iconAnchor: [30, 58]
        });

        const reportMarker = L.marker(report.coordinates, { icon: reportIcon }).addTo(layerGroup);

        // Click marker directly selects the report to open the bottom sheet drawer
        reportMarker.on('click', () => {
          const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
          if (isMobile && mapInstanceRef.current) {
            const map = mapInstanceRef.current;
            const targetZoom = 16;
            const targetPoint = map.project(report.coordinates, targetZoom);
            const offsetPoint = L.point(targetPoint.x, targetPoint.y + 195);
            const unprojected = map.unproject(offsetPoint, targetZoom);
            map.flyTo([unprojected.lat, unprojected.lng], targetZoom, { duration: 1.0 });
          }
          if (onSelectReport) {
            onSelectReport(report);
          } else {
            setDetailModalReport(report);
          }
          const seg = roadSegments.find((s) => s.id === report.segmentId);
          if (seg) onSelectSegment(seg);
        });
      });

      // Render User GPS Blue Location Marker on Map (as shown in reference image)
      const userGpsIconHtml = `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.5);"></div>
          <div style="width: 13px; height: 13px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 0 8px rgba(37, 99, 235, 0.85); z-index: 2;"></div>
        </div>
      `;
      const userGpsIcon = L.divIcon({
        html: userGpsIconHtml,
        className: 'user-gps-dot-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      L.marker([-6.3120, 107.3050], { icon: userGpsIcon }).addTo(layerGroup);
    }

    // Render Selected Location Pin Marker & Anchored Popup Card directly above pin
    if (mapSelectedPoint) {
      const selectedPinHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.9));">
          <div style="position: relative; z-index: 10; background-color: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; border: 2px solid white; box-shadow: 0 0 14px rgba(16, 185, 129, 0.9);">
            📍
          </div>
        </div>
      `;

      const selectedPinIcon = L.divIcon({
        html: selectedPinHtml,
        className: 'selected-location-pin-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const selectedMarker = L.marker(mapSelectedPoint.coordinates, { icon: selectedPinIcon }).addTo(layerGroup);

      // Compact DOM popup anchored directly above pin
      const popupContainer = document.createElement('div');
      popupContainer.style.width = '210px';
      popupContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      popupContainer.style.padding = '2px';

      popupContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 5px;">
          <span style="font-size: 10.5px; font-weight: 900; color: #059669;">📍 ${t.selectedLocation}</span>
          <button id="pop-close-btn" style="background: none; border: none; font-size: 12px; color: #94a3b8; cursor: pointer; font-weight: 700; padding: 0 2px;">✕</button>
        </div>
        <div style="font-size: 9.5px; font-family: monospace; color: #0284c7; background: #f0f9ff; padding: 2px 5px; border-radius: 5px; font-weight: 700; margin-bottom: 5px; border: 1px solid #bae6fd; text-align: center;">
          ${mapSelectedPoint.coordinates[0]}, ${mapSelectedPoint.coordinates[1]}
        </div>
        <div style="font-size: 9px; color: #334155; text-align: left; background: #f8fafc; padding: 4px 6px; border-radius: 6px; margin-bottom: 7px; border: 1px solid #e2e8f0;">
          <span style="color: #64748b; font-size: 8px; font-weight: 700; display: block;">${isEn ? 'NEAREST ROAD CORRIDOR:' : 'RUAS JALAN TERDEKAT:'}</span>
          <strong style="color: #0f172a; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9.5px;">${mapSelectedPoint.nearestSegment.name}</strong>
        </div>
        <div style="display: flex; gap: 4px;">
          <button id="pop-approve-btn" style="flex: 1; background-color: #10b981; color: white; border: none; padding: 5px 8px; border-radius: 6px; font-weight: 800; font-size: 9.5px; cursor: pointer; box-shadow: 0 2px 5px rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; gap: 3px;">
            ✓ ${t.approveLocation}
          </button>
          <button id="pop-cancel-btn" style="background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 5px 7px; border-radius: 6px; font-weight: 700; font-size: 9.5px; cursor: pointer;">
            ✕
          </button>
        </div>
      `;

      selectedMarker.bindPopup(popupContainer, {
        offset: [0, -12],
        closeButton: false,
        className: 'compact-location-approval-popup'
      }).openPopup();

      setTimeout(() => {
        const approveBtn = popupContainer.querySelector('#pop-approve-btn') as HTMLButtonElement | null;
        const cancelBtn = popupContainer.querySelector('#pop-cancel-btn') as HTMLButtonElement | null;
        const closeBtn = popupContainer.querySelector('#pop-close-btn') as HTMLButtonElement | null;

        if (approveBtn) {
          approveBtn.onclick = (evt) => {
            evt.stopPropagation();
            if (onOpenReportModalWithLocation) {
              onOpenReportModalWithLocation(mapSelectedPoint.nearestSegment, mapSelectedPoint.coordinates);
            } else {
              setCustomCoordinates(mapSelectedPoint.coordinates);
              setFormSegmentId(mapSelectedPoint.nearestSegment.id);
              setIsReportFormOpen(true);
            }
            setMapSelectedPoint(null);
          };
        }

        const handleCancel = (evt: MouseEvent) => {
          evt.stopPropagation();
          setMapSelectedPoint(null);
        };

        if (cancelBtn) cancelBtn.onclick = handleCancel;
        if (closeBtn) closeBtn.onclick = handleCancel;
      }, 50);
    }
  }, [filteredSegments, filteredWimStations, communityReports, selectedSegment, showWimOnly, showCommunityReports, mapSelectedPoint, activeFilter, activeRole, hiddenPinReportId, sproutingPinReportId, activeBlinkReportId]);

  // Center on selected segment
  useEffect(() => {
    if (selectedSegment && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(selectedSegment.coordinates, 12, {
        duration: 1.2
      });
    }
  }, [selectedSegment]);

  // Recenter Map to Karawang with wide view of Karawang Regency
  useEffect(() => {
    if (recenterKey > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([-6.3050, 107.3180], 12, {
        duration: 1.2
      });
    }
  }, [recenterKey]);

  // Check if current logged-in role is a regular user account (Public Reporter / Viewer)
  const isRegularUser = activeRole === 'PUBLIC_REPORTER' || activeRole === 'PUBLIC_VIEWER';

  return (
    <div className={`relative w-full ${isRegularUser ? 'h-full min-h-0' : 'h-[calc(100vh-4rem)] min-h-[550px]'} bg-slate-950 overflow-hidden flex flex-col`}>
      {/* Main Leaflet Canvas Container (Full Bleed Background) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Top Floating Control Bar (Filters & Search) - ONLY for Official Roles */}
      {!isRegularUser && (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none transition-all duration-300 max-w-full overflow-hidden">
          {/* Search & Filters in 1 Single Horizontal Row */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl shadow-lg overflow-x-auto whitespace-nowrap max-w-full custom-scrollbar">
            {/* Search Box */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ruas jalan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-slate-100 text-[10.5px] rounded-lg pl-8 pr-2.5 py-1 w-28 sm:w-40 focus:outline-none focus:border-slate-600 transition-all placeholder:text-slate-500 font-medium"
              />
            </div>

            {/* Province Filter */}
            <div className="flex items-center space-x-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-slate-600 font-medium cursor-pointer"
              >
                <option value="ALL">Semua Provinsi</option>
                <option value="DKI Jakarta">DKI Jakarta</option>
                <option value="Banten">Banten (Bintaro)</option>
                <option value="Jawa Barat">Jawa Barat</option>
                <option value="Sumatera Selatan">Sumatera Selatan</option>
                <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                <option value="Papua Pegunungan">Papua Pegunungan</option>
                <option value="Bali">Bali</option>
              </select>
            </div>

            {/* Condition Category Filter */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-slate-600 shrink-0 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Kondisi PCI</option>
              <option value="GOOD">Kondisi Mantap (PCI &gt; 70)</option>
              <option value="MODERATE">Sedang (PCI 50 - 70)</option>
              <option value="LIGHT_DAMAGE">Rusak Ringan (PCI 35 - 50)</option>
              <option value="HEAVY_DAMAGE">Rusak Berat (PCI &lt; 35)</option>
            </select>

            {/* WIM Only Toggle */}
            <button
              onClick={() => setShowWimOnly(!showWimOnly)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold flex items-center space-x-1 transition-all border ${
                showWimOnly
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <Truck className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Ada Stasiun WIM</span>
              {showWimOnly && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-slate-700 text-white rounded-md font-mono font-bold">
                  {filteredWimStations.length} Pin
                </span>
              )}
            </button>

            {/* Community Reports Pin Toggle */}
            <button
              onClick={() => setShowCommunityReports(!showCommunityReports)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold flex items-center space-x-1 transition-all border ${
                showCommunityReports
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-3 h-3 text-rose-400 shrink-0" />
              <span>Laporan Warga</span>
              {showCommunityReports && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-slate-700 text-white rounded-md font-mono font-bold">
                  {communityReports.length} Pin
                </span>
              )}
            </button>

            {/* Dropdown WIM Overload Category Filter */}
            {showWimOnly && (
              <select
                value={wimStatusFilter}
                onChange={(e) => setWimStatusFilter(e.target.value)}
                className="bg-slate-950/90 border border-slate-750 text-slate-200 text-[10.5px] rounded-lg px-2 py-1 focus:outline-none focus:border-slate-600 font-semibold shadow-md shrink-0 cursor-pointer"
              >
                <option value="ALL">Semua Stasiun WIM (100%)</option>
                <option value="EXTREME">Overload Ekstrim (&gt;100%)</option>
                <option value="HEAVY">Overload Berat (50 - 100%)</option>
                <option value="MODERATE">Overload Sedang (20 - 50%)</option>
                <option value="LIGHT">Overload Ringan (5 - 20%)</option>
                <option value="NONE">Tidak Overload (Normal)</option>
              </select>
            )}
          </div>

          {/* Floating Quick Action CTA - ONLY for Official Roles */}
          {selectedSegment && (
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-2.5 rounded-xl shadow-lg flex items-center space-x-3">
              <div>
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Ruas Terpilih
                </p>
                <p className="text-xs font-semibold text-white max-w-[160px] truncate">
                  {selectedSegment.name}
                </p>
              </div>
              <button
                onClick={() => onLaunchSimulation(selectedSegment)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Jalankan PINN</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Floating Stats & Legend Bar - ONLY for Official Roles */}
      {!isRegularUser && (
        <div className="absolute bottom-6 sm:bottom-8 left-2 sm:left-4 right-2 sm:right-4 z-10 pointer-events-none space-y-3">
          {/* BOTTOM STATS & LEGEND COLUMN */}
          <div className="pointer-events-auto max-w-7xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-2 sm:p-3 shadow-xl grid grid-cols-2 md:grid-cols-5 gap-1.5 sm:gap-2.5 text-slate-200 text-xs">
            {/* Stat 1 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 sm:p-2.5 flex items-center space-x-2 sm:space-x-2.5">
              <div className="p-1.5 sm:p-2 rounded-lg bg-slate-700/60 text-slate-300 border border-slate-600/60 shrink-0">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8.5px] sm:text-[9px] font-mono text-slate-400 uppercase truncate">
                  Total Jaringan
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-white font-mono">
                  {totalLengthKm} <span className="text-[9px] sm:text-[10px] font-normal text-slate-400">km</span>
                </p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 sm:p-2.5 flex items-center space-x-2 sm:space-x-2.5">
              <div className="p-1.5 sm:p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8.5px] sm:text-[9px] font-mono text-slate-400 uppercase truncate">
                  Tidak Mantap (2025)
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-rose-400 font-mono">
                  {damagedPercent}% <span className="text-[9px] sm:text-[10px] font-normal text-slate-400">({damagedKm}km)</span>
                </p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 sm:p-2.5 flex items-center space-x-2 sm:space-x-2.5">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/60 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[8.5px] sm:text-[9px] font-mono text-slate-400 uppercase truncate">
                  Peringatan ODOL
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-amber-300 font-mono">
                  {activeRedAlertsCount} Ruas
                </p>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 sm:p-2.5 flex items-center space-x-2 sm:space-x-2.5">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8.5px] sm:text-[9px] font-mono text-slate-400 uppercase truncate">
                  Rata-rata PCI
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-400 font-mono">
                  {avgPci} / 100
                </p>
              </div>
            </div>

            {/* Map PCI Legend & WIM Overload Legend */}
            <div className="col-span-2 md:col-span-5 bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 sm:p-2.5 flex flex-col gap-1.5 sm:gap-2 text-[9.5px] sm:text-[10px]">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] sm:text-[9.5px]">
                  <span className="font-semibold text-slate-300 uppercase font-mono border-r border-slate-700 pr-1.5">
                    PCI:
                  </span>
                  <span className="flex items-center text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> Mantap (&gt;70)
                  </span>
                  <span className="flex items-center text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-1" /> Sedang (50-70)
                  </span>
                  <span className="flex items-center text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" /> Rusak Ringan
                  </span>
                  <span className="flex items-center text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-1" /> Rusak Berat (&lt;35)
                  </span>
                </div>

                <div className="hidden sm:flex items-center space-x-1.5 text-[9px] text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Animasi Radius Berbanding Terbalik Nilai PCI</span>
                </div>
              </div>

              {/* WIM & Radius Legends */}
              <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[9.5px] border-t border-slate-700/80 pt-1.5 mt-0.5">
                <span className="font-semibold text-slate-300 font-mono flex items-center gap-1 border-r border-slate-700 pr-1.5">
                  <Truck className="w-3 h-3 text-cyan-400" /> WIM (PUPR):
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> Normal
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1" /> Overload (5-20%)
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" /> Overload (20-50%)
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-1" /> Overload (&gt;50%)
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Ekstrim (&gt;100%)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[9.5px] border-t border-slate-700/80 pt-1.5 mt-0.5">
                <span className="font-semibold text-slate-300 font-mono flex items-center gap-1 border-r border-slate-700 pr-1.5">
                  <Camera className="w-3 h-3 text-rose-400" /> LAPORAN WARGA:
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-1" /> CRITICAL
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" /> SEVERE
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1" /> MODERATE
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> MINOR
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absolute Bottom Copyright Text Outside Cards - ONLY for Official Roles */}
      {!isRegularUser && (
        <div className="absolute bottom-1 sm:bottom-1.5 left-0 right-0 z-20 text-center pointer-events-none pb-0.5 px-2">
          <p className="text-[9.5px] sm:text-[11px] font-medium text-slate-400 font-sans tracking-wide drop-shadow truncate">
            PAVEMENT-PINN © 2026 | Intel AI Global Impact Festival 2026
          </p>
        </div>
      )}

      {/* REPORT FORM MODAL INSIDE LEAFLETMAP */}
      {isReportFormOpen && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto">
          <div className="bg-slate-900/95 border border-white/20 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 text-cyan-300 rounded-2xl border border-indigo-500/30">
                  <Camera className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Formulir Pelaporan Kerusakan Jalan Komunitas
                  </h3>
                  <p className="text-xs text-slate-300">
                    Otomatis terhubung dengan stasiun WIM & simulasi regangan asphalt PINN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportFormOpen(false)}
                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Selected GPS Coordinates Badge (Autofilled when clicking map) */}
              <div className="bg-indigo-950/70 border border-cyan-500/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-cyan-300 font-mono font-bold">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>📍 Koordinat Titik Peta:</span>
                  <span className="text-white bg-slate-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                    {customCoordinates
                      ? `${customCoordinates[0]}, ${customCoordinates[1]}`
                      : `${activeFormSegment.coordinates[0]}, ${activeFormSegment.coordinates[1]}`}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  ✓ Terisi Otomatis
                </span>
              </div>

              {/* Form Select Segment */}
              <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                    1. Lokasi Ruas Jalan
                  </label>
                  {customCoordinates && (
                    <span className="text-[9.5px] text-cyan-300 font-mono font-bold bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/40">
                      📍 Terdeteksi Otomatis di Sekitar Pin Point
                    </span>
                  )}
                </div>
                <select
                  value={formSegmentId}
                  onChange={(e) => setFormSegmentId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/15 focus:border-cyan-400 text-white rounded-xl px-3 py-2 focus:outline-none font-semibold text-xs"
                >
                  {roadSegments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.province}) {seg.id === formSegmentId && customCoordinates ? '📍 [Ruas Terdekat Pin Point]' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 italic">
                  *Nama ruas jalan dipilih secara presisi berdasarkan analisis radius wilayah geografis di sekitar lokasi pin point peta.
                </p>
              </div>

              {/* Damage Type & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                    2. Jenis Kerusakan Jalan
                  </label>
                  <select
                    value={formDamageType}
                    onChange={(e) => setFormDamageType(e.target.value as DamageType)}
                    className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 font-semibold"
                  >
                    <option value="POTHOLE">Lubang Dalam (Pothole)</option>
                    <option value="RUTTING">Ambles & Deformasi Alur (Rutting)</option>
                    <option value="ALLIGATOR_CRACK">Retak Buaya (Alligator Cracking)</option>
                    <option value="CORRUGATION">Kerusakan Gelombang (Corrugation)</option>
                    <option value="SUBSIDENCE">Penurunan Pondasi (Subsidence)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                    3. Tingkat Keparahan
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as ReportSeverity)}
                    className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 font-semibold"
                  >
                    <option value="MODERATE">🟡 Sedang (Menghambat Laju)</option>
                    <option value="SEVERE">🟠 Parah (Berisiko Kecelakaan)</option>
                    <option value="CRITICAL">🔴 Sangat Kritis (Bahaya Tinggi Truk Overload)</option>
                  </select>
                </div>
              </div>

              {/* Estimated Depth & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                    4. Estimasi Kedalaman (cm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formEstimatedDepth}
                    onChange={(e) => setFormEstimatedDepth(Number(e.target.value))}
                    className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                    5. Estimasi Luas Kerusakan (m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="100"
                    value={formEstimatedArea}
                    onChange={(e) => setFormEstimatedArea(Number(e.target.value))}
                    className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Sample Photo Preset Selector */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                  6. Foto Lampiran Lapangan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
                      label: 'Lubang Pothole'
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
                      label: 'Ambles & Rutting'
                    },
                    {
                      url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
                      label: 'Retak Buaya'
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormPhotoIndex(idx)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all h-20 ${
                        formPhotoIndex === idx
                          ? 'border-cyan-400 ring-2 ring-cyan-400/50'
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-white py-0.5 text-center font-bold">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                  7. Deskripsi & Detail Kejadian
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Lubang cukup dalam di lajur kiri. Sangat membahayakan pengendara motor & sering dilewati truk tronton berat."
                  className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 placeholder:text-slate-500"
                />
              </div>

              {/* Auto WIM Correlation Box */}
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3 space-y-1">
                <div className="flex items-center space-x-2 text-cyan-300 font-extrabold text-[11px]">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Korelasi Otomatis Sensor WIM Bina Marga:</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Stasiun WIM Terdekat: <strong className="text-white">{matchedWimStation.stationName}</strong> | Truk Terakhir:{' '}
                  <strong className="text-rose-300">{matchedWimStation.licensePlate} ({matchedWimStation.vehicleClass})</strong> | Overload:{' '}
                  <span className="text-amber-300 font-mono font-bold">+{matchedWimStation.overloadPercent}% ({matchedWimStation.maxAxleLoadTon} Ton)</span>
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsReportFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 border border-white/20 transition-all"
                >
                  <Send className="w-4 h-4 text-cyan-200" />
                  <span>Kirim Laporan Kerusakan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Community Report Detail & Before/After Comparison Modal */}
      <ReportDetailModal
        isOpen={!!detailModalReport}
        onClose={() => setDetailModalReport(null)}
        report={detailModalReport}
        language={language}
        onUpvote={onUpvoteReport}
        onFocusMap={(rep) => {
          const seg = roadSegments.find((s) => s.id === rep.segmentId);
          if (seg) {
            onSelectSegment(seg);
          } else if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(rep.coordinates, 10, { duration: 1.2 });
          }
        }}
      />
    </div>
  );
};
