import { DRIVER_CACHE_TTL } from "../../redis";
import { createCacheManager } from "../utils/cacheFactory";

// Shared cache manager instance for all driver submodules.
export const driverCache = createCacheManager("drivers", DRIVER_CACHE_TTL);
