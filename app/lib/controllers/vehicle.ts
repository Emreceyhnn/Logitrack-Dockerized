// Barrel re-exporting the vehicle controller, split across submodules under
// ./vehicle/ to keep each file focused and under ~400 lines.
// NOTE: invalidateVehicleCache is intentionally NOT re-exported (server-only
// module — see routes.ts note). Server callers import it from "./vehicle/cache".
export {
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus,
} from "./vehicle/crud";
export {
  assignDriverToVehicle,
  unassignDriverFromVehicle,
  getAvailableDrivers,
} from "./vehicle/assignments";
export {
  createVehicleIssue,
  getOpenIssuesForUser,
  updateIssue,
} from "./vehicle/issues";
export {
  addMaintenanceRecord,
  updateMaintenanceRecord,
} from "./vehicle/maintenance";
export { uploadVehicleDocument } from "./vehicle/documents";
export {
  getVehicles,
  getVehiclesDashboardData,
  getVehiclesWithDashboard,
} from "./vehicle/queries";
