import type {
  InventoryWithRelations,
  LowStockItem,
} from "@/app/lib/type/inventory";

/**
 * Fixed mock data for the Live Demo inventory dashboard. Shape mirrors the
 * return type of fetchInventoryDashboard() in app/hooks/useInventory.ts —
 * { items, totalCount, stats, statsTrends, lowStockItems } — as served by
 * /api/inventory/dashboard.
 */

const WAREHOUSES = [
  { id: "demo-warehouse-0", code: "IST-DC", name: "İstanbul Ana Dağıtım Merkezi" },
  { id: "demo-warehouse-1", code: "ANK-WH", name: "Ankara Bölge Deposu" },
  { id: "demo-warehouse-2", code: "IZM-WH", name: "İzmir Liman Deposu" },
];

const ITEMS: Array<{ name: string; cargoType: string; unit: string }> = [
  { name: "Buzdolabı - No Frost 480L", cargoType: "General Cargo", unit: "adet" },
  { name: "Çamaşır Makinesi 9kg", cargoType: "General Cargo", unit: "adet" },
  { name: "Pamuklu Kumaş Topu", cargoType: "Textile", unit: "top" },
  { name: "Endüstriyel Boya 20L", cargoType: "Hazardous", unit: "varil" },
  { name: "LED Panel 55\"", cargoType: "Fragile", unit: "adet" },
  { name: "Zeytinyağı 5L Teneke", cargoType: "Perishable", unit: "koli" },
  { name: "Fren Balatası Seti", cargoType: "Automotive", unit: "set" },
  { name: "Ofis Sandalyesi", cargoType: "General Cargo", unit: "adet" },
  { name: "Seramik Karo 60x60", cargoType: "Fragile", unit: "palet" },
  { name: "Ambalaj Kolisi (küçük)", cargoType: "Packaging", unit: "koli" },
  { name: "Kağıt Bobin 90gr", cargoType: "General Cargo", unit: "bobin" },
  { name: "Klima Split 12000 BTU", cargoType: "General Cargo", unit: "adet" },
  { name: "Deterjan 15kg", cargoType: "General Cargo", unit: "kova" },
  { name: "Otomobil Lastiği 205/55", cargoType: "Automotive", unit: "adet" },
];

function buildItem(index: number): InventoryWithRelations {
  const item = ITEMS[index % ITEMS.length]!;
  const warehouse = WAREHOUSES[index % WAREHOUSES.length]!;
  const minStock = 20 + (index % 5) * 10;
  // Cycle through healthy / low / out-of-stock so KPIs are populated.
  const mod = index % 6;
  const quantity = mod === 0 ? 0 : mod === 1 ? Math.max(1, minStock - 8) : minStock + 40 + index * 3;
  const unitValue = 150 + index * 45;

  return {
    id: `demo-inventory-${index}`,
    warehouseId: warehouse.id,
    sku: `SKU-${4000 + index}`,
    name: item.name,
    quantity,
    allocatedQuantity: Math.floor(quantity * 0.15),
    minStock,
    weightKg: 5 + index * 2,
    volumeM3: 0.5 + (index % 4) * 0.3,
    palletCount: 1 + (index % 5),
    cargoType: item.cargoType,
    companyId: "demo-company",
    updatedAt: new Date(Date.now() - index * 6 * 60 * 60 * 1000),
    warehouse: { code: warehouse.code, name: warehouse.name },
    imageUrl: null,
    unitValue,
    unit: item.unit,
    currency: "TRY",
  };
}

export function getInventoryMock(): InventoryWithRelations[] {
  return Array.from({ length: 14 }, (_, i) => buildItem(i));
}

export function getInventoryDashboardMock(): {
  items: InventoryWithRelations[];
  totalCount: number;
  stats: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  statsTrends?: {
    totalItems?: { value: number; isUp: boolean };
    lowStock?: { value: number; isUp: boolean };
    outOfStock?: { value: number; isUp: boolean };
  };
  lowStockItems: LowStockItem[];
} {
  const all = getInventoryMock();
  const items = all.slice(0, 10);

  const lowStockCount = all.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minStock
  ).length;
  const outOfStockCount = all.filter((i) => i.quantity === 0).length;
  const totalValue = all.reduce(
    (s, i) => s + i.quantity * (i.unitValue ?? 0),
    0
  );

  const lowStockItems: LowStockItem[] = all
    .filter((i) => i.quantity <= i.minStock)
    .map((i) => ({
      id: i.id,
      warehouseId: i.warehouseId,
      sku: i.sku,
      name: i.name,
      quantity: i.quantity,
      allocatedQuantity: i.allocatedQuantity,
      minStock: i.minStock,
      currency: i.currency,
      weightKg: i.weightKg ?? null,
      volumeM3: i.volumeM3 ?? null,
      palletCount: i.palletCount ?? null,
      cargoType: i.cargoType ?? null,
      companyId: i.companyId ?? null,
      updatedAt: i.updatedAt ?? new Date(),
      warehouse: { name: i.warehouse.name },
    }));

  return {
    items,
    totalCount: all.length,
    stats: {
      totalItems: all.length,
      lowStockCount,
      outOfStockCount,
      totalValue,
    },
    statsTrends: {
      totalItems: { value: 6, isUp: true },
      lowStock: { value: 2, isUp: false },
      outOfStock: { value: 1, isUp: false },
    },
    lowStockItems,
  };
}
