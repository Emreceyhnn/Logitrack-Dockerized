import { ShipmentStatus } from "@prisma/client";
// The transition map is defined in a client-safe module (plain-object enum, no
// Prisma runtime) so server and UI share one source of truth. Prisma's enum is
// structurally identical to the const-object enum, so the map types line up.
import {
  SHIPMENT_TRANSITIONS as SHARED_TRANSITIONS,
  canTransitionShipment as sharedCanTransition,
} from "../../type/shipmentTransitions";

export {
  SHIPMENT_TRANSITIONS,
  TERMINAL_SHIPMENT_STATUSES,
  isTerminalShipmentStatus,
  canTransitionShipment,
} from "../../type/shipmentTransitions";

/**
 * tr-istenen sevkiyat durum değişikliğinin yasal bir yaşam döngüsü adımı olup olmadığını kontrol eder, aksi halde hata fırlatır
 * en-checks if the requested shipment status change is a legal lifecycle move, otherwise throws an error
 * input (from: ShipmentStatus, to: ShipmentStatus)
 * output (void)
 */
export function assertShipmentTransition(
  from: ShipmentStatus,
  to: ShipmentStatus
): void {
  if (!sharedCanTransition(from, to)) {
    throw new Error(
      `Invalid shipment status transition: ${from} -> ${to}. Allowed from ${from}: ${
        SHARED_TRANSITIONS[from]?.join(", ") || "none (terminal status)"
      }`
    );
  }
}
