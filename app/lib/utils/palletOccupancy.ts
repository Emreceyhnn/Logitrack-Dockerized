/**
 * Pallet occupancy: how much rack space an inventory line actually consumes.
 *
 * `Inventory.palletCount` stores **units per pallet** — how many pieces fit on
 * one pallet — not the number of pallets the line occupies. Occupancy is
 * therefore derived: `quantity / unitsPerPallet`, rounded up, because a partial
 * pallet still takes a whole pallet position on the rack.
 *
 * This module exists because that division used to be missing: warehouse
 * capacity summed `palletCount` directly, so an item entered as "10 units per
 * pallet" reported 10 pallets regardless of its quantity. A line of 1000 units
 * at 10 per pallet occupies 100 pallet positions, not 10.
 */

/** The pallet-bearing fields of an inventory row; extra fields are ignored. */
export interface PalletOccupancyInput {
  quantity: number | null | undefined;
  /** Units that fit on one pallet. 0/null means "not palletised". */
  palletCount: number | null | undefined;
}

/**
 * tr-Bir envanter kaleminin kapladığı palet gözü sayısını hesaplar
 *    (miktar ÷ palet başına adet, yukarı yuvarlanır).
 * en-Computes the pallet positions one inventory line occupies
 *    (quantity ÷ units-per-pallet, rounded up).
 *
 *    Returns 0 when the item is not palletised (`palletCount` 0/null/negative)
 *    rather than guessing a default: an unset units-per-pallet is missing data,
 *    and inventing a number here would silently inflate warehouse capacity —
 *    the exact failure this module was written to fix.
 * input (item: PalletOccupancyInput)
 * output (number)
 */
export function palletsUsedFor(item: PalletOccupancyInput): number {
  const quantity = item.quantity ?? 0;
  const unitsPerPallet = item.palletCount ?? 0;
  if (!(quantity > 0) || !(unitsPerPallet > 0)) return 0;
  // A partial pallet still occupies a full position, hence ceil.
  return Math.ceil(quantity / unitsPerPallet);
}

/**
 * tr-Bir envanter kalemi listesinin toplam palet doluluğunu hesaplar
 * en-Sums pallet occupancy across a list of inventory lines
 * input (items: PalletOccupancyInput[])
 * output (number)
 */
export function totalPalletsUsed(items: PalletOccupancyInput[]): number {
  return items.reduce((acc, item) => acc + palletsUsedFor(item), 0);
}

/** An inventory row carrying the warehouse it belongs to. */
export interface WarehouseScopedInventoryRow extends PalletOccupancyInput {
  warehouseId: string;
  volumeM3?: number | null;
}

/**
 * tr-Envanter satırlarını depoya göre gruplayıp her deponun palet ve hacim
 *    kullanımını döndürür.
 * en-Folds inventory rows into per-warehouse pallet and volume usage.
 *
 *    Callers used to do this with `groupBy({ _sum: { palletCount } })`, which is
 *    wrong now that occupancy is a per-row division — SQL can't sum a ceiling of
 *    a quotient, so the rows are folded in application code instead.
 * input (rows: WarehouseScopedInventoryRow[])
 * output (Map<string, { pallets: number; volume: number }>)
 */
export function palletUsageByWarehouse(
  rows: WarehouseScopedInventoryRow[]
): Map<string, { pallets: number; volume: number }> {
  const usage = new Map<string, { pallets: number; volume: number }>();
  for (const row of rows) {
    const acc = usage.get(row.warehouseId) ?? { pallets: 0, volume: 0 };
    acc.pallets += palletsUsedFor(row);
    acc.volume += row.volumeM3 ?? 0;
    usage.set(row.warehouseId, acc);
  }
  return usage;
}
