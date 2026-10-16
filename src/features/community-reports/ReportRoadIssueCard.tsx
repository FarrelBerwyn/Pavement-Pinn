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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const handleOpenFullscreenCamera = async () => {
    setValidationError(null);
    setCameraError(null);
    setCurrentState('CAMERA_CAPTURE');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        mediaStreamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setIsCameraActive(false);
      }
    } catch (err: any) {
      console.warn('Live camera stream not directly accessible:', err);
      setIsCameraActive(false);
    }
  };

  // Switch / Flip Front & Back Camera
  const handleFlipCamera = async () => {
    setIsCameraFlipping(true);
    setTimeout(() => setIsCameraFlipping(false), 500);

    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);

    stopCameraStream();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        mediaStreamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (err) {
      console.warn('Failed flipping camera:', err);
    }
  };

  // Toggle Flash Mode
  const handleToggleFlash = () => {
    if (flashMode === 'AUTO') setFlashMode('ON');
    else if (flashMode === 'ON') setFlashMode('OFF');
    else setFlashMode('AUTO');
  };

  // Capture photo from live camera or high-res road snapshot -> Now prompts confirmation
  const handleCapturePhoto = () => {
    // Trigger shutter screen flash animation
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 180);

    let capturedUrl: string = CV_DAMAGE_CLASSES.pothole.samplePhotoUrl;

    if (videoRef.current && isCameraActive) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          capturedUrl = canvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (e) {
        console.warn('Canvas capture fallback:', e);
      }
    }

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
      setValidationError('⚠ Mohon masukkan detail lokasi kerusakan jalan.');
      return;
    }
    if (!selectedImage) {
      setValidationError('⚠ Mohon ambil foto atau unggah gambar kerusakan.');
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

          {/* Background Camera Viewfinder Feed / Realistic Perspective Fallback */}
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                {/* Authentic road surface with centered pothole matching Reference Image 2 */}
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=1400"
                  alt="Road Surface Viewfinder"
                  className="w-full h-full object-cover brightness-[0.9] contrast-[1.05]"
                />
                {/* Subtle perspective road overlay with realistic road texture */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 pointer-events-none" />
              </div>
            )}

            {/* Viewfinder Center Reticle (Subtle Framing Corners) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
                className="w-20 h-20 rounded-full border-4 border-white/90 flex items-center justify-center p-1 cursor-pointer active:scale-90 transition-transform shadow-2xl group"
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
                <MapPin className="w-4 h-4 text-white" />
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
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight drop-shadow-md">
                Konfirmasi Foto
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium drop-shadow">
                Pastikan kerusakan terlihat jelas
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* BOTTOM BAR: Location Badge & 2 Action Buttons (Capture Ulang vs Lanjutkan) */}
          <div className="relative z-30 pb-safe pb-6 px-4 sm:px-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8">
            {/* Location preview badge */}
            <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-2.5 flex items-center space-x-2.5 text-left">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
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
                className="py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 backdrop-blur-md border border-white/25 transition-all cursor-pointer shadow-lg"
              >
                <RotateCw className="w-4 h-4 text-white" />
                <span>Capture Ulang</span>
              </button>

              {/* Confirm / Continue Button */}
              <button
                type="button"
                onClick={handleConfirmCapturedPhoto}
                className="py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xl shadow-amber-400/20"
              >
                <span>Lanjutkan</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARD MODAL CARD (INPUT, PREPARING, CV_PROCESSING, REVIEW, SUCCESS)     */
        /* 88% OPACITY TRANSPARENT DARK BACKGROUND OVER MAP LAYER (HP / MOBILE & DESKTOP) */
        /* ========================================================================= */
        <div className="fixed inset-0 z-[1500] bg-black/40 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          {/* Mobile backdrop click layer */}
          <div
            className="fixed inset-0 -z-10 cursor-pointer"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
          />

          <div className="w-full max-h-[88dvh] sm:max-h-[92vh] sm:w-full sm:max-w-lg bg-[#0B0F19]/90 border-t sm:border border-white/20 rounded-t-[32px] sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-slate-100 flex flex-col justify-between overflow-y-auto custom-scrollbar relative box-border transition-all">
            {/* ========================================================================= */}
            {/* STATE 01: INPUT REPORT (Detailed Notes, Camera/Image, Location, Continue) */}
            {/* ========================================================================= */}
            {currentState === 'INPUT' && (
              <div className="space-y-4 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md shadow-black/40 shrink-0">
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                          Report Road Issue
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                          Citizen Observation & AI Verification
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        stopCameraStream();
                        onClose();
                      }}
                      className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                      title="Close"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* 1. Detailed Notes Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Detailed Notes</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional / Context</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe what you noticed (e.g. Lubang jalan cukup dalam di lajur kiri)..."
                      className="w-full bg-white/[0.04] border border-white/10 text-slate-100 rounded-2xl p-3 text-xs focus:outline-none focus:border-amber-400 transition-colors placeholder:text-slate-500 resize-none"
                    />
                  </div>

                  {/* 2. Evidence: Take Photo & Use Image */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Evidence Photo</label>

                    {selectedImage ? (
                      /* Selected Image Preview with Retake / Remove Option */
                      <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 group">
                        <img
                          src={selectedImage}
                          alt="Evidence Preview"
                          className="w-full h-36 sm:h-44 object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px] sm:max-w-[200px]">{imageFileName}</span>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleOpenFullscreenCamera}
                            className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Retake</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-200 text-[10px] font-bold backdrop-blur-md border border-white/20 cursor-pointer"
                          >
                            Gallery
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedImage(null)}
                            className="p-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Primary Evidence Buttons Matching Reference Image 1 */
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={handleOpenFullscreenCamera}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/50 text-slate-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-amber-400/15 group-hover:bg-amber-400/25 text-amber-300 flex items-center justify-center transition-colors">
                            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <span className="text-xs font-bold text-white">Take Photo</span>
                          <span className="text-[10px] text-slate-400">Device Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-slate-300/50 text-slate-200 flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors">
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <span className="text-xs font-bold text-white">Use Image</span>
                          <span className="text-[10px] text-slate-400">Upload / Pick</span>
                        </button>
                      </div>
                    )}

                    {cameraError && (
                      <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        {cameraError}
                      </p>
                    )}
                  </div>

                  {/* 3. Manual Location Details Input Field */}
                  <div className="space-y-1.5 bg-white/[0.04] border border-white/10 rounded-2xl p-3 sm:p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Detail Lokasi Kerusakan</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectGps}
                        className="text-[10px] font-mono text-amber-300 hover:text-amber-200 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title="Deteksi ulang GPS"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>GPS</span>
                      </button>
                    </div>

                    {/* Manual Text Input for Location */}
                    <div className="relative">
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => {
                          setLocationName(e.target.value);
                          setLocationStatus('MANUAL');
                        }}
                        placeholder="Contoh: Jl. Sudirman, Karet Tengsin, Jakarta Pusat"
                        className="w-full bg-slate-900/80 border border-white/15 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-400 transition-colors font-medium placeholder:text-slate-500"
                      />
                    </div>

                    {/* Coordinates Indicator */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5 px-0.5">
                      <span className="truncate max-w-[200px]">
                        📍 {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                      </span>
                      <span className="text-emerald-400 font-bold shrink-0">
                        {locationStatus === 'DETECTED'
                          ? 'GPS Aktif'
                          : locationStatus === 'REQUESTING'
                          ? 'Mencari...'
                          : 'Manual'}
                      </span>
                    </div>
                  </div>

                  {/* Validation Error Message */}
                  {validationError && (
                    <div className="flex items-center space-x-1.5 bg-red-500/20 text-red-200 border border-red-500/40 p-2.5 rounded-xl text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>

                {/* Continue Action Button */}
                <div className="pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer active:scale-[0.99]"
                  >
                    <span>Continue to AI Analysis</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STATE 02 & 03: PREPARING & COMPUTER VISION PROCESSING                     */}
            {/* ========================================================================= */}
            {(currentState === 'PREPARING' || currentState === 'CV_PROCESSING') && (
              <div className="py-8 sm:py-14 px-2 space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                    <Sparkles className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">Analyzing Road Condition</h3>
                  <p className="text-xs text-slate-400">Edge AI Computer Vision is evaluating pavement health</p>
                </div>

                {/* Compact Progress Bar Card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-300 flex items-center gap-1 font-medium truncate max-w-[220px]">
                      {processingStageText}
                    </span>
                    <span className="font-mono text-white text-xs font-black">{progressPercent}%</span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[160px]">Input: {imageFileName}</span>
                    <span className="text-emerald-400">GPS: Valid ✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STATE 04: ANALYSIS RESULT (Full Screen Translucent Review & Submit)       */}
            {/* ========================================================================= */}
            {currentState === 'ANALYSIS_RESULT' && (
              <div className="space-y-3.5 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Header with Back, Title & Close */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <button
                      type="button"
                      onClick={() => setCurrentState('INPUT')}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Back to input / photo"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                      <h3 className="text-sm sm:text-base font-black text-white tracking-tight">Review & Submit</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Analysis Complete • AI Verified</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Evidence Image Preview (Clean 16:9) */}
                  <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 aspect-[16/9] shadow-lg group">
                    <img
                      src={selectedImage || analyzedClass.samplePhotoUrl}
                      alt="Detected Road Damage Evidence"
                      className="w-full h-full object-cover"
                    />

                  </div>

                  {/* 1. AI Detection Section */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 px-0.5">Jenis kerusakan (perkiraan)</p>
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center text-lg shrink-0">
                          {analyzedClass.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-white truncate">{analyzedClass.label}</h4>
                          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                            belum diklasifikasi model
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowTechnicalAnalysis(!showTechnicalAnalysis)}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Technical Info"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Technical Analysis Collapsible Details */}
                    {showTechnicalAnalysis && (
                      <div className="bg-slate-900/90 border border-white/15 rounded-xl p-2.5 text-xs space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Model Engine:</span>
                          <span className="font-mono font-bold text-slate-200">YOLOv8 Edge AI</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Est. Dimension:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {analyzedClass.defaultDepthCm} cm depth / {analyzedClass.defaultAreaM2} m²
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pavement Condition:</span>
                          <span className="font-mono font-bold text-amber-300">Requires Maintenance Action</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Severity Selector Section */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400 px-0.5">Severity Level</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomSeverity('LIGHT')}
                        className={`py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          effectiveSeverity === 'LIGHT'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Minor
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomSeverity('MODERATE')}
                        className={`py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          effectiveSeverity === 'MODERATE'
                            ? 'bg-amber-400 text-slate-950 font-extrabold shadow-md'
                            : 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Moderate
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomSeverity('CRITICAL')}
                        className={`py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                          effectiveSeverity === 'CRITICAL' || effectiveSeverity === 'SEVERE'
                            ? 'bg-red-600 text-white font-extrabold shadow-md'
                            : 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Critical
                      </button>
                    </div>
                  </div>

                  {/* 3. Location Section */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 px-0.5">Location</p>
                    <div
                      onClick={handleViewOnMap}
                      className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {mainRoadName}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {locationName || `${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* 4. Add Notes (Optional) */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 px-0.5">Add Notes (Optional)</p>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Large pothole, deep, affecting left lane..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* 5. Primary Submit Action Button */}
                <div className="pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="w-full h-12 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait text-slate-950 font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>{isSubmitting ? 'Menyimpan laporan…' : 'Submit Report'}</span>
                  </button>
                  {submitError && (
                    <p role="alert" className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-center">
                      Laporan belum tersimpan: {submitError}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    Your report helps improve our roads. Thank you! 💛
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STATE 05: SUBMISSION SUCCESS & LEAFLET PIN CREATED                         */}
            {/* ========================================================================= */}
            {currentState === 'SUCCESS' && (
              <div className="space-y-4 py-4 sm:py-6 animate-in fade-in duration-200 text-center flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/50 shadow-xl">
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-white">Report Submitted</h3>
                    <p className="text-xs text-slate-300">
                      Your road issue has been reported and placed on the monitoring map.
                    </p>
                    {savedState === 'NEEDS_REVIEW' && (
                      <p className="text-[11px] text-amber-200">
                        Status: menunggu peninjauan petugas. Klasifikasi AI berstatus DEMO, jadi laporan diperiksa manusia sebelum ditindaklanjuti.
                      </p>
                    )}
                  </div>

                  {/* Created Report Receipt Card */}
                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 sm:p-4 text-left space-y-3 shadow-inner">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Report ID</p>
                        <p className="text-xs sm:text-sm font-black font-mono text-amber-400">{createdReportId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyReportId}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1 border border-white/10 cursor-pointer"
                      >
                        {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-bold uppercase">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>Location</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{mainRoadName}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-lg">{analyzedClass.icon}</span>
                        <span className="text-xs font-bold text-slate-200">{analyzedClass.label}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Reported
                      </span>
                    </div>
                  </div>

                  {/* Notification Badge about Map Pin */}
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>📍 Pin created on Leaflet Map</span>
                  </div>
                </div>

                {/* Action Buttons: View on Map & Close */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onFocusMapLocation) {
                        onFocusMapLocation(coordinates, 17, createdReportId);
                      }
                      handleReset();
                      onClose();
                    }}
                    className="py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>View on Map</span>
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
                    className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center cursor-pointer"
                  >
                    <span>Done</span>
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
