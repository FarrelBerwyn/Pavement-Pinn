import React, { useState, useMemo, useEffect } from 'react';
import logoImg from '../../assets/pavement-pinn-logo.jpg';
import {
  Map as MapIcon,
  FileText,
  BarChart2,
  Cpu,
  Bell,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Camera,
  Copy,
  Check,
  Share2,
  Bookmark,
  AlertTriangle,
  ArrowUpRight,
  X,
  Plus,
  Minus,
  Navigation,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Shield,
  Truck,
  Eye,
  Menu,
  Sun,
  Moon,
  HardHat,
  Calculator,
  FileDown,
  Ruler,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  ClipboardList,
  CheckSquare,
  History,
  Briefcase,
  DollarSign,
  Landmark,
  Home,
  Gauge,
  CreditCard,
  Headphones,
  Download,
  CloudRain,
  Scale,
  Users,
  Workflow,
  Wrench,
  Globe,
  ThumbsUp,
  ArrowRight,
  Star,
  MessageSquare,
  MoreVertical,
  Send,
  Activity,
  ShieldAlert
} from 'lucide-react';
import {
  UserRole,
  RoadSegment,
  DamageReport,
  DamageType,
  ReportSeverity,
  SimulationResult,
  ReportReview,
  ReportMutationHandler
} from '../../types';
import { UserAccount, USER_ACCOUNTS } from '../../features/authentication/demoAccounts';
import { LeafletMap, type LeafletMapProps } from '../../components/maps/LeafletMap';
import { MAP_LAYER_PANEL_ID, MapLayerPanel } from '../../components/maps/MapLayerPanel';
import { selectRegularUserDensity } from '../../features/community-reports/reportDensity';
import { createSessionReport, ReportCreationError } from '../../features/community-reports/reportFactory';
import { settleMutation } from '../../features/community-reports/reportMutations';
import { ReportWorkflowPanel } from '../../features/workflow/ReportWorkflowPanel';
import { useAppState } from '../providers/AppStateProvider';
import { canEditReport } from '../../features/rbac/accessPolicy';
import { ReportDetailModal } from '../../features/community-reports/ReportDetailModal';
import { ReportDetailBottomSheet } from '../../features/community-reports/ReportDetailBottomSheet';
import { DEMO_DATA_LABEL } from '../../data/provenance';
import { LatLngBounds, itemsInBounds } from '../../components/maps/mapDetail';
import { MapSheet } from '../../components/maps/MapSheet';
import { MapSheetState, sheetInsetPx } from '../../components/maps/sheetState';
import { DemoTag, ReportList, RoadSegmentSheet } from '../../features/road-health/RoadSegmentSheet';
import type { PolicyTabType } from '../../features/policy-analysis/ExecutivePolicyView';
import { ReportRoadIssueCard } from '../../features/community-reports/ReportRoadIssueCard';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import { TRANSLATIONS, Language } from '../../i18n/translations';
import type { WorkspaceNav } from '../navigation';
import { resolveLiveReport } from '../../features/community-reports/reportState';
import { PolicyPage } from '../../pages/policy/PolicyPage';
import { OperationsPage, OPERATIONS_WORKSPACE_NAVS } from '../../pages/operations/OperationsPage';
import { EngineeringPage } from '../../pages/engineering/EngineeringPage';
import { WorkOrdersPage } from '../../pages/engineering/WorkOrdersPage';

interface ModernAppLayoutProps {
  currentAccount: UserAccount;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onLoginAccount: (account: UserAccount) => void;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  onAddReport: ReportMutationHandler;
  onEditReport?: ReportMutationHandler;
  onUpvoteReport: (reportId: string) => void;
  onLaunchSimulation: (segment: RoadSegment) => void;
  currentResult: SimulationResult | null;
  onSimulationComplete: (result: SimulationResult) => void;
  onOpenOpenvinoModal: () => void;
  onOpenAuditModal: () => void;
  onOpenLoginModal: () => void;
  /** Active view, derived from the current route (src/app/navigation.ts). */
  activeNav: WorkspaceNav;
  /** Navigate to the route bound to a view key. */
  onNavigate: (nav: WorkspaceNav) => void;
  /** Open the /settings/ route. */
  onOpenSettings: () => void;
  /** Route outlet: the page component for the current route, if it is a standalone page. */
  children?: React.ReactNode;
}

// MapLibre (WebGL, globe) is loaded only for the accounts that use it
const MapLibreMap = React.lazy(() => import('../../components/maps/MapLibreMap'));

export const ModernAppLayout: React.FC<ModernAppLayoutProps> = ({
  currentAccount,
  activeRole,
  onSelectRole,
  onLoginAccount,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  communityReports,
  onAddReport,
  onEditReport,
  onUpvoteReport,
  onLaunchSimulation,
  currentResult,
  onSimulationComplete,
  onOpenOpenvinoModal,
  onOpenAuditModal,
  onOpenLoginModal,
  activeNav,
  onNavigate,
  onOpenSettings,
  children
}) => {
  // Role predicates come from the account role only (one source of truth with the RBAC policy).
  const isFieldEngineer = currentAccount.role === 'FIELD_ENGINEER';
  const isPolicyMaker = currentAccount.role === 'POLICY_MAKER';
  const isOperationsManager = currentAccount.role === 'OPERATIONS_MANAGER';
  // Shared report workflow (server-backed): state, evidence and role actions for the sheet.
  const { workflow } = useAppState();

  // Navigation tab in Public User interface (defaults to DASHBOARD for Operations Manager, Field Engineer and Policy Maker, MAP for public users)
  const setActiveNav = onNavigate;

  // Operations Manager submenus state
  const [isMonitoringSubmenuOpen, setIsMonitoringSubmenuOpen] = useState<boolean>(true);
  const [isTindakanSubmenuOpen, setIsTindakanSubmenuOpen] = useState<boolean>(true);

  // Policy Maker specific sidebar tabs (Defaults to Peta Strategis as requested)
  const [policyNavTab, setPolicyNavTab] = useState<PolicyTabType>('PETA_STRATEGIS');

  // Navigation is route-driven (see src/app/navigation.ts: navAfterAccountSwitch reproduces the
  // landing rules that used to live here). Only the policy tab reset remains local state.
  useEffect(() => {
    if (isPolicyMaker) {
      setPolicyNavTab('PETA_STRATEGIS');
    }
  }, [currentAccount.id, isPolicyMaker]);

  // Language state (Indonesian 'id' vs English 'en')
  const [language, setLanguage] = useState<Language>('id');
  const t = TRANSLATIONS[language];

  // Theme state (Light vs Dark) - Default to Dark Mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Notifications dropdown state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      titleId: 'Laporan Diverifikasi PUPR',
      titleEn: 'Report Verified by Agency',
      descId: 'Laporan lubang di Ruas Cikarang Raya telah diverifikasi oleh tim teknis.',
      descEn: 'Pothole report at Cikarang Raya has been verified by the engineering team.',
      time: '10 min ago',
      type: 'VERIFIED',
      isUnread: true,
      icon: 'check'
    },
    {
      id: 'notif-2',
      titleId: '5 Warga Mendukung Laporan Anda',
      titleEn: '5 Citizens Upvoted Your Report',
      descId: 'Laporan kerusakan di Tol Cikampek KM 31 menerima perhatian komunitas.',
      descEn: 'Your road damage report on Tol Cikampek KM 31 gained community traction.',
      time: '45 min ago',
      type: 'UPVOTE',
      isUnread: true,
      icon: 'thumb'
    },
    {
      id: 'notif-3',
      titleId: 'Peringatan Titik Kritis Baru',
      titleEn: 'New Critical Hotspot Alert',
      descId: 'Terdeteksi akumulasi lubang parah di Kawasan Industri MM2100.',
      descEn: 'High concentration of severe potholes detected at MM2100 Industrial Area.',
      time: '2 hours ago',
      type: 'ALERT',
      isUnread: true,
      icon: 'alert'
    },
    {
      id: 'notif-4',
      titleId: 'Penambalan Jalan Selesai',
      titleEn: 'Road Patching Completed',
      descId: 'Perbaikan jalan di Jl. Raya Lemahabang telah rampung dilaksanakan.',
      descEn: 'Asphalt resurfacing at Jl. Raya Lemahabang has been completed.',
      time: '1 day ago',
      type: 'REPAIR',
      isUnread: false,
      icon: 'repair'
    }
  ]);

  const unreadNotificationsCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleToggleNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: !n.isUnread } : n))
    );
  };

  // Filter state for Map overlay pills
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'MODERATE' | 'MINOR'>('ALL');
  // Report density is a map layer, not a data filter: the two can be combined.
  const [showDensity, setShowDensity] = useState<boolean>(false);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ coordinates: [number, number]; accuracyM: number } | null>(null);
  const [recenterToastText, setRecenterToastText] = useState<string>('');
  // Shared map sheet: a road segment, or reports that share one position.
  const [sheetSegment, setSheetSegment] = useState<RoadSegment | null>(null);
  const [sheetCluster, setSheetCluster] = useState<DamageReport[] | null>(null);
  const [mapSheetState, setMapSheetState] = useState<MapSheetState>('HALF');
  const isMapSheetOpen = !!sheetSegment || !!sheetCluster;
  const closeMapSheet = () => {
    setSheetSegment(null);
    setSheetCluster(null);
  };

  // Base map style (DARK, SATELLITE, LIGHT) - Default to Light GIS
  const [baseMapStyle, setBaseMapStyle] = useState<'DARK' | 'SATELLITE' | 'LIGHT'>('LIGHT');
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState<boolean>(false);

  // Recenter Map State for Karawang view
  const [recenterKey, setRecenterKey] = useState<number>(0);
  const [showRecenterToast, setShowRecenterToast] = useState<boolean>(false);

  // Newly submitted report highlight & map animation targets
  const [highlightReportId, setHighlightReportId] = useState<string | null>(null);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ coords: [number, number]; zoom?: number; timestamp: number } | null>(null);

  // Selected Issue Report for Right Drawer Panel
  const [selectedIssueReport, setSelectedIssueReport] = useState<DamageReport | null>(() => {
    return communityReports.length > 0 ? communityReports[0] : null;
  });

  // Right Panel Drawer Visibility (Default to hidden until user selects a report)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState<boolean>(false);

  // Mobile Bottom Card Sheet Height Mode ('PEEK' = Compact bottom card, 'FULL' = Expanded full-screen card)
  const [mobileSheetHeight, setMobileSheetHeight] = useState<'PEEK' | 'FULL'>('PEEK');
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Closing animation state for smooth slide-down exit
  const [isClosingCard, setIsClosingCard] = useState<boolean>(false);

  const handleCloseBottomCard = () => {
    setIsClosingCard(true);
    setTimeout(() => {
      setIsDetailsPanelOpen(false);
      setIsClosingCard(false);
      setMobileSheetHeight('PEEK');
    }, 280);
  };

  // Reviews data per report ID
  const [reviewsMap, setReviewsMap] = useState<Record<string, ReportReview[]>>({
    'REP-KRW-001': [
      {
        id: 'rev-101',
        userName: 'Awaludin Efendi',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        userBadge: 'Local Guide 5★',
        rating: 5,
        timeAgo: '2 hari lalu',
        dateFormatted: '21 Agu 2026',
        comment: 'Lubang ini sempat sangat dalam dan rawan bikin velg pecah. Terima kasih warga dan PUPR respon laporannya cepat.',
        likesCount: 14
      },
      {
        id: 'rev-102',
        userName: 'saesar agung',
        userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
        userBadge: 'Warga KIIC',
        rating: 5,
        timeAgo: '1 minggu lalu',
        dateFormatted: '15 Agu 2026',
        comment: 'Thank you responnya cepat, penandaan di jalan sangat jelas dan aspal sudah mulai diratakan. Mantap!',
        likesCount: 9
      },
      {
        id: 'rev-103',
        userName: 'Rani Wahyuni',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        userBadge: 'Warga Karawang',
        rating: 5,
        timeAgo: '2 minggu lalu',
        dateFormatted: '8 Agu 2026',
        comment: 'Sangat suka dengan sistem pemantauan ini, foto sebelum dan sesudah perbaikan sangat transparan untuk warga.',
        likesCount: 6
      }
    ],
    'REP-KRW-002': [
      {
        id: 'rev-201',
        userName: 'Hendra Gunawan',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        userBadge: 'Driver Suryacipta',
        rating: 4,
        timeAgo: '3 hari lalu',
        dateFormatted: '20 Agu 2026',
        comment: 'Alur amblasnya cukup panjang di dekat pintu masuk kawasan. Perlu penanganan hotmix lapis aus secepatnya.',
        likesCount: 8
      },
      {
        id: 'rev-202',
        userName: 'Siti Rahmawati',
        userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
        userBadge: 'Warga Telukjambe',
        rating: 5,
        timeAgo: '5 hari lalu',
        dateFormatted: '18 Agu 2026',
        comment: 'Sudah diupvote agar segera dieksekusi oleh tim pemeliharaan jalan.',
        likesCount: 4
      }
    ]
  });

  // New review form input state
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<boolean>(false);

  const handleSubmitCitizenReview = () => {
    if (!selectedIssueReport || !newReviewText.trim()) return;

    const newRev: ReportReview = {
      id: `rev-${Date.now()}`,
      userName: currentAccount.name || 'Warga Karawang',
      userAvatar: currentAccount.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      userBadge: currentAccount.role === 'PUBLIC_REPORTER' ? 'Warga Pelapor' : 'Warga Terverifikasi',
      rating: newReviewRating,
      timeAgo: 'Baru saja',
      dateFormatted: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      comment: newReviewText.trim(),
      likesCount: 0
    };

    setReviewsMap((prev) => {
      const existing = prev[selectedIssueReport.id] || [];
      return {
        ...prev,
        [selectedIssueReport.id]: [newRev, ...existing]
      };
    });

    setNewReviewText('');
    setReviewSubmitSuccess(true);
    setTimeout(() => setReviewSubmitSuccess(false), 3000);
  };

  // Tab inside Issue Details Panel ('COMPARISON' | 'TELEMETRY' | 'OVERVIEW')
  const [detailsTab, setDetailsTab] = useState<'COMPARISON' | 'TELEMETRY' | 'OVERVIEW'>('COMPARISON');

  // Before / After Slider Position (0 to 100%)
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Recent Reports card visibility (toggled via the Reports button in bottom bar)
  const [isRecentReportsCardOpen, setIsRecentReportsCardOpen] = useState<boolean>(false);
  const [reportsCardFilter, setReportsCardFilter] = useState<'ALL' | 'CRITICAL' | 'MODERATE' | 'MINOR'>('ALL');

  // Mobile quick search toggle
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Collapsible sidebar state (compact vs expanded)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Custom coordinates for location-based reporting from map
  const [customCoordinates, setCustomCoordinates] = useState<[number, number] | null>(null);

  // Active photo index in Issue Details
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState<number>(0);

  // Selected severity in segmented button
  const [customSeverity, setCustomSeverity] = useState<ReportSeverity>('CRITICAL');

  // Copy location feedback state
  const [copiedLocation, setCopiedLocation] = useState<boolean>(false);

  // Saved / Bookmarked state
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // User dropdown menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Notification / Alerts modal state
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);

  // Settings modal state

  // Report Creation Form state
  const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState<boolean>(false);
  const [formSegmentId, setFormSegmentId] = useState<string>(roadSegments[0]?.id || '');
  const [formDamageType, setFormDamageType] = useState<DamageType>('POTHOLE');
  const [formSeverity, setFormSeverity] = useState<ReportSeverity>('CRITICAL');
  const [formDepth, setFormDepth] = useState<number>(12);
  const [formArea, setFormArea] = useState<number>(4.5);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPhotoPreset, setFormPhotoPreset] = useState<number>(0);

  // Report Edit Form state (Only accessible to owner like Budi Santoso)
  const [isEditReportModalOpen, setIsEditReportModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    id: string;
    description: string;
    depth: number;
    area: number;
    severity: ReportSeverity;
    damageType: DamageType;
  } | null>(null);

  // Local state for updated reports
  const [localReports, setLocalReports] = useState<DamageReport[]>(communityReports);

  // Full Details / Before-After modal
  const [detailModalReport, setDetailModalReport] = useState<DamageReport | null>(null);

  // The two panels above hold a copy of a report. Refresh the copy whenever the shared
  // list changes (upvotes, verification, edits) so they never show stale values.
  useEffect(() => {
    setSelectedIssueReport((prev) => resolveLiveReport(prev, communityReports));
    setDetailModalReport((prev) => resolveLiveReport(prev, communityReports));
  }, [communityReports]);

  // Global search input
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile Floating UI states (matching mobile design reference) - Default collapsed as requested
  const [isNearbyCardExpanded, setIsNearbyCardExpanded] = useState<boolean>(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isQuickSearchModalOpen, setIsQuickSearchModalOpen] = useState<boolean>(false);

  // Sample preset images for report creation
  const PHOTO_PRESETS = [
    {
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      label: 'Pothole (Lubang Dalam)'
    },
    {
      url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
      label: 'Rutting (Ambles & Alur)'
    },
    {
      url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
      label: 'Alligator Crack (Retak Buaya)'
    }
  ];

  // Handle Location Copy
  const handleCopyLocation = () => {
    if (!selectedIssueReport) return;
    const textToCopy = `${selectedIssueReport.segmentName}, ${selectedIssueReport.province} (${selectedIssueReport.coordinates[0]}, ${selectedIssueReport.coordinates[1]})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  // Sync selectedIssueReport with selected segment when clicking map
  const handleSelectSegmentFromMap = (seg: RoadSegment) => {
    onSelectSegment(seg);
    if (isFieldEngineer) {
      const matchedReport = communityReports.find((r) => r.segmentId === seg.id);
      if (matchedReport) {
        setSelectedIssueReport(matchedReport);
        setIsDetailsPanelOpen(true);
      }
      return;
    }
    // A segment opens the segment sheet, not one of its reports
    setIsDetailsPanelOpen(false);
    setSheetCluster(null);
    setSheetSegment(seg);
    setMapSheetState('HALF');
  };

  const openReportFromSheet = (report: DamageReport) => {
    closeMapSheet();
    setSelectedIssueReport(report);
    setDetailsTab('COMPARISON');
    setIsDetailsPanelOpen(true);
  };

  // Handle Form Submit
  const handleCreateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      alert('Mohon masukkan deskripsi singkat kerusakan jalan.');
      return;
    }

    const targetSegment = roadSegments.find((s) => s.id === formSegmentId) || roadSegments[0];

    const damageLabels: Record<DamageType, string> = {
      POTHOLE: 'Pothole (Lubang Dalam)',
      ALLIGATOR_CRACK: 'Alligator Cracking (Retak Buaya)',
      RUTTING: 'Rutting (Ambles & Alur)',
      CORRUGATION: 'Corrugation (Kerusakan Bergelombang)',
      SUBSIDENCE: 'Subsidence (Penurunan Pondasi)',
      CRACK: 'Surface Crack (Retak Permukaan)',
      SURFACE_DAMAGE: 'Surface Damage (Kerusakan Permukaan)',
      ROAD_DEFORMATION: 'Road Deformation (Deformasi Jalan)',
      DEPRESSION: 'Depression (Ambles Lokal)',
      PATCHING: 'Patching (Tambalan)'
    };

    const newReportCoords: [number, number] = customCoordinates || targetSegment.coordinates;

    let newReport: DamageReport;
    try {
      newReport = createSessionReport({
      reporterName: currentAccount.name,
      reporterRole: currentAccount.role === 'PUBLIC_REPORTER' ? 'Public Reporter' : 'Public Viewer',
      reporterAvatar: currentAccount.avatarUrl,
      timestamp: new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      segmentId: targetSegment.id,
      segmentName: targetSegment.name,
      corridor: targetSegment.corridor,
      province: targetSegment.province,
      coordinates: newReportCoords,
      damageType: formDamageType,
      damageTypeLabel: damageLabels[formDamageType],
      severity: formSeverity,
      estimatedDepthCm: Number(formDepth),
      estimatedAreaM2: Number(formArea),
      photoUrl: PHOTO_PRESETS[formPhotoPreset].url,
      description: formDescription,
      upvotesCount: 1,
      userUpvoted: true,
      repairDetails: {
        afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
        repairDate: 'Proyeksi Restorasi PUPR',
        repairMethod: 'Hotmix Asphalt Overlay & Patching AC-WC 6cm',
        repairedPciImprovement: 'Target: PCI >85 (Mulus)',
        engineerNote: 'Standar perbaikan rekonstruksi perkerasan jalan terverifikasi Bina Marga.',
        agencyInCharge: 'Dinas PUPR & BBPJN'
      },
      wimCorrelation: {
        hasWimData: true,
        stationId: targetSegment.wimDetails?.stationId || 'WIM-JAKARTA-01',
        stationName: targetSegment.wimDetails?.stationName || 'Stasiun WIM Sudirman-Thamrin',
        corridor: targetSegment.corridor,
        recentTruckPlate: targetSegment.wimDetails?.licensePlate || 'B 9481 UYT',
        recentTruckClass: targetSegment.wimDetails?.vehicleClass || 'Golongan 6B - Truk Tronton 3 Sumbu',
        maxAxleLoadTon: targetSegment.wimDetails?.maxAxleLoadTon || 18.5,
        legalLimitTon: 10.0,
        overloadPercent: targetSegment.wimDetails?.overloadPercent || 85,
        overloadCategory: 'HEAVY',
        correlatedOverloadTrucksCount: 142,
        estimatedPinnContributionPercent: 82,
        causeAnalysisSummary: `Korelasi PINN & WIM: Kerusakan di ${targetSegment.name} dipicu oleh akumulasi lintasan truk overload berbeban >18.5 Ton.`
      }
      }, currentAccount);
    } catch (error) {
      if (error instanceof ReportCreationError) {
        alert(error.message);
        return;
      }
      throw error;
    }

    // Shown on the map only after the workflow store saved it.
    const outcome = await settleMutation(onAddReport(newReport), newReport);
    if (outcome.ok === false) {
      alert(`Laporan belum tersimpan: ${(outcome as { error: string }).error}`);
      return;
    }
    newReport = (outcome as { report: DamageReport }).report;
    setSelectedIssueReport(newReport);
    setHighlightReportId(newReport.id);
    // Zoom in with close range (zoom 17) to pin point
    setMapCenterTarget({
      coords: newReportCoords,
      zoom: 17,
      timestamp: Date.now()
    });
    setIsDetailsPanelOpen(false);
    setIsNearbyCardExpanded(false);
    setIsRecentReportsCardOpen(false);
    setIsCreateReportModalOpen(false);
    setFormDescription('');
    setCustomCoordinates(null);

    // Automatically slide up the Mobile View Report Bottom Card after pin point finishes sprouting (at 3300ms)
    setTimeout(() => {
      setSelectedIssueReport(newReport);
      setDetailsTab('COMPARISON');
      setMobileSheetHeight('PEEK');
      setIsDetailsPanelOpen(true);
    }, 3300);
  };

  // Handle Save Edited Report (For User 1: Budi Santoso)
  const handleSaveReportEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !selectedIssueReport) return;
    // Same ownership rule as the edit button; a stale or forged modal state saves nothing.
    if (!canEditReport(currentAccount, selectedIssueReport)) {
      setIsEditReportModalOpen(false);
      return;
    }

    const damageLabels: Record<DamageType, string> = {
      POTHOLE: 'Pothole (Lubang Dalam)',
      ALLIGATOR_CRACK: 'Alligator Cracking (Retak Buaya)',
      RUTTING: 'Rutting (Ambles & Alur)',
      CORRUGATION: 'Corrugation (Kerusakan Bergelombang)',
      SUBSIDENCE: 'Subsidence (Penurunan Pondasi)',
      CRACK: 'Surface Crack (Retak Permukaan)',
      SURFACE_DAMAGE: 'Surface Damage (Kerusakan Permukaan)',
      ROAD_DEFORMATION: 'Road Deformation (Deformasi Jalan)',
      DEPRESSION: 'Depression (Ambles Lokal)',
      PATCHING: 'Patching (Tambalan)'
    };

    const updatedReport: DamageReport = {
      ...selectedIssueReport,
      description: editFormData.description,
      estimatedDepthCm: editFormData.depth,
      estimatedAreaM2: editFormData.area,
      severity: editFormData.severity,
      damageType: editFormData.damageType,
      damageTypeLabel: damageLabels[editFormData.damageType] || selectedIssueReport.damageTypeLabel
    };

    // Saved through the workflow store (owner check and version check on the server).
    const outcome = onEditReport ? await settleMutation(onEditReport(updatedReport), updatedReport) : { ok: true as const, report: updatedReport };
    if (outcome.ok === false) {
      alert(`Perubahan belum tersimpan: ${(outcome as { error: string }).error}`);
      return;
    }
    const saved = (outcome as { report: DamageReport }).report;
    setSelectedIssueReport(saved);
    setLocalReports((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    setIsEditReportModalOpen(false);
  };

  // KPI Statistics calculations
  const stats = useMemo(() => {
    const critical = communityReports.filter((r) => r.severity === 'CRITICAL').length + 20;
    const moderate = communityReports.filter((r) => r.severity === 'SEVERE' || r.severity === 'MODERATE').length + 32;
    const minor = communityReports.filter((r) => r.severity === 'LIGHT').length + 152;
    const avgPci = roadSegments.length
      ? Math.round(roadSegments.reduce((acc, s) => acc + s.currentPci, 0) / roadSegments.length)
      : 78;
    return {
      critical,
      moderate,
      minor,
      healthIndex: avgPci,
      totalReportsMonth: '2.4K'
    };
  }, [communityReports, roadSegments]);

  // Filtered reports for recent list
  const recentReportsList = useMemo(() => {
    if (activeFilter === 'CRITICAL') {
      return communityReports.filter((r) => r.severity === 'CRITICAL');
    }
    if (activeFilter === 'MODERATE') {
      return communityReports.filter((r) => r.severity === 'SEVERE' || r.severity === 'MODERATE');
    }
    if (activeFilter === 'MINOR') {
      return communityReports.filter((r) => r.severity === 'LIGHT');
    }
    return communityReports;
  }, [communityReports, activeFilter]);

  // What the "in view" pill and card show: filtered reports inside the current viewport.
  const reportsInView = useMemo(
    () => itemsInBounds(recentReportsList, (report) => report.coordinates, mapBounds),
    [recentReportsList, mapBounds]
  );
  const inViewCounts = useMemo(
    () => ({
      critical: reportsInView.filter((r) => r.severity === 'CRITICAL').length,
      moderate: reportsInView.filter((r) => r.severity === 'SEVERE' || r.severity === 'MODERATE').length,
      minor: reportsInView.filter((r) => r.severity === 'LIGHT').length
    }),
    [reportsInView]
  );
  const matchesCardFilter = (severity: string) =>
    reportsCardFilter === 'ALL' ||
    (reportsCardFilter === 'CRITICAL' && severity === 'CRITICAL') ||
    (reportsCardFilter === 'MODERATE' && (severity === 'SEVERE' || severity === 'MODERATE')) ||
    (reportsCardFilter === 'MINOR' && severity === 'LIGHT');
  const inViewLabel = language === 'en' ? 'reports in view' : 'laporan di area ini';

  // Report density layer: Regular User reports under the same severity filter as the markers
  const densitySelection = useMemo(
    () => selectRegularUserDensity(communityReports, activeFilter),
    [communityReports, activeFilter]
  );
  const densityInView = useMemo(
    () => itemsInBounds(densitySelection.reports, (report) => report.coordinates, mapBounds),
    [densitySelection, mapBounds]
  );
  const layerButtonRef = React.useRef<HTMLButtonElement>(null);
  const closeLayersMenu = React.useCallback(() => setIsLayersMenuOpen(false), []);

  // Public accounts get the globe map; official roles keep the Leaflet map and its tools
  const isPublicRole = currentAccount.role === 'PUBLIC_REPORTER' || currentAccount.role === 'PUBLIC_VIEWER';
  const PublicMap: React.ComponentType<LeafletMapProps> = isPublicRole ? MapLibreMap : LeafletMap;

  const showMapToast = (text: string) => {
    setRecenterToastText(text);
    setShowRecenterToast(true);
    setTimeout(() => setShowRecenterToast(false), 2600);
  };

  // Locate: the device position when permission is given, otherwise the data region.
  const handleLocate = () => {
    const fallBackToDataRegion = () => {
      setUserLocation(null);
      setRecenterKey((prev) => prev + 1);
      showMapToast(
        language === 'en'
          ? 'Location unavailable. Map centred on the Karawang data region.'
          : 'Lokasi tidak tersedia. Peta dipusatkan ke wilayah data Karawang.'
      );
    };
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      fallBackToDataRegion();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          coordinates: [position.coords.latitude, position.coords.longitude],
          accuracyM: position.coords.accuracy
        });
        showMapToast(language === 'en' ? 'Map centred on your location.' : 'Peta dipusatkan ke lokasi Anda.');
      },
      fallBackToDataRegion,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  return (
    <div className="flex h-screen w-screen bg-[#0b0f19] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* 1. LEFT MAIN SIDEBAR (Dark sleek navigation, compact width & collapsible) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } bg-[#0e1320] border-r border-white/10 flex flex-col justify-between p-3.5 transition-all duration-300 ease-in-out md:static md:translate-x-0 overflow-x-hidden ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col space-y-6 w-full max-w-full min-w-0">
          {/* Logo & Brand Identity */}
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'
            } px-1 pt-1 cursor-pointer transition-all w-full max-w-full min-w-0`}
            onClick={() => setActiveNav('MAP')}
            title="PAVEMENT - Smart Road Intelligence"
          >
            <img 
              src={logoImg} 
              alt="Logo" 
              className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-lg shadow-black/20" 
            />
            {!isSidebarCollapsed && (
              <div className="overflow-hidden min-w-0 flex-1">
                <h1 className="font-extrabold text-base tracking-wider text-white leading-tight truncate">PAVEMENT PINN</h1>
                <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">Smart Road Intelligence</p>
              </div>
            )}
          </div>

          {/* Navigation Items Vertical Stack */}
          <nav className="space-y-1.5 w-full max-w-full min-w-0">
            {/* EXECUTIVE POLICY MAKER SIDEBAR */}
            {isPolicyMaker ? (
              <>
                {/* 1. Ringkasan Eksekutif */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setPolicyNavTab('RINGKASAN_EKSEKUTIF');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Ringkasan Eksekutif"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'DASHBOARD' && policyNavTab === 'RINGKASAN_EKSEKUTIF'
                      ? 'bg-[#fef8ee] text-[#b45309] font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <Home className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' && policyNavTab === 'RINGKASAN_EKSEKUTIF' ? 'text-[#d97706]' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Ringkasan Eksekutif</span>}
                </button>

                {/* 2. Peta Strategis */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setPolicyNavTab('PETA_STRATEGIS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Peta Strategis"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'DASHBOARD' && policyNavTab === 'PETA_STRATEGIS'
                      ? 'bg-[#fef8ee] text-[#b45309] font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <MapIcon className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' && policyNavTab === 'PETA_STRATEGIS' ? 'text-[#d97706]' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Peta Strategis</span>}
                </button>

                {/* 3. Anggaran & Investasi */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setPolicyNavTab('ANGGARAN_INVESTASI');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Anggaran & Investasi"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'DASHBOARD' && (policyNavTab === 'ANGGARAN_INVESTASI' || policyNavTab === 'ANGGARAN_REALISASI')
                      ? 'bg-[#fef8ee] text-[#b45309] font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <CreditCard className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' && (policyNavTab === 'ANGGARAN_INVESTASI' || policyNavTab === 'ANGGARAN_REALISASI') ? 'text-[#d97706]' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Anggaran & Investasi</span>}
                </button>

                {/* 4. Program Prioritas */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setPolicyNavTab('PROGRAM_PRIORITAS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Program Prioritas"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'DASHBOARD' && (policyNavTab === 'PROGRAM_PRIORITAS' || policyNavTab === 'PRIORITAS_NASIONAL')
                      ? 'bg-[#fef8ee] text-[#b45309] font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <Layers className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' && (policyNavTab === 'PROGRAM_PRIORITAS' || policyNavTab === 'PRIORITAS_NASIONAL') ? 'text-[#d97706]' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Program Prioritas</span>}
                </button>
              </>
            ) : isOperationsManager ? (
              <>
                {/* 1. DASHBOARD (renamed from Beranda) */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Dashboard"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'DASHBOARD' || activeNav === 'BERANDA_OPERASI'
                      ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' || activeNav === 'BERANDA_OPERASI' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">Dashboard</span>
                      <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                        Ops
                      </span>
                    </div>
                  )}
                </button>

                {/* 2. PETA */}
                <button
                  onClick={() => {
                    setActiveNav('MAP');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Peta"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'MAP' || activeNav === 'PETA_POS_WIM'
                      ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <MapIcon className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'MAP' || activeNav === 'PETA_POS_WIM' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">Peta</span>
                      <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                        GIS
                      </span>
                    </div>
                  )}
                </button>

                {/* 3. MONITORING (Folder containing: Kondisi Jalan, POS WIM, ODOL, Cuaca & Banjir) */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (isSidebarCollapsed) {
                        setIsSidebarCollapsed(false);
                      }
                      setIsMonitoringSubmenuOpen(!isMonitoringSubmenuOpen);
                    }}
                    title="Monitoring"
                    className={`w-full max-w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                      activeNav.startsWith('MONITORING_')
                        ? 'bg-white/5 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Activity className={`w-4.5 h-4.5 shrink-0 ${activeNav.startsWith('MONITORING_') ? 'text-amber-400' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="truncate">Monitoring</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMonitoringSubmenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
                    )}
                  </button>

                  {/* Sub-items for Monitoring */}
                  {(!isSidebarCollapsed && isMonitoringSubmenuOpen) && (
                    <div className="pl-4 pr-1 space-y-1 border-l border-white/10 ml-4.5 my-1">
                      {/* Kondisi Jalan */}
                      <button
                        onClick={() => {
                          setActiveNav('MONITORING_KONDISI_JALAN');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="Kondisi Jalan"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'MONITORING_KONDISI_JALAN'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'MONITORING_KONDISI_JALAN' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">Kondisi Jalan</span>
                      </button>

                      {/* POS WIM */}
                      <button
                        onClick={() => {
                          setActiveNav('MONITORING_POS_WIM');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="POS WIM"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'MONITORING_POS_WIM'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <Scale className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'MONITORING_POS_WIM' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">POS WIM</span>
                      </button>

                      {/* ODOL */}
                      <button
                        onClick={() => {
                          setActiveNav('MONITORING_ODOL');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="ODOL"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'MONITORING_ODOL'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <Truck className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'MONITORING_ODOL' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">ODOL</span>
                      </button>

                      {/* Cuaca & Banjir */}
                      <button
                        onClick={() => {
                          setActiveNav('MONITORING_CUACA_BANJIR');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="Cuaca & Banjir"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'MONITORING_CUACA_BANJIR'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <CloudRain className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'MONITORING_CUACA_BANJIR' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">Cuaca & Banjir</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. TINDAKAN OPERASI (Folder containing: Rekayasa Lalu Lintas, Peringatan) */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (isSidebarCollapsed) {
                        setIsSidebarCollapsed(false);
                      }
                      setIsTindakanSubmenuOpen(!isTindakanSubmenuOpen);
                    }}
                    title="Tindakan Operasi"
                    className={`w-full max-w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                      activeNav.startsWith('TINDAKAN_')
                        ? 'bg-white/5 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Workflow className={`w-4.5 h-4.5 shrink-0 ${activeNav.startsWith('TINDAKAN_') ? 'text-amber-400' : 'text-slate-400'}`} />
                      {!isSidebarCollapsed && <span className="truncate">Tindakan Operasi</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTindakanSubmenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
                    )}
                  </button>

                  {/* Sub-items for Tindakan Operasi */}
                  {(!isSidebarCollapsed && isTindakanSubmenuOpen) && (
                    <div className="pl-4 pr-1 space-y-1 border-l border-white/10 ml-4.5 my-1">
                      {/* Rekayasa Lalu Lintas */}
                      <button
                        onClick={() => {
                          setActiveNav('TINDAKAN_REKAYASA');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="Rekayasa Lalu Lintas"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'TINDAKAN_REKAYASA'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <Navigation className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'TINDAKAN_REKAYASA' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">Rekayasa Lalu Lintas</span>
                      </button>

                      {/* Peringatan */}
                      <button
                        onClick={() => {
                          setActiveNav('TINDAKAN_PERINGATAN');
                          setIsMobileSidebarOpen(false);
                        }}
                        title="Peringatan"
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          activeNav === 'TINDAKAN_PERINGATAN'
                            ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                        }`}
                      >
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${activeNav === 'TINDAKAN_PERINGATAN' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate">Peringatan</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. TIM & TUGAS */}
                <button
                  onClick={() => {
                    setActiveNav('SPK_ORDERS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Tim & Tugas"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'SPK_ORDERS'
                      ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <Users className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'SPK_ORDERS' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">Tim & Tugas</span>
                      <span className="text-[11px] font-bold bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0 ml-1">
                        7
                      </span>
                    </div>
                  )}
                </button>

                {/* 6. LAPORAN */}
                <button
                  onClick={() => {
                    setActiveNav('REPORTS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Laporan"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'REPORTS'
                      ? 'bg-[#fef8ee] text-[#b45309] dark:bg-amber-400/20 dark:text-amber-300 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <FileText className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'REPORTS' ? 'text-[#d97706] dark:text-amber-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Laporan</span>}
                </button>
              </>
            ) : isFieldEngineer ? (
              <>
                {/* 1. DASHBOARD (Field Engineer) */}
                <button
                  onClick={() => {
                    setActiveNav('DASHBOARD');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Dashboard"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeNav === 'DASHBOARD'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'DASHBOARD' ? 'text-amber-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">Dashboard</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md shrink-0 ml-1 bg-slate-700/80 text-slate-300 border border-slate-600/60">
                        Live
                      </span>
                    </div>
                  )}
                </button>

                {/* 2. MAPS & RUAS JALAN (Field Engineer) */}
                <button
                  onClick={() => {
                    setActiveNav('MAP');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Maps & Ruas Jalan"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeNav === 'MAP'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <MapIcon className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'MAP' ? 'text-blue-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Maps & Ruas Jalan</span>}
                </button>

                {/* 3. TUGAS & INSPEKSI (Field Engineer) */}
                <button
                  onClick={() => {
                    setActiveNav('SPK_ORDERS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Tugas & Inspeksi"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeNav === 'SPK_ORDERS'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <ClipboardList className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'SPK_ORDERS' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">Tugas & Inspeksi</span>
                      <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-md shrink-0 ml-1 border border-emerald-500/30">
                        7
                      </span>
                    </div>
                  )}
                </button>

                {/* 4. ANALISIS PINN (Field Engineer) */}
                <button
                  onClick={() => {
                    setActiveNav('SIMULATION');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Analisis PINN"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeNav === 'SIMULATION'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <Cpu className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'SIMULATION' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Analisis PINN</span>}
                </button>

                {/* 5. RIWAYAT JALAN (Field Engineer) */}
                <button
                  onClick={() => {
                    setActiveNav('ROAD_HISTORY');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Riwayat Jalan"
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                    activeNav === 'ROAD_HISTORY'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <History className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'ROAD_HISTORY' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">Riwayat Jalan</span>}
                </button>
              </>
            ) : (
              <>
                {/* 1. PETA (Public / Non-Staff) */}
                <button
                  onClick={() => {
                    setActiveNav('MAP');
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navMap}
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'MAP'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MapIcon className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'MAP' ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{t.navMap}</span>}
                </button>

                {/* 2. LAPORAN (Public) */}
                <button
                  onClick={() => {
                    setActiveNav('REPORTS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navReports}
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'REPORTS'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'REPORTS' ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{t.navReports}</span>}
                </button>

                {/* 3. ANALITIK (Public) */}
                <button
                  onClick={() => {
                    setActiveNav('ANALYTICS');
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navAnalytics}
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'ANALYTICS'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BarChart2 className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'ANALYTICS' ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{t.navAnalytics}</span>}
                </button>

                {/* 4. SIMULASI PINN (Public) */}
                <button
                  onClick={() => {
                    setActiveNav('SIMULATION');
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navSimulation}
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeNav === 'SIMULATION'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Cpu className={`w-4.5 h-4.5 shrink-0 ${activeNav === 'SIMULATION' ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{t.navSimulation}</span>}
                </button>

                {/* 5. PENGATURAN (Public) */}
                <button
                  onClick={() => {
                    onOpenSettings();
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navSettings}
                  className={`w-full max-w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                  } rounded-2xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer`}
                >
                  <Settings className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{t.navSettings}</span>}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Policy Maker and Operations Manager Bottom Assistance & Logout OR Sidebar Collapse Toggle Button */}
        {isPolicyMaker || isOperationsManager ? (
          <div className="pt-3 border-t border-white/10 flex flex-col space-y-1.5 w-full max-w-full">
            {/* Pusat Bantuan 24/7 */}
            <button
              onClick={() => {
                alert(
                  isOperationsManager
                    ? 'Pusat Bantuan Operasional WIM & Dephub siap melayani 24/7 melalui hotline 1500-228 atau email ops-support@dephub.go.id'
                    : 'Pusat Bantuan Eksekutif Bappenas & Bina Marga siap melayani 24/7 melalui hotline 1500-619 atau email bappenas-support@pavement.go.id'
                );
              }}
              className={`w-full max-w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3.5 py-2'
              } rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer`}
              title="Pusat Bantuan 24/7"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Headphones className="w-4 h-4 text-slate-400 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Pusat Bantuan</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                  24/7
                </span>
              )}
            </button>

            {/* Keluar */}
            <button
              onClick={onOpenLoginModal}
              className={`w-full max-w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2 py-2' : 'space-x-2.5 px-3.5 py-2'
              } rounded-2xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer`}
              title="Keluar"
            >
              <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Keluar</span>}
            </button>

            {/* Collapse toggle */}
            <div className="hidden md:flex pt-1 items-center justify-center">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-full flex items-center justify-center py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                title={isSidebarCollapsed ? t.navExpand : t.navCollapse}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] text-slate-400 truncate ml-1">{t.navCollapse}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-white/10 hidden md:flex items-center justify-center w-full max-w-full">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full max-w-full flex items-center justify-center space-x-2 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              title={isSidebarCollapsed ? t.navExpand : t.navCollapse}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] text-slate-400 truncate">{t.navCollapse}</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-colors duration-200 ${theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
        {/* 1. DESKTOP HEADER BAR (For tablets md: and desktop lg:) */}
        <header className={`hidden md:flex h-16 backdrop-blur-xl border-b px-4 sm:px-6 items-center justify-between z-40 relative shrink-0 transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#0e1320]/90 border-white/10 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          {/* Left: Mobile Toggle & Search Input */}
          <div className="flex items-center space-x-3 flex-1 max-w-xl">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`md:hidden p-2 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-white/5 text-slate-300 hover:text-white border-white/10'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search location or issue input */}
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full border rounded-2xl pl-10 pr-10 py-2 text-xs sm:text-sm focus:outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-[#161c2d] border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-amber-400/80'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                }`}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border hidden sm:block ${
                theme === 'dark' ? 'text-slate-500 bg-white/5 border-white/10' : 'text-slate-400 bg-slate-200 border-slate-300'
              }`}>
                /
              </span>
            </div>
          </div>

          {/* Right: Language Toggle, Theme Toggle, Notification Dropdown, and User Account Pill */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Language Switcher (English / Indonesia) */}
            <div className="relative">
              <button
                onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#161c2d] hover:bg-[#1d253b] border-white/10 text-slate-200 hover:text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:text-slate-950'
                }`}
                title="Ganti Bahasa / Switch Language"
              >
                <span className="text-sm">{language === 'id' ? '🇮🇩' : '🇺🇸'}</span>
                <span className="font-mono tracking-wider">{language === 'id' ? 'ID' : 'EN'}</span>
              </button>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                theme === 'dark'
                  ? 'bg-[#161c2d] hover:bg-[#1d253b] border-white/10 text-amber-400'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-600'
              }`}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Unduh Laporan Button (Policy Maker / Executive Fast Access) */}
            {isPolicyMaker && (
              <button
                onClick={() => {
                  const sim = currentResult || runPinnSimulation({
                    segmentId: selectedSegment.id,
                    axleLoadTon: 18,
                    rainIntensityMmHr: 45,
                    floodDurationHours: 12,
                    surfaceTemperatureC: 38,
                    subgradeCbrPercent: 5.5,
                    asphaltThicknessCm: 15,
                    asphaltModulusMpa: 2800,
                    targetDevice: 'CPU',
                    precisionMode: 'FP32'
                  }, selectedSegment);
                  generateOfficialReportPdf(sim, currentAccount.role);
                }}
                className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-sm shadow-amber-400/20 cursor-pointer"
                title="Unduh Laporan Eksekutif PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan</span>
              </button>
            )}

            {/* Alerts Bell with Glowing Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsUserMenuOpen(false);
                }}
                className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#161c2d] hover:bg-[#1d253b] border-white/10 text-slate-300 hover:text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title={t.navAlerts}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-md shadow-amber-400/40">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu (Mirroring Account Menu Design) */}
              {isNotificationsOpen && (
                <div className={`absolute right-0 mt-2 w-80 sm:w-96 border rounded-3xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  theme === 'dark'
                    ? 'bg-[#141a29] border-white/15 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h4 className="font-extrabold text-sm">{t.notificationsTitle}</h4>
                      {unreadNotificationsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-bold text-[10px]">
                          {unreadNotificationsCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsAsRead}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        {t.markAllRead}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleToggleNotificationRead(notif.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          notif.isUnread
                            ? theme === 'dark'
                              ? 'bg-white/10 border-amber-400/40 shadow-sm'
                              : 'bg-amber-50/70 border-amber-300/80 shadow-sm'
                            : theme === 'dark'
                            ? 'bg-white/5 border-transparent hover:bg-white/10'
                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400 shrink-0 mt-0.5">
                            {notif.type === 'VERIFIED' && <Check className="w-4 h-4 text-emerald-400" />}
                            {notif.type === 'UPVOTE' && <TrendingUp className="w-4 h-4 text-cyan-400" />}
                            {notif.type === 'ALERT' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                            {notif.type === 'REPAIR' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {language === 'id' ? notif.titleId : notif.titleEn}
                              </h5>
                              <span className="text-[9.5px] font-mono text-slate-400 shrink-0">{notif.time}</span>
                            </div>
                            <p className={`text-[11px] mt-0.5 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                              {language === 'id' ? notif.descId : notif.descEn}
                            </p>
                          </div>
                          {notif.isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5 shadow-sm shadow-amber-400/80" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Account Profile Pill Dropdown */}
            <div className="relative z-50">
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                className={`flex items-center space-x-2.5 border rounded-full py-1.5 pl-1.5 pr-3 transition-all cursor-pointer shadow-sm ${
                  theme === 'dark'
                    ? 'bg-[#161c2d] hover:bg-[#1d253b] border-white/10'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-8 h-8 rounded-full object-cover border border-amber-400/60"
                />
                <div className="text-left hidden sm:block">
                  <p className={`text-xs font-extrabold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Hi, {currentAccount.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-amber-500 font-semibold leading-tight">
                    {currentAccount.role === 'PUBLIC_REPORTER'
                      ? 'Pelapor Aktif'
                      : currentAccount.role === 'PUBLIC_VIEWER'
                      ? 'Warga Pengamat'
                      : currentAccount.role === 'FIELD_ENGINEER'
                      ? 'Field Engineer'
                      : currentAccount.role === 'OPERATIONS_MANAGER'
                      ? 'Ops Manager'
                      : 'Policy Maker'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Fast User Role Switcher Dropdown (With All 3 Official Roles & 2 Public Accounts) */}
              {isUserMenuOpen && (
                <div className={`absolute right-0 mt-2 w-72 border rounded-3xl p-3.5 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl ${
                  theme === 'dark' ? 'bg-[#141a29]/98 border-white/15 text-slate-200' : 'bg-white/98 border-slate-200 text-slate-800'
                }`}>
                  <div className="px-2 py-1.5 border-b border-white/10 mb-2">
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentAccount.name}</p>
                    <p className="text-[10px] text-slate-400">{currentAccount.email}</p>
                    <span className="inline-block mt-1 text-[9px] bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-400/30">
                      {currentAccount.clearanceLevel}
                    </span>
                  </div>

                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase px-2 mb-1.5">
                    {t.switchAccount}:
                  </p>

                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {/* Akun Baru: Executive Policy Maker (App Eksekutif Bappenas & Bina Marga / Layout Modern) */}
                    <button
                      onClick={() => {
                        const acc = USER_ACCOUNTS.find((a) => a.id === 'USR-007') || USER_ACCOUNTS[2];
                        onLoginAccount(acc);
                        setPolicyNavTab('PETA_STRATEGIS');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        currentAccount.id === 'USR-007'
                          ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={USER_ACCOUNTS.find((a) => a.id === 'USR-007')?.avatarUrl}
                        alt="Retno Policy Maker"
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-indigo-400/60"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <p className="text-xs font-bold truncate">Dr. Ir. Retno Wulandari</p>
                          <span className="text-[8px] bg-indigo-500/30 text-indigo-300 px-1 rounded font-mono font-bold">PM-APP</span>
                        </div>
                        <p className="text-[10px] text-indigo-300 font-medium truncate">Policy Maker (App Eksekutif Bappenas)</p>
                      </div>
                    </button>

                    {/* Akun Baru: Field Civil Engineer (App Lapangan PUPR / Layout Modern) */}
                    <button
                      onClick={() => {
                        const acc = USER_ACCOUNTS.find((a) => a.id === 'USR-006') || USER_ACCOUNTS[0];
                        onLoginAccount(acc);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        currentAccount.id === 'USR-006'
                          ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={USER_ACCOUNTS.find((a) => a.id === 'USR-006')?.avatarUrl}
                        alt="Ahmad FE"
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-amber-400/60"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <p className="text-xs font-bold truncate">Ir. Ahmad Subagyo, M.T.</p>
                          <span className="text-[8px] bg-amber-400/30 text-amber-300 px-1 rounded font-mono font-bold">FE-APP</span>
                        </div>
                        <p className="text-[10px] text-amber-400 font-medium truncate">Field Engineer (App Lapangan PUPR)</p>
                      </div>
                    </button>

                    {/* Akun Baru: Operations Manager (App Operasional WIM & Dephub / Layout Modern) */}
                    <button
                      onClick={() => {
                        const acc = USER_ACCOUNTS.find((a) => a.id === 'USR-008') || USER_ACCOUNTS[1];
                        onLoginAccount(acc);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        currentAccount.id === 'USR-008'
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={USER_ACCOUNTS.find((a) => a.id === 'USR-008')?.avatarUrl}
                        alt="Hendra OM"
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-rose-400/60"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <p className="text-xs font-bold truncate">Drs. Hendra Gunawan, S.Si.</p>
                          <span className="text-[8px] bg-rose-500/30 text-rose-300 px-1 rounded font-mono font-bold">OM-APP</span>
                        </div>
                        <p className="text-[10px] text-rose-400 font-medium truncate">Operations Manager (WIM & Dephub)</p>
                      </div>
                    </button>

                    {/* User 1: Budi Santoso (Public Reporter - Bisa Lapor & Edit) */}
                    <button
                      onClick={() => {
                        const acc = USER_ACCOUNTS.find((a) => a.id === 'USR-004') || currentAccount;
                        onLoginAccount(acc);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        currentAccount.id === 'USR-004'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={USER_ACCOUNTS.find((a) => a.id === 'USR-004')?.avatarUrl}
                        alt="Budi"
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">User 1: Budi Santoso, S.T.</p>
                        <p className="text-[10px] text-emerald-400 font-medium">Bisa Lapor & Edit Laporan</p>
                      </div>
                    </button>

                    {/* User 2: Siti Aminah (Public Viewer - Lihat & Lapor Baru) */}
                    <button
                      onClick={() => {
                        const acc = USER_ACCOUNTS.find((a) => a.id === 'USR-005') || currentAccount;
                        onLoginAccount(acc);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        currentAccount.id === 'USR-005'
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <img
                        src={USER_ACCOUNTS.find((a) => a.id === 'USR-005')?.avatarUrl}
                        alt="Siti"
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">User 2: Siti Aminah, S.E.</p>
                        <p className="text-[10px] text-cyan-300 font-medium">Lihat & Lapor (Belum Edit)</p>
                      </div>
                    </button>

                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. MAIN WORKSPACE / MAP VIEWPORT */}
        <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
          {/* STAKEHOLDER WORKSPACES: route-level compositions live in src/pages */}
          {isPolicyMaker && activeNav === 'DASHBOARD' ? (
            <PolicyPage policyNavTab={policyNavTab} setPolicyNavTab={setPolicyNavTab} />
          ) : isOperationsManager && OPERATIONS_WORKSPACE_NAVS.includes(activeNav) ? (
            <OperationsPage activeNav={activeNav} setIsCreateReportModalOpen={setIsCreateReportModalOpen} />
          ) : isFieldEngineer && activeNav === 'DASHBOARD' ? (
            <EngineeringPage searchQuery={searchQuery} setIsCreateReportModalOpen={setIsCreateReportModalOpen} />
          ) : (isFieldEngineer || isOperationsManager) && activeNav === 'SPK_ORDERS' ? (
            <WorkOrdersPage />
          ) : (
            <>
              {/* Base Leaflet Map Component (100% Function Layout Preserved) */}
              <div className="absolute inset-0 w-full h-full z-0">
                <React.Suspense fallback={<div className="w-full h-full bg-[#0b1220]" />}>
                <PublicMap
                  roadSegments={roadSegments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={handleSelectSegmentFromMap}
                  onLaunchSimulation={onLaunchSimulation}
                  activeRole={activeRole}
                  onNavigateToDashboard={() => setActiveNav('REPORTS')}
                  communityReports={communityReports}
                  onAddReport={onAddReport}
                  onUpvoteReport={onUpvoteReport}
                  currentAccount={currentAccount}
                  activeFilter={activeFilter}
                  showDensity={showDensity}
                  bottomInsetPx={
                    sheetSegment && typeof window !== 'undefined' && window.innerWidth < 768
                      ? sheetInsetPx(mapSheetState, window.innerHeight)
                      : 0
                  }
                  onSelectCluster={(reports) => {
                    setIsDetailsPanelOpen(false);
                    setSheetSegment(null);
                    setSheetCluster(reports);
                    setMapSheetState('HALF');
                  }}
                  userLocation={userLocation}
                  onViewportChange={({ bounds, moving }) => {
                    setIsMapMoving(moving);
                    if (!moving) setMapBounds(bounds);
                  }}
                  baseMapStyle={baseMapStyle}
                  theme={theme}
                  language={language}
                  recenterKey={recenterKey}
                  highlightReportId={highlightReportId}
                  mapCenterTarget={mapCenterTarget}
                  onOpenReportModalWithLocation={(segment, coords) => {
                    setFormSegmentId(segment.id);
                    setCustomCoordinates(coords);
                    setIsCreateReportModalOpen(true);
                  }}
                  onSelectReport={(rep) => {
                    closeMapSheet();
                    const reportSegment = roadSegments.find((s) => s.id === rep.segmentId);
                    if (reportSegment) onSelectSegment(reportSegment);
                    {
                      setSelectedIssueReport(rep);
                      setDetailsTab('COMPARISON');
                      setIsDetailsPanelOpen(true);
                      const isMobile = window.innerWidth < 768;
                      if (isMobile) {
                        setMapCenterTarget({
                          coords: rep.coordinates,
                          zoom: 16,
                          timestamp: Date.now()
                        });
                      }
                    }
                  }}
                />
                </React.Suspense>
              </div>

          {/* RECENTER TOAST NOTIFICATION */}
          {showRecenterToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-xl border border-amber-400/50 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>{recenterToastText}</span>
            </div>
          )}

          {/* MOBILE FLOATING TOP HEADER (md:hidden) */}
          {!isFieldEngineer && (
            <div className="md:hidden absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none transition-all">
              {/* Left: Floating User & Location Pill Card */}
              <div
                onClick={() => setIsProfileModalOpen(true)}
                className="pointer-events-auto flex items-center gap-2.5 bg-white/95 dark:bg-[#121622]/95 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-full py-1.5 pl-1.5 pr-3.5 shadow-xl cursor-pointer active:scale-95 transition-all"
              >
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0"
                />
                <div className="text-left flex flex-col justify-center">
                  <p className="text-[11.5px] font-black leading-none text-slate-900 dark:text-white truncate max-w-[110px]">
                    {selectedSegment ? selectedSegment.province : 'Indonesia'}
                  </p>
                  <p className="text-[10px] text-amber-500 font-bold leading-none mt-1 flex items-center gap-1">
                    {DEMO_DATA_LABEL[language]}
                  </p>
                </div>
              </div>

              {/* Right: Floating Search & Notification Buttons */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setIsQuickSearchModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#121622]/95 backdrop-blur-xl border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  title="Search location or damage report"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#121622]/95 backdrop-blur-xl border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
                  title={t.navAlerts}
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-md shadow-amber-400/40">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY 1: MAP FILTER PILLS (Floating horizontally below header) */}
          {!isFieldEngineer && (
            <div className="absolute top-[60px] sm:top-[68px] md:top-4 left-3 sm:left-4 z-20 flex flex-col space-y-1.5 max-w-[calc(100vw-1.5rem)] sm:max-w-max pointer-events-auto transition-all">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
                {/* All Issues */}
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  <span>{t.filterAll}</span>
                </button>

                {/* Critical */}
                <button
                  onClick={() => setActiveFilter('CRITICAL')}
                  className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    activeFilter === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-rose-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-0.5 animate-pulse" />
                  <span>{t.filterCritical}</span>
                </button>

                {/* Moderate */}
                <button
                  onClick={() => setActiveFilter('MODERATE')}
                  className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    activeFilter === 'MODERATE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-amber-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-0.5" />
                  <span>{t.filterModerate}</span>
                </button>

                {/* Minor */}
                <button
                  onClick={() => setActiveFilter('MINOR')}
                  className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    activeFilter === 'MINOR'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-emerald-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-0.5" />
                  <span>{t.filterMinor}</span>
                </button>
              </div>

            </div>
          )}

          {/* FLOATING MAP CONTROLS (Right-Center of Map Viewport) */}
          <div
            className={`absolute right-3 sm:right-4 top-28 sm:top-32 md:top-20 z-20 flex flex-col space-y-2 pointer-events-auto transition-opacity duration-200 ${
              isMapMoving && !isLayersMenuOpen ? 'opacity-30' : 'opacity-100'
            }`}
          >
            {/* Layers / Base Map Menu Button */}
            <div className="relative">
              <button
                ref={layerButtonRef}
                type="button"
                aria-expanded={isLayersMenuOpen}
                aria-controls={MAP_LAYER_PANEL_ID}
                aria-label={language === 'en' ? 'Map layers' : 'Lapisan peta'}
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                className={`w-10 h-10 rounded-xl backdrop-blur-md border shadow-lg flex items-center justify-center transition-all cursor-pointer ${
                  isLayersMenuOpen || showDensity
                    ? 'bg-slate-800 text-amber-400 border-slate-700'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Tipe Peta Dasar & Lapisan Geospasial"
              >
                <Layers className={`w-4 h-4 ${isLayersMenuOpen || showDensity ? 'text-amber-400' : 'text-slate-400'}`} />
              </button>

              {/* Layer settings: collapsed by default, opens next to the button */}
              <MapLayerPanel
                open={isLayersMenuOpen}
                onClose={closeLayersMenu}
                anchorRef={layerButtonRef}
                baseMapStyle={baseMapStyle}
                onBaseMapStyleChange={setBaseMapStyle}
                showDensity={showDensity}
                onShowDensityChange={setShowDensity}
                density={densitySelection}
                language={language}
              />
            </div>

            <button
              onClick={handleLocate}
              className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg flex items-center justify-center transition-all cursor-pointer group active:scale-95"
              title={language === 'en' ? 'My location' : 'Lokasi saya'}
            >
              <Navigation className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            </button>
            <button
              onClick={() => onOpenSettings()}
              className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg flex items-center justify-center transition-all cursor-pointer"
              title="Map Diagnostics"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* OVERLAY 2: FLOATING "ROAD ISSUES NEARBY" CARD (Above bottom nav bar) */}
          {!isFieldEngineer && isNearbyCardExpanded && !isDetailsPanelOpen && !isMapSheetOpen && (
            <div className="absolute bottom-[78px] sm:bottom-[86px] left-3 right-3 sm:left-4 sm:right-4 sm:max-w-md sm:mx-auto z-20 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-slate-200 animate-in fade-in duration-300 pointer-events-auto max-h-[48vh] sm:max-h-[55vh] flex flex-col box-border overflow-hidden">
              {/* Card Header & Toggle */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2 shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                      {reportsInView.length} {inViewLabel}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {inViewCounts.critical} Critical &bull; {inViewCounts.moderate} Moderate &bull; {inViewCounts.minor} Minor
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setIsNearbyCardExpanded(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                    title="Collapse card"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-filter chips */}
              <div className="flex items-center gap-1.5 pb-2 shrink-0 overflow-x-auto no-scrollbar text-[10px]">
                <button
                  onClick={() => setReportsCardFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  All ({reportsInView.length})
                </button>
                <button
                  onClick={() => setReportsCardFilter('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-rose-300 border-slate-800'
                  }`}
                >
                  Critical ({inViewCounts.critical})
                </button>
                <button
                  onClick={() => setReportsCardFilter('MODERATE')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'MODERATE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-amber-300 border-slate-800'
                  }`}
                >
                  Moderate ({inViewCounts.moderate})
                </button>
                <button
                  onClick={() => setReportsCardFilter('MINOR')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'MINOR'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-emerald-300 border-slate-800'
                  }`}
                >
                  Minor ({inViewCounts.minor})
                </button>
              </div>

              {/* Scrollable list of recent issues */}
              <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                {reportsInView.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    {language === 'en' ? 'No reports in this area. Move or zoom out the map.' : 'Tidak ada laporan di area ini. Geser atau perkecil peta.'}
                  </p>
                )}
                {reportsInView
                  .filter((rep) => matchesCardFilter(rep.severity))
                  .map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedIssueReport(rep);
                        setDetailsTab('COMPARISON');
                        setIsDetailsPanelOpen(true);
                        const isMobile = window.innerWidth < 768;
                        if (isMobile) {
                          setMapCenterTarget({
                            coords: rep.coordinates,
                            zoom: 16,
                            timestamp: Date.now()
                          });
                        }
                        const seg = roadSegments.find((s) => s.id === rep.segmentId);
                        if (seg) onSelectSegment(seg);
                      }}
                      className={`flex items-center space-x-3 p-2 rounded-xl transition-all cursor-pointer border ${
                        selectedIssueReport?.id === rep.id
                          ? 'bg-slate-800 border-slate-700'
                          : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800'
                      }`}
                    >
                      <img
                        src={rep.photoUrl}
                        alt={rep.damageTypeLabel}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-white truncate">{rep.damageTypeLabel}</h4>
                          <span
                            className={`text-[8.5px] font-semibold px-1.5 py-0.2 rounded-md uppercase shrink-0 border ${
                              rep.severity === 'CRITICAL'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : rep.severity === 'SEVERE' || rep.severity === 'MODERATE'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {rep.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{rep.segmentName}</p>
                        <div className="flex items-center justify-between mt-0.5 text-[9.5px] text-slate-400 font-mono">
                          <span className="truncate">{rep.timestamp || 'Just now'}</span>
                          <span className="text-amber-400 font-sans font-medium shrink-0 ml-1">Details →</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
                <button
                  onClick={() => setIsCreateReportModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Buat Laporan Kerusakan</span>
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY 3: FLOATING PILL WHEN CARD IS COLLAPSED */}
          {!isFieldEngineer && !isNearbyCardExpanded && !isDetailsPanelOpen && !isMapSheetOpen && (
            <div className="absolute bottom-[78px] sm:bottom-[86px] md:bottom-6 left-3 right-3 sm:left-4 sm:right-4 sm:max-w-xs sm:mx-auto z-20 flex justify-center pointer-events-auto">
              <button
                onClick={() => setIsNearbyCardExpanded(true)}
                className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl py-2 px-4 shadow-lg text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>
                  {showDensity
                    ? `${densityInView.length} ${language === 'en' ? 'user reports in view' : 'laporan pengguna di area ini'}`
                    : `${reportsInView.length} ${inViewLabel}`}
                </span>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}

          {/* OVERLAY 4: MOBILE & DESKTOP DRAGGABLE BOTTOM SHEET MODAL (SNAP POINTS 50% & 88% SCREEN, INNER SCROLLING & ENTRANCE ANIMATION) */}
          <MapSheet
            isOpen={isMapSheetOpen}
            state={mapSheetState}
            onStateChange={setMapSheetState}
            onClose={closeMapSheet}
            title={
              sheetSegment
                ? sheetSegment.name
                : `${sheetCluster?.length ?? 0} ${language === 'en' ? 'reports at this location' : 'laporan di lokasi ini'}`
            }
            subtitle={sheetSegment ? `${sheetSegment.id} · ${sheetSegment.province}` : undefined}
            badge={<DemoTag language={language} />}
            closeLabel={language === 'en' ? 'Close' : 'Tutup'}
          >
            {sheetSegment ? (
              <RoadSegmentSheet
                segment={sheetSegment}
                reports={communityReports.filter((r) => r.segmentId === sheetSegment.id)}
                language={language}
                onSelectReport={openReportFromSheet}
                onOpenSimulation={onLaunchSimulation}
              />
            ) : (
              <ReportList
                reports={sheetCluster ?? []}
                onSelectReport={openReportFromSheet}
                emptyText={language === 'en' ? 'No reports.' : 'Tidak ada laporan.'}
              />
            )}
          </MapSheet>

          <ReportDetailBottomSheet
            isOpen={isDetailsPanelOpen && !!selectedIssueReport}
            onClose={() => {
              setIsDetailsPanelOpen(false);
              setIsNearbyCardExpanded(false);
            }}
            report={selectedIssueReport}
            onUpvoteReport={onUpvoteReport}
            currentAccount={currentAccount}
            isFieldEngineer={isFieldEngineer}
            onEditReport={onEditReport}
            onOpenSPK={() => {
              setActiveNav('SPK_ORDERS');
              setIsDetailsPanelOpen(false);
            }}
            onOpenEditModal={(rep) => {
              if (!canEditReport(currentAccount, rep)) return;
              setEditFormData({
                id: rep.id,
                description: rep.description,
                depth: rep.estimatedDepthCm,
                area: rep.estimatedAreaM2,
                severity: rep.severity,
                damageType: rep.damageType
              });
              setIsEditReportModalOpen(true);
            }}
            workflowPanel={
              selectedIssueReport ? (
                <ReportWorkflowPanel
                  compact
                  view={workflow.views[selectedIssueReport.id] ?? null}
                  mode={workflow.mode}
                  engineers={workflow.engineers}
                  onRun={(command) => workflow.runTransition(selectedIssueReport.id, command)}
                />
              ) : null
            }
            reviewsMap={reviewsMap}
            onAddReview={(reportId, review) => {
              setReviewsMap((prev) => {
                const existing = prev[reportId] || [];
                return {
                  ...prev,
                  [reportId]: [review, ...existing]
                };
              });
            }}
          />

          {/* OVERLAY 5: FLOATING BOTTOM NAVIGATION BAR (Mobile Phones only; Tablets & Desktop use Pinned Sidebar & Top Header) */}
          {!isFieldEngineer && (
            <div className="fixed bottom-safe left-3 right-3 sm:left-0 sm:right-0 z-30 pointer-events-none flex justify-center pb-2 md:hidden">
              <div className="pointer-events-auto bg-white/95 dark:bg-[#0e1320]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-full px-5 sm:px-8 py-2 shadow-2xl flex items-center justify-between w-full max-w-sm sm:max-w-md text-slate-400">
                {/* 1. Map Tab */}
                <button
                  onClick={() => {
                    setActiveNav('MAP');
                    setIsRecentReportsCardOpen(false);
                    setRecenterKey((prev) => prev + 1);
                  }}
                  className={`flex flex-col items-center space-y-0.5 cursor-pointer transition-all ${
                    activeNav === 'MAP' && !isRecentReportsCardOpen && !isActivityModalOpen && !isProfileModalOpen
                      ? 'text-amber-500 font-black scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Peta Utama"
                >
                  <MapIcon className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-tight">Map</span>
                </button>

                {/* 2. Reports Tab */}
                <button
                  onClick={() => {
                    setIsNearbyCardExpanded((prev) => !prev);
                  }}
                  className={`flex flex-col items-center space-y-0.5 cursor-pointer transition-all ${
                    isNearbyCardExpanded
                      ? 'text-amber-500 font-black scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Daftar Laporan Warga"
                >
                  <div className="relative">
                    <FileText className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-[#0e1320]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">Reports</span>
                </button>

                {/* 3. Camera / Report Action Button (Prominent Center Yellow Elevated Button) */}
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() => setIsCreateReportModalOpen(true)}
                    className="-mt-7 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-400/50 ring-4 ring-white dark:ring-[#0e1320] border-2 border-amber-200/80 transition-all transform hover:scale-110 active:scale-95 cursor-pointer group"
                    title="Ambil Foto & Lapor Kerusakan Jalan"
                  >
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] text-slate-950 group-hover:rotate-6 transition-transform" />
                  </button>
                </div>

                {/* 4. Activity Tab */}
                <button
                  onClick={() => {
                    setIsActivityModalOpen(true);
                  }}
                  className={`flex flex-col items-center space-y-0.5 cursor-pointer transition-all ${
                    isActivityModalOpen
                      ? 'text-amber-500 font-black scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Aktivitas & Audit Penanganan"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-tight">Activity</span>
                </button>

                {/* 5. Profile Tab */}
                <button
                  onClick={() => {
                    setIsProfileModalOpen(true);
                  }}
                  className={`flex flex-col items-center space-y-0.5 cursor-pointer transition-all ${
                    isProfileModalOpen
                      ? 'text-amber-500 font-black scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Profil & Ganti Akun"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-tight">Profile</span>
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* 4. MODALS & TAB OVERLAYS */}

      {/* MODAL: EDIT REPORT FORM (For User 1: Budi Santoso) */}
      {isEditReportModalOpen && editFormData && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#121622] border border-white/20 rounded-2xl sm:rounded-3xl w-[86vw] sm:w-full max-w-[350px] sm:max-w-lg p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 text-slate-100 max-h-[54vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 font-black">
                  <span>✏️</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-extrabold text-white">Edit Laporan Kerusakan</h3>
                  <p className="text-[10px] sm:text-xs text-cyan-300">Pengguna: {currentAccount.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditReportModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReportEdit} className="space-y-3 sm:space-y-4 text-xs">
              {/* Damage Type */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-[11px] sm:text-xs">Jenis Kerusakan:</label>
                <select
                  value={editFormData.damageType}
                  onChange={(e) => setEditFormData({ ...editFormData, damageType: e.target.value as DamageType })}
                  className="w-full bg-[#181f33] border border-white/15 text-white rounded-xl px-2.5 py-2 text-[11px] sm:text-xs focus:outline-none focus:border-amber-400 font-semibold"
                >
                  <option value="POTHOLE">Pothole (Lubang Dalam)</option>
                  <option value="ALLIGATOR_CRACK">Alligator Cracking (Retak Buaya)</option>
                  <option value="RUTTING">Rutting (Ambles & Alur)</option>
                  <option value="CORRUGATION">Corrugation (Bergelombang)</option>
                </select>
              </div>

              {/* Severity & Dimensions */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-[10px] sm:text-xs truncate block">Keparahan:</label>
                  <select
                    value={editFormData.severity}
                    onChange={(e) => setEditFormData({ ...editFormData, severity: e.target.value as ReportSeverity })}
                    className="w-full bg-[#181f33] border border-white/15 text-white rounded-xl px-1.5 py-2 text-[10px] sm:text-xs focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="LIGHT">Minor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-[10px] sm:text-xs truncate block">Kedalaman (cm):</label>
                  <input
                    type="number"
                    value={editFormData.depth}
                    onChange={(e) => setEditFormData({ ...editFormData, depth: Number(e.target.value) })}
                    className="w-full bg-[#181f33] border border-white/15 text-white rounded-xl px-2 py-2 text-[11px] sm:text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-[10px] sm:text-xs truncate block">Luas (m²):</label>
                  <input
                    type="number"
                    value={editFormData.area}
                    onChange={(e) => setEditFormData({ ...editFormData, area: Number(e.target.value) })}
                    className="w-full bg-[#181f33] border border-white/15 text-white rounded-xl px-2 py-2 text-[11px] sm:text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-[11px] sm:text-xs">Deskripsi Kerusakan:</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-[#181f33] border border-white/15 text-white rounded-xl p-2.5 text-[11px] sm:text-xs focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditReportModalOpen(false)}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-lg shadow-amber-400/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODALS & TAB OVERLAYS */}

      {/* MODAL: REPORT ROAD ISSUE CARD WITH CV PROGRESS & ANALYSIS */}
      <ReportRoadIssueCard
        isOpen={isCreateReportModalOpen}
        onClose={() => {
          setIsCreateReportModalOpen(false);
          setCustomCoordinates(null);
        }}
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        initialCoordinates={customCoordinates}
        onAddReport={async (submitted) => {
          // The card waits on this promise and shows success only after the save.
          const outcome = await settleMutation(onAddReport(submitted), submitted);
          if (outcome.ok === false) return outcome;
          const newReport = (outcome as { report: DamageReport }).report;
          setSelectedIssueReport(newReport);
          setHighlightReportId(newReport.id);
          setMapCenterTarget({
            coords: newReport.coordinates,
            zoom: 17,
            timestamp: Date.now()
          });
          setIsDetailsPanelOpen(false);
          setIsNearbyCardExpanded(false);
          setIsRecentReportsCardOpen(false);

          // Automatically slide up the Mobile View Report Bottom Card after pin finishes sprouting
          setTimeout(() => {
            setSelectedIssueReport(newReport);
            setDetailsTab('COMPARISON');
            setMobileSheetHeight('PEEK');
            setIsDetailsPanelOpen(true);
          }, 3300);
          return outcome;
        }}
        onFocusMapLocation={(coords, zoom, reportId) => {
          setActiveNav('MAP');
          setCustomCoordinates(coords);
          if (reportId) {
            setHighlightReportId(reportId);
          }
          setMapCenterTarget({
            coords,
            zoom: zoom || 17,
            timestamp: Date.now()
          });
          setIsDetailsPanelOpen(false);
          setIsNearbyCardExpanded(false);
          setIsRecentReportsCardOpen(false);

          // Automatically slide up the Mobile View Report Bottom Card after pin finishes sprouting
          setTimeout(() => {
            const rep = communityReports.find((r) => r.id === reportId) || selectedIssueReport;
            if (rep) {
              setSelectedIssueReport(rep);
              setDetailsTab('COMPARISON');
              setMobileSheetHeight('PEEK');
              setIsDetailsPanelOpen(true);
            }
          }, 3300);
        }}
      />

      {/* ROUTE OUTLET: route-level pages (src/pages) mount here — reports, engine, computer vision, settings, login, ... */}
      {children}

      {/* MODAL: NOTIFICATIONS / ALERTS */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121622] border border-white/20 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Live System Alerts</h3>
                  <p className="text-xs text-slate-400">Recent road damage alerts & ODOL notifications</p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Critical Pothole Reported
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">2 min ago</span>
                </div>
                <p className="text-xs text-slate-300">Jl. Sudirman No. 62 &bull; Severe depth ~14 cm affecting left lane.</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-400" />
                    Overload Truck Violation (+85%)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">15 min ago</span>
                </div>
                <p className="text-xs text-slate-300">Stasiun WIM Bintaro Sektor 7 &bull; Truk B 9182 NFD (18.5 Ton).</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Road Patching Completed
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">1 hr ago</span>
                </div>
                <p className="text-xs text-slate-300">Pantura KM 62+500 &bull; Overlay AC-WC 8.5 cm successfully applied.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOBILE QUICK SEARCH */}
      {isQuickSearchModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 pt-12 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/20 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-2xl bg-amber-400 text-slate-950">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Cari Lokasi / Kerusakan</h3>
              </div>
              <button
                onClick={() => setIsQuickSearchModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jalan, koridor, atau tipe kerusakan..."
                className="w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-[#181f33] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Pilihan Koridor</p>
              {roadSegments.map((seg) => (
                <div
                  key={seg.id}
                  onClick={() => {
                    onSelectSegment(seg);
                    setIsQuickSearchModalOpen(false);
                  }}
                  className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{seg.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{seg.province} &bull; {seg.conditionCategory}</p>
                  </div>
                  <span className="text-amber-500 font-bold text-[10px] shrink-0 ml-2">Pilih →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACTIVITY / AUDIT FEED (Mobile Tab 4) */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/20 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-black shadow-md shadow-amber-400/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Aktivitas & Audit Penanganan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pembaruan realtime laporan dan verifikasi jalan</p>
                </div>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
              {/* Activity item 1 */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Verifikasi AI OpenVINO Selesai
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">10 mnt lalu</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">Laporan Lubang Dalam di Tol Jakarta-Cikampek KM 47 telah divalidasi dengan confidence 96.8%.</p>
              </div>

              {/* Activity item 2 */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    Penambalan AC-WC Diterapkan
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">1 jam lalu</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">Tim Bina Marga Balai Wilayah VI menyelesaikan patching di Jl. Tuparev Karawang Barat.</p>
              </div>

              {/* Activity item 3 */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Laporan Kritis Baru
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">3 jam lalu</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">Budi Santoso melaporkan Ambles Parah (Depth ~14cm) di Kawasan Industri KIIC.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 shrink-0">
              <button
                onClick={() => {
                  setIsActivityModalOpen(false);
                  setActiveNav('MAP');
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              >
                Kembali ke Peta Interaktif
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE & USER DRAWER (Mobile Tab 5) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/20 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{currentAccount.name}</h3>
                  <p className="text-[11px] text-amber-500 font-bold truncate">{currentAccount.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentAccount.agency}</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Toggles: Language & Dark Mode */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#181f33] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer active:scale-98 transition-all"
              >
                <span>{language === 'id' ? '🇮🇩 Bahasa' : '🇺🇸 English'}</span>
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#181f33] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer active:scale-98 transition-all"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            {/* Role Switcher */}
            <div className="space-y-2 shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Ganti Peran / Akun Pengguna</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                {USER_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onLoginAccount(acc);
                      setIsProfileModalOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentAccount.id === acc.id
                        ? 'bg-amber-400/20 border-amber-400 text-slate-950 dark:text-white font-black'
                        : 'bg-slate-50 dark:bg-[#181f33] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
                    }`}
                  >
                    <img src={acc.avatarUrl} alt={acc.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-amber-400/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{acc.name}</p>
                      <p className="text-[10px] text-amber-500 font-mono truncate">{acc.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 shrink-0 flex gap-2">
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onOpenLoginModal();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              >
                Ganti Akun Lain
              </button>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DETAIL BEFORE / AFTER MODAL */}
      <ReportDetailModal
        isOpen={!!detailModalReport}
        onClose={() => setDetailModalReport(null)}
        report={detailModalReport}
        onUpvote={onUpvoteReport}
        onFocusMap={(rep) => {
          const seg = roadSegments.find((s) => s.id === rep.segmentId);
          if (seg) onSelectSegment(seg);
          setDetailModalReport(null);
          setActiveNav('MAP');
        }}
      />
    </div>
  );
};
