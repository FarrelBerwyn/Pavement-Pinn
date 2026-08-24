import React, { useState, useMemo } from 'react';
import {
  RoadSegment,
  SimulationResult,
  DamageReport
} from '../types';
import { UserAccount } from '../data/userAccounts';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  Eye,
  Camera,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Smartphone,
  Ruler,
  Compass,
  FileSpreadsheet,
  BookOpen,
  Activity,
  HardHat,
  Lightbulb,
  Check,
  X,
  FileDown,
  Cpu,
  MapPin,
  TrendingUp,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { generateOfficialReportPdf } from '../utils/pdfGenerator';
import { runPinnSimulation } from '../utils/pinnEngine';

export interface FieldTaskItem {
  id: string;
  title: string;
  location: string;
  corridor: string;
  segmentId: string;
  kmPost: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  taskType: 'Survei Kerusakan' | 'Inspeksi Rutin' | 'Pengumpulan Data' | 'Dokumentasi' | 'Uji Defleksi FWD';
  method: 'Visual + Instrument' | 'Visual' | 'Deflectometer' | 'Foto' | 'FWD + DCP';
  distanceMeters: number;
  estimatedTimeMinutes: number;
  dueDate?: string;
  createdDate?: string;
  completedDate?: string;
  iconType: 'damage' | 'routine' | 'deflectometer' | 'photo' | 'completed' | 'dcp';
  
  // PINN Engineering Field Data Parameters
  pinnData?: {
    fwdDeflectionD0Micron?: number;
    subgradeCbrPercent?: number;
    asphaltThicknessCm?: number;
    surfaceTempC?: number;
    estimatedAxleLoadTon?: number;
    predictedPci?: number;
    recommendedOverlayCm?: number;
    notes?: string;
    photoUrl?: string;
  };
}

interface MyTasksViewProps {
  currentAccount: UserAccount;
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  simulationResult: SimulationResult | null;
  communityReports: DamageReport[];
  onOpenSimulation?: (segment: RoadSegment) => void;
  onNavigateToMap?: () => void;
  onNavigateToTechnicalRef?: () => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  currentAccount,
  roadSegments,
  selectedSegment,
  onSelectSegment,
  simulationResult,
  communityReports,
  onOpenSimulation,
  onNavigateToMap,
  onNavigateToTechnicalRef
}) => {
  // Initial 7 Tasks exactly mirroring the requested dashboard
  const [tasks, setTasks] = useState<FieldTaskItem[]>([
    {
      id: 'TSK-001',
      title: 'Survei Kerusakan Jalan',
      location: 'Jl. Raya Bogor KM 28+400 - KM 28+800',
      corridor: 'Ciracas, Jakarta Timur',
      segmentId: roadSegments[0]?.id || 'SEG-001',
      kmPost: 'KM 28+400 - KM 28+800',
      status: 'NEW',
      priority: 'HIGH',
      taskType: 'Survei Kerusakan',
      method: 'Visual + Instrument',
      distanceMeters: 400,
      estimatedTimeMinutes: 60,
      dueDate: '12 Mei 2025',
      iconType: 'damage',
      pinnData: {
        fwdDeflectionD0Micron: 520,
        subgradeCbrPercent: 4.5,
        asphaltThicknessCm: 10,
        surfaceTempC: 44,
        estimatedAxleLoadTon: 18.5,
        predictedPci: 42,
        recommendedOverlayCm: 8.5
      }
    },
    {
      id: 'TSK-002',
      title: 'Inspeksi Rutin Jalan',
      location: 'Jl. Tol Jagorawi KM 48+000 - KM 49+000',
      corridor: 'Cibubur, Jawa Barat',
      segmentId: roadSegments[1]?.id || 'SEG-002',
      kmPost: 'KM 48+000 - KM 49+000',
      status: 'NEW',
      priority: 'MEDIUM',
      taskType: 'Inspeksi Rutin',
      method: 'Visual',
      distanceMeters: 1000,
      estimatedTimeMinutes: 45,
      dueDate: '14 Mei 2025',
      iconType: 'routine',
      pinnData: {
        fwdDeflectionD0Micron: 310,
        subgradeCbrPercent: 6.2,
        asphaltThicknessCm: 18,
        surfaceTempC: 38,
        estimatedAxleLoadTon: 12.0,
        predictedPci: 76,
        recommendedOverlayCm: 0
      }
    },
    {
      id: 'TSK-003',
      title: 'Pengumpulan Data Struktur',
      location: 'Jl. Gatot Subroto KM 12+200 - KM 12+700',
      corridor: 'Jakarta Selatan',
      segmentId: roadSegments[2]?.id || 'SEG-003',
      kmPost: 'KM 12+200 - KM 12+700',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      taskType: 'Pengumpulan Data',
      method: 'Deflectometer',
      distanceMeters: 500,
      estimatedTimeMinutes: 90,
      createdDate: '9 Mei 2025',
      iconType: 'deflectometer',
      pinnData: {
        fwdDeflectionD0Micron: 460,
        subgradeCbrPercent: 5.0,
        asphaltThicknessCm: 14,
        surfaceTempC: 41,
        estimatedAxleLoadTon: 16.0,
        predictedPci: 58,
        recommendedOverlayCm: 6.0
      }
    },
    {
      id: 'TSK-004',
      title: 'Foto Kondisi Permukaan',
      location: 'Jl. Daan Mogot KM 15+300 - KM 15+800',
      corridor: 'Jakarta Barat',
      segmentId: roadSegments[3]?.id || 'SEG-004',
      kmPost: 'KM 15+300 - KM 15+800',
      status: 'NEW',
      priority: 'LOW',
      taskType: 'Dokumentasi',
      method: 'Foto',
      distanceMeters: 500,
      estimatedTimeMinutes: 30,
      dueDate: '16 Mei 2025',
      iconType: 'photo',
      pinnData: {
        fwdDeflectionD0Micron: 380,
        subgradeCbrPercent: 5.5,
        asphaltThicknessCm: 12,
        surfaceTempC: 39,
        estimatedAxleLoadTon: 13.5,
        predictedPci: 68,
        recommendedOverlayCm: 4.0
      }
    },
    {
      id: 'TSK-005',
      title: 'Survei Kerusakan Jalan',
      location: 'Jl. Ahmad Yani KM 5+000 - KM 5+500',
      corridor: 'Bekasi, Jawa Barat',
      segmentId: roadSegments[4]?.id || 'SEG-005',
      kmPost: 'KM 5+000 - KM 5+500',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      taskType: 'Survei Kerusakan',
      method: 'Visual',
      distanceMeters: 500,
      estimatedTimeMinutes: 40,
      completedDate: '8 Mei 2025',
      iconType: 'completed',
      pinnData: {
        fwdDeflectionD0Micron: 290,
        subgradeCbrPercent: 6.8,
        asphaltThicknessCm: 16,
        surfaceTempC: 36,
        estimatedAxleLoadTon: 11.5,
        predictedPci: 82,
        recommendedOverlayCm: 0,
        notes: 'Perkerasan masih dalam kategori mantap, retak rambut minor telah ditangani dengan crack sealing.',
        photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600'
      }
    },
    {
      id: 'TSK-006',
      title: 'Uji Lendutan FWD & Dynamic Cone (DCP)',
      location: 'Jalur Pantura KM 62+500 - KM 63+500',
      corridor: 'Karawang Barat, Jawa Barat',
      segmentId: roadSegments[0]?.id || 'SEG-001',
      kmPost: 'KM 62+500 - KM 63+500',
      status: 'NEW',
      priority: 'HIGH',
      taskType: 'Uji Defleksi FWD',
      method: 'FWD + DCP',
      distanceMeters: 1000,
      estimatedTimeMinutes: 120,
      dueDate: '18 Mei 2025',
      iconType: 'dcp',
      pinnData: {
        fwdDeflectionD0Micron: 580,
        subgradeCbrPercent: 3.8,
        asphaltThicknessCm: 9,
        surfaceTempC: 45,
        estimatedAxleLoadTon: 22.0,
        predictedPci: 38,
        recommendedOverlayCm: 10.0
      }
    },
    {
      id: 'TSK-007',
      title: 'Verifikasi Laporan Warga & Kalibrasi PINN',
      location: 'Jl. Interchange Tol Karawang Timur KM 3+200',
      corridor: 'Klari, Karawang',
      segmentId: roadSegments[1]?.id || 'SEG-002',
      kmPost: 'KM 3+200',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      taskType: 'Survei Kerusakan',
      method: 'Visual + Instrument',
      distanceMeters: 300,
      estimatedTimeMinutes: 45,
      createdDate: '10 Mei 2025',
      iconType: 'damage',
      pinnData: {
        fwdDeflectionD0Micron: 490,
        subgradeCbrPercent: 4.8,
        asphaltThicknessCm: 11,
        surfaceTempC: 42,
        estimatedAxleLoadTon: 19.2,
        predictedPci: 46,
        recommendedOverlayCm: 7.5
      }
    }
  ]);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'HIGH_PRIORITY' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'PRIORITY' | 'DISTANCE'>('NEWEST');

  // Modals
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<FieldTaskItem | null>(null);
  const [isTaskActionModalOpen, setIsTaskActionModalOpen] = useState<boolean>(false);
  const [isTaskResultModalOpen, setIsTaskResultModalOpen] = useState<boolean>(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState<boolean>(false);
  const [isQuickGuideModalOpen, setIsQuickGuideModalOpen] = useState<boolean>(false);
  const [selectedGuideTopic, setSelectedGuideTopic] = useState<string>('SURVEY');
  const [isPinnInfoModalOpen, setIsPinnInfoModalOpen] = useState<boolean>(false);

  // Task Execution Form State (Field Engineer PINN Input)
  const [formFwdDeflection, setFormFwdDeflection] = useState<number>(480);
  const [formCbr, setFormCbr] = useState<number>(4.8);
  const [formAsphaltThickness, setFormAsphaltThickness] = useState<number>(10);
  const [formSurfaceTemp, setFormSurfaceTemp] = useState<number>(42);
  const [formAxleLoad, setFormAxleLoad] = useState<number>(18.0);
  const [formEngineerNotes, setFormEngineerNotes] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  // Equipment Checklist State
  const [equipmentList, setEquipmentList] = useState([
    { id: 'eq-1', name: 'Smartphone / Kamera', status: 'Tersedia', icon: Smartphone, ready: true, description: 'Untuk dokumentasi foto geotagged kondisi perkerasan & bounding box AI' },
    { id: 'eq-2', name: 'Meteran / Roll Meter', status: 'Tersedia', icon: Ruler, ready: true, description: 'Pengukuran dimensi panjang, lebar, dan kedalaman lubang jalan' },
    { id: 'eq-3', name: 'Alat Uji Defleksi (FWD)', status: 'Tersedia', icon: Activity, ready: true, description: 'Falling Weight Deflectometer untuk mengukur basin lendutan D0-D1500' },
    { id: 'eq-4', name: 'GPS / GNSS', status: 'Tersedia', icon: Compass, ready: true, description: 'Penentuan koordinat akurat titik STA / KM Post' },
    { id: 'eq-5', name: 'Formulir Survei', status: 'Tersedia', icon: FileSpreadsheet, ready: true, description: 'Lembar kerja standar Bina Marga & formulir parameter fisika PINN' },
    { id: 'eq-6', name: 'Dynamic Cone Penetrometer (DCP)', status: 'Tersedia', icon: Layers, ready: true, description: 'Uji daya dukung dan nilai CBR tanah dasar (subgrade)' }
  ]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search matching
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.corridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskType.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status pill filter
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'NEW') return task.status === 'NEW';
      if (statusFilter === 'IN_PROGRESS') return task.status === 'IN_PROGRESS';
      if (statusFilter === 'HIGH_PRIORITY') return task.priority === 'HIGH';
      if (statusFilter === 'COMPLETED') return task.status === 'COMPLETED';

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'PRIORITY') {
        const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortOrder === 'DISTANCE') {
        return a.distanceMeters - b.distanceMeters;
      }
      return 0;
    });
  }, [tasks, statusFilter, searchQuery, sortOrder]);

  // Statistics calculation
  const totalTasks = tasks.length;
  const highPriorityCount = tasks.filter((t) => t.priority === 'HIGH' && t.status !== 'COMPLETED').length;
  const mediumPriorityCount = tasks.filter((t) => t.priority === 'MEDIUM' && t.status !== 'COMPLETED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const newTasksCount = tasks.filter((t) => t.status === 'NEW').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  
  // Total estimated hours of active tasks
  const totalActiveHours = Number(
    (tasks.filter((t) => t.status !== 'COMPLETED').reduce((acc, curr) => acc + curr.estimatedTimeMinutes, 0) / 60).toFixed(1)
  );

  // Completion percentage
  const completionPercentage = Math.round((completedCount / totalTasks) * 100);

  // Pie chart data for "Ringkasan Tugas"
  const pieData = [
    { name: 'Prioritas Tinggi', value: highPriorityCount, color: '#ef4444' },
    { name: 'Prioritas Sedang', value: mediumPriorityCount, color: '#f59e0b' },
    { name: 'Berjalan', value: inProgressCount, color: '#3b82f6' },
    { name: 'Baru', value: newTasksCount, color: '#94a3b8' },
    { name: 'Selesai', value: completedCount, color: '#10b981' }
  ].filter((d) => d.value > 0);

  // Open Task Action (Mulai / Lanjutkan)
  const handleOpenTaskAction = (task: FieldTaskItem) => {
    setSelectedTaskForAction(task);
    if (task.pinnData) {
      setFormFwdDeflection(task.pinnData.fwdDeflectionD0Micron || 480);
      setFormCbr(task.pinnData.subgradeCbrPercent || 4.8);
      setFormAsphaltThickness(task.pinnData.asphaltThicknessCm || 10);
      setFormSurfaceTemp(task.pinnData.surfaceTempC || 42);
      setFormAxleLoad(task.pinnData.estimatedAxleLoadTon || 18.0);
      setFormEngineerNotes(task.pinnData.notes || '');
    }
    setIsTaskActionModalOpen(true);
  };

  // Open Task Result (Lihat Hasil)
  const handleOpenTaskResult = (task: FieldTaskItem) => {
    setSelectedTaskForAction(task);
    setIsTaskResultModalOpen(true);
  };

  // Submit Task Field Data (Compute PINN & Complete Task)
  const handleCompleteTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForAction) return;

    setIsSubmittingTask(true);

    // Compute PINN physics output with field inputs
    const targetSegment = roadSegments.find((s) => s.id === selectedTaskForAction.segmentId) || selectedSegment;
    const simRes = runPinnSimulation(
      {
        segmentId: targetSegment.id,
        axleLoadTon: formAxleLoad,
        rainIntensityMmHr: 35,
        floodDurationHours: 4,
        surfaceTemperatureC: formSurfaceTemp,
        subgradeCbrPercent: formCbr,
        asphaltThicknessCm: formAsphaltThickness,
        asphaltModulusMpa: 2400,
        targetDevice: 'NPU',
        precisionMode: 'INT8_NNCF'
      },
      targetSegment
    );

    setTimeout(() => {
      // Update Task in list
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === selectedTaskForAction.id) {
            return {
              ...t,
              status: 'COMPLETED',
              completedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              pinnData: {
                fwdDeflectionD0Micron: formFwdDeflection,
                subgradeCbrPercent: formCbr,
                asphaltThicknessCm: formAsphaltThickness,
                surfaceTempC: formSurfaceTemp,
                estimatedAxleLoadTon: formAxleLoad,
                predictedPci: simRes.predictedPci,
                recommendedOverlayCm: simRes.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm,
                notes: formEngineerNotes || 'Survei lapangan dan kalibrasi parameter PINN berhasil diselesaikan.'
              }
            };
          }
          return t;
        })
      );

      setIsSubmittingTask(false);
      setIsTaskActionModalOpen(false);
    }, 600);
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-800 min-h-full font-sans antialiased">
      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-7 h-7 text-emerald-600 shrink-0" />
              <span>Tugas Saya</span>
              <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                {totalTasks} Tugas
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Daftar tugas survei, inspeksi, dan penanganan jalan yang perlu Anda kerjakan.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsPinnInfoModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Info Parameter PINN</span>
            </button>
            <button
              onClick={() => setIsEquipmentModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <HardHat className="w-4 h-4 text-amber-600" />
              <span>Peralatan Survei</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Left Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Status ({totalTasks})
            </button>

            <button
              onClick={() => setStatusFilter('NEW')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'NEW'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Baru ({newTasksCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Berjalan ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('HIGH_PRIORITY')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'HIGH_PRIORITY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Prioritas Tinggi ({highPriorityCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Selesai ({completedCount})</span>
            </button>
          </div>

          {/* Right Controls (Search & Sort) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tugas, ruas, KM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="PRIORITY">Prioritas</option>
              <option value="DISTANCE">Jarak</option>
            </select>
          </div>
        </div>

        {/* Main Content Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: TASK CARDS LIST (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Tidak Ada Tugas yang Sesuai</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tidak ditemukan tugas dengan kriteria filter saat ini. Coba pilih status "Semua Status" atau bersihkan kolom pencarian.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-500 transition-all cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';
                const isInProgress = task.status === 'IN_PROGRESS';
                const isHighPriority = task.priority === 'HIGH';

                // Color configuration matching screenshot exactly
                const getIconStyle = () => {
                  if (task.iconType === 'damage' || task.priority === 'HIGH') {
                    return {
                      bg: 'bg-rose-50 border-rose-200 text-rose-600',
                      badge: 'bg-rose-50 text-rose-700 border-rose-200',
                      badgeLabel: 'Prioritas Tinggi'
                    };
                  }
                  if (task.iconType === 'routine' || task.priority === 'MEDIUM') {
                    return {
                      bg: 'bg-amber-50 border-amber-200 text-amber-600',
                      badge: 'bg-amber-50 text-amber-700 border-amber-200',
                      badgeLabel: 'Prioritas Sedang'
                    };
                  }
                  if (isInProgress) {
                    return {
                      bg: 'bg-blue-50 border-blue-200 text-blue-600',
                      badge: 'bg-blue-50 text-blue-700 border-blue-200',
                      badgeLabel: 'Berjalan'
                    };
                  }
                  if (isCompleted) {
                    return {
                      bg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
                      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      badgeLabel: 'Selesai'
                    };
                  }
                  return {
                    bg: 'bg-slate-100 border-slate-200 text-slate-600',
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                    badgeLabel: 'Baru'
                  };
                };

                const style = getIconStyle();

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-3xl p-5 border transition-all duration-200 hover:shadow-md ${
                      isInProgress
                        ? 'border-blue-300 shadow-sm ring-1 ring-blue-100'
                        : isHighPriority && !isCompleted
                        ? 'border-rose-200 shadow-sm'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left: Icon & Task Meta */}
                      <div className="flex items-start space-x-4 min-w-0 flex-1">
                        {/* Icon Box */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${style.bg}`}>
                          {task.iconType === 'damage' && <AlertTriangle className="w-6 h-6" />}
                          {task.iconType === 'routine' && <ClipboardList className="w-6 h-6" />}
                          {task.iconType === 'deflectometer' && <Activity className="w-6 h-6" />}
                          {task.iconType === 'photo' && <Camera className="w-6 h-6" />}
                          {task.iconType === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                          {task.iconType === 'dcp' && <Layers className="w-6 h-6" />}
                        </div>

                        {/* Title, Address, Date */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                              {style.badgeLabel}
                            </span>
                            {task.pinnData?.fwdDeflectionD0Micron && (
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Cpu className="w-3 h-3 text-indigo-600" />
                                PINN D₀: {task.pinnData.fwdDeflectionD0Micron} µm
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                            {task.title}
                          </h3>

                          <p className="text-xs text-slate-600 truncate">
                            {task.location}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {task.corridor}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {task.dueDate && <span>Batas waktu: {task.dueDate}</span>}
                            {task.createdDate && <span>Dibuat: {task.createdDate}</span>}
                            {task.completedDate && <span className="text-emerald-600 font-bold">Selesai: {task.completedDate}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Details Columns (Jenis Tugas & Jarak) */}
                      <div className="grid grid-cols-2 gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5 shrink-0 text-xs">
                        <div className="space-y-1">
                          <p className="text-[10.5px] text-slate-400 font-medium">Jenis Tugas</p>
                          <p className="font-bold text-slate-800">{task.taskType}</p>
                          <p className="text-[10.5px] text-slate-400 font-medium pt-1">Metode</p>
                          <p className="font-semibold text-slate-700">{task.method}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10.5px] text-slate-400 font-medium">Jarak</p>
                          <p className="font-bold text-slate-800">{(task.distanceMeters ?? 0).toLocaleString('id-ID')} m</p>
                          <p className="text-[10.5px] text-slate-400 font-medium pt-1">
                            {isCompleted ? 'Durasi' : 'Estimasi Waktu'}
                          </p>
                          <p className="font-semibold text-slate-700">{task.estimatedTimeMinutes} menit</p>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="shrink-0 flex sm:flex-col justify-end items-end pt-2 sm:pt-0">
                        {isCompleted ? (
                          <button
                            onClick={() => handleOpenTaskResult(task)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Lihat Hasil</span>
                          </button>
                        ) : isInProgress ? (
                          <button
                            onClick={() => handleOpenTaskAction(task)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lanjutkan</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenTaskAction(task)}
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                              isHighPriority
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                : 'border border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Mulai Tugas</span>
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Optional PINN Fast Output bar if result available */}
                    {task.pinnData?.predictedPci && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                        <div className="flex items-center gap-3">
                          <span>
                            Prediksi PCI: <strong className="text-slate-900">{task.pinnData.predictedPci}/100</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Rekomendasi Overlay: <strong className="text-emerald-700">{task.pinnData.recommendedOverlayCm} cm AC-WC</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const seg = roadSegments.find((s) => s.id === task.segmentId) || selectedSegment;
                            onSelectSegment(seg);
                            if (onOpenSimulation) onOpenSimulation(seg);
                          }}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Buka Simulator Fisika PINN</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Bottom Summary Bar (4 Metrics Tiles) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mt-6">
              
              {/* Tile 1 */}
              <div className="flex items-center space-x-3 p-2">
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 font-mono">{totalTasks}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">Total Tugas Aktif</p>
                </div>
              </div>

              {/* Tile 2 */}
              <div className="flex items-center space-x-3 p-2">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-rose-600 font-mono">{highPriorityCount}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">Prioritas Tinggi</p>
                  <p className="text-[9.5px] text-rose-500">Perlu segera dikerjakan</p>
                </div>
              </div>

              {/* Tile 3 */}
              <div className="flex items-center space-x-3 p-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 font-mono">{totalActiveHours} jam</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">Total Estimasi</p>
                  <p className="text-[9.5px] text-slate-400">Waktu pekerjaan</p>
                </div>
              </div>

              {/* Tile 4 */}
              <div className="flex items-center space-x-3 p-2">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-emerald-700 font-mono">{completionPercentage}%</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">Penyelesaian</p>
                  <p className="text-[9.5px] text-slate-400">Bulan ini</p>
                </div>
              </div>
            </div>

            {/* Footer Attribution Note */}
            <p className="text-xs text-slate-400 text-center pt-2">
              PAVEMENT-PINN menggunakan Physics-Informed Neural Network untuk prediksi kerusakan perkerasan.
            </p>
          </div>

          {/* RIGHT COLUMN: WIDGETS & SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Widget 1: Ringkasan Tugas (Donut Chart) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Ringkasan Tugas</h3>
              
              <div className="flex items-center justify-between">
                {/* Donut Chart with Center Total Label */}
                <div className="relative w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px',
                          border: 'none'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Count */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 font-mono">{totalTasks}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 text-xs flex-1 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-slate-600 text-[11px]">Prioritas Tinggi</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900">{highPriorityCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-slate-600 text-[11px]">Prioritas Sedang</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900">{mediumPriorityCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-slate-600 text-[11px]">Berjalan</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900">{inProgressCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-slate-600 text-[11px]">Baru</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900">{newTasksCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-600 text-[11px]">Selesai</span>
                    </div>
                    <span className="font-bold font-mono text-slate-900">{completedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Peralatan yang Dibutuhkan */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Peralatan yang Dibutuhkan</h3>
                <button
                  onClick={() => setIsEquipmentModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="space-y-2.5">
                {equipmentList.slice(0, 5).map((eq) => {
                  const Icon = eq.icon;
                  return (
                    <div key={eq.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center space-x-2.5 text-slate-700">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800">{eq.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {eq.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Widget 3: Panduan Cepat (Quick Guides) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Panduan Cepat</h3>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedGuideTopic('SURVEY');
                    setIsQuickGuideModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    <span className="font-medium group-hover:text-slate-900">Cara Survei Kerusakan Jalan</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                </button>

                <button
                  onClick={() => {
                    setSelectedGuideTopic('FWD');
                    setIsQuickGuideModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <Activity className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    <span className="font-medium group-hover:text-slate-900">Cara Pengukuran Defleksi (FWD)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                </button>

                <button
                  onClick={() => {
                    setSelectedGuideTopic('PCI');
                    setIsQuickGuideModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    <span className="font-medium group-hover:text-slate-900">Penilaian Kondisi (PCI 0-100)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                </button>

                <button
                  onClick={() => {
                    setSelectedGuideTopic('STANDARDS');
                    setIsQuickGuideModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <Cpu className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    <span className="font-medium group-hover:text-slate-900">Standar Pengambilan Data PINN</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                </button>
              </div>
            </div>

            {/* Widget 4: Reminder Pro-Tip Box ("Ingat!") */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-4.5 text-xs text-slate-700 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ingat!</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11.5px]">
                Pastikan data yang Anda kumpulkan akurat dan lengkap. Data lapangan (Lendutan FWD, CBR Tanah Dasar, Suhu Permukaan) mempengaruhi prediksi <strong className="text-emerald-900">PINN Physics Loss</strong> dan keputusan penanganan jalan nasional.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL 1: MULAI TUGAS & FORMULIR PENGAMBILAN DATA LAPANGAN PINN */}
      {isTaskActionModalOpen && selectedTaskForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl font-bold">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedTaskForAction.title}</h3>
                  <p className="text-xs text-slate-500">{selectedTaskForAction.location} ({selectedTaskForAction.corridor})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskActionModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory Banner: PINN Physics Coupling */}
            <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl text-xs text-indigo-900 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="block font-bold text-indigo-950">Physics-Informed Neural Network (PINN) Data Integration:</strong>
                Data yang diinputkan akan langsung digunakan oleh solver <span className="font-mono font-bold">L_total = L_Data + λ·L_PDE</span> untuk menghitung deformasi elastis multilayer Burmister, regangan tarik lelah (ε_t), dan rekomendasi tebal overlay hotmix AC-WC.
              </div>
            </div>

            <form onSubmit={handleCompleteTask} className="space-y-4 text-xs">
              
              {/* Grid 1: Deflection & Soil CBR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>1. Lendutan FWD D₀ (Pusat Beban):</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">Pd T-01-2002</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={formFwdDeflection}
                      onChange={(e) => setFormFwdDeflection(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">µm</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">Nilai w(0) di bawah pelat beban 40 kN.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>2. Nilai CBR Tanah Dasar (Subgrade):</span>
                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-bold">DCP / Lab</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formCbr}
                      onChange={(e) => setFormCbr(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">%</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">Modulus tanah dasar Es ≈ 10 × CBR (MPa).</p>
                </div>
              </div>

              {/* Grid 2: Asphalt Thickness, Temperature, Axle Load */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">3. Tebal Lapis Aspal (h₁):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formAsphaltThickness}
                      onChange={(e) => setFormAsphaltThickness(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">cm</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">4. Suhu Permukaan (T):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formSurfaceTemp}
                      onChange={(e) => setFormSurfaceTemp(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">°C</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">5. Beban Gandar Truk:</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={formAxleLoad}
                      onChange={(e) => setFormAxleLoad(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">Ton</span>
                  </div>
                </div>
              </div>

              {/* Engineer Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">6. Catatan Teknis Insinyur Lapangan:</label>
                <textarea
                  rows={3}
                  value={formEngineerNotes}
                  onChange={(e) => setFormEngineerNotes(e.target.value)}
                  placeholder="Kondisi drainase tepi jalan, pola retak buaya, kelelahan aspal, atau indikasi pembebanan ODOL..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTask ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menjalankan Inferensi PINN...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan & Selesaikan Tugas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIHAT HASIL TUGAS (SURVEY RESULT & PINN OUTPUT) */}
      {isTaskResultModalOpen && selectedTaskForAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[92vh] overflow-y-auto space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Hasil Survei & Evaluasi PINN</h3>
                  <p className="text-xs text-slate-500">{selectedTaskForAction.title} - {selectedTaskForAction.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskResultModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Indeks PCI</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  {selectedTaskForAction.pinnData?.predictedPci || 82}/100
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">Kondisi Mantap</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Lendutan D₀</span>
                <p className="text-2xl font-black text-blue-600 font-mono">
                  {selectedTaskForAction.pinnData?.fwdDeflectionD0Micron || 290} µm
                </p>
                <p className="text-[10px] text-slate-500">FWD 40 kN</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">CBR Subgrade</span>
                <p className="text-2xl font-black text-indigo-600 font-mono">
                  {selectedTaskForAction.pinnData?.subgradeCbrPercent || 6.8}%
                </p>
                <p className="text-[10px] text-slate-500">Daya Dukung Baik</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Desain Overlay</span>
                <p className="text-2xl font-black text-amber-600 font-mono">
                  {selectedTaskForAction.pinnData?.recommendedOverlayCm || 0} cm
                </p>
                <p className="text-[10px] text-slate-500">AC-WC Nominal</p>
              </div>
            </div>

            {/* Photo Attachment if available */}
            {selectedTaskForAction.pinnData?.photoUrl && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Dokumentasi Visual Lapangan:</span>
                <img
                  src={selectedTaskForAction.pinnData.photoUrl}
                  alt="Dokumentasi Survei"
                  className="w-full h-48 object-cover rounded-2xl border border-slate-200"
                />
              </div>
            )}

            {/* Engineer Notes */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <span className="font-bold text-slate-700 block">Catatan Lapangan Resmi:</span>
              <p className="text-slate-600 leading-relaxed">
                "{selectedTaskForAction.pinnData?.notes || 'Survei perkerasan telah diverifikasi sesuai prosedur ASTM D6433 dan panduan FWD Bina Marga.'}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-mono">
                Diselesaikan pada: {selectedTaskForAction.completedDate || '8 Mei 2025'}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const targetSegment = roadSegments.find((s) => s.id === selectedTaskForAction.segmentId) || selectedSegment;
                    const simRes = runPinnSimulation(
                      {
                        segmentId: targetSegment.id,
                        axleLoadTon: selectedTaskForAction.pinnData?.estimatedAxleLoadTon || 12,
                        rainIntensityMmHr: 30,
                        floodDurationHours: 2,
                        surfaceTemperatureC: selectedTaskForAction.pinnData?.surfaceTempC || 36,
                        subgradeCbrPercent: selectedTaskForAction.pinnData?.subgradeCbrPercent || 6.8,
                        asphaltThicknessCm: selectedTaskForAction.pinnData?.asphaltThicknessCm || 16,
                        asphaltModulusMpa: 2400,
                        targetDevice: 'NPU',
                        precisionMode: 'INT8_NNCF'
                      },
                      targetSegment
                    );
                    generateOfficialReportPdf(simRes, 'FIELD_ENGINEER');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Cetak PDF Laporan Resmi</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: PERALATAN SURVEI LENGKAP */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Checklist Peralatan Survei Lapangan</h3>
                  <p className="text-xs text-slate-500">Standar BBPJN DKI-Jabar & Ditjen Bina Marga</p>
                </div>
              </div>
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {equipmentList.map((eq) => {
                const Icon = eq.icon;
                return (
                  <div key={eq.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-bold text-slate-900">
                        <Icon className="w-4 h-4 text-emerald-600" />
                        <span>{eq.name}</span>
                      </div>
                      <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {eq.status}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 pl-6 leading-relaxed">
                      {eq.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PANDUAN CEPAT (QUICK GUIDES ACCORDION/DETAIL) */}
      {isQuickGuideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-2xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Panduan Teknis & SOP Lapangan</h3>
                  <p className="text-xs text-slate-500">Pedoman Survei Perkerasan & Model PINN PUPR</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickGuideModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
              <button
                onClick={() => setSelectedGuideTopic('SURVEY')}
                className={`py-1.5 rounded-xl transition-all ${
                  selectedGuideTopic === 'SURVEY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Survei Kerusakan
              </button>
              <button
                onClick={() => setSelectedGuideTopic('FWD')}
                className={`py-1.5 rounded-xl transition-all ${
                  selectedGuideTopic === 'FWD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Defleksi FWD
              </button>
              <button
                onClick={() => setSelectedGuideTopic('PCI')}
                className={`py-1.5 rounded-xl transition-all ${
                  selectedGuideTopic === 'PCI' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Kondisi PCI
              </button>
              <button
                onClick={() => setSelectedGuideTopic('STANDARDS')}
                className={`py-1.5 rounded-xl transition-all ${
                  selectedGuideTopic === 'STANDARDS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Loss PINN
              </button>
            </div>

            {/* Content for each topic */}
            {selectedGuideTopic === 'SURVEY' && (
              <div className="space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm">Metodologi Survei Visual & Instrument</h4>
                <p className="leading-relaxed">
                  Survei kondisi perkerasan jalan dilakukan secara visual dan instrumen dengan membagi ruas jalan menjadi unit sampel 100-500 meter. Setiap kerusakan diidentifikasi berdasarkan 19 jenis cacat ASTM D6433 (seperti retak buaya, alur roda, lubang, keriting).
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">Langkah Inti Survei:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-600">
                    <li>Pasang rambu keselamatan K3 dan rompi reflektif.</li>
                    <li>Ambil foto tampak atas kerusakan menggunakan kamera HP bersudut 90°.</li>
                    <li>Ukur panjang, lebar, dan kedalaman terdalam dengan roll meter / jangka sorong.</li>
                    <li>Catat koordinat GPS dan KM Post pada form survei digital.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedGuideTopic === 'FWD' && (
              <div className="space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm">Pengukuran Defleksi FWD (Pd T-01-2002-B)</h4>
                <p className="leading-relaxed">
                  Alat Falling Weight Deflectometer (FWD) melepaskan beban impuls standar 40 kN (ekuivalen gandar tunggal 8.16 Ton) pada pelat diameter 300 mm. Tujuh sensor geophone merekam defleksi pada jarak r = 0, 200, 400, 600, 900, 1200, dan 1500 mm.
                </p>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 text-[11.5px] space-y-1">
                  <span className="font-bold block">Formula Basin Lendutan:</span>
                  <p className="font-mono">w(r) = w₀ · exp(-β·r)</p>
                  <p>Lendutan D₀ merefleksikan kekuatan struktural total, sedangkan D₉₀₀-D₁₅₀₀ merefleksikan daya dukung tanah dasar (CBR subgrade).</p>
                </div>
              </div>
            )}

            {selectedGuideTopic === 'PCI' && (
              <div className="space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm">Skala Penilaian Pavement Condition Index (PCI)</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="font-bold block">85 - 100: Sangat Baik (Good)</span>
                    Rutin pembersihan & crack sealing.
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                    <span className="font-bold block">70 - 85: Baik (Satisfactory)</span>
                    Pemeliharaan periodik ringan.
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="font-bold block">55 - 70: Sedang (Fair)</span>
                    Penambalan lubang & overlay 4-6 cm.
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <span className="font-bold block">&lt; 55: Rusak Parah (Poor)</span>
                    Rekonstruksi pondasi agregat & AC-BC.
                  </div>
                </div>
              </div>
            )}

            {selectedGuideTopic === 'STANDARDS' && (
              <div className="space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 text-sm">Kopling Formulasi PDE Fisika dalam Model PINN</h4>
                <p className="leading-relaxed">
                  Model PINN pada sistem ini mematuhi persamaan mekanika elastisitas kontinum Navier-Cauchy untuk perkerasan berlapis (Burmister theory):
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <p className="text-emerald-400">L_Total = L_Data + λ_PDE · L_PDE + λ_ODOL · L_Damage</p>
                  <p className="text-slate-400 text-[10px]">*L_Data meminimalkan selisih nilai FWD lapangan.</p>
                  <p className="text-slate-400 text-[10px]">*L_PDE menjamin kesetimbangan tegangan & regangan aspal.</p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsQuickGuideModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PINN PARAMETERS EXPLANATION (BERDASARKAN PINN PDF) */}
      {isPinnInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-2xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Parameter Fisika PINN yang Diperlukan</h3>
                  <p className="text-xs text-slate-500">Spesifikasi Pengambilan Data Insinyur Lapangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsPinnInfoModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Berdasarkan arsitektur <strong>Physics-Informed Neural Network (PINN)</strong> untuk prediksi degradasi perkerasan jalan, insinyur lapangan bertugas memasok data batas (boundary conditions) dan parameter konstitutif material agar neural network mematuhi hukum fisika:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                  <Activity className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">1. Lendutan FWD D₀ - D₁₅₀₀ (Boundary Data Loss)</h5>
                    <p className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                      Berfungsi sebagai ground-truth data points L_Data untuk mengkalibrasi profil mangkok lendutan permukaan w(r).
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                  <Layers className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">2. Nilai CBR Subgrade & Modulus Es</h5>
                    <p className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                      Menentukan modulus elastisitas tanah dasar Es ≈ 10 × CBR (MPa) yang mencegah penurunan pondasi berlebih.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                  <Compass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">3. Tebal Lapisan Struktural (h₁, h₂, h₃)</h5>
                    <p className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                      Parameter geometri batas antarmuka (interface boundaries) untuk persamaan diferensial parsial (PDE) Burmister multi-layer.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900">4. Suhu Permukaan & Korelasi Beban Gandar ODOL</h5>
                    <p className="text-[11.5px] text-slate-500 leading-tight mt-0.5">
                      Memperhitungkan pelunakan viskoelastis aspal pada suhu tinggi (&gt;40°C) dan faktor eksponensial ke-4 kerusakan muatan lebih (Power Law).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsPinnInfoModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
