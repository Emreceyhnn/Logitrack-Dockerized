// Plain module (NOT a "use server" boundary) so it may export the shared cache
// manager object alongside async invalidation helpers. Matches driver/shared.ts.
import { VEHICLE_CACHE_TTL } from "../../redis";
import { createCacheManager } from "../utils/cacheFactory";

// Shared cache manager instance for all vehicle submodules.
export const vehicleCache = createCacheManager("vehicles", VEHICLE_CACHE_TTL);

/**
 * tr-şirkete ve (varsa) araca ait önbelleği (cache) temizler
 * en-clears the cache for the company and (if provided) the specified vehicle
 * input (companyId: string, vehicleId?: string)
 * output (Promise<void>)
 */
export async function invalidateVehicleCache(
  companyId: string,
  vehicleId?: string
): Promise<void> {
  await vehicleCache.invalidate(companyId, vehicleId);
}
