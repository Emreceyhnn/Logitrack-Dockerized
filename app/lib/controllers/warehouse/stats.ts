"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import {
  WarehouseWithRelations,
  WarehouseStats,
  InventoryMovementWithRelations,
} from "../../type/warehouse";
import {
  withCache,
  hashFilters,
  warehouseCacheKeys,
  WAREHOUSE_CACHE_TTL,
} from "../../redis";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";
import { palletUsageByWarehouse } from "../../utils/palletOccupancy";

/**
 * tr-kullanıcının şirketindeki depolara ait temel istatistikleri (kapasite, toplam kalem, SKU vb.) hesaplar
 * en-calculates basic statistics (capacity, total items, SKUs, etc.) for warehouses in the user's company
 * input (user: AuthenticatedUser)
 * output (Promise<{ totalWarehouses: number, totalSkus: number, totalItems: number, totalCapacityPallets: number, totalCapacityVolume: number }>)
 */
export const getWarehouseStats = authenticatedAction(async (user) => {
  return controllerGuard("getWarehouseStats", async () => {
    await checkPermission(user, user.companyId);

    if (!user.companyId) throw new Error("User has no company");

    const warehouses = await db.warehouse.findMany({
      where: { companyId: user.companyId },
      select: { capacityPallets: true, capacityVolumeM3: true },
    });

    const totalWarehouses = warehouses.length;

    const inventoryStats = await db.inventory.aggregate({
      where: { companyId: user.companyId },
      _count: { sku: true },
      _sum: { quantity: true },
    });

    const totalCapacityPallets = warehouses.reduce(
      (acc: number, w) => acc + (w.capacityPallets || 0),
      0
    );
    const totalCapacityVolume = warehouses.reduce(
      (acc: number, w) => acc + (w.capacityVolumeM3 || 0),
      0
    );

    return {
      totalWarehouses,
      totalSkus: inventoryStats._count.sku,
      totalItems: inventoryStats._sum.quantity || 0,
      totalCapacityPallets,
      totalCapacityVolume,
    };
  }, {
    fallback: {
      totalWarehouses: 0,
      totalSkus: 0,
      totalItems: 0,
      totalCapacityPallets: 0,
      totalCapacityVolume: 0,
    },
  });
});

/**
 * tr-şirketteki son 10 envanter hareketini depo ve kalem adıyla zenginleştirerek getirir
 * en-retrieves the last 10 inventory movements in the company, enriched with warehouse and item names
 * input (user: AuthenticatedUser)
 * output (Promise<InventoryMovementWithRelations[]>)
 */
export const getRecentStockMovements = authenticatedAction(async (user) => {
  return controllerGuard("getRecentStockMovements", async () => {
    await checkPermission(user, user.companyId);

    if (!user.companyId) throw new Error("User has no company");

    const movements = await db.inventoryMovement.findMany({
      where: { companyId: user.companyId },
      include: {
        warehouse: { select: { code: true, name: true } },
      },
      take: 10,
      orderBy: { date: "desc" },
    });

    const enrichedMovements = await Promise.all(
      movements.map(async (m: (typeof movements)[number]) => {
        const inventoryItem = await db.inventory.findFirst({
          where: {
            warehouseId: m.warehouseId,
            sku: m.sku,
          },
          select: { name: true },
        });
        return {
          ...m,
          itemName: inventoryItem?.name || m.sku,
        };
      })
    );

    return enrichedMovements;
  }, { fallback: [] });
});

/**
 * tr-sayfalama yapılarak (pagination) depoları ve beraberinde depo gösterge paneli özetlerini (istatistik, hareketler, trend) getirir
 * en-retrieves paginated warehouses along with dashboard summaries (stats, movements, trends)
 * input (user: AuthenticatedUser, page?: number, pageSize?: number)
 * output (Promise<{ warehouses: WarehouseWithRelations[], totalCount: number, stats: WarehouseStats, statsTrends?: any, recentMovements: InventoryMovementWithRelations[] }>)
 */
export const getWarehousesWithDashboardData = authenticatedAction(
  async (
    user,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    warehouses: WarehouseWithRelations[];
    totalCount: number;
    stats: WarehouseStats;
    statsTrends?: {
      totalWarehouses?: { value: number; isUp: boolean } | undefined;
    };
    recentMovements: InventoryMovementWithRelations[];
  }> => {
    const companyId = user?.companyId;

    return controllerGuard("getWarehousesWithDashboardData", async () => {
      if (!companyId) throw new Error("User has no company");

      const skip = (page - 1) * pageSize;

      // ── Parallel Orchestration ──────────────────────────────────────────
      const cacheKey = warehouseCacheKeys.dashboard(
        companyId,
        hashFilters({ page, pageSize })
      );

      return await withCache(cacheKey, WAREHOUSE_CACHE_TTL, async () => {
        const [
          ,
          warehouses,
          totalCount,
          statsRaw,
          inventoryStats,
          movements,
          prevTotalWarehouses,
          inventoryRows,
        ] = await Promise.all([
          checkPermission(user, companyId, ["role_admin", "role_manager"]),
          db.warehouse.findMany({
            where: { companyId },
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              _count: {
                select: {
                  inventory: true,
                  drivers: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
          }),
          db.warehouse.count({ where: { companyId } }),
          db.warehouse.findMany({
            where: { companyId },
            select: { capacityPallets: true, capacityVolumeM3: true },
          }),
          db.inventory.aggregate({
            where: { companyId },
            _count: { sku: true },
            _sum: { quantity: true },
          }),
          db.inventoryMovement.findMany({
            where: { companyId },
            include: {
              warehouse: { select: { code: true, name: true } },
            },
            take: 10,
            orderBy: { date: "desc" },
          }),
          db.warehouse.count({
            where: { companyId, createdAt: { lt: daysAgo(30) } },
          }),
          // Rows, not a groupBy _sum: occupancy is quantity ÷ units-per-pallet
          // per row (see palletOccupancy).
          db.inventory.findMany({
            where: { companyId },
            select: {
              warehouseId: true,
              quantity: true,
              palletCount: true,
              volumeM3: true,
            },
          }),
        ]);

        // Stats Calculation
        const totalWarehouses = statsRaw.length;
        const totalCapacityPallets = statsRaw.reduce(
          (acc: number, w) => acc + (w.capacityPallets || 0),
          0
        );
        const totalCapacityVolume = statsRaw.reduce(
          (acc: number, w) => acc + (w.capacityVolumeM3 || 0),
          0
        );

        // Enriched Movements
        const enrichedMovements = await Promise.all(
          movements.map(async (m: (typeof movements)[number]) => {
            const inventoryItem = await db.inventory.findFirst({
              where: {
                warehouseId: m.warehouseId,
                sku: m.sku,
                companyId,
              },
              select: { name: true },
            });
            return {
              ...m,
              itemName: inventoryItem?.name || m.sku,
            } as InventoryMovementWithRelations;
          })
        );

        const palletMap = palletUsageByWarehouse(
          Array.isArray(inventoryRows) ? inventoryRows : []
        );

        const typedWarehouses: WarehouseWithRelations[] = warehouses.map(
          (w) => {
            const used = palletMap.get(w.id) ?? { pallets: 0, volume: 0 };
            return {
              ...w,
              usedPallets: Math.round(used.pallets),
              usedVolume: Math.round(used.volume),
            };
          }
        );

        return {
          warehouses: typedWarehouses,
          totalCount,
          stats: {
            totalWarehouses,
            totalSkus: inventoryStats._count.sku,
            totalItems: inventoryStats._sum.quantity || 0,
            totalCapacityPallets,
            totalCapacityVolume,
          },
          statsTrends: {
            totalWarehouses: calcTrend(
              totalWarehouses,
              prevTotalWarehouses as number
            ),
          },
          recentMovements: enrichedMovements,
        };
      });
    });
  }
);
