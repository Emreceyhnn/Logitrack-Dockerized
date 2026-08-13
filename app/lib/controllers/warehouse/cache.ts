// Plain module (NOT a "use server" boundary) so it may export the shared cache
// manager object alongside async invalidation helpers. Matches driver/shared.ts.
import { WAREHOUSE_CACHE_TTL } from "../../redis";
import { createCacheManager } from "../utils/cacheFactory";

// Shared cache manager instance for all warehouse submodules.
export const warehouseCache = createCacheManager("warehouses", WAREHOUSE_CACHE_TTL);

/**
 * tr-şirkete ve (varsa) belirli bir depoya ait önbelleği (cache) temizler
 * en-clears the cache for the company and (if provided) the specified warehouse
 * input (companyId: string, warehouseId?: string)
 * output (Promise<void>)
 */
export async function invalidateWarehouseCache(
  companyId: string,
  warehouseId?: string
): Promise<void> {
  await warehouseCache.invalidate(companyId, warehouseId);
}
