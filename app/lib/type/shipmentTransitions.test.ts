import { describe, it } from "node:test";
import { expect } from "expect";
import {
  SHIPMENT_TRANSITIONS,
  canTransitionShipment,
  isTerminalShipmentStatus,
} from "./shipmentTransitions";

describe("shipmentTransitions", () => {
  it("should_AllowDelayedToInTransitAndDelivered", () => {
    // The core of the reported flow: a DELAYED shipment moving forward.
    expect(canTransitionShipment("DELAYED", "IN_TRANSIT")).toBe(true);
    expect(canTransitionShipment("DELAYED", "DELIVERED")).toBe(true);
  });

  it("should_RejectIllegalMove", () => {
    // Can't jump straight from PENDING to DELIVERED.
    expect(canTransitionShipment("PENDING", "DELIVERED")).toBe(false);
  });

  it("should_TreatSameStatusAsAllowedNoOp", () => {
    expect(canTransitionShipment("IN_TRANSIT", "IN_TRANSIT")).toBe(true);
  });

  it("should_HaveNoTransitionsFromTerminalStates", () => {
    expect(SHIPMENT_TRANSITIONS.DELIVERED).toEqual([]);
    expect(SHIPMENT_TRANSITIONS.RETURNED).toEqual([]);
    expect(SHIPMENT_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("should_FlagTerminalStatuses", () => {
    expect(isTerminalShipmentStatus("DELIVERED")).toBe(true);
    expect(isTerminalShipmentStatus("DELAYED")).toBe(false);
  });
});
