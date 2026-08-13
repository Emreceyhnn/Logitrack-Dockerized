import type { AnalyticsDashboardData } from "@/app/lib/type/analytics";

/**
 * Fixed mock data for the Live Demo analytics dashboard. Shape mirrors
 * AnalyticsDashboardData exactly as returned by getAnalyticsDashboardData()
 * / app/api/analytics/dashboard/route.ts.
 */
export function getAnalyticsMock(): AnalyticsDashboardData {
  return {
    performance: {
      onTimeRate: 94.2,
      fleetUtilization: 78.5,
      satisfaction: 4.6,
      satisfactionCount: 312,
    },
    costs: {
      months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      fuel: [18500, 19200, 17800, 20100, 21300, 19800],
      maintenance: [4200, 3800, 5100, 4600, 3900, 4400],
      overhead: [6000, 6100, 6200, 6300, 6250, 6400],
      distribution: [
        { id: 0, value: 19800, label: "Fuel" },
        { id: 1, value: 4400, label: "Maintenance" },
        { id: 2, value: 6400, label: "Overhead" },
      ],
    },
    forecast: {
      weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
      actuals: [420, 445, 460, 438, 470, 490, null, null],
      predicted: [415, 440, 455, 445, 465, 485, 500, 515],
    },
  };
}
