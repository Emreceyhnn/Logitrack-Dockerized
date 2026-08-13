// Barrel re-exporting the warehouse-worker controller, split across submodules
// under ./warehouseWorker/ to keep each file focused and under ~400 lines.
export { getWarehouseWorkerDashboard } from "./warehouseWorker/dashboard";
export {
  logWarehouseMovement,
  adjustWarehouseStock,
  advanceWarehouseTask,
  requestRestock,
  reportWarehouseIssue,
} from "./warehouseWorker/mutations";
