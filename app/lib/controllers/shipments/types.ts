import type { Customer, CustomerLocation } from "@prisma/client";

export interface CustomerWithLocations extends Customer {
  locations: CustomerLocation[];
}

/**
 * Converts a shipment line item's quantity to base stock units.
 * When unit is "Pallet", quantity is a pallet count and palletCount is the
 * units-per-pallet factor, so the two must be multiplied before touching
 * Inventory.quantity/allocatedQuantity (which are always tracked in base units).
 */
export function toBaseUnitQuantity(item: { quantity: number; unit: string; palletCount?: number | null }): number {
  return item.unit === "Pallet" ? item.quantity * (item.palletCount || 1) : item.quantity;
}

export interface ShipmentStopInput {
  customerId?: string | null;
  customerLocationId?: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  sequence: number;
  contactEmail?: string | null;
}
