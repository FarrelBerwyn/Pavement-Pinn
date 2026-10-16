import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  X,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  RotateCw,
  Eye,
  ArrowLeft,
  Copy,
  AlertCircle,
  Video,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Zap,
  ZapOff,
  Crosshair,
  Compass
} from 'lucide-react';
import { DamageReport, DamageType, ReportMutationHandler, ReportSeverity, RoadSegment } from '../../types';
import { UserAccount } from '../authentication/demoAccounts';
import { createSessionReport, ReportCreationError } from './reportFactory';
import { settleMutation } from './reportMutations';
import { useSheetDrag } from '../../components/ui/useSheetDrag';
import { CV_DAMAGE_CLASSES, CVDamageClassInfo, analyzeImageDamageClass } from '../../engines/computer-vision/classification/cvDamageClasses';

export type ReportCardState =
  | 'INPUT'
  | 'CAMERA_CAPTURE'
  | 'CAMERA_CONFIRM'
  | 'PREPARING'
  | 'CV_PROCESSING'
  | 'ANALYSIS_RESULT'
  | 'SUCCESS';

interface ReportRoadIssueCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment?: RoadSegment | null;
  onAddReport: ReportMutationHandler;
  onFocusMapLocation?: (coords: [number, number], zoomLevel?: number, reportId?: string) => void;
  initialCoordinates?: [number, number] | null;
}

/* Shared look for every step of the report sheet: solid surface, thin borders, one yellow accent. */
const SHEET =
  'w-full max-h-[90dvh] sm:max-h-[92vh] sm:max-w-lg bg-[#121826] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-3xl px-5 pt-5 pb-3 sm:p-6 shadow-2xl text-slate-100 flex flex-col overflow-y-auto custom-scrollbar relative box-border';
const CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.03]';
const LABEL = 'text-sm font-medium text-slate-200';
const HINT = 'text-xs text-slate-400';
const FIELD =
  'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 transition-colors';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';
const PRIMARY = `w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-60 disabled:cursor-wait text-slate-950 text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer ${FOCUS}`;
const SECONDARY = `w-full h-12 rounded-2xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-100 text-sm font-medium flex items-center justify-center transition-colors cursor-pointer ${FOCUS}`;
const TILE = `${CARD} p-4 flex flex-col items-start gap-1 text-left hover:bg-white/[0.06] hover:border-amber-400/40 transition-colors cursor-pointer ${FOCUS}`;
const ICON_TILE = 'w-10 h-10 mb-1 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center text-lg shrink-0';
const ICON_BUTTON = `w-9 h-9 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer shrink-0 ${FOCUS}`;
const TEXT_BUTTON = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer ${FOCUS}`;
const NOTICE = 'rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200';
const ERROR = 'flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200';
const REPORT_STEPS = 3;

/** Same header on every step: optional back, title + step count, optional close. */
const SheetHeader: React.FC<{ step: number; title: string; subtitle: string; onBack?: () => void; onClose?: () => void }> = ({
  step,
  title,
  subtitle,
  onBack,
  onClose
}) => (
  <div data-sheet-grab className="space-y-3 touch-none sm:touch-auto">
    <div className="mx-auto h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
    <div className="flex items-start gap-2">
      {onBack && (
        <button type="button" onClick={onBack} className={`${ICON_BUTTON} -ml-2`} title="Kembali" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-amber-300">
          Langkah {step} dari {REPORT_STEPS}
        </p>
        <h3 className="text-lg font-semibold text-white leading-tight">{title}</h3>
        <p className={`${HINT} mt-0.5`}>{subtitle}</p>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className={`${ICON_BUTTON} -mr-2`} title="Tutup" aria-label="Tutup">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: REPORT_STEPS }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-amber-400' : 'bg-white/10'}`} />
      ))}
    </div>
  </div>
);


export const ReportRoadIssueCard: React.FC<ReportRoadIssueCardProps> = ({
  isOpen,
  onClose,
  currentAccount,
  roadSegments,
  selectedSegment,
  onAddReport,
  onFocusMapLocation,
  initialCoordinates
}) => {
  // Main State Machine
  const [currentState, setCurrentState] = useState<ReportCardState>('INPUT');

  // Input Fields
  const [notes, setNotes] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('road_photo.jpg');

  // Camera Live Video Stream State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [flashMode, setFlashMode] = useState<'OFF' | 'AUTO' | 'ON'>('AUTO');
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [isCameraFlipping, setIsCameraFlipping] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  /** Camera page: dark until the browser grants access; no stand-in photo is ever shown. */
  const [cameraPermission, setCameraPermission] = useState<'REQUESTING' | 'GRANTED' | 'DENIED' | 'UNSUPPORTED'>('REQUESTING');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Swipe the sheet down to close it (header, or the content when scrolled to the top).
  const { sheetRef, sheetProps } = useSheetDrag({
    mode: 'translate',
    onClose: () => {
      stopCameraStream();
      onClose();
    },
    maxWidth: 639
  });

  // Location State
  const [locationName, setLocationName] = useState<string>('Jl. Sudirman, Karet Tengsin, Jakarta Pusat');
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialCoordinates || selectedSegment?.coordinates || [-6.2150, 106.8220]
  );
  const [locationStatus, setLocationStatus] = useState<'DETECTED' | 'REQUESTING' | 'DENIED' | 'MANUAL'>('DETECTED');

  // Validation Error
  const [validationError, setValidationError] = useState<string | null>(null);

  // CV Processing State
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processingStageText, setProcessingStageText] = useState<string>('✨ Processing image');

  // CV Analysis Result
  const [analyzedClass, setAnalyzedClass] = useState<CVDamageClassInfo>(CV_DAMAGE_CLASSES.pothole);
  const [customSeverity, setCustomSeverity] = useState<ReportSeverity | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showTechnicalAnalysis, setShowTechnicalAnalysis] = useState<boolean>(false);

  // Success Created Report
  const [createdReportId, setCreatedReportId] = useState<string>('');
  // Submission waits for the workflow store; success is shown only after it saved the report.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Sync initial coordinates or segment
  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
      if (selectedSegment) {
        setLocationName(`${selectedSegment.name}, ${selectedSegment.province}`);
      } else {
        setLocationName(`Jl. Sudirman, Karet Tengsin, Jakarta Pusat`);
      }
      setLocationStatus('DETECTED');
    } else if (selectedSegment) {
      setCoordinates(selectedSegment.coordinates);
      setLocationName(`${selectedSegment.name}, ${selectedSegment.province}`);
      setLocationStatus('DETECTED');
    }
  }, [initialCoordinates, selectedSegment]);

  // Request user GPS on open
  useEffect(() => {
    if (isOpen && !initialCoordinates && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates([pos.coords.latitude, pos.coords.longitude]);
          setLocationStatus('DETECTED');
        },
        (err) => {
          console.warn('Geolocation notice:', err.message);
          setLocationStatus('DETECTED');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [isOpen]);

  // Manual GPS re-detect function
  const handleDetectGps = () => {
    if (navigator.geolocation) {
      setLocationStatus('REQUESTING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoordinates([lat, lng]);
          setLocationStatus('DETECTED');
          if (!locationName || locationName.startsWith('Lokasi Koordinat')) {
            setLocationName(`Jl. Sudirman, Karet Tengsin, Jakarta Pusat`);
          }
        },
        (err) => {
          console.warn('GPS error:', err);
          setLocationStatus('DENIED');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Stop camera stream when component closes or unmounts
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Open Full-screen Camera Page
  /** Ask for the camera (the browser shows its permission prompt) and start the stream. */
  const requestCameraStream = async (facing: 'environment' | 'user') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermission('UNSUPPORTED');
      setIsCameraActive(false);
      return;
    }
    setCameraPermission('REQUESTING');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      mediaStreamRef.current = stream;
      setCameraPermission('GRANTED');
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera not available:', err);
      setCameraPermission('DENIED');
      setIsCameraActive(false);
    }
  };

  // Open Full-screen Camera Page: dark page, permission prompt, then live camera
  const handleOpenFullscreenCamera = async () => {
    setValidationError(null);
    setCameraError(null);
    setCurrentState('CAMERA_CAPTURE');
    await requestCameraStream(cameraFacing);
  };

  // Attach the stream once the <video> element is on screen.
  useEffect(() => {
    const video = videoRef.current;
    if (currentState === 'CAMERA_CAPTURE' && isCameraActive && video && mediaStreamRef.current) {
      video.srcObject = mediaStreamRef.current;
      video.play().catch(() => undefined);
    }
  }, [currentState, isCameraActive]);

  // If access was blocked and the user allows it later in the browser, open the camera right away.
  useEffect(() => {
    if (currentState !== 'CAMERA_CAPTURE' || cameraPermission !== 'DENIED' || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (status?.state === 'granted') requestCameraStream(cameraFacing);
    };
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((st) => {
        status = st;
        st.addEventListener('change', onChange);
      })
      .catch(() => undefined);
    return () => status?.removeEventListener('change', onChange);
  }, [currentState, cameraPermission, cameraFacing]);

  // Switch / Flip Front & Back Camera
  const handleFlipCamera = async () => {
    setIsCameraFlipping(true);
    setTimeout(() => setIsCameraFlipping(false), 500);

    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);

    stopCameraStream();
    await requestCameraStream(nextFacing);
  };

  // Toggle Flash Mode
  const handleToggleFlash = () => {
    if (flashMode === 'AUTO') setFlashMode('ON');
    else if (flashMode === 'ON') setFlashMode('OFF');
    else setFlashMode('AUTO');
  };

  // Capture photo from live camera or high-res road snapshot -> Now prompts confirmation
  const handleCapturePhoto = () => {
    // Only a real camera frame can become evidence; there is no stand-in photo.
    const video = videoRef.current;
    if (!video || !isCameraActive || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capturedUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Trigger shutter screen flash animation
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 180);

    setSelectedImage(capturedUrl);
    setImageFileName(`road_capture_${Date.now().toString().slice(-4)}.jpg`);
    stopCameraStream();
    setValidationError(null);

    // Pre-calculate analyzed damage class
    const resultClass = analyzeImageDamageClass(capturedUrl);
    setAnalyzedClass(resultClass);

    // Show Confirmation Screen before proceeding to AI processing
    setTimeout(() => {
      setCurrentState('CAMERA_CONFIRM');
    }, 200);
  };

  // User confirms captured photo -> proceed to AI Processing
  const handleConfirmCapturedPhoto = () => {
    startAiProcessing();
  };

  // User retakes photo -> back to camera capture
  const handleRetakeCapturedPhoto = () => {
    setSelectedImage(null);
    handleOpenFullscreenCamera();
  };

  // Start AI Processing Sequence
  const startAiProcessing = () => {
    setCurrentState('PREPARING');
    setTimeout(() => {
      setCurrentState('CV_PROCESSING');
      setProgressPercent(10);
      setProcessingStageText('✨ Processing image');

      // Stage 1: 0 - 25%
      setTimeout(() => {
        setProgressPercent(30);
        setProcessingStageText('✨ Detecting road damage');
      }, 400);

      // Stage 2: 25 - 55%
      setTimeout(() => {
        setProgressPercent(65);
        setProcessingStageText('✨ Classifying damage severity');
      }, 950);

      // Stage 3: 55 - 80%
      setTimeout(() => {
        setProgressPercent(90);
        setProcessingStageText('✨ Finalizing AI assessment');
      }, 1500);

      // Stage 4: 100% Complete
      setTimeout(() => {
        setProgressPercent(100);
        setProcessingStageText('✓ Analysis complete');

        setTimeout(() => {
          setCurrentState('ANALYSIS_RESULT');
        }, 500);
      }, 2100);
    }, 400);
  };

  // Handle image file selection from gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setSelectedImage(dataUrl);
          setValidationError(null);
          stopCameraStream();

          // Analyze and process
          const resultClass = analyzeImageDamageClass(dataUrl);
          setAnalyzedClass(resultClass);
          startAiProcessing();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const handleReset = () => {
    stopCameraStream();
    setCurrentState('INPUT');
    setNotes('');
    setSelectedImage(null);
    setValidationError(null);
    setProgressPercent(0);
    setShowTechnicalAnalysis(false);
  };

  // Trigger Validation and Advance to CV Processing from manual input
  const handleContinue = () => {
    if (!locationName.trim()) {
      setValidationError('Mohon masukkan detail lokasi kerusakan jalan.');
      return;
    }
    if (!selectedImage) {
      setValidationError('Mohon ambil foto atau unggah gambar kerusakan.');
      return;
    }
    setValidationError(null);

    const resultClass = analyzeImageDamageClass(selectedImage);
    setAnalyzedClass(resultClass);
    startAiProcessing();
  };

  // Preview on Map
  const handleViewOnMap = () => {
    if (onFocusMapLocation) {
      onFocusMapLocation(coordinates, 15);
    }
  };

  // Submit Final Report
  const handleSubmitReport = async () => {
    if (isSubmitting) return;
    const targetSeg =
      roadSegments.find((s) => {
        const dist = Math.hypot(s.coordinates[0] - coordinates[0], s.coordinates[1] - coordinates[1]);
        return dist < 0.25;
      }) || roadSegments[0];

    const effectiveSeverity: ReportSeverity = customSeverity || analyzedClass.defaultSeverity;

    let newReport: DamageReport;
    try {
      newReport = createSessionReport({
      reporterName: currentAccount.name,
      reporterRole: currentAccount.role === 'PUBLIC_REPORTER' ? 'Public Reporter' : 'Citizen User',
      reporterAvatar: currentAccount.avatarUrl,
      timestamp: new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      segmentId: targetSeg.id,
      segmentName: locationName.split(',')[0] || targetSeg.name,
      corridor: targetSeg.corridor || 'Koridor Jalan Nasional',
      province: targetSeg.province || 'DKI Jakarta',
      coordinates: coordinates,
      damageType: analyzedClass.damageType,
      damageTypeLabel: analyzedClass.label,
      severity: effectiveSeverity,
      estimatedDepthCm: analyzedClass.defaultDepthCm,
      estimatedAreaM2: analyzedClass.defaultAreaM2,
      photoUrl: selectedImage || analyzedClass.samplePhotoUrl,
      description: notes.trim() || `Laporan kerusakan jalan (${analyzedClass.label}) dari warga.`,
      upvotesCount: 1,
      userUpvoted: true,
      aiAnalysis: {
        class: analyzedClass.modelClass,
        label: analyzedClass.label,
        icon: analyzedClass.icon,
        // No trained detector exists yet (Module C). The class is the reporter-facing
        // guess; confidence stays null until a versioned model produces it (F-05).
        confidence: null,
        modelStatus: 'NOT_CLASSIFIED',
        severity: effectiveSeverity.toLowerCase(),
        characteristics: analyzedClass.characteristics
      },
      }, currentAccount);
    } catch (error) {
      if (error instanceof ReportCreationError) {
        alert(error.message);
        return;
      }
      throw error;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const outcome = await settleMutation(onAddReport(newReport), newReport);
    setIsSubmitting(false);
    if (outcome.ok === false) {
      setSubmitError((outcome as { error: string }).error);
      return;
    }
    const saved = (outcome as { report: DamageReport }).report;
    setCreatedReportId(saved.id);
    setSavedState(saved.workflowState ?? null);
    setCurrentState('SUCCESS');
  };

  // Copy report ID
  const handleCopyReportId = () => {
    navigator.clipboard.writeText(createdReportId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  // Derive location title and subtitle cleanly
  const locationParts = locationName.split(',');
  const mainRoadName = locationParts[0]?.trim() || selectedSegment?.name || 'Jl. Sudirman';
  const subLocationName =
    locationParts.slice(1).join(',').trim() ||
    (selectedSegment ? `${selectedSegment.corridor}, ${selectedSegment.province}` : 'Karet Tengsin, Jakarta Pusat');

  const effectiveSeverity: ReportSeverity = customSeverity || analyzedClass.defaultSeverity;

  return (
    <>
      {/* Hidden File Input for Gallery Pick */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* FULLSCREEN CAMERA CAPTURE PAGE (EXACT MATCH WITH USER REFERENCE IMAGE 2)   */}
      {/* ========================================================================= */}
      {currentState === 'CAMERA_CAPTURE' ? (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
          {/* Shutter Screen Flash Animation Overlay */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white z-[2100] pointer-events-none transition-opacity duration-150" />
          )}

          {/* Live camera feed on a dark page; nothing else is shown until access is granted */}
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-[#0B0F17]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? '' : 'hidden'}`}
            />

            {/* Viewfinder Center Reticle (Subtle Framing Corners) */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isCameraActive ? '' : 'hidden'}`}>
              <div className="w-64 h-64 sm:w-80 sm:h-80 border border-white/20 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40 animate-ping" />
                </div>
              </div>
            </div>
          </div>

          {/* Permission state on the dark page (no stand-in image) */}
          {!isCameraActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-8 text-center" role="status">
              <span className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </span>
              {cameraPermission === 'REQUESTING' ? (
                <>
                  <p className="text-sm font-medium text-white">Meminta izin kamera…</p>
                  <p className="text-xs text-slate-400">Pilih “Izinkan” pada pesan browser untuk membuka kamera.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">
                    {cameraPermission === 'UNSUPPORTED' ? 'Kamera tidak didukung di browser ini' : 'Akses kamera belum diizinkan'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {cameraPermission === 'UNSUPPORTED'
                      ? 'Pilih foto dari galeri sebagai gantinya.'
                      : 'Izinkan kamera di pengaturan browser; kamera akan langsung terbuka. Atau pilih foto dari galeri.'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    {cameraPermission === 'DENIED' && (
                      <button
                        type="button"
                        onClick={() => requestCameraStream(cameraFacing)}
                        className="h-10 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold cursor-pointer"
                      >
                        Coba lagi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 px-4 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-medium cursor-pointer"
                    >
                      Pilih dari galeri
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TOP BAR OVERLAY: < Chevron Left, "Report Road Issue", Flash / AI Toggle */}
          <div className="relative z-30 pt-safe pt-4 px-4 sm:px-6 flex items-center justify-between">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setCurrentState('INPUT');
              }}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all cursor-pointer border border-white/10"
              title="Back"
            >
              <ChevronLeft className="w-6 h-6 text-white stroke-[2.5]" />
            </button>

            {/* Title */}
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight drop-shadow-md text-center">
              Report Road Issue
            </h2>

            {/* Flash / Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleFlash}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all cursor-pointer border border-white/10"
              title={`Flash Mode: ${flashMode}`}
            >
              {flashMode === 'ON' ? (
                <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
              ) : flashMode === 'AUTO' ? (
                <Sparkles className="w-5 h-5 text-amber-300" />
              ) : (
                <ZapOff className="w-5 h-5 text-white/80" />
              )}
            </button>
          </div>

          {/* BOTTOM CONTROLS OVERLAY: Shutter Controls + Floating Location Card */}
          <div className="relative z-30 pb-safe pb-6 px-4 sm:px-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-12">
            {/* 1. Shutter Control Row: Gallery (Left) - Shutter (Center) - Flip (Right) */}
            <div className="w-full max-w-sm flex items-center justify-between px-6 sm:px-10">
              {/* Left: Gallery / Pick Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all cursor-pointer shadow-lg"
                title="Pilih dari Galeri"
              >
                <ImageIcon className="w-5 h-5 text-white" />
              </button>

              {/* Center: Camera Shutter Button */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraActive}
                className="w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center p-1 cursor-pointer active:scale-90 transition-transform shadow-2xl group disabled:opacity-30 disabled:cursor-not-allowed"
                title="Ambil Foto Kerusakan Jalan"
              >
                <div className="w-full h-full bg-white rounded-full transition-all group-hover:scale-95 group-active:scale-90 shadow-md" />
              </button>

              {/* Right: Flip Camera Button */}
              <button
                type="button"
                onClick={handleFlipCamera}
                className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all cursor-pointer shadow-lg"
                title="Balik Kamera"
              >
                <RotateCw
                  className={`w-5 h-5 text-white transition-transform duration-500 ${
                    isCameraFlipping ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* 2. Floating Location Pill (Exact match with Reference Image 2) */}
            <div className="w-full max-w-md bg-black/65 backdrop-blur-2xl border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl text-left">
              {/* Left Pin Icon */}
              <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>

              {/* Center Road Name & Subtitle */}
              <div className="min-w-0 flex-1 px-3">
                <h4 className="text-sm font-bold text-white leading-tight truncate">
                  {mainRoadName}
                </h4>
                <p className="text-[11px] text-white/70 leading-tight mt-0.5 truncate">
                  {subLocationName}
                </p>
              </div>

              {/* Right GPS Crosshair Button */}
              <button
                type="button"
                onClick={handleDetectGps}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
                title="Perbarui GPS"
              >
                <Crosshair
                  className={`w-4 h-4 ${
                    locationStatus === 'REQUESTING' ? 'animate-spin text-amber-300' : 'text-white'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      ) : currentState === 'CAMERA_CONFIRM' ? (
        /* ========================================================================= */
        /* FULLSCREEN PHOTO CONFIRMATION PAGE (Retake / Capture Ulang VS Lanjutkan)   */
        /* ========================================================================= */
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
          {/* Captured Road Photo Fullscreen View */}
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-950 flex items-center justify-center">
            <img
              src={selectedImage || CV_DAMAGE_CLASSES.pothole.samplePhotoUrl}
              alt="Hasil Tangkapan Kamera"
              className="w-full h-full object-cover"
            />
            {/* Subtle Gradient Overlay for Top and Bottom readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
          </div>

          {/* TOP BAR: Back Button & Confirmation Status */}
          <div className="relative z-30 pt-safe pt-4 px-4 sm:px-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRetakeCapturedPhoto}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all cursor-pointer border border-white/15"
              title="Capture Ulang"
            >
              <ChevronLeft className="w-6 h-6 text-white stroke-[2.5]" />
            </button>

            <div className="text-center">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight drop-shadow-md">
                Konfirmasi Foto
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium drop-shadow">
                Pastikan kerusakan terlihat jelas
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* BOTTOM BAR: Location Badge & 2 Action Buttons (Capture Ulang vs Lanjutkan) */}
          <div className="relative z-30 pb-safe pb-6 px-4 sm:px-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8">
            {/* Location preview badge */}
            <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-2.5 flex items-center space-x-2.5 text-left">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">{mainRoadName}</p>
                <p className="text-[10px] text-slate-300 truncate leading-tight mt-0.5">{subLocationName}</p>
              </div>
            </div>

            {/* 2 Big Action Buttons: Capture Ulang & Lanjutkan Proses */}
            <div className="w-full max-w-md grid grid-cols-2 gap-3">
              {/* Retake Button */}
              <button
                type="button"
                onClick={handleRetakeCapturedPhoto}
                className="h-12 px-4 rounded-2xl bg-black/40 hover:bg-black/55 text-white font-medium text-sm flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/20 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-white" />
                <span>Ulangi</span>
              </button>

              {/* Confirm / Continue Button */}
              <button
                type="button"
                onClick={handleConfirmCapturedPhoto}
                className="h-12 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Lanjutkan</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* BOTTOM SHEET (INPUT, PREPARING, CV_PROCESSING, REVIEW, SUCCESS)            */
        /* One calm style for every step: solid surface, thin borders, yellow accent  */
        /* ========================================================================= */
        <div className="fixed inset-0 z-[1500] bg-black/50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          {/* Backdrop click closes the sheet */}
          <div
            className="fixed inset-0 -z-10 cursor-pointer"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
          />

          <div ref={sheetRef as React.RefObject<HTMLDivElement>} {...sheetProps} data-sheet-scroll className={SHEET}>
            {/* ========================================================================= */}
            {/* STEP 1: INPUT REPORT (notes, photo, location)                             */}
            {/* ========================================================================= */}
            {currentState === 'INPUT' && (
              <div className="space-y-5 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <SheetHeader
                    step={1}
                    title="Report Road Issue"
                    subtitle="Foto, lokasi, dan catatan singkat"
                    onClose={() => {
                      stopCameraStream();
                      onClose();
                    }}
                  />

                  {/* 1. Notes */}
                  <div className="space-y-2">
                    <label htmlFor="report-notes" className="flex items-center justify-between">
                      <span className={LABEL}>Catatan</span>
                      <span className={HINT}>Opsional</span>
                    </label>
                    <textarea
                      id="report-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: lubang cukup dalam di lajur kiri"
                      className={`${FIELD} resize-none`}
                    />
                  </div>

                  {/* 2. Evidence photo */}
                  <div className="space-y-2">
                    <p className={LABEL}>Foto kerusakan</p>

                    {selectedImage ? (
                      <div className={`${CARD} overflow-hidden`}>
                        <img src={selectedImage} alt="Foto kerusakan yang dipilih" className="w-full h-40 sm:h-48 object-cover" />
                        <div className="flex items-center justify-between gap-2 px-4 py-3">
                          <span className="flex items-center gap-2 min-w-0 text-sm text-slate-200">
                            <Check className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="truncate">{imageFileName}</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={handleOpenFullscreenCamera} className={TEXT_BUTTON}>
                              Ulangi
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className={TEXT_BUTTON}>
                              Galeri
                            </button>
                            <button type="button" onClick={() => setSelectedImage(null)} className={ICON_BUTTON} title="Hapus foto" aria-label="Hapus foto">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={handleOpenFullscreenCamera} className={TILE}>
                          <span className={ICON_TILE}>
                            <Camera className="w-5 h-5" />
                          </span>
                          <span className="text-sm font-medium text-white">Ambil foto</span>
                          <span className={HINT}>Kamera perangkat</span>
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={TILE}>
                          <span className={ICON_TILE}>
                            <ImageIcon className="w-5 h-5" />
                          </span>
                          <span className="text-sm font-medium text-white">Pilih gambar</span>
                          <span className={HINT}>Dari galeri</span>
                        </button>
                      </div>
                    )}

                    {cameraError && <p className={NOTICE}>{cameraError}</p>}
                  </div>

                  {/* 3. Location */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="report-location" className={LABEL}>Lokasi</label>
                      <button type="button" onClick={handleDetectGps} className={TEXT_BUTTON} title="Deteksi ulang GPS">
                        <Crosshair className={`w-4 h-4 ${locationStatus === 'REQUESTING' ? 'animate-spin' : ''}`} />
                        <span>Perbarui GPS</span>
                      </button>
                    </div>
                    <div className={`${CARD} flex items-center gap-3 px-4 py-3`}>
                      <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <input
                          id="report-location"
                          type="text"
                          value={locationName}
                          onChange={(e) => {
                            setLocationName(e.target.value);
                            setLocationStatus('MANUAL');
                          }}
                          placeholder="Nama jalan atau patokan"
                          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        />
                        <p className={`${HINT} font-mono mt-0.5`}>
                          {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)} ·{' '}
                          {locationStatus === 'DETECTED' ? 'GPS aktif' : locationStatus === 'REQUESTING' ? 'mencari…' : 'manual'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {validationError && (
                    <p role="alert" className={ERROR}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{validationError}</span>
                    </p>
                  )}
                </div>

                <div className="pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <button type="button" onClick={handleContinue} className={PRIMARY}>
                    Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: PREPARING & PHOTO CHECK                                            */}
            {/* ========================================================================= */}
            {(currentState === 'PREPARING' || currentState === 'CV_PROCESSING') && (
              <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
                <SheetHeader step={2} title="Memeriksa foto" subtitle="Biasanya hanya beberapa detik" />
                <div className={`${CARD} p-4 space-y-3`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-200 truncate pr-3">{processingStageText}</span>
                    <span className="font-mono text-slate-300">{progressPercent}%</span>
                  </div>
                  <div
                    className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className={`${HINT} truncate`}>{imageFileName}</p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: REVIEW & SUBMIT                                                    */}
            {/* ========================================================================= */}
            {currentState === 'ANALYSIS_RESULT' && (
              <div className="space-y-5 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <SheetHeader
                    step={3}
                    title="Periksa laporan"
                    subtitle="Pastikan jenis dan lokasinya benar"
                    onBack={() => setCurrentState('INPUT')}
                    onClose={() => {
                      stopCameraStream();
                      onClose();
                    }}
                  />

                  <div className={`${CARD} overflow-hidden`}>
                    <img
                      src={selectedImage || analyzedClass.samplePhotoUrl}
                      alt="Foto kerusakan jalan"
                      className="w-full aspect-[16/9] object-cover"
                    />
                  </div>

                  {/* Damage type (not yet classified by a trained model) */}
                  <div className="space-y-2">
                    <p className={LABEL}>Jenis kerusakan</p>
                    <div className={CARD}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className={ICON_TILE} aria-hidden="true">{analyzedClass.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{analyzedClass.label}</p>
                          <p className={HINT}>Perkiraan; belum diklasifikasi model</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTechnicalAnalysis(!showTechnicalAnalysis)}
                          className={ICON_BUTTON}
                          aria-expanded={showTechnicalAnalysis}
                          title="Detail"
                          aria-label="Detail jenis kerusakan"
                        >
                          {showTechnicalAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {showTechnicalAnalysis && (
                        <dl className="border-t border-white/[0.06] px-4 py-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">Model</dt>
                            <dd className="text-slate-200 text-right">Belum ada model terlatih (DEMO)</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">Ukuran contoh</dt>
                            <dd className="text-slate-200 text-right">
                              {analyzedClass.defaultDepthCm} cm · {analyzedClass.defaultAreaM2} m²
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="space-y-2">
                    <p className={LABEL}>Tingkat keparahan</p>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tingkat keparahan">
                      {([
                        ['LIGHT', 'Ringan'],
                        ['MODERATE', 'Sedang'],
                        ['CRITICAL', 'Parah']
                      ] as const).map(([value, label]) => {
                        const active = value === 'CRITICAL' ? effectiveSeverity === 'CRITICAL' || effectiveSeverity === 'SEVERE' : effectiveSeverity === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setCustomSeverity(value)}
                            className={`h-11 rounded-2xl text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                              active ? 'bg-amber-400 text-slate-950 font-semibold' : 'border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <p className={LABEL}>Lokasi</p>
                    <button type="button" onClick={handleViewOnMap} className={`${CARD} w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] transition-colors cursor-pointer`}>
                      <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white truncate">{mainRoadName}</span>
                        <span className={`${HINT} block truncate`}>
                          {locationName || `${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label htmlFor="report-notes-review" className="flex items-center justify-between">
                      <span className={LABEL}>Catatan</span>
                      <span className={HINT}>Opsional</span>
                    </label>
                    <textarea
                      id="report-notes-review"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: lubang besar, memengaruhi lajur kiri"
                      className={`${FIELD} resize-none`}
                    />
                  </div>
                </div>

                <div className="pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-3">
                  <button type="button" onClick={handleSubmitReport} disabled={isSubmitting} aria-busy={isSubmitting} className={PRIMARY}>
                    {isSubmitting ? 'Mengirim laporan…' : 'Kirim laporan'}
                  </button>
                  {submitError && (
                    <p role="alert" className={ERROR}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Laporan belum tersimpan: {submitError}</span>
                    </p>
                  )}
                  <p className={`${HINT} text-center`}>Laporan diperiksa petugas sebelum ditindaklanjuti.</p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 4: SUBMITTED                                                          */}
            {/* ========================================================================= */}
            {currentState === 'SUCCESS' && (
              <div className="space-y-5 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="pt-2 text-center space-y-3">
                    <span className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 stroke-[2.5]" />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-white">Laporan terkirim</h3>
                      <p className="text-sm text-slate-400">Terima kasih. Laporan Anda sudah ada di peta.</p>
                    </div>
                  </div>

                  <div className={`${CARD} divide-y divide-white/[0.06]`}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className={HINT}>Kode laporan</p>
                        <p className="text-sm font-mono text-amber-300 truncate">{createdReportId}</p>
                      </div>
                      <button type="button" onClick={handleCopyReportId} className={TEXT_BUTTON}>
                        {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedId ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                    <div className="px-4 py-3">
                      <p className={HINT}>Lokasi</p>
                      <p className="text-sm text-white truncate">{mainRoadName}</p>
                      <p className={`${HINT} font-mono`}>
                        {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className={HINT}>Jenis</p>
                        <p className="text-sm text-white truncate">{analyzedClass.label}</p>
                      </div>
                      <span className="rounded-full border border-amber-400/40 px-2.5 py-0.5 text-xs text-amber-300 shrink-0">
                        {savedState === 'NEEDS_REVIEW' ? 'Menunggu peninjauan' : 'Terkirim'}
                      </span>
                    </div>
                  </div>

                  {savedState === 'NEEDS_REVIEW' && (
                    <p className={`${HINT} text-center`}>
                      Klasifikasi foto masih DEMO, jadi petugas memeriksa laporan ini sebelum ditindaklanjuti.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onFocusMapLocation) {
                        onFocusMapLocation(coordinates, 17, createdReportId);
                      }
                      handleReset();
                      onClose();
                    }}
                    className={SECONDARY}
                  >
                    Selesai
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onFocusMapLocation) {
                        onFocusMapLocation(coordinates, 17, createdReportId);
                      }
                      handleReset();
                      onClose();
                    }}
                    className={PRIMARY}
                  >
                    Lihat di peta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
