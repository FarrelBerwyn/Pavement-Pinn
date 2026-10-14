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
import { EngineHubPage } from '../pages/engine/EngineHubPage';
import { EnginePinnPage } from '../pages/engine/EnginePinnPage';
import { EngineSimulationPage } from '../pages/engine/EngineSimulationPage';
import { EngineFwdPage } from '../pages/engine/EngineFwdPage';
import { EnginePredictionPage } from '../pages/engine/EnginePredictionPage';
import { TechnicalReferencePage } from '../pages/engineering/TechnicalReferencePage';
import {
  ComputerVisionHubPage,
  ComputerVisionDetectionPage,
  ComputerVisionHistoryPage
} from '../pages/computer-vision/ComputerVisionPages';

export type PageComponent = React.ComponentType<{ params: Record<string, string> }>;

export const PAGE_COMPONENTS: Partial<Record<RouteId, PageComponent>> = {
  reports: ReportsPage,
  dashboardAnalytics: AnalyticsPage,
  login: LoginPage,
  settings: SettingsPage,
  roadDetail: RoadDetailPage,
  engine: EngineHubPage,
  enginePinn: EnginePinnPage,
  engineSimulation: EngineSimulationPage,
  engineFwd: EngineFwdPage,
  enginePrediction: EnginePredictionPage,
  engineeringReference: TechnicalReferencePage,
  computerVision: ComputerVisionHubPage,
  computerVisionDetection: ComputerVisionDetectionPage,
  computerVisionHistory: ComputerVisionHistoryPage
};
