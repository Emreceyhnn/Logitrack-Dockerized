// Barrel re-exporting the driver controller, split across submodules under
// ./driver/ to keep each file focused and under ~400 lines.
export {
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from "./driver/crud";
export {
  updateDriverStatus,
  assignVehicleToDriver,
  unassignVehicleFromDriver,
} from "./driver/status";
export {
  getEligibleUsersForDriver,
  getDriverHistory,
  getDrivers,
} from "./driver/queries";
export {
  getDriverDashboardData,
  getDriverWithDashboardData,
} from "./driver/dashboard";
