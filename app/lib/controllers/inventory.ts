// Barrel re-exporting the inventory controller, split across submodules under
// ./inventory/ to keep each file focused and under ~400 lines.
export { invalidateInventoryCache } from "./inventory/cache";
export {
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryStock,
  deleteInventoryItem,
  logWarehouseFulfillment,
} from "./inventory/mutations";
export {
  getInventory,
  getInventoryItemById,
  getInventoryBySku,
  getLowStockItems,
  getInventoryMovements,
} from "./inventory/queries";
export { getInventoryWithDashboardData } from "./inventory/dashboard";
