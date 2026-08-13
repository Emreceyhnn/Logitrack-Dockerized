// Barrel re-exporting the warehouse controller, split across submodules under
// ./warehouse/ to keep each file focused and under ~400 lines.
// NOTE: invalidateWarehouseCache is intentionally NOT re-exported (server-only
// module — see routes.ts note). Server callers import it from "./warehouse/cache".
export {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  assignManagerToWarehouse,
} from "./warehouse/crud";
export {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
} from "./warehouse/inventory";
export {
  getWarehouseZones,
  createWarehouseZone,
  updateWarehouseZone,
  deleteWarehouseZone,
} from "./warehouse/zones";
export {
  getWarehouseStats,
  getRecentStockMovements,
  getWarehousesWithDashboardData,
} from "./warehouse/stats";
