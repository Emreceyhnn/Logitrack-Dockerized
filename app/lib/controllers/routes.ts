// Barrel re-exporting the routes controller, split across submodules under
// ./routes/ to keep each file focused and under ~400 lines.
export type { RouteUpdateData } from "./routes/types";
// NOTE: invalidateRouteCache is intentionally NOT re-exported here. It lives in
// ./routes/cache (a server-only module that imports next/cache revalidatePath).
// Re-exporting it through this barrel drags that server-only module into every
// client component that imports an action from the barrel, breaking the build.
// Server callers import it directly from "./routes/cache". Matches driver.ts.
export { createRoute, updateRoute, deleteRoute } from "./routes/mutations";
export {
  assignDriverToRoute,
  assignVehicleToRoute,
  unassignDriverFromRoute,
  unassignVehicleFromRoute,
  updateRouteStatus,
} from "./routes/assignments";
export {
  getRoutes,
  getRouteById,
  getDriverRoutes,
  getVehicleRoutes,
  getCompanyRoutes,
} from "./routes/queries";
export {
  getRouteStats,
  getRouteEfficiencyStats,
  getActiveRoutesLocations,
  getRoutesWithDashboardData,
} from "./routes/stats";
