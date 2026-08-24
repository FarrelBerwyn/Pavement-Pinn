import React, { useState, useEffect } from 'react';
import { Map, LayoutDashboard, Activity, X } from 'lucide-react';
import { UserRole, RoadSegment, SimulationResult, AuditLogItem, DamageReport } from './types';
import { INDONESIAN_ROAD_SEGMENTS } from './data/indonesianRoads';
import { USER_ACCOUNTS, UserAccount } from './data/userAccounts';
import { INITIAL_COMMUNITY_REPORTS } from './data/communityReports';
import { runPinnSimulation } from './utils/pinnEngine';
import { Navbar } from './components/Navbar';
import { LeafletMap } from './components/LeafletMap';
import { SimulationPanel } from './components/SimulationPanel';
import { FieldEngineerDashboard } from './components/FieldEngineerDashboard';
import { OperationsManagerDashboard } from './components/OperationsManagerDashboard';
import { ExecutivePolicyDashboard } from './components/ExecutivePolicyDashboard';
import { CommunityReportsDashboard } from './components/CommunityReportsDashboard';
import { OpenVINOModelDiagnosticsModal } from './components/OpenVINOModelDiagnosticsModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { LoginModal } from './components/LoginModal';
import { BinaMargaWimPipelineModal } from './components/BinaMargaWimPipelineModal';
import { PublicUserLayout } from './components/PublicUserLayout';

export default function App() {
  // Account & Role State (Default to Regular Public User)
  const defaultPublicAccount = USER_ACCOUNTS.find((acc) => acc.role === 'PUBLIC_REPORTER') || USER_ACCOUNTS[3] || USER_ACCOUNTS[0];
  const [currentAccount, setCurrentAccount] = useState<UserAccount>(defaultPublicAccount);
  const [activeRole, setActiveRole] = useState<UserRole>('PUBLIC_REPORTER');
  const [activeTab, setActiveTab] = useState<'MAP' | 'SIMULATOR' | 'DASHBOARD' | 'OPENVINO' | 'AUDIT'>('MAP');
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>(INDONESIAN_ROAD_SEGMENTS);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment>(INDONESIAN_ROAD_SEGMENTS[0]);

  // Community Damage Reports State
  const [communityReports, setCommunityReports] = useState<DamageReport[]>(INITIAL_COMMUNITY_REPORTS);

  // Initial Simulation Result
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);

  // Modals
  const [isOpenOpenvinoModal, setIsOpenOpenvinoModal] = useState<boolean>(false);
  const [isOpenAuditModal, setIsOpenAuditModal] = useState<boolean>(false);
  const [isOpenLoginModal, setIsOpenLoginModal] = useState<boolean>(false);
  const [isOpenBinaMargaModal, setIsOpenBinaMargaModal] = useState<boolean>(false);

  // Synchronize role change with account
  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    const matchedAccount = USER_ACCOUNTS.find((acc) => acc.role === role);
    if (matchedAccount) {
      setCurrentAccount(matchedAccount);
    }
  };

  // Synchronize login change with role
  const handleLoginAccount = (account: UserAccount) => {
    setCurrentAccount(account);
    setActiveRole(account.role);
  };

  // Add Community Damage Report
  const handleAddCommunityReport = (newReport: DamageReport) => {
    setCommunityReports((prev) => [newReport, ...prev]);

    // Append to audit logs
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: currentAccount.agency,
      action: 'LAPORAN KERUSAKAN WARGA',
      segmentName: newReport.segmentName,
      details: `Laporan: ${newReport.damageTypeLabel} (Dalam: ${newReport.estimatedDepthCm} cm). Korelasi WIM: ${newReport.wimCorrelation.recentTruckPlate} (+${newReport.wimCorrelation.overloadPercent}% Overload).`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Edit Community Damage Report
  const handleEditCommunityReport = (updatedReport: DamageReport) => {
    setCommunityReports((prev) =>
      prev.map((rep) => (rep.id === updatedReport.id ? updatedReport : rep))
    );

    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: currentAccount.agency,
      action: 'EDIT LAPORAN WARGA',
      segmentName: updatedReport.segmentName,
      details: `Perubahan: ${updatedReport.damageTypeLabel} (Dalam: ${updatedReport.estimatedDepthCm} cm, Luas: ${updatedReport.estimatedAreaM2} m²). Status: ${updatedReport.status}.`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Upvote Community Damage Report
  const handleUpvoteCommunityReport = (reportId: string) => {
    setCommunityReports((prev) =>
      prev.map((rep) => {
        if (rep.id === reportId) {
          const isUpvoted = rep.userUpvoted;
          return {
            ...rep,
            upvotesCount: isUpvoted ? rep.upvotesCount - 1 : rep.upvotesCount + 1,
            userUpvoted: !isUpvoted
          };
        }
        return rep;
      })
    );
  };

  // Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: 'LOG-101',
      timestamp: '16:45:12',
      userRole: 'FIELD_ENGINEER',
      userAgency: 'BBPJN DKI-Jabar',
      action: 'SIMULASI PINN',
      segmentName: 'Pantura KM 62+500',
      details: 'Prediksi PCI: 48/100, Regangan Tarik 245 µε, Rekomendasi Overlay 8.5 cm AC-WC.'
    },
    {
      id: 'LOG-102',
      timestamp: '16:40:08',
      userRole: 'OPERATIONS_MANAGER',
      userAgency: 'BPTD Wilayah VIII',
      action: 'TRANSFER MUATAN WIM',
      segmentName: 'Betung KM 114 (Trans-Sumatra)',
      details: 'Peringatan ODOL Red (24.6 Ton). Instruksi transfer muatan & pembatasan 30 km/jam.'
    },
    {
      id: 'LOG-103',
      timestamp: '16:30:00',
      userRole: 'POLICY_MAKER',
      userAgency: 'Kementerian PU',
      action: 'Ringkasan Eksekutif PDF',
      segmentName: 'Jaringan Jalan Nasional 2026',
      details: 'Proyeksi penghematan APBN Rp 38.5 Miliar dengan Zero ODOL 2027.'
    }
  ]);

  // Run initial simulation on load
  useEffect(() => {
    const initialRes = runPinnSimulation(
      {
        segmentId: selectedSegment.id,
        axleLoadTon: selectedSegment.defaultAxleLoadTon,
        rainIntensityMmHr: 45,
        floodDurationHours: 6,
        surfaceTemperatureC: 42,
        subgradeCbrPercent: selectedSegment.defaultCbrPercent,
        asphaltThicknessCm: selectedSegment.defaultAsphaltThicknessCm,
        asphaltModulusMpa: 2400,
        targetDevice: 'NPU',
        precisionMode: 'INT8_NNCF'
      },
      selectedSegment
    );
    setCurrentResult(initialRes);
  }, [selectedSegment]);

  // Callback when a new simulation finishes
  const handleSimulationComplete = (result: SimulationResult) => {
    setCurrentResult(result);

    // Append to Audit Logs
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userRole: activeRole,
      userAgency: activeRole === 'FIELD_ENGINEER' ? 'BBPJN / Dinas PUPR' : activeRole === 'OPERATIONS_MANAGER' ? 'Kemenhub / BPTD' : 'Kepala Dinas / PU',
      action: 'INFERENSI PINN OPENVINO',
      segmentName: result.roadSegment.name,
      details: `PCI: ${result.predictedPci}, Latensi OpenVINO: ${result.telemetry.inferenceLatencyMs} ms (${result.telemetry.deviceUsed})`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Launch simulation for specific segment from Map popup
  const handleLaunchSimulationForSegment = (segment: RoadSegment) => {
    setSelectedSegment(segment);
    setActiveTab('SIMULATOR');
  };

  const [isCommunityReportCardOpen, setIsCommunityReportCardOpen] = useState<boolean>(false);

  const handleToggleCommunityReportCard = () => {
    setIsCommunityReportCardOpen((prev) => !prev);
  };

  const isNormalUser =
    activeRole === 'PUBLIC_REPORTER' ||
    activeRole === 'PUBLIC_VIEWER' ||
    currentAccount.id === 'USR-006' ||
    currentAccount.layoutStyle === 'MODERN_APP';

  if (isNormalUser) {
    return (
      <PublicUserLayout
        currentAccount={currentAccount}
        activeRole={activeRole}
        onSelectRole={handleSelectRole}
        onLoginAccount={handleLoginAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onSelectSegment={setSelectedSegment}
        communityReports={communityReports}
        onAddReport={handleAddCommunityReport}
        onEditReport={handleEditCommunityReport}
        onUpvoteReport={handleUpvoteCommunityReport}
        onLaunchSimulation={handleLaunchSimulationForSegment}
        currentResult={currentResult}
        onSimulationComplete={handleSimulationComplete}
        onOpenOpenvinoModal={() => setIsOpenOpenvinoModal(true)}
        onOpenAuditModal={() => setIsOpenAuditModal(true)}
        onOpenLoginModal={() => setIsOpenLoginModal(true)}
      />
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navbar Header */}
      <Navbar
        activeRole={activeRole}
        onSelectRole={handleSelectRole}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'OPENVINO') {
            setIsOpenOpenvinoModal(true);
          } else if (tab === 'AUDIT') {
            setIsOpenAuditModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        telemetry={currentResult?.telemetry}
        onOpenQuickSim={() => setActiveTab('SIMULATOR')}
        currentAccount={currentAccount}
        onOpenLoginModal={() => setIsOpenLoginModal(true)}
        onOpenBinaMargaPipeline={() => setIsOpenBinaMargaModal(true)}
        onToggleCommunityReports={handleToggleCommunityReportCard}
        isCommunityReportOpen={isCommunityReportCardOpen}
      />

      {/* Main View Area (Full Screen Base Map + Floating Glass Overlays) */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-950">
        {/* Full-Screen Base Geospasial Map */}
        <LeafletMap
          roadSegments={roadSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={setSelectedSegment}
          onLaunchSimulation={handleLaunchSimulationForSegment}
          activeRole={activeRole}
          onNavigateToDashboard={() => setActiveTab('DASHBOARD')}
          communityReports={communityReports}
          onAddReport={handleAddCommunityReport}
          onUpvoteReport={handleUpvoteCommunityReport}
          currentAccount={currentAccount}
          isCommunityReportCardOpen={isCommunityReportCardOpen}
          onToggleCommunityReportCard={handleToggleCommunityReportCard}
        />

        {/* Floating Feature Panel Overlay (When DASHBOARD or SIMULATOR tab is active) */}
        {activeTab !== 'MAP' && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md p-3 md:p-6 overflow-y-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-7xl bg-slate-900/95 border border-white/20 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl relative my-auto">
              {/* Floating Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-cyan-300 border border-indigo-500/30">
                    {activeTab === 'DASHBOARD' && <LayoutDashboard className="w-5 h-5 text-cyan-400" />}
                    {activeTab === 'SIMULATOR' && <Activity className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Tab Melayang Aktif:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        {activeTab}
                      </span>
                    </div>
                    <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight">
                      {activeTab === 'DASHBOARD' && `Dashboard Analisis Lensa Role: ${(activeRole || 'FIELD_ENGINEER').replace('_', ' ')}`}
                      {activeTab === 'SIMULATOR' && 'Panel Simulasi Fizik PINN & OpenVINO Inference'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('MAP')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/20 shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
                >
                  <Map className="w-4 h-4 text-cyan-200" />
                  <span className="hidden sm:inline">Sembunyikan ke Peta Full-Screen</span>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Floating Content Body */}
              {activeTab === 'SIMULATOR' && (
                <SimulationPanel
                  roadSegments={roadSegments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={setSelectedSegment}
                  activeRole={activeRole}
                  currentResult={currentResult}
                  onSimulationComplete={handleSimulationComplete}
                  onOpenOpenvinoModal={() => setIsOpenOpenvinoModal(true)}
                />
              )}

              {activeTab === 'DASHBOARD' && (
                <div>
                  {activeRole === 'FIELD_ENGINEER' && (
                    <FieldEngineerDashboard
                      simulationResult={currentResult}
                      roadSegments={roadSegments}
                      selectedSegment={selectedSegment}
                      onSelectSegment={setSelectedSegment}
                      onRunSimulation={() => setActiveTab('SIMULATOR')}
                    />
                  )}

                  {activeRole === 'OPERATIONS_MANAGER' && (
                    <OperationsManagerDashboard
                      simulationResult={currentResult}
                      roadSegments={roadSegments}
                      selectedSegment={selectedSegment}
                      onSelectSegment={setSelectedSegment}
                      onRunSimulation={() => setActiveTab('SIMULATOR')}
                    />
                  )}

                  {activeRole === 'POLICY_MAKER' && (
                    <ExecutivePolicyDashboard
                      simulationResult={currentResult}
                      roadSegments={roadSegments}
                      selectedSegment={selectedSegment}
                      onSelectSegment={setSelectedSegment}
                      onRunSimulation={() => setActiveTab('SIMULATOR')}
                    />
                  )}

                  {(activeRole === 'PUBLIC_REPORTER' || activeRole === 'PUBLIC_VIEWER') && (
                    <CommunityReportsDashboard
                      activeRole={activeRole}
                      currentAccount={currentAccount}
                      roadSegments={roadSegments}
                      reports={communityReports}
                      onAddReport={handleAddCommunityReport}
                      onUpvoteReport={handleUpvoteCommunityReport}
                      onSelectSegmentForMap={(segmentId) => {
                        const seg = roadSegments.find((s) => s.id === segmentId);
                        if (seg) setSelectedSegment(seg);
                        setActiveTab('MAP');
                      }}
                      onRunSimulationForSegment={handleLaunchSimulationForSegment}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Intel OpenVINO Edge AI Diagnostics Modal */}
      <OpenVINOModelDiagnosticsModal
        isOpen={isOpenOpenvinoModal}
        onClose={() => setIsOpenOpenvinoModal(false)}
        telemetry={currentResult?.telemetry}
      />

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={isOpenAuditModal}
        onClose={() => setIsOpenAuditModal(false)}
        auditLogs={auditLogs}
      />

      {/* Account Login & RBAC Governance Modal */}
      <LoginModal
        isOpen={isOpenLoginModal}
        onClose={() => setIsOpenLoginModal(false)}
        currentAccount={currentAccount}
        onLogin={handleLoginAccount}
      />

      {/* Bina Marga WIM Scraper & PINN Training Pipeline Modal */}
      <BinaMargaWimPipelineModal
        isOpen={isOpenBinaMargaModal}
        onClose={() => setIsOpenBinaMargaModal(false)}
      />
    </div>
  );
}
