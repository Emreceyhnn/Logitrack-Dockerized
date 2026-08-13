// Barrel re-exporting the shipments controller, split across submodules under
// ./shipments/ to keep each file focused and under ~400 lines.
export type { CustomerWithLocations, ShipmentStopInput } from "./shipments/types";
// NOTE: invalidateShipmentCache is intentionally NOT re-exported (server-only
// module — see routes.ts note). Server callers import it from "./shipments/cache".
export { createShipment } from "./shipments/create";
export {
  assignDriverToShipment,
  assignRouteToShipment,
  updateShipmentStatus,
} from "./shipments/assign";
export { updateShipment, deleteShipment } from "./shipments/update";
export {
  getShipmentsByTrailer,
  getVehicleLinkedShipments,
  getEligibleTargetTrailers,
  bulkReassignTrailer,
} from "./shipments/transfer";
export type {
  TrailerLinkedShipment,
  VehicleLinkedShipments,
  EligibleTargetTrailer,
} from "./shipments/transfer";
export {
  getShipments,
  getShipmentById,
  getShipmentByTrackingId,
} from "./shipments/queries";
export {
  getShipmentStats,
  getShipmentVolumeHistory,
  getShipmentStatusDistribution,
  getShipmentsWithDashboardData,
} from "./shipments/stats";
