import type { Db } from "../../db";

type TransactionClient = Parameters<Extract<Parameters<Db["$transaction"]>[0], (...args: never[]) => unknown>>[0];

/**
 * Allocating stock for a shipment is the trigger for a warehouse worker to
 * actually pick it — without this the worker dashboard never reflects
 * shipment activity, even though stock was reserved. One task per shipment
 * (not per line item) so a multi-SKU order shows up as a single pick job the
 * worker can walk through item by item.
 */
export async function createPickTaskForAllocations(
  tx: TransactionClient,
  params: {
    companyId: string;
    warehouseId: string;
    orderRef: string;
    allocations: Array<{ name: string; sku: string; zone: string; totalUnits: number }>;
  }
): Promise<void> {
  const { companyId, warehouseId, orderRef, allocations } = params;
  if (allocations.length === 0) return;

  await tx.warehouseTask.create({
    data: {
      warehouseId,
      companyId,
      kind: "PICK",
      name:
        allocations.length === 1
          ? allocations[0]!.name
          : `Sipariş Toplama — ${orderRef}`,
      orderRef,
      items: {
        create: allocations.map((a) => ({
          companyId,
          sku: a.sku,
          zone: a.zone,
          totalUnits: a.totalUnits,
        })),
      },
    },
  });
}
