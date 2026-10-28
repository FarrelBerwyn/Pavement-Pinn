/**
 * Route id -> page component, for routes whose `kind` is `page`.
 * (`workspace` routes are rendered by the application shell itself.)
 */
import React from 'react';
import type { RouteId } from './routeConfig';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { AnalyticsPage } from '../pages/dashboard/AnalyticsPage';
import { LoginPage } from '../pages/login/LoginPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { RoadDetailPage } from '../pages/roads/RoadDetailPage';
import { EnginePage } from '../pages/engine/EnginePage';
import { PinnPage } from '../pages/engine/PinnPage';
import { SimulationPage } from '../pages/engine/SimulationPage';
import { FwdPage } from '../pages/engine/FwdPage';
import { PredictionPage } from '../pages/engine/PredictionPage';
import { TechnicalReferencePage } from '../pages/engineering/TechnicalReferencePage';
import { ComputerVisionPage } from '../pages/computer-vision/ComputerVisionPage';
import { DamageDetectionPage } from '../pages/computer-vision/DamageDetectionPage';
import { InspectionHistoryPage } from '../pages/computer-vision/InspectionHistoryPage';
import { PinnIndexPage } from '../pages/operations/PinnIndexPage';
import { PinnWorkspacePage } from '../pages/operations/PinnWorkspacePage';
import { TrackPage } from '../pages/track/TrackPage';

export type PageComponent = React.ComponentType<{ params: Record<string, string> }>;

export const PAGE_COMPONENTS: Partial<Record<RouteId, PageComponent>> = {
  reports: ReportsPage,
  dashboardAnalytics: AnalyticsPage,
  login: LoginPage,
  settings: SettingsPage,
  roadDetail: RoadDetailPage,
  engine: EnginePage,
  enginePinn: PinnPage,
  engineSimulation: SimulationPage,
  engineFwd: FwdPage,
  enginePrediction: PredictionPage,
  engineeringReference: TechnicalReferencePage,
  computerVision: ComputerVisionPage,
  computerVisionDetection: DamageDetectionPage,
  computerVisionHistory: InspectionHistoryPage,
  operationsPinn: PinnIndexPage,
  operationsPinnWorkspace: PinnWorkspacePage,
  track: TrackPage
};
