"use server";

import { adminDb } from "@/app/lib/firebase-admin";
import { VehicleLocation } from "@/app/lib/type/vehicle";
import { logger } from "@/app/lib/logger";


/**
 * All Realtime Database paths are tenant-scoped as
 * `vehicles/<node>/{companyId}/{vehicleId}` so that a client (whose RTDB access
 * is constrained by security rules to its own `companyId`) can never read or
 * write another tenant's vehicles. See `database.rules.json`.
 */

/**
 * tr-aracın konumunu günceller
 * en-updates the location of the vehicle
 * input (companyId: string, vehicleId: string, location: Omit<VehicleLocation, "lastUpdated">)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function updateVehicleLocationAction(
  companyId: string,
  vehicleId: string,
  location: Omit<VehicleLocation, "lastUpdated">
) {
  try {
    if (!adminDb) throw new Error("Firebase not initialized");
    const path = `vehicles/locations/${companyId}/${vehicleId}`;
    const data: VehicleLocation = {
      ...location,
      lastUpdated: Date.now(),
    };

    await adminDb.ref(path).set(data);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to update location for vehicle ${vehicleId}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-aracın verilerini kısmi olarak günceller
 * en-partially updates the data of the vehicle
 * input (companyId: string, vehicleId: string, data: Partial<VehicleLocation>)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function updateVehicleDataAction(
  companyId: string,
  vehicleId: string,
  data: Partial<VehicleLocation>
) {
  try {
    if (!adminDb) throw new Error("Firebase not initialized");
    const path = `vehicles/locations/${companyId}/${vehicleId}`;
    const updateData = {
      ...data,
      lastUpdated: Date.now(),
    };
    await adminDb.ref(path).update(updateData);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to update data for vehicle ${vehicleId}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * tr-araç bilgilerini Firebase Realtime Database'e kaydeder
 * en-syncs the vehicle information to Firebase Realtime Database
 * input (vehicle: { id: string; companyId: string | null } & Record<string, unknown>)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function syncVehicleToFirebaseAction(
  vehicle: { id: string; companyId: string | null } & Record<string, unknown>
) {
  try {
    if (!adminDb) throw new Error("Firebase not initialized");
    if (!vehicle.companyId) {
      // A vehicle with no company must never land in a shared/guessable node.
      return { success: false, error: "Vehicle has no companyId" };
    }
    const path = `vehicles/registry/${vehicle.companyId}/${vehicle.id}`;
    await adminDb.ref(path).set({
      ...vehicle,
      lastSynced: Date.now(),
    });
    return { success: true };
  } catch (error) {
    logger.error(`Failed to sync vehicle ${vehicle.id} to Firebase:`, error);
    return { success: false, error: String(error) };
  }
}
