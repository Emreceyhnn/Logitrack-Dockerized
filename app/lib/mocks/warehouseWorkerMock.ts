import type { WarehouseWorkerDashboard } from "@/app/lib/type/warehouseWorker";

/**
 * Fixed mock dataset for the public Live Demo warehouse-worker panel.
 * Shape matches WarehouseWorkerDashboard exactly (what the real
 * /api/warehouse-worker/dashboard route returns), so the shared WW client and
 * demo state hook render unchanged. No DB, no auth — pure data.
 */
export function getWarehouseWorkerDashboardMock(
  warehouseId?: string
): WarehouseWorkerDashboard {
  const allWarehouses = [
    {
      id: "demo-warehouse-0",
      name: "İstanbul Ana Dağıtım Merkezi",
      code: "IST-DC",
      city: "İstanbul",
    },
    {
      id: "demo-warehouse-1",
      name: "Ankara Bölge Deposu",
      code: "ANK-WH",
      city: "Ankara",
    },
    {
      id: "demo-warehouse-2",
      name: "İzmir Liman Deposu",
      code: "IZM-WH",
      city: "İzmir",
    },
  ];
  const selectedWh =
    allWarehouses.find((w) => w.id === warehouseId) ?? allWarehouses[0]!;

  const configMap: Record<
    string,
    {
      capacity: { used: number; total: number; pct: number; free: number };
      zones: Array<{
        code: string;
        capacityPallets: number;
        usedPallets: number;
        pct: number;
      }>;
    }
  > = {
    "demo-warehouse-0": {
      capacity: { used: 3650, total: 5000, pct: 73, free: 1350 },
      zones: [
        { code: "A", capacityPallets: 1500, usedPallets: 1365, pct: 91 },
        { code: "B", capacityPallets: 1500, usedPallets: 960, pct: 64 },
        { code: "C", capacityPallets: 1000, usedPallets: 470, pct: 47 },
        { code: "D", capacityPallets: 1000, usedPallets: 855, pct: 86 },
      ],
    },
    "demo-warehouse-1": {
      capacity: { used: 3712, total: 5800, pct: 64, free: 2088 },
      zones: [
        { code: "A", capacityPallets: 1800, usedPallets: 1440, pct: 80 },
        { code: "B", capacityPallets: 1500, usedPallets: 900, pct: 60 },
        { code: "C", capacityPallets: 1500, usedPallets: 750, pct: 50 },
        { code: "D", capacityPallets: 1000, usedPallets: 622, pct: 62 },
      ],
    },
    "demo-warehouse-2": {
      capacity: { used: 5412, total: 6600, pct: 82, free: 1188 },
      zones: [
        { code: "A", capacityPallets: 2000, usedPallets: 1820, pct: 91 },
        { code: "B", capacityPallets: 2000, usedPallets: 1600, pct: 80 },
        { code: "C", capacityPallets: 1400, usedPallets: 1120, pct: 80 },
        { code: "D", capacityPallets: 1200, usedPallets: 872, pct: 73 },
      ],
    },
  };

  const currentConfig =
    configMap[selectedWh.id] ?? configMap["demo-warehouse-0"]!;

  return {
    warehouse: {
      id: selectedWh.id,
      name: selectedWh.name,
      code: selectedWh.code,
      city: selectedWh.city,
    },
    warehouses: allWarehouses.map(({ id, name, code }) => ({ id, name, code })),
    worker: {
      name: "Demo Depo Görevlisi",
      initials: "DG",
      role: "WAREHOUSE_WORKER",
    },
    // The demo panel is fully interactive (mutations are simulated in-memory).
    canWrite: true,
    kpis: {
      picks: 342,
      picksTarget: 400,
      packs: 298,
      packsTarget: 350,
      rate: 47,
    },
    tasks: [
      {
        id: "demo-task-1",
        kind: "PICK",
        name: "Palet Sarma Filmi",
        orderRef: "ORD-24815",
        zone: "A",
        done: 6,
        total: 12,
        priority: "HIGH",
        complete: false,
      },
      {
        id: "demo-task-2",
        kind: "PACK",
        name: "Karton Kutu (Orta)",
        orderRef: "ORD-24816",
        zone: "B",
        done: 0,
        total: 8,
        priority: "MEDIUM",
        complete: false,
      },
      {
        id: "demo-task-3",
        kind: "PUT",
        name: "Streç Bant",
        orderRef: "ORD-24817",
        zone: "C",
        done: 3,
        total: 10,
        priority: "HIGH",
        complete: false,
      },
      {
        id: "demo-task-4",
        kind: "PICK",
        name: "Ahşap Palet",
        orderRef: "ORD-24818",
        zone: "A",
        done: 20,
        total: 20,
        priority: "LOW",
        complete: true,
      },
      {
        id: "demo-task-5",
        kind: "PACK",
        name: "Köpük Dolgu",
        orderRef: "ORD-24819",
        zone: "D",
        done: 2,
        total: 15,
        priority: "MEDIUM",
        complete: false,
      },
    ],
    zones: currentConfig.zones,
    feed: [
      {
        id: "demo-mv-1",
        type: "PICK",
        name: "Palet Sarma Filmi",
        sku: "SKU-2231",
        qty: 4,
        zone: "A",
        who: "Demo Depo Görevlisi",
        self: true,
        at: new Date(Date.now() - 2 * 60_000).toISOString(),
      },
      {
        id: "demo-mv-2",
        type: "PACK",
        name: "Karton Kutu (Orta)",
        sku: "SKU-1094",
        qty: 8,
        zone: "B",
        who: "Mehmet Yılmaz",
        self: false,
        at: new Date(Date.now() - 9 * 60_000).toISOString(),
      },
      {
        id: "demo-mv-3",
        type: "STOCK_IN",
        name: "Ahşap Palet",
        sku: "SKU-7788",
        qty: 40,
        zone: "A",
        who: "System",
        self: false,
        at: new Date(Date.now() - 24 * 60_000).toISOString(),
      },
      {
        id: "demo-mv-4",
        type: "PUTAWAY",
        name: "Streç Bant",
        sku: "SKU-3310",
        qty: 12,
        zone: "C",
        who: "Ayşe Demir",
        self: false,
        at: new Date(Date.now() - 41 * 60_000).toISOString(),
      },
    ],
    catalog: [
      {
        sku: "SKU-2231",
        name: "Palet Sarma Filmi",
        zone: "A",
        quantity: 12,
        available: 8,
        minStock: 50,
        lowStock: true,
      },
      {
        sku: "SKU-1094",
        name: "Karton Kutu (Orta)",
        zone: "B",
        quantity: 30,
        available: 24,
        minStock: 100,
        lowStock: true,
      },
      {
        sku: "SKU-7788",
        name: "Ahşap Palet",
        zone: "A",
        quantity: 420,
        available: 380,
        minStock: 100,
        lowStock: false,
      },
      {
        sku: "SKU-3310",
        name: "Streç Bant",
        zone: "C",
        quantity: 210,
        available: 190,
        minStock: 80,
        lowStock: false,
      },
      {
        sku: "SKU-5521",
        name: "Kırılır Etiketi",
        zone: "D",
        quantity: 8,
        available: 8,
        minStock: 40,
        lowStock: true,
      },
    ],
    lowStock: [
      {
        sku: "SKU-2231",
        name: "Palet Sarma Filmi",
        zone: "A",
        available: 8,
        minStock: 50,
        suggestedQty: 42,
      },
      {
        sku: "SKU-1094",
        name: "Karton Kutu (Orta)",
        zone: "B",
        available: 24,
        minStock: 100,
        suggestedQty: 76,
      },
      {
        sku: "SKU-5521",
        name: "Kırılır Etiketi",
        zone: "D",
        available: 8,
        minStock: 40,
        suggestedQty: 32,
      },
    ],
    // Every demo SKU carries a surveyed zone, so nothing is unlocated.
    unassignedPallets: 0,
    capacity: currentConfig.capacity,
  };
}
