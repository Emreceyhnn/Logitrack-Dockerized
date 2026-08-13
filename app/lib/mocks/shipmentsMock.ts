import type {
  ShipmentWithRelations,
  ShipmentStats,
  ShipmentVolumeData,
  ShipmentStatusData,
} from "@/app/lib/type/shipment";
import {
  ShipmentStatus,
  ShipmentPriority,
  ShipmentServiceType,
} from "@/app/lib/type/enums";

/**
 * Fixed mock data for the Live Demo shipments dashboard. Shape mirrors the
 * return type of fetchShipmentDashboard() in app/hooks/useShipments.ts —
 * { shipments, totalCount, stats, statsTrends, volumeHistory,
 * statusDistribution } — as served by /api/shipments/dashboard.
 */

const TR_ROUTES: Array<{ origin: string; destination: string }> = [
  { origin: "İstanbul", destination: "Ankara" },
  { origin: "İzmir", destination: "Bursa" },
  { origin: "Ankara", destination: "Antalya" },
  { origin: "İstanbul", destination: "Adana" },
  { origin: "Bursa", destination: "Konya" },
  { origin: "Antalya", destination: "İzmir" },
  { origin: "Gaziantep", destination: "İstanbul" },
  { origin: "Konya", destination: "Mersin" },
  { origin: "İstanbul", destination: "Trabzon" },
  { origin: "Ankara", destination: "Samsun" },
];

const CUSTOMER_NAMES = [
  "Anadolu Lojistik A.Ş.",
  "Marmara Tekstil",
  "Ege Elektronik",
  "Boğaziçi Gıda San.",
  "Karadeniz Otomotiv",
  "Akdeniz İnşaat",
  "Trakya Kimya",
  "Orta Anadolu Makine",
];

const STATUS_CYCLE: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.PROCESSING,
  ShipmentStatus.ASSIGNED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.DELAYED,
  ShipmentStatus.FAILED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.CANCELLED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.PENDING,
  ShipmentStatus.PROCESSING,
  ShipmentStatus.ASSIGNED,
  ShipmentStatus.DELIVERED,
];

const PRIORITY_CYCLE: ShipmentPriority[] = [
  ShipmentPriority.LOW,
  ShipmentPriority.MEDIUM,
  ShipmentPriority.HIGH,
  ShipmentPriority.CRITICAL,
];

const TYPE_CYCLE: ShipmentServiceType[] = [
  ShipmentServiceType.STANDARD_FREIGHT,
  ShipmentServiceType.EXPRESS,
  ShipmentServiceType.HAZARDOUS,
];

const DRIVER_NAMES: Array<{ name: string; surname: string }> = [
  { name: "Ahmet", surname: "Yılmaz" },
  { name: "Mehmet", surname: "Kaya" },
  { name: "Ayşe", surname: "Demir" },
  { name: "Fatma", surname: "Çelik" },
  { name: "Mustafa", surname: "Şahin" },
];

function buildShipment(index: number): ShipmentWithRelations {
  const route = TR_ROUTES[index % TR_ROUTES.length]!;
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!;
  const priority = PRIORITY_CYCLE[index % PRIORITY_CYCLE.length]!;
  const type = TYPE_CYCLE[index % TYPE_CYCLE.length]!;
  const customerName = CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]!;
  const driver = DRIVER_NAMES[index % DRIVER_NAMES.length]!;
  const createdAt = new Date(Date.now() - (20 - index) * 24 * 60 * 60 * 1000);
  const hasDriver = status !== ShipmentStatus.PENDING && status !== ShipmentStatus.CANCELLED;

  return {
    id: `demo-shipment-${index}`,
    trackingId: `SHP-${10000 + index}`,
    customerId: `demo-customer-${index % CUSTOMER_NAMES.length}`,
    customerLocationId: `demo-location-${index % CUSTOMER_NAMES.length}`,
    driverId: hasDriver ? `demo-driver-${index % DRIVER_NAMES.length}` : null,
    status,
    origin: route.origin,
    originWarehouseId: `demo-warehouse-${index % 3}`,
    originLat: 41.0082 - index * 0.05,
    originLng: 28.9784 + index * 0.05,
    destination: route.destination,
    destinationLat: 39.9334 - index * 0.03,
    destinationLng: 32.8597 + index * 0.03,
    itemsCount: 5 + (index % 12),
    priority,
    type,
    slaDeadline: new Date(Date.now() + (index % 5) * 24 * 60 * 60 * 1000),
    weightKg: 200 + index * 37,
    volumeM3: 2 + (index % 8),
    palletCount: 1 + (index % 6),
    cargoType: index % 3 === 0 ? "General Cargo" : index % 3 === 1 ? "Perishable" : "Fragile",
    contactEmail: `contact${index}@example.com`,
    billingAccount: `BILL-${2000 + index}`,
    routeId: hasDriver ? `demo-route-${index % 4}` : null,
    trailerId: null,
    companyId: "demo-company",
    createdAt,
    updatedAt: createdAt,
    referenceNumber: `REF-${5000 + index}`,
    customer: {
      id: `demo-customer-${index % CUSTOMER_NAMES.length}`,
      code: `CUST-${index % CUSTOMER_NAMES.length}`,
      name: customerName,
      industry: "Logistics",
      taxId: `TAX-${9000 + index}`,
      email: `info@${customerName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      phone: "+90 212 555 00 00",
      companyId: "demo-company",
    },
    driver: hasDriver
      ? {
          id: `demo-driver-${index % DRIVER_NAMES.length}`,
          user: {
            name: driver.name,
            surname: driver.surname,
            avatarUrl: null,
          },
        }
      : null,
    route: hasDriver
      ? {
          id: `demo-route-${index % 4}`,
          name: `${route.origin} → ${route.destination}`,
          status: "ACTIVE",
          date: createdAt,
          distanceKm: 300 + index * 12,
          durationMin: 240 + index * 8,
          driverId: `demo-driver-${index % DRIVER_NAMES.length}`,
          vehicleId: `demo-vehicle-${index % 10}`,
          companyId: "demo-company",
        }
      : null,
  } as ShipmentWithRelations;
}

export function getShipmentsMock(): ShipmentWithRelations[] {
  return Array.from({ length: 18 }, (_, i) => buildShipment(i));
}

export function getShipmentsDashboardMock(): {
  shipments: ShipmentWithRelations[];
  totalCount: number;
  stats: ShipmentStats;
  statsTrends?: {
    total?: { value: number; isUp: boolean };
    active?: { value: number; isUp: boolean };
    delayed?: { value: number; isUp: boolean };
    inTransit?: { value: number; isUp: boolean };
  };
  volumeHistory: ShipmentVolumeData[];
  statusDistribution: ShipmentStatusData[];
} {
  const shipments = getShipmentsMock();

  const stats: ShipmentStats = {
    total: shipments.length,
    active: shipments.filter((s) =>
      (
        [ShipmentStatus.PROCESSING, ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT] as ShipmentStatus[]
      ).includes(s.status)
    ).length,
    delayed: shipments.filter((s) => s.status === ShipmentStatus.DELAYED).length,
    inTransit: shipments.filter((s) => s.status === ShipmentStatus.IN_TRANSIT).length,
  };

  const volumeHistory: ShipmentVolumeData[] = [
    { day: "Mon", volume: 22 },
    { day: "Tue", volume: 28 },
    { day: "Wed", volume: 19 },
    { day: "Thu", volume: 33 },
    { day: "Fri", volume: 41 },
    { day: "Sat", volume: 15 },
    { day: "Sun", volume: 9 },
  ];

  const statusDistribution: ShipmentStatusData[] = Object.values(ShipmentStatus).map((status) => ({
    status,
    count: shipments.filter((s) => s.status === status).length,
  }));

  return {
    shipments,
    totalCount: shipments.length,
    stats,
    statsTrends: {
      total: { value: 9, isUp: true },
      active: { value: 14, isUp: true },
      delayed: { value: 3, isUp: false },
      inTransit: { value: 6, isUp: true },
    },
    volumeHistory,
    statusDistribution,
  };
}
