// Barrel re-exporting the analytics controller, split across submodules under
// ./analytics/ to keep each file focused and under ~400 lines.
export {
  getOverviewStats,
  getActionRequired,
  getDailyOperations,
  getPicksAndPacks,
} from "./analytics/operations";
export {
  getWarehouseCapacity,
  getLowStockItems,
} from "./analytics/warehouse";
export {
  getShipmentStatusStats,
  getShipmentVolumeHistory,
  getOnTimeTrends,
} from "./analytics/shipments";
export {
  getFuelStats,
  getMapData,
  getAnalyticsDashboardData,
} from "./analytics/fleet";
