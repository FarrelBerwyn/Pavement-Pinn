import React, { useState } from 'react';
import { Map, LayoutDashboard, Activity, X } from 'lucide-react';
import { Navbar } from './Navbar';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { SimulationPanel } from '../../components/simulation-viewer/SimulationPanel';
import { FieldEngineerDashboard } from '../../features/fwd/FieldEngineerDashboard';
import { OperationsManagerDashboard } from '../../features/wim/OperationsManagerDashboard';
import { ExecutivePolicyDashboard } from '../../features/policy-analysis/ExecutivePolicyDashboard';
import { CommunityReportsDashboard } from '../../features/community-reports/CommunityReportsDashboard';
import { RoadSegment } from '../../types';
import { useSession } from '../providers/SessionProvider';
import { useAppState } from '../providers/AppStateProvider';
import { useGlobalModals } from '../providers/GlobalModalsProvider';
import type { ClassicTab } from '../navigation';

interface ClassicPortalLayoutProps {
  /** Active tab, derived from the current route (src/app/navigation.ts). */
  activeTab: ClassicTab;
  /** Navigate to the route bound to a tab. */
  onSelectTab: (tab: ClassicTab) => void;
  onOpenLoginModal: () => void;
  /** End the session and return to the login page. */
  onLogout: () => void;
  /** Route outlet: the page component for the current route, if it is a standalone page. */
  children?: React.ReactNode;
}

/**
 * Classic portal shell — used by the three CLASSIC_PORTAL accounts (USR-001/002/003).
 * Full-screen map with a top navbar and floating simulator / dashboard panels.
 *
 * Markup moved verbatim from the classic branch of the original App.tsx; the only
 * change is that `activeTab` now comes from the URL instead of component state.
 */
export const ClassicPortalLayout: React.FC<ClassicPortalLayoutProps> = ({ activeTab, onSelectTab, onOpenLoginModal, onLogout, children }) => {
  const { currentAccount, activeRole } = useSession();
  const {
    roadSegments,
    selectedSegment,
    selectSegment: setSelectedSegment,
    communityReports,
    addCommunityReport: handleAddCommunityReport,
    upvoteCommunityReport: handleUpvoteCommunityReport,
    currentResult,
    completeSimulation: handleSimulationComplete
  } = useAppState();
  const { openOpenvinoDiagnostics, openAuditTrail } = useGlobalModals();
  const setActiveTab = onSelectTab;

  // Launch simulation for specific segment from Map popup
  const handleLaunchSimulationForSegment = (segment: RoadSegment) => {
    setSelectedSegment(segment);
    setActiveTab('SIMULATOR');
  };

  const [isCommunityReportCardOpen, setIsCommunityReportCardOpen] = useState<boolean>(false);

  const handleToggleCommunityReportCard = () => {
    setIsCommunityReportCardOpen((prev) => !prev);
  };

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navbar Header */}
      <Navbar
        activeRole={activeRole}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'OPENVINO') {
            openOpenvinoDiagnostics();
          } else if (tab === 'AUDIT') {
            openAuditTrail();
          } else {
            setActiveTab(tab);
          }
        }}
        telemetry={currentResult?.telemetry}
        onOpenQuickSim={() => setActiveTab('SIMULATOR')}
        currentAccount={currentAccount}
        onOpenLoginModal={onOpenLoginModal}
        onLogout={onLogout}
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
          <div className="absolute inset-0 z-30 bg-slate-950/70 p-3 md:p-6 overflow-y-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-7xl bg-slate-900/95 border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl relative my-auto">
              {/* Floating Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-indigo-500/20 text-cyan-300 border border-indigo-500/30">
                    {activeTab === 'DASHBOARD' && <LayoutDashboard className="w-5 h-5 text-cyan-400" />}
                    {activeTab === 'SIMULATOR' && <Activity className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400">
                        Tab Melayang Aktif:
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        {activeTab}
                      </span>
                    </div>
                    <h2 className="text-sm md:text-base font-semibold text-white tracking-tight">
                      {activeTab === 'DASHBOARD' && `Dashboard Analisis Lensa Role: ${(activeRole || 'FIELD_ENGINEER').replace('_', ' ')}`}
                      {activeTab === 'SIMULATOR' && 'Panel Simulasi Fizik PINN & OpenVINO Inference'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('MAP')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/20 shadow-lg flex items-center space-x-2 transition-all"
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
                  onOpenOpenvinoModal={openOpenvinoDiagnostics}
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

      {/* ROUTE OUTLET: route-level pages (src/pages) mount here */}
      {children}
    </div>
  );
};
