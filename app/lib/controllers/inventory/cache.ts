"use server";

import { revalidatePath } from "next/cache";
import { redis, invalidatePattern, inventoryCacheKeys } from "../../redis";

/**
 * tr-belirtilen şirketin ve (varsa) stoğun önbellek verilerini temizler
 * en-clears the cache data of the specified company and (if applicable) inventory
 * input (companyId: string, inventoryId?: string)
 * output (Promise<void>)
 */
export async function invalidateInventoryCache(companyId: string, inventoryId?: string) {
  await Promise.all([
    invalidatePattern(inventoryCacheKeys.companyPattern(companyId)),
    inventoryId ? redis.del(inventoryCacheKeys.detail(inventoryId)) : Promise.resolve(),
  ]);
  revalidatePath("/", "layout");
}
