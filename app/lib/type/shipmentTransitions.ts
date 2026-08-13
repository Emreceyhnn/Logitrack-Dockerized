import { ShipmentStatus } from "./enums";

/**
 * Shipment lifecycle state machine — client-safe (uses the plain-object enum
 * from ./enums, no Prisma runtime import), so both server controllers and
 * client dialogs can share one source of truth for legal transitions.
 *
 * PENDING ─→ PROCESSING ─→ ASSIGNED ─→ IN_TRANSIT ─→ DELIVERED
 *    │            │            │            ├──→ FAILED ─→ PENDING (reschedule)
 *    │            │            │            │        └──→ RETURNED
 *    └────────────┴────────────┴────────────┴──→ CANCELLED
 *
 * DELAYED is an exception overlay on any active status (SLA breach); the
 * shipment continues its normal flow from there.
 * DELIVERED / RETURNED / CANCELLED are terminal.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [
    ShipmentStatus.PROCESSING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.DELAYED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PROCESSING]: [
    ShipmentStatus.PENDING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.DELAYED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.ASSIGNED]: [
    // PENDING = unassigned / route canceled before departure
    ShipmentStatus.PENDING,
    ShipmentStatus.PROCESSING,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELAYED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    // PENDING = route canceled mid-trip, load returns to dispatch pool
    ShipmentStatus.PENDING,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.DELAYED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.DELAYED]: [
    ShipmentStatus.PENDING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.FAILED]: [
    // PENDING = reschedule for another attempt
    ShipmentStatus.PENDING,
    ShipmentStatus.RETURNED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export const TERMINAL_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.CANCELLED,
];

export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return TERMINAL_SHIPMENT_STATUSES.includes(status);
}

export function canTransitionShipment(
  from: ShipmentStatus,
  to: ShipmentStatus
): boolean {
  if (from === to) return true;
  return SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
