export interface AnalyticsPerformance {
  onTimeRate: number;
  fleetUtilization: number;
  satisfaction: number;
  satisfactionCount: number;
}

export interface AnalyticsCostDistribution {
  id: number;
  value: number;
  label: string;
}

export interface AnalyticsCosts {
  months: string[];
  fuel: number[];
  maintenance: number[];
  overhead: number[];
  distribution: AnalyticsCostDistribution[];
}

export interface AnalyticsForecast {
  weeks: string[];
  actuals: (number | null)[];
  predicted: (number | null)[];
}

export interface AnalyticsDashboardData {
  performance: AnalyticsPerformance;
  costs: AnalyticsCosts;
  forecast: AnalyticsForecast;
}

// Page State
export interface AnalyticsPageState {
  data: AnalyticsDashboardData | null;
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface AnalyticsPageActions {
  fetchAnalytics: () => Promise<void>;
}

// Component Props
export interface AnalyticsPageProps {
  state: AnalyticsPageState;
  actions: AnalyticsPageActions;
}
