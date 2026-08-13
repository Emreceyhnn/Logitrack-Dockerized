import type {
  WarehouseWithRelations,
  WarehouseStats,
  InventoryMovementWithRelations,
} from "@/app/lib/type/warehouse";
import { WarehouseType } from "@/app/lib/type/enums";

/**
 * Fixed mock data for the Live Demo warehouses dashboard. Shape mirrors the
 * return type of fetchWarehouseDashboard() in app/hooks/useWarehouses.ts —
 * { warehouses, totalCount, stats, statsTrends, recentMovements } — as served
 * by /api/warehouses/dashboard.
 */

const WAREHOUSES: Array<{
  name: string;
  code: string;
  city: string;
  type: WarehouseType;
  lat: number;
  lng: number;
}> = [
  { name: "İstanbul Ana Dağıtım Merkezi", code: "IST-DC", city: "İstanbul", type: WarehouseType.DISTRIBUTION_CENTER, lat: 41.0082, lng: 28.9784 },
  { name: "Ankara Bölge Deposu", code: "ANK-WH", city: "Ankara", type: WarehouseType.WAREHOUSE, lat: 39.9334, lng: 32.8597 },
  { name: "İzmir Liman Deposu", code: "IZM-WH", city: "İzmir", type: WarehouseType.WAREHOUSE, lat: 38.4237, lng: 27.1428 },
  { name: "Bursa Çapraz Sevk", code: "BUR-XD", city: "Bursa", type: WarehouseType.CROSSDOCK, lat: 40.1826, lng: 29.0665 },
  { name: "Antalya Bölge Deposu", code: "ANT-WH", city: "Antalya", type: WarehouseType.WAREHOUSE, lat: 36.8969, lng: 30.7133 },
  { name: "Adana Dağıtım Merkezi", code: "ADA-DC", city: "Adana", type: WarehouseType.DISTRIBUTION_CENTER, lat: 37.0, lng: 35.3213 },
  { name: "Gaziantep Çapraz Sevk", code: "GAZ-XD", city: "Gaziantep", type: WarehouseType.CROSSDOCK, lat: 37.0662, lng: 37.3833 },
  { name: "Konya Bölge Deposu", code: "KON-WH", city: "Konya", type: WarehouseType.WAREHOUSE, lat: 37.8746, lng: 32.4932 },
];

const MANAGERS = [
  { name: "Kemal", surname: "Yıldız" },
  { name: "Ayşe", surname: "Demir" },
  { name: "Serkan", surname: "Aksoy" },
  { name: "Deniz", surname: "Kara" },
];

function buildWarehouse(index: number): WarehouseWithRelations {
  const w = WAREHOUSES[index % WAREHOUSES.length]!;
  const manager = MANAGERS[index % MANAGERS.length]!;
  const createdAt = new Date(Date.now() - (60 - index * 5) * 24 * 60 * 60 * 1000);
  const capacityPallets = 5000 + index * 800;
  const capacityVolumeM3 = 12000 + index * 1500;
  const occupancyRates = [0.73, 0.64, 0.82, 0.55, 0.89, 0.61, 0.77, 0.68];
  const rate = occupancyRates[index % occupancyRates.length] ?? 0.7;
  const usedPallets = Math.round(capacityPallets * rate);
  const usedVolume = Math.round(capacityVolumeM3 * rate);

  return {
    id: `demo-warehouse-${index}`,
    code: w.code,
    name: w.name,
    type: w.type,
    address: `${w.city} Organize Sanayi Bölgesi No:${10 + index}`,
    city: w.city,
    country: "Türkiye",
    lat: w.lat,
    lng: w.lng,
    capacityPallets,
    capacityVolumeM3,
    usedPallets,
    usedVolume,
    operatingHours: "08:00 - 20:00",
    timezone: "Europe/Istanbul",
    specifications:
      index % 2 === 0
        ? ["Cold Storage", "Hazmat Certified", "24/7 Security"]
        : ["Ambient", "Loading Docks x8"],
    managerId: `demo-manager-${index % MANAGERS.length}`,
    companyId: "demo-company",
    createdAt,
    updatedAt: createdAt,
    manager: {
      id: `demo-manager-${index % MANAGERS.length}`,
      name: manager.name,
      surname: manager.surname,
      email: `${manager.name.toLowerCase()}.${manager.surname.toLowerCase()}@logitrack.com`,
      avatarUrl: null,
    },
    _count: {
      inventory: 120 + index * 35,
      drivers: 4 + (index % 6),
    },
  };
}

export function getWarehousesMock(): WarehouseWithRelations[] {
  return Array.from({ length: 8 }, (_, i) => buildWarehouse(i));
}

const MOVEMENT_TYPES = ["INBOUND", "OUTBOUND", "TRANSFER", "ADJUSTMENT"];
const ITEM_NAMES = [
  "Palet - Beyaz Eşya",
  "Koli - Tekstil",
  "Varil - Kimyasal",
  "Kutu - Elektronik",
  "Palet - Gıda",
  "Koli - Otomotiv Parça",
];

function buildMovement(index: number): InventoryMovementWithRelations {
  const w = WAREHOUSES[index % WAREHOUSES.length]!;
  return {
    id: `demo-movement-${index}`,
    warehouseId: `demo-warehouse-${index % WAREHOUSES.length}`,
    sku: `SKU-${4000 + index}`,
    quantity: (index % 2 === 0 ? 1 : -1) * (10 + index * 3),
    type: MOVEMENT_TYPES[index % MOVEMENT_TYPES.length]!,
    date: new Date(Date.now() - index * 3 * 60 * 60 * 1000),
    warehouse: { code: w.code, name: w.name },
    itemName: ITEM_NAMES[index % ITEM_NAMES.length]!,
  };
}

export function getWarehousesDashboardMock(): {
  warehouses: WarehouseWithRelations[];
  totalCount: number;
  stats: WarehouseStats;
  statsTrends?: { totalWarehouses?: { value: number; isUp: boolean } };
  recentMovements: InventoryMovementWithRelations[];
} {
  const warehouses = getWarehousesMock();

  const stats: WarehouseStats = {
    totalWarehouses: warehouses.length,
    totalSkus: 2140,
    totalItems: 184320,
    totalCapacityPallets: warehouses.reduce(
      (s, w) => s + (w.capacityPallets ?? 0),
      0
    ),
    totalCapacityVolume: warehouses.reduce(
      (s, w) => s + (w.capacityVolumeM3 ?? 0),
      0
    ),
  };

  const recentMovements = Array.from({ length: 12 }, (_, i) => buildMovement(i));

  return {
    warehouses,
    totalCount: warehouses.length,
    stats,
    statsTrends: {
      totalWarehouses: { value: 2, isUp: true },
    },
    recentMovements,
  };
}
