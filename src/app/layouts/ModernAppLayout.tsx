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
  ShieldAlert,
  Layers as LayersIcon
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
import { UserAccount } from '../../features/authentication/demoAccounts';
import { ROLE_LABELS } from '../../features/authentication/roleLabels';
import { isAnonymousAccount } from '../providers/SessionProvider';
import type { LeafletMapProps } from '../../components/maps/LeafletMap';
import { PavementMap } from '../../components/maps/PavementMap';
import { MAP_LAYER_PANEL_ID, MapLayerPanel } from '../../components/maps/MapLayerPanel';
import { selectRegularUserDensity } from '../../features/community-reports/reportDensity';
import { createSessionReport, ReportCreationError } from '../../features/community-reports/reportFactory';
import { settleMutation } from '../../features/community-reports/reportMutations';
import { ReportWorkflowPanel } from '../../features/workflow/ReportWorkflowPanel';
import { useAppState } from '../providers/AppStateProvider';
import { useRouter } from '../router';
import { canEditReport } from '../../features/rbac/accessPolicy';
import { ReportDetailModal } from '../../features/community-reports/ReportDetailModal';
import { ReportDetailBottomSheet } from '../../features/community-reports/ReportDetailBottomSheet';
import { LatLngBounds, itemsInBounds } from '../../components/maps/mapDetail';
import { MapSheet } from '../../components/maps/MapSheet';
import { useSheetDrag } from '../../components/ui/useSheetDrag';
import { useThemePreference } from '../themePreference';
import { MapSheetState, sheetInsetPx } from '../../components/maps/sheetState';
import { DemoTag, ReportList, RoadSegmentSheet } from '../../features/road-health/RoadSegmentSheet';
import { matchReportToRoadSegment } from '../../domain/geo/canonicalRoadGeometry';
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
import { relativeTime, workflowNotifications } from '../../features/workflow/notifications';
import { fieldTasks, tasksDue } from '../../features/work-orders/fieldTasks';
import { GlobalFloatingTopBar } from '../../components/navigation/GlobalFloatingTopBar';
import { UiLanguageContext } from '../../i18n/LanguageContext';
import { can } from '../../features/rbac/accessPolicy';

interface ModernAppLayoutProps {
  currentAccount: UserAccount;
  activeRole: UserRole;
  /** End the session and return to the login page. */
  onLogout: () => void;
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

export const ModernAppLayout: React.FC<ModernAppLayoutProps> = ({
  currentAccount,
  activeRole,
  onLogout,
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
  // Visitor without a login (public map, anonymous reports); everyone else signed in with credentials.
  const isAnonymousIdentity = isAnonymousAccount(currentAccount);
  const isPolicyMaker = currentAccount.role === 'POLICY_MAKER';
  const isOperationsManager = currentAccount.role === 'OPERATIONS_MANAGER';
  const isPublicUser = currentAccount.role === 'PUBLIC_REPORTER' || currentAccount.role === 'PUBLIC_VIEWER';
  // Shared report workflow (server-backed): state, evidence and role actions for the sheet.
  const { workflow, activeNavigationTask, startNavigation, cancelNavigation, completeNavigation } = useAppState();
  const { navigateTo, location: routerLocation } = useRouter();
  // Sidebar badge: assigned cases where the engineer can act now (inspect, recommend, verify).
  // M.O badge: cases where an operations action is available now (same server views as the queue).
  const operationsDue = Object.values(workflow.views).filter((v) => v.audience === 'STAFF' && v.availableActions.length > 0).length;
  const fieldTasksDue = tasksDue(fieldTasks(Object.values(workflow.views), workflow.actor?.id ?? currentAccount.id));

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
  // Theme is chosen in Settings (dark by default); see app/themePreference.ts.
  const [theme] = useThemePreference();

  // Notifications dropdown state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  // Notifications come from the shared workflow history (who handed what to whom).
  // Read marks are kept per account in this browser only; they are not workflow data.
  const readKey = `pinn.notif.read.${currentAccount.id}`;
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(readKey) ?? '[]'));
    } catch {
      return new Set<string>();
    }
  });
  useEffect(() => {
    try {
      setReadIds(new Set<string>(JSON.parse(localStorage.getItem(readKey) ?? '[]')));
    } catch {
      setReadIds(new Set<string>());
    }
  }, [readKey]);
  const saveRead = (next: Set<string>) => {
    setReadIds(next);
    try {
      localStorage.setItem(readKey, JSON.stringify([...next].slice(-500)));
    } catch {
      /* storage unavailable: marks last for this page only */
    }
  };
  const notifications = useMemo(
    () =>
      workflowNotifications(Object.values(workflow.views), { id: workflow.actor?.id ?? currentAccount.id, role: currentAccount.role }).map((n) => ({
        id: n.id,
        titleId: n.title,
        titleEn: n.title,
        descId: n.description,
        descEn: n.description,
        time: relativeTime(n.at),
        type: n.kind === 'DONE' ? 'REPAIR' : n.kind === 'DECISION' || n.kind === 'PROGRESS' ? 'VERIFIED' : 'ALERT',
        isUnread: !readIds.has(n.id),
        icon: n.kind,
        caseId: n.caseId,
        done: n.kind === 'DONE'
      })),
    [workflow.views, workflow.actor, currentAccount.id, currentAccount.role, readIds]
  );

  const unreadNotificationsCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllNotificationsAsRead = () => {
    saveRead(new Set([...readIds, ...notifications.map((n) => n.id)]));
  };

  const handleToggleNotificationRead = (id: string) => {
    const next = new Set(readIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveRead(next);
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

  // Cinematic Globe-to-Java Map Entry Animation Key
  const [mapEntryKey, setMapEntryKey] = useState<number>(1);
  const prevActiveNavRef = React.useRef<WorkspaceNav>(activeNav);

  useEffect(() => {
    const isMapActive = activeNav === 'MAP' || activeNav === 'PETA_POS_WIM';
    const wasMapActive = prevActiveNavRef.current === 'MAP' || prevActiveNavRef.current === 'PETA_POS_WIM';
    if (isMapActive && !wasMapActive) {
      setMapEntryKey((prev) => prev + 1);
    }
    prevActiveNavRef.current = activeNav;
  }, [activeNav]);

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
        comment: 'Lubang ini sempat sangat dalam dan rawan bikin velg pecah. Terima kasih warga dan petugas respon laporannya cepat.',
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

  // Check for testLat / testLng in URL query for verified reproducible testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testLatStr = params.get('testLat');
      const testLngStr = params.get('testLng');
      if (testLatStr && testLngStr) {
        const tLat = parseFloat(testLatStr);
        const tLng = parseFloat(testLngStr);
        if (Number.isFinite(tLat) && Number.isFinite(tLng)) {
          setCustomCoordinates([tLat, tLng]);
          setMapCenterTarget({
            coords: [tLat, tLng],
            zoom: 16,
            timestamp: Date.now()
          });
        }
      }
    }
  }, []);

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

  const handleNavToMap = (targetNav: WorkspaceNav = 'MAP') => {
    setActiveNav(targetNav);
    setMapEntryKey((prev) => prev + 1);
    setIsMobileSidebarOpen(false);
  };

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
  // Activity and profile sheets close with a downward swipe on phones.
  const activitySheet = useSheetDrag({ mode: 'translate', onClose: () => setIsActivityModalOpen(false), maxWidth: 639 });
  // "Reports in view" card: drag between half and nearly full; below half it folds into the pill.
  const [nearbyCardSize, setNearbyCardSize] = useState<'HALF' | 'FULL'>('HALF');
  const nearbySheet = useSheetDrag<'HALF' | 'FULL'>({
    mode: 'height',
    snaps: () => [
      { key: 'HALF', height: window.innerHeight * 0.48 },
      { key: 'FULL', height: window.innerHeight * 0.78 }
    ],
    onSnap: setNearbyCardSize,
    onClose: () => {
      setIsNearbyCardExpanded(false);
      setNearbyCardSize('HALF');
    },
    maxWidth: 639
  });
  const profileSheet = useSheetDrag({ mode: 'translate', onClose: () => setIsProfileModalOpen(false), maxWidth: 639 });
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
      userUpvoted: true
      // No repairDetails: the "after" photo comes only from the F.E repair evidence.
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

  // Filter pills horizontal edge-to-edge scroll detection for transparent edge mask fade
  const filterScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);

  const checkFilterScroll = React.useCallback(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    const isAtStart = el.scrollLeft <= 2;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setCanScrollLeft(hasOverflow && !isAtStart);
    setCanScrollRight(hasOverflow && !isAtEnd);
  }, []);

  // Pure transparent CSS mask: chips fade smoothly to 0% opacity near edges without adding colors or shadows
  const filterMaskStyle = useMemo(() => {
    if (!canScrollLeft && !canScrollRight) {
      return undefined;
    }
    const fadeWidth = '28px';
    let gradient = '';
    if (canScrollLeft && canScrollRight) {
      gradient = `linear-gradient(to right, transparent 0%, #000 ${fadeWidth}, #000 calc(100% - ${fadeWidth}), transparent 100%)`;
    } else if (canScrollRight) {
      gradient = `linear-gradient(to right, #000 0%, #000 calc(100% - ${fadeWidth}), transparent 100%)`;
    } else if (canScrollLeft) {
      gradient = `linear-gradient(to right, transparent 0%, #000 ${fadeWidth}, #000 100%)`;
    }
    return {
      WebkitMaskImage: gradient,
      maskImage: gradient
    };
  }, [canScrollLeft, canScrollRight]);

  useEffect(() => {
    checkFilterScroll();
    const el = filterScrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      checkFilterScroll();
    });
    observer.observe(el);
    window.addEventListener('resize', checkFilterScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkFilterScroll);
    };
  }, [checkFilterScroll, language, activeFilter]);

  // Every role uses the shared map engine (3D globe; flat Leaflet only during route guidance).
  const PublicMap: React.ComponentType<LeafletMapProps> = PavementMap;

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

  // Synchronize navigation task with report details panel
  useEffect(() => {
    if (activeNavigationTask) {
      setSelectedIssueReport(activeNavigationTask.report);
      setIsDetailsPanelOpen(false);
    }
  }, [activeNavigationTask]);

  const handleCompleteNavigation = () => {
    completeNavigation();
    setIsDetailsPanelOpen(false);
    setActiveNav('MAP');
  };

  const handleCancelNavigation = () => {
    cancelNavigation();
    setIsDetailsPanelOpen(false);
    setActiveNav('MAP');
  };

  /**
   * Apple Human Interface Guidelines Dark Sidebar Navigation Tokens:
  /**
   * Professional Dark GIS Navigation Tokens (Dark Navy Chrome System):
   * - Selected item: Dark navy elevated surface (#18243A), off-white label (#E8EDF5),
   *   restrained golden yellow accent (#E8B52B), subtle border (#202B3B).
   * - Inactive item: Muted slate-navy (#9AA8BC), soft hover (#121C2C).
   * - Proportions: 176–200 px width on desktop.
   */
  const getNavItemClass = (isActive: boolean) => {
    const layout = isSidebarCollapsed
      ? 'justify-center px-2 py-2 min-h-[40px]'
      : 'space-x-2.5 px-3 py-2 min-h-[40px]';
    const state = isActive
      ? 'bg-[#18243A] text-[#E8EDF5] font-medium border border-[#202B3B] shadow-xs'
      : 'text-[#9AA8BC] hover:text-[#E8EDF5] hover:bg-[#121C2C] border border-transparent font-medium';
    return `relative w-full max-w-full flex items-center ${layout} rounded-lg text-xs transition-all duration-150 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080E1B] ${state}`;
  };

  const getNavIconClass = (isActive: boolean) =>
    `w-4 h-4 shrink-0 transition-colors duration-150 ${
      isActive ? 'text-[#E8B52B]' : 'text-[#9AA8BC] group-hover:text-[#E8EDF5]'
    }`;

  const getSubnavItemClass = (isActive: boolean) => {
    const state = isActive
      ? 'bg-[#18243A] text-[#E8EDF5] font-medium border border-[#202B3B] shadow-xs'
      : 'text-[#9AA8BC] hover:text-[#E8EDF5] hover:bg-[#121C2C] border border-transparent font-medium';
    return `relative w-full flex items-center space-x-2 px-2.5 py-1.5 min-h-[34px] rounded-md text-xs transition-all duration-150 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080E1B] ${state}`;
  };

  const getSubnavIconClass = (isActive: boolean) =>
    `w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${
      isActive ? 'text-[#E8B52B]' : 'text-[#7D8B9F] group-hover:text-[#9AA8BC]'
    }`;

  const getFolderNavClass = (hasActiveChild: boolean) => {
    const layout = isSidebarCollapsed
      ? 'justify-center px-2 py-2 min-h-[40px]'
      : 'justify-between px-3 py-2 min-h-[40px]';
    const state = hasActiveChild
      ? 'bg-[#121C2C] text-[#E8EDF5] font-medium border border-[#202B3B]'
      : 'text-[#9AA8BC] hover:text-[#E8EDF5] hover:bg-[#121C2C] border border-transparent font-medium';
    return `w-full max-w-full flex items-center ${layout} rounded-lg text-xs transition-all duration-150 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B52B]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080E1B] ${state}`;
  };

  return (
    <div
      className="flex h-full w-full bg-workspace text-ink overflow-hidden font-sans select-none antialiased"
      // Full-screen pages start after the sidebar on md+ (it is static there): see PageOverlay.
      style={{ ['--sidebar-w' as string]: isSidebarCollapsed ? '4.5rem' : '12rem' } as React.CSSProperties}
    >
      {/* 1. LEFT MAIN SIDEBAR (Dark sleek navigation, ~192px width & collapsible) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isSidebarCollapsed ? 'w-18' : 'w-[192px]'
        } bg-[#080E1B] border-r border-[#202B3B] flex flex-col justify-between p-3 transition-all duration-200 ease-in-out md:static md:translate-x-0 overflow-x-hidden ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col space-y-6 w-full max-w-full min-w-0">
          {/* Logo & Brand Identity */}
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'space-x-3'
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
                <h1 className="font-semibold text-base tracking-wider text-[#E8EDF5] leading-tight truncate">PAVEMENT PINN</h1>
                <p className="text-xs text-[#9AA8BC] font-medium leading-tight truncate">Smart Road Intelligence</p>
              </div>
            )}
          </div>

          {/* Navigation Items Vertical Stack */}
          <nav className="space-y-1.5 w-full max-w-full min-w-0">
            {/* EXECUTIVE POLICY MAKER SIDEBAR */}
            {isPolicyMaker ? (
              <>
                {/* 1. Ringkasan Eksekutif */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD' && policyNavTab === 'RINGKASAN_EKSEKUTIF';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setPolicyNavTab('RINGKASAN_EKSEKUTIF');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Ringkasan Eksekutif"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <Home className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Ringkasan Eksekutif</span>}
                    </button>
                  );
                })()}

                {/* 2. Peta Strategis */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD' && policyNavTab === 'PETA_STRATEGIS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setPolicyNavTab('PETA_STRATEGIS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Peta Strategis"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <MapIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Peta Strategis</span>}
                    </button>
                  );
                })()}

                {/* 3. Anggaran & Investasi */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD' && (policyNavTab === 'ANGGARAN_INVESTASI' || policyNavTab === 'ANGGARAN_REALISASI');
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setPolicyNavTab('ANGGARAN_INVESTASI');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Anggaran & Investasi"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <CreditCard className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Anggaran & Investasi</span>}
                    </button>
                  );
                })()}

                {/* 4. Program Prioritas */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD' && (policyNavTab === 'PROGRAM_PRIORITAS' || policyNavTab === 'PRIORITAS_NASIONAL');
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setPolicyNavTab('PROGRAM_PRIORITAS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Program Prioritas"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <Layers className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Program Prioritas</span>}
                    </button>
                  );
                })()}
              </>
            ) : isOperationsManager ? (
              <>
                {/* 1. RINGKASAN */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD' || activeNav === 'BERANDA_OPERASI';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Ringkasan"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <LayoutDashboard className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">Ringkasan</span>
                          <span className="text-[10px] font-semibold tracking-wide bg-[#18243A] text-[#9AA8BC] border border-[#202B3B] px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none">
                            Ops
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 2. PETA JALAN */}
                {(() => {
                  const isActive = activeNav === 'MAP' || activeNav === 'PETA_POS_WIM';
                  return (
                    <button
                      onClick={() => {
                        handleNavToMap('MAP');
                      }}
                      title="Peta Jalan"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <MapIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">Peta Jalan</span>
                          <span className="text-[10px] font-semibold tracking-wide bg-[#18243A] text-[#9AA8BC] border border-[#202B3B] px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none">
                            GIS
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 3. MONITORING (Kondisi Jalan, Pos WIM, ODOL, Cuaca dan Banjir) */}
                <div className="space-y-0.5">
                  {(() => {
                    const hasActiveChild = activeNav.startsWith('MONITORING_');
                    return (
                      <button
                        onClick={() => {
                          if (isSidebarCollapsed) {
                            setIsSidebarCollapsed(false);
                          }
                          setIsMonitoringSubmenuOpen(!isMonitoringSubmenuOpen);
                        }}
                        title="Monitoring"
                        className={getFolderNavClass(hasActiveChild)}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Activity className={getNavIconClass(hasActiveChild)} />
                          {!isSidebarCollapsed && <span className="truncate">Monitoring</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronDown className={`w-3.5 h-3.5 text-[#9AA8BC] transition-transform duration-200 ${isMonitoringSubmenuOpen ? 'rotate-180 text-[#E8B52B]' : ''}`} />
                        )}
                      </button>
                    );
                  })()}

                  {/* Sub-items for Monitoring */}
                  {(!isSidebarCollapsed && isMonitoringSubmenuOpen) && (
                    <div className="ml-3 pl-2.5 space-y-0.5 border-l border-[#202B3B] my-0.5">
                      {/* Kondisi Jalan */}
                      {(() => {
                        const isActive = activeNav === 'MONITORING_KONDISI_JALAN';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('MONITORING_KONDISI_JALAN');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="Kondisi Jalan"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <CheckCircle2 className={getSubnavIconClass(isActive)} />
                            <span className="truncate">Kondisi Jalan</span>
                          </button>
                        );
                      })()}

                      {/* Pos WIM */}
                      {(() => {
                        const isActive = activeNav === 'MONITORING_POS_WIM';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('MONITORING_POS_WIM');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="Pos WIM"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <Scale className={getSubnavIconClass(isActive)} />
                            <span className="truncate">Pos WIM</span>
                          </button>
                        );
                      })()}

                      {/* ODOL */}
                      {(() => {
                        const isActive = activeNav === 'MONITORING_ODOL';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('MONITORING_ODOL');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="ODOL"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <Truck className={getSubnavIconClass(isActive)} />
                            <span className="truncate">ODOL</span>
                          </button>
                        );
                      })()}

                      {/* Cuaca dan Banjir */}
                      {(() => {
                        const isActive = activeNav === 'MONITORING_CUACA_BANJIR';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('MONITORING_CUACA_BANJIR');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="Cuaca dan Banjir"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <CloudRain className={getSubnavIconClass(isActive)} />
                            <span className="truncate">Cuaca dan Banjir</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* 4. LAPORAN DAN PENANGANAN (Rekayasa Lalu Lintas, Peringatan) */}
                <div className="space-y-0.5">
                  {(() => {
                    const hasActiveChild = activeNav.startsWith('TINDAKAN_');
                    return (
                      <button
                        onClick={() => {
                          if (isSidebarCollapsed) {
                            setIsSidebarCollapsed(false);
                          }
                          setIsTindakanSubmenuOpen(!isTindakanSubmenuOpen);
                        }}
                        title="Laporan dan Penanganan"
                        className={getFolderNavClass(hasActiveChild)}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Workflow className={getNavIconClass(hasActiveChild)} />
                          {!isSidebarCollapsed && <span className="truncate">Laporan & Penanganan</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronDown className={`w-3.5 h-3.5 text-[#9AA8BC] transition-transform duration-200 ${isTindakanSubmenuOpen ? 'rotate-180 text-[#E8B52B]' : ''}`} />
                        )}
                      </button>
                    );
                  })()}

                  {/* Sub-items for Laporan dan Penanganan */}
                  {(!isSidebarCollapsed && isTindakanSubmenuOpen) && (
                    <div className="ml-3 pl-2.5 space-y-0.5 border-l border-[#202B3B] my-0.5">
                      {/* Rekayasa Lalu Lintas */}
                      {(() => {
                        const isActive = activeNav === 'TINDAKAN_REKAYASA';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('TINDAKAN_REKAYASA');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="Rekayasa Lalu Lintas"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <Navigation className={getSubnavIconClass(isActive)} />
                            <span className="truncate">Rekayasa Lalu Lintas</span>
                          </button>
                        );
                      })()}

                      {/* Peringatan */}
                      {(() => {
                        const isActive = activeNav === 'TINDAKAN_PERINGATAN';
                        return (
                          <button
                            onClick={() => {
                              setActiveNav('TINDAKAN_PERINGATAN');
                              setIsMobileSidebarOpen(false);
                            }}
                            title="Peringatan"
                            className={getSubnavItemClass(isActive)}
                          >
                            {isActive && <span className="absolute left-1 top-2 bottom-2 w-[2px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                            <AlertTriangle className={getSubnavIconClass(isActive)} />
                            <span className="truncate">Peringatan</span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* PINN — Analysis Workspace (M.O; F.E where RBAC allows: VIEW_PINN_WORKSPACE) */}
                {can(currentAccount.role, 'VIEW_PINN_WORKSPACE') && (() => {
                  const isActive = routerLocation.path.startsWith('/operations/pinn/');
                  return (
                    <button
                      onClick={() => {
                        navigateTo('operationsPinn');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="PINN — Analisis"
                      data-testid="nav-pinn"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <LayersIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">PINN</span>
                          <span className="text-[10px] font-semibold bg-[#18243A] text-[#9AA8BC] border border-[#202B3B] px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none">Analisis</span>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 5. TIM DAN TUGAS */}
                {(() => {
                  const isActive = activeNav === 'SPK_ORDERS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('SPK_ORDERS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Tim dan Tugas"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <Users className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">Tim dan Tugas</span>
                          {operationsDue > 0 && (
                            <span className="text-[10px] font-semibold tabular-nums bg-[#18243A] text-[#E8B52B] border border-[#202B3B] px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none" title="Laporan yang menunggu tindakan Anda">
                              {operationsDue}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 6. LAPORAN KINERJA */}
                {(() => {
                  const isActive = activeNav === 'REPORTS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('REPORTS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Laporan Kinerja"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <FileText className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Laporan Kinerja</span>}
                    </button>
                  );
                })()}
              </>
            ) : isFieldEngineer ? (
              <>
                {/* 1. DASHBOARD (Field Engineer) */}
                {(() => {
                  const isActive = activeNav === 'DASHBOARD';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('DASHBOARD');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Dashboard"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <LayoutDashboard className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">Dashboard</span>
                          <span className="text-[10px] font-semibold tracking-wide bg-[#18243A] text-[#50A878] border border-[#50A878]/30 px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none">
                            Live
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 2. MAPS & RUAS JALAN (Field Engineer) */}
                {(() => {
                  const isActive = activeNav === 'MAP';
                  return (
                    <button
                      onClick={() => {
                        handleNavToMap('MAP');
                      }}
                      title="Maps & Ruas Jalan"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <MapIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Maps & Ruas Jalan</span>}
                    </button>
                  );
                })()}

                {/* PINN — Analysis Workspace (M.O; F.E where RBAC allows: VIEW_PINN_WORKSPACE) */}
                {can(currentAccount.role, 'VIEW_PINN_WORKSPACE') && (() => {
                  const isActive = routerLocation.path.startsWith('/operations/pinn/');
                  return (
                    <button
                      onClick={() => {
                        navigateTo('operationsPinn');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="PINN — Analisis"
                      data-testid="nav-pinn"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <LayersIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">PINN</span>
                          <span className="text-[10px] font-semibold bg-[#18243A] text-[#9AA8BC] border border-[#202B3B] px-1.5 py-0.5 rounded shrink-0 ml-1 leading-none">Analisis</span>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 3. TUGAS & INSPEKSI (Field Engineer) */}
                {(() => {
                  const isActive = activeNav === 'SPK_ORDERS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('SPK_ORDERS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Tugas & Inspeksi"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <ClipboardList className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">Tugas & Inspeksi</span>
                          {fieldTasksDue > 0 && (
                            <span title="Tugas yang menunggu tindakan Anda" className="text-[10px] font-mono font-medium text-[#E8B52B] bg-[#18243A] border border-[#202B3B] px-1.5 py-0.5 rounded-md shrink-0 ml-1 leading-none">
                              {fieldTasksDue}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* 4. ANALISIS PINN (Field Engineer) */}
                {(() => {
                  const isActive = activeNav === 'SIMULATION';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('SIMULATION');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Analisis PINN"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <Cpu className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Analisis PINN</span>}
                    </button>
                  );
                })()}

                {/* 5. RIWAYAT JALAN (Field Engineer) */}
                {(() => {
                  const isActive = activeNav === 'ROAD_HISTORY';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('ROAD_HISTORY');
                        setIsMobileSidebarOpen(false);
                      }}
                      title="Riwayat Jalan"
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[2.5px] rounded-full bg-[#E8B52B] pointer-events-none" />}
                      <History className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">Riwayat Jalan</span>}
                    </button>
                  );
                })()}
              </>
            ) : (
              <>
                {/* 1. PETA (Public / Non-Staff) */}
                {(() => {
                  const isActive = activeNav === 'MAP';
                  return (
                    <button
                      onClick={() => {
                        handleNavToMap('MAP');
                      }}
                      title={t.navMap}
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <MapIcon className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">{t.navMap}</span>}
                    </button>
                  );
                })()}

                {/* 2. LAPORAN (Public) */}
                {(() => {
                  const isActive = activeNav === 'REPORTS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('REPORTS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title={t.navReports}
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <FileText className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">{t.navReports}</span>}
                    </button>
                  );
                })()}

                {/* 3. ANALITIK (Public) */}
                {(() => {
                  const isActive = activeNav === 'ANALYTICS';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('ANALYTICS');
                        setIsMobileSidebarOpen(false);
                      }}
                      title={t.navAnalytics}
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <BarChart2 className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">{t.navAnalytics}</span>}
                    </button>
                  );
                })()}

                {/* 4. SIMULASI PINN (Public) */}
                {(() => {
                  const isActive = activeNav === 'SIMULATION';
                  return (
                    <button
                      onClick={() => {
                        setActiveNav('SIMULATION');
                        setIsMobileSidebarOpen(false);
                      }}
                      title={t.navSimulation}
                      className={getNavItemClass(isActive)}
                    >
                      {isActive && <span className="absolute left-1 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-400 pointer-events-none" />}
                      <Cpu className={getNavIconClass(isActive)} />
                      {!isSidebarCollapsed && <span className="truncate">{t.navSimulation}</span>}
                    </button>
                  );
                })()}

                {/* 5. PENGATURAN (Public) */}
                <button
                  onClick={() => {
                    onOpenSettings();
                    setIsMobileSidebarOpen(false);
                  }}
                  title={t.navSettings}
                  className={getNavItemClass(false)}
                >
                  <Settings className={getNavIconClass(false)} />
                  {!isSidebarCollapsed && <span className="truncate">{t.navSettings}</span>}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Policy Maker and Operations Manager Bottom Assistance & Logout OR Sidebar Collapse Toggle Button */}
        {isPolicyMaker || isOperationsManager ? (
          <div className="pt-3 border-t border-[#202B3B] flex flex-col space-y-1.5 w-full max-w-full">
            {/* Pusat Bantuan 24/7 */}
            <button
              onClick={() => {
                alert(
                  isOperationsManager
                    ? 'Pusat Bantuan Operasional WIM & Dephub siap melayani 24/7 melalui hotline 1500-228 atau email ops-support@dephub.go.id'
                    : 'Pusat bantuan prototipe (DEMO) — kontak resmi belum tersedia.'
                );
              }}
              className={`w-full max-w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
              } min-h-[40px] rounded-xl text-xs font-medium text-[#9AA8BC] hover:text-[#E8EDF5] hover:bg-[#121C2C] border border-transparent transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60`}
              title="Pusat Bantuan 24/7"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Headphones className="w-4 h-4 text-[#9AA8BC] shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Pusat Bantuan</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[11px] font-mono font-medium text-[#9AA8BC] bg-[#121C2C] border border-[#202B3B] px-2 py-0.5 rounded-md shrink-0 leading-none">
                  24/7
                </span>
              )}
            </button>

            {/* Keluar (signed in) or Masuk (anonymous visitor) */}
            <button
              onClick={isAnonymousIdentity ? onOpenLoginModal : onLogout}
              className={`w-full max-w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
              } min-h-[40px] rounded-xl text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60`}
              title={isAnonymousIdentity ? 'Masuk ke Sistem' : 'Keluar'}
            >
              <LogOut className="w-4 h-4 text-rose-400/90 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">{isAnonymousIdentity ? 'Masuk' : 'Keluar'}</span>}
            </button>

            {/* Collapse toggle */}
            <div className="hidden md:flex pt-1 items-center justify-center">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-full max-w-full flex items-center justify-center space-x-1.5 py-2 px-3 min-h-[36px] rounded-xl bg-[#121C2C]/60 hover:bg-[#121C2C] text-[#9AA8BC] hover:text-[#E8EDF5] border border-[#202B3B] transition-all duration-150 text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                title={isSidebarCollapsed ? t.navExpand : t.navCollapse}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 text-[#9AA8BC]" />
                    <span className="truncate">{t.navCollapse}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-[#202B3B] hidden md:flex items-center justify-center w-full max-w-full">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full max-w-full flex items-center justify-center space-x-1.5 py-2 px-3 min-h-[36px] rounded-xl bg-[#121C2C]/60 hover:bg-[#121C2C] text-[#9AA8BC] hover:text-[#E8EDF5] border border-[#202B3B] transition-all duration-150 text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              title={isSidebarCollapsed ? t.navExpand : t.navCollapse}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#9AA8BC]" />
                  <span className="truncate">{t.navCollapse}</span>
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
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-colors duration-200 ${theme === 'dark' ? 'bg-workspace text-ink' : 'bg-slate-100 text-slate-900'}`}>
        {/* GLOBAL FLOATING TOP BAR (Unified for all routes, viewports, and roles) */}
        {/* Phones, public map: the map's own floating header (search, notifications) and the bottom
            tab bar (Map, Reports, Activity, Profile) cover this bar, so it is hidden below md. Staff keep
            it on phones: its menu button is their way to the sidebar. */}
        <div className={isPublicUser && activeNav === 'MAP' && !children && !activeNavigationTask ? 'hidden md:contents' : 'contents'}>
        <GlobalFloatingTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectSegment={(seg) => {
            onSelectSegment(seg);
            setActiveNav('MAP');
            setMapCenterTarget({ coords: seg.coordinates, zoom: 15, timestamp: Date.now() });
          }}
          onSelectReport={(rep) => {
            setSelectedIssueReport(rep);
            setActiveNav('MAP');
            setMapCenterTarget({ coords: rep.coordinates, zoom: 17, timestamp: Date.now() });
            setDetailsTab('COMPARISON');
            setIsDetailsPanelOpen(true);
          }}
          roadSegments={roadSegments}
          communityReports={communityReports}
          language={language}
          onToggleLanguage={() => setLanguage(language === 'id' ? 'en' : 'id')}
          notifications={notifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onToggleNotificationRead={handleToggleNotificationRead}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onViewNotificationReport={(caseId) => {
            const rep = communityReports.find((r) => r.id === caseId);
            if (!rep) return;
            setActiveNav('MAP');
            setMapCenterTarget({ coords: rep.coordinates, zoom: 17, timestamp: Date.now() });
            setSelectedIssueReport(rep);
            setDetailsTab('COMPARISON');
            setIsDetailsPanelOpen(true);
          }}
          currentAccount={currentAccount}
          isAnonymousIdentity={isAnonymousIdentity}
          onOpenLoginModal={onOpenLoginModal}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isPolicyMaker={isPolicyMaker}
          onDownloadPolicyReport={() => {
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
        />
        </div>

        {/* 3. MAIN WORKSPACE / MAP VIEWPORT / ROUTE OUTLET */}
        <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
          {children && !activeNavigationTask ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <UiLanguageContext.Provider value={language}>{children}</UiLanguageContext.Provider>
            </div>
          ) : isPolicyMaker && activeNav === 'DASHBOARD' && !activeNavigationTask ? (
            <PolicyPage policyNavTab={policyNavTab} setPolicyNavTab={setPolicyNavTab} />
          ) : isOperationsManager && OPERATIONS_WORKSPACE_NAVS.includes(activeNav) && !activeNavigationTask ? (
            <OperationsPage activeNav={activeNav} setIsCreateReportModalOpen={setIsCreateReportModalOpen} />
          ) : isFieldEngineer && activeNav === 'DASHBOARD' && !activeNavigationTask ? (
            <EngineeringPage searchQuery={searchQuery} setIsCreateReportModalOpen={setIsCreateReportModalOpen} />
          ) : (isFieldEngineer || isOperationsManager) && activeNav === 'SPK_ORDERS' && !activeNavigationTask ? (
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
                  activeNavigationTask={activeNavigationTask}
                  onCompleteNavigation={handleCompleteNavigation}
                  onCancelNavigation={handleCancelNavigation}
                  onStartNavigationToReport={startNavigation}
                  compact={false}
                  isTabActive={activeNav === 'MAP' || activeNav === 'PETA_POS_WIM'}
                  entryAnimationKey={mapEntryKey}
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
                  activePinCoordinates={customCoordinates}
                  onActivePinChange={(coords) => setCustomCoordinates(coords)}
                  onOpenReportModalWithLocation={(segment, coords) => {
                    const targetSegment = segment || roadSegments[0] || null;
                    if (targetSegment) {
                      setFormSegmentId(targetSegment.id);
                      onSelectSegment(targetSegment);
                    }
                    setCustomCoordinates(coords);
                    setIsCreateReportModalOpen(true);
                  }}
                  onSelectReport={(rep) => {
                    closeMapSheet();
                    const match = matchReportToRoadSegment(rep.coordinates, roadSegments, rep.segmentId);
                    const reportSegment = match.segment ?? roadSegments.find((s) => s.id === rep.segmentId);
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
            <div className="absolute top-[116px] sm:top-[120px] md:top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-amber-400/50 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none max-w-[calc(100vw-3rem)]">
              <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{recenterToastText}</span>
            </div>
          )}

          {/* MOBILE FLOATING TOP HEADER (md:hidden) */}
          {!isFieldEngineer && (
            <div className="md:hidden absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none transition-all">
              {/* Left: Floating User & Location Pill Card */}
              <div
                onClick={() => setIsProfileModalOpen(true)}
                className="pointer-events-auto flex items-center gap-3 bg-white/95 dark:bg-surface/95 border border-white/70 dark:border-white/10 rounded-full py-2 pl-2 pr-4 shadow-xl cursor-pointer active:scale-95 transition-all"
              >
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0"
                />
                <div className="text-left flex flex-col justify-center">
                  {/* Who is signed in: account name, then the role in the same type, regular weight. */}
                  <p className="text-xs font-semibold leading-none text-slate-900 dark:text-white truncate max-w-[150px]">
                    {currentAccount.name}
                  </p>
                  <p className="text-xs font-normal leading-none mt-1 text-brand truncate max-w-[150px]">
                    {isAnonymousAccount(currentAccount) ? currentAccount.title : ROLE_LABELS[currentAccount.role]}
                  </p>
                </div>
              </div>

              {/* Right: Floating Search & Notification Buttons */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setIsQuickSearchModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-surface/95 border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  title="Search location or damage report"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-surface/95 border border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
                  title={t.navAlerts}
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center shadow-md ">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY 1: MAP FILTER PILLS (Floating horizontally below header, edge-to-edge scroll with smooth transparent edge mask) */}
          {!isFieldEngineer && (
            <div className="absolute top-[68px] sm:top-[72px] md:top-4 left-0 right-0 md:left-4 md:right-auto md:w-auto md:max-w-max z-20 pointer-events-auto transition-all">
              <div
                ref={filterScrollRef}
                onScroll={checkFilterScroll}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pl-3 pr-8 sm:pl-4 sm:pr-8 md:px-0 py-1 scroll-smooth touch-pan-x filter-chips-scroll"
                style={filterMaskStyle}
              >
                {/* All Issues */}
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`h-8 px-3 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  <span>{t.filterAll}</span>
                </button>

                {/* Critical */}
                <button
                  onClick={() => setActiveFilter('CRITICAL')}
                  className={`h-8 px-3 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeFilter === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-slate-900/90 text-slate-300 hover:text-rose-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>{t.filterCritical}</span>
                </button>

                {/* Moderate */}
                <button
                  onClick={() => setActiveFilter('MODERATE')}
                  className={`h-8 px-3 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeFilter === 'MODERATE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-900/90 text-slate-300 hover:text-amber-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>{t.filterModerate}</span>
                </button>

                {/* Minor */}
                <button
                  onClick={() => setActiveFilter('MINOR')}
                  className={`h-8 px-3 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border whitespace-nowrap ${
                    activeFilter === 'MINOR'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900/90 text-slate-300 hover:text-emerald-300 border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
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
                className={`w-10 h-10 rounded-xl  border shadow-lg flex items-center justify-center transition-all cursor-pointer ${
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
              className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg flex items-center justify-center transition-all cursor-pointer group active:scale-95"
              title={language === 'en' ? 'My location' : 'Lokasi saya'}
            >
              <Navigation className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            </button>
            <button
              onClick={() => onOpenSettings()}
              className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg flex items-center justify-center transition-all cursor-pointer"
              title="Map Diagnostics"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* OVERLAY 2: FLOATING "ROAD ISSUES NEARBY" CARD (Above bottom nav bar) */}
          {!isFieldEngineer && isNearbyCardExpanded && !isDetailsPanelOpen && !isMapSheetOpen && (
            <div
              ref={nearbySheet.sheetRef as React.RefObject<HTMLDivElement>}
              {...nearbySheet.sheetProps}
              className={`absolute bottom-[104px] sm:bottom-[108px] left-3 right-3 sm:left-4 sm:right-4 sm:max-w-md sm:mx-auto z-20 bg-slate-900/95  border border-slate-800 rounded-2xl px-4 pb-4 pt-2 sm:p-4 shadow-2xl text-slate-200 animate-in fade-in duration-300 pointer-events-auto flex flex-col box-border overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                nearbyCardSize === 'FULL' ? 'h-[78vh]' : 'h-[48vh]'
              } sm:h-auto sm:max-h-[55vh]`}
            >
              {/* Drag handle (phones): pull up for more, down to fold into the pill */}
              <div
                data-sheet-grab
                onClick={() => setNearbyCardSize(nearbyCardSize === 'FULL' ? 'HALF' : 'FULL')}
                className="sm:hidden -mx-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
              >
                <span className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              {/* Card Header & Toggle */}
              <div data-sheet-grab className="touch-none sm:touch-auto flex items-center justify-between border-b border-slate-800 pb-3 mb-2 shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                      {reportsInView.length} {inViewLabel}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium truncate">
                      {inViewCounts.critical} Critical &bull; {inViewCounts.moderate} Moderate &bull; {inViewCounts.minor} Minor
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setIsNearbyCardExpanded(false)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                    title="Collapse card"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-filter chips */}
              <div className="flex items-center gap-2 pb-2 shrink-0 overflow-x-auto no-scrollbar text-xs">
                <button
                  onClick={() => setReportsCardFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  All ({reportsInView.length})
                </button>
                <button
                  onClick={() => setReportsCardFilter('CRITICAL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-rose-300 border-slate-800'
                  }`}
                >
                  Critical ({inViewCounts.critical})
                </button>
                <button
                  onClick={() => setReportsCardFilter('MODERATE')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'MODERATE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-amber-300 border-slate-800'
                  }`}
                >
                  Moderate ({inViewCounts.moderate})
                </button>
                <button
                  onClick={() => setReportsCardFilter('MINOR')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                    reportsCardFilter === 'MINOR'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-emerald-300 border-slate-800'
                  }`}
                >
                  Minor ({inViewCounts.minor})
                </button>
              </div>

              {/* Scrollable list of recent issues */}
              <div data-sheet-scroll className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
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
                            className={`text-xs font-semibold px-2 py-0.2 rounded-md uppercase shrink-0 border ${
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
                        <p className="text-xs text-slate-400 truncate">{rep.segmentName}</p>
                        <div className="flex items-center justify-between mt-1 text-xs text-slate-400 font-mono">
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
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>+ Buat Laporan Kerusakan</span>
                </button>
              </div>
            </div>
          )}

          {/* OVERLAY 3: FLOATING PILL WHEN CARD IS COLLAPSED */}
          {!isFieldEngineer && !isNearbyCardExpanded && !isDetailsPanelOpen && !isMapSheetOpen && (
            <div className="absolute bottom-[104px] sm:bottom-[108px] md:bottom-6 left-3 right-3 sm:left-4 sm:right-4 sm:max-w-xs sm:mx-auto z-20 flex justify-center pointer-events-auto">
              <button
                onClick={() => setIsNearbyCardExpanded(true)}
                className="flex items-center gap-2 bg-slate-900/95 border border-slate-800 rounded-xl py-2 px-4 shadow-lg text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>
                  {showDensity
                    ? `${densityInView.length} ${language === 'en' ? 'user reports in view' : 'laporan pengguna di area ini'}`
                    : `${reportsInView.length} ${inViewLabel}`}
                </span>
                <ChevronUp className="w-4 h-4 text-amber-400" />
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
                onOpenDetail={(seg) => navigateTo('roadDetail', { roadId: seg.id })}
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
            onStartNavigation={startNavigation}
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
              <div className="pointer-events-auto bg-white/95 dark:bg-surface/95 border border-slate-200/90 dark:border-white/15 rounded-full px-5 sm:px-8 py-2 shadow-2xl flex items-center justify-between w-full max-w-sm sm:max-w-md text-slate-400">
                {/* 1. Map Tab */}
                <button
                  onClick={() => {
                    handleNavToMap('MAP');
                    setIsRecentReportsCardOpen(false);
                  }}
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                    activeNav === 'MAP' && !isRecentReportsCardOpen && !isActivityModalOpen && !isProfileModalOpen
                      ? 'text-amber-500 font-semibold scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Peta Utama"
                >
                  <MapIcon className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-tight">Map</span>
                </button>

                {/* 2. Reports Tab */}
                <button
                  onClick={() => {
                    setIsNearbyCardExpanded((prev) => !prev);
                  }}
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                    isNearbyCardExpanded
                      ? 'text-amber-500 font-semibold scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Daftar Laporan Warga"
                >
                  <div className="relative">
                    <FileText className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-[#0e1320]" />
                  </div>
                  <span className="text-xs font-bold tracking-tight">Reports</span>
                </button>

                {/* 3. Camera / Report Action Button (Prominent Center Yellow Elevated Button) */}
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() => setIsCreateReportModalOpen(true)}
                    className="-mt-7 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xl  ring-4 ring-white dark:ring-[#0e1320] border-2 border-amber-200/80 transition-all transform hover:scale-110 active:scale-95 cursor-pointer group"
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
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                    isActivityModalOpen
                      ? 'text-amber-500 font-semibold scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Aktivitas & Audit Penanganan"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-tight">Activity</span>
                </button>

                {/* 5. Profile Tab */}
                <button
                  onClick={() => {
                    setIsProfileModalOpen(true);
                  }}
                  className={`flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                    isProfileModalOpen
                      ? 'text-amber-500 font-semibold scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Profil"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-tight">Profile</span>
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
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/20 rounded-2xl sm:rounded-2xl w-[86vw] sm:w-full max-w-[350px] sm:max-w-lg p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 text-slate-100 max-h-[54vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 font-semibold">
                  <span>✏️</span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-semibold text-white">Edit Laporan Kerusakan</h3>
                  <p className="text-xs sm:text-xs text-cyan-300">Pengguna: {currentAccount.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditReportModalOpen(false)}
                className="p-2 sm:p-2 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReportEdit} className="space-y-3 sm:space-y-4 text-xs">
              {/* Damage Type */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs sm:text-xs">Jenis Kerusakan:</label>
                <select
                  value={editFormData.damageType}
                  onChange={(e) => setEditFormData({ ...editFormData, damageType: e.target.value as DamageType })}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl px-3 py-2 text-xs sm:text-xs focus:outline-none focus:border-amber-400 font-semibold"
                >
                  <option value="POTHOLE">Pothole (Lubang Dalam)</option>
                  <option value="ALLIGATOR_CRACK">Alligator Cracking (Retak Buaya)</option>
                  <option value="RUTTING">Rutting (Ambles & Alur)</option>
                  <option value="CORRUGATION">Corrugation (Bergelombang)</option>
                </select>
              </div>

              {/* Severity & Dimensions */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-xs sm:text-xs truncate block">Keparahan:</label>
                  <select
                    value={editFormData.severity}
                    onChange={(e) => setEditFormData({ ...editFormData, severity: e.target.value as ReportSeverity })}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-2 py-2 text-xs sm:text-xs focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="LIGHT">Minor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-xs sm:text-xs truncate block">Kedalaman (cm):</label>
                  <input
                    type="number"
                    value={editFormData.depth}
                    onChange={(e) => setEditFormData({ ...editFormData, depth: Number(e.target.value) })}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-2 py-2 text-xs sm:text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 text-xs sm:text-xs truncate block">Luas (m²):</label>
                  <input
                    type="number"
                    value={editFormData.area}
                    onChange={(e) => setEditFormData({ ...editFormData, area: Number(e.target.value) })}
                    className="w-full bg-elevated border border-white/15 text-white rounded-xl px-2 py-2 text-xs sm:text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 text-xs sm:text-xs">Deskripsi Kerusakan:</label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-elevated border border-white/15 text-white rounded-xl p-3 text-xs sm:text-xs focus:outline-none focus:border-amber-400 font-sans"
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
                  className="px-4 sm:px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center space-x-1 shadow-lg "
                >
                  <Check className="w-4 h-4" />
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

      

      {/* MODAL: NOTIFICATIONS / ALERTS */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Live System Alerts</h3>
                  <p className="text-xs text-slate-400">Recent road damage alerts & ODOL notifications</p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Critical Pothole Reported
                  </span>
                  <span className="text-xs font-mono text-slate-400">2 min ago</span>
                </div>
                <p className="text-xs text-slate-300">Jl. Sudirman No. 62 &bull; Severe depth ~14 cm affecting left lane.</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-amber-300 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    Overload Truck Violation (+85%)
                  </span>
                  <span className="text-xs font-mono text-slate-400">15 min ago</span>
                </div>
                <p className="text-xs text-slate-300">Stasiun WIM Bintaro Sektor 7 &bull; Truk B 9182 NFD (18.5 Ton).</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Road Patching Completed
                  </span>
                  <span className="text-xs font-mono text-slate-400">1 hr ago</span>
                </div>
                <p className="text-xs text-slate-300">Pantura KM 62+500 &bull; Overlay AC-WC 8.5 cm successfully applied.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOBILE QUICK SEARCH */}
      {isQuickSearchModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-start justify-center p-4 pt-12 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-white/20 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-2xl bg-amber-400 text-slate-950">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cari Lokasi / Kerusakan</h3>
              </div>
              <button
                onClick={() => setIsQuickSearchModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                className="w-full border rounded-2xl pl-10 pr-4 py-3 text-xs bg-slate-50 dark:bg-elevated border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar text-xs">
              <p className="text-xs font-bold text-slate-400 px-1">Pilihan Koridor</p>
              {roadSegments.map((seg) => (
                <div
                  key={seg.id}
                  onClick={() => {
                    onSelectSegment(seg);
                    setIsQuickSearchModalOpen(false);
                  }}
                  className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{seg.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{seg.province} &bull; {seg.conditionCategory}</p>
                  </div>
                  <span className="text-amber-500 font-bold text-xs shrink-0 ml-2">Pilih →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACTIVITY / AUDIT FEED (Mobile Tab 4) */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div ref={activitySheet.sheetRef as React.RefObject<HTMLDivElement>} {...activitySheet.sheetProps} className="bg-white dark:bg-surface border border-slate-200 dark:border-white/20 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[85vh] flex flex-col">
            <div data-sheet-grab className="sm:hidden -mt-2 pb-1 flex justify-center touch-none" aria-hidden="true"><span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" /></div>
            <div data-sheet-grab className="touch-none sm:touch-auto flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-semibold shadow-md ">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Aktivitas & Audit Penanganan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pembaruan realtime laporan dan verifikasi jalan</p>
                </div>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
              {/* Activity item 1 */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Verifikasi AI OpenVINO Selesai
                  </span>
                  <span className="text-xs font-mono text-slate-400">10 mnt lalu</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">Laporan Lubang Dalam di Tol Jakarta-Cikampek KM 47 telah divalidasi dengan confidence 96.8%.</p>
              </div>

              {/* Activity item 2 */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    Penambalan AC-WC Diterapkan
                  </span>
                  <span className="text-xs font-mono text-slate-400">1 jam lalu</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">Contoh (DEMO): tim pemeliharaan menyelesaikan patching di Jl. Tuparev Karawang Barat.</p>
              </div>

              {/* Activity item 3 */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Laporan Kritis Baru
                  </span>
                  <span className="text-xs font-mono text-slate-400">3 jam lalu</span>
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
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                Kembali ke Peta Interaktif
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE & USER DRAWER (Mobile Tab 5) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div ref={profileSheet.sheetRef as React.RefObject<HTMLDivElement>} {...profileSheet.sheetProps} data-sheet-scroll className="bg-white dark:bg-surface border border-slate-200 dark:border-white/20 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col overflow-y-auto">
            <div data-sheet-grab className="sm:hidden -mt-2 pb-1 flex justify-center touch-none" aria-hidden="true"><span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" /></div>
            {/* Header */}
            <div data-sheet-grab className="touch-none sm:touch-auto flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={currentAccount.avatarUrl}
                  alt={currentAccount.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentAccount.name}</h3>
                  <p className="text-xs text-amber-500 font-bold truncate">
                    {ROLE_LABELS[currentAccount.role]} · {currentAccount.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{currentAccount.agency}</p>
                  {!isAnonymousIdentity && (
                    <p className="text-xs font-semibold text-sky-500">Akun demo · identitas fiktif</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Toggles: Language & Dark Mode */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                className="flex items-center justify-center space-x-2 py-3 px-3 rounded-2xl bg-slate-100 dark:bg-elevated border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer active:scale-98 transition-all"
              >
                <span>{language === 'id' ? '🇮🇩 Bahasa' : '🇺🇸 English'}</span>
              </button>
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onOpenSettings();
                }}
                className="flex items-center justify-center space-x-2 py-3 px-3 rounded-2xl bg-slate-100 dark:bg-elevated border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer active:scale-98 transition-all"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{language === 'id' ? 'Pengaturan' : 'Settings'}</span>
              </button>
            </div>

            {/* Quick Action Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 shrink-0 flex gap-2">
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  if (isAnonymousIdentity) onOpenLoginModal();
                  else onLogout();
                }}
                className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                {isAnonymousIdentity ? 'Masuk ke Sistem' : 'Keluar'}
              </button>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
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
