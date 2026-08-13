import type {
  RouteWithRelations,
  RouteStats,
  RouteEfficiencyStats,
  MapRouteData,
} from "@/app/lib/type/routes";
import { RouteStatus } from "@/app/lib/type/enums";

/**
 * Fixed mock data for the Live Demo routes dashboard. Shape mirrors the return
 * type of getRoutesWithDashboardData() / GET /api/routes/dashboard —
 * { routes, totalCount, stats, statsTrends, efficiency, mapData }.
 */

const ROUTE_LEGS: Array<{ origin: string; destination: string; oLat: number; oLng: number; dLat: number; dLng: number }> = [
  { origin: "İstanbul Depo", destination: "Ankara Merkez", oLat: 41.0082, oLng: 28.9784, dLat: 39.9334, dLng: 32.8597 },
  { origin: "İzmir Liman", destination: "Bursa OSB", oLat: 38.4237, oLng: 27.1428, dLat: 40.1826, dLng: 29.0665 },
  { origin: "Ankara Merkez", destination: "Antalya Terminal", oLat: 39.9334, oLng: 32.8597, dLat: 36.8969, dLng: 30.7133 },
  { origin: "İstanbul Depo", destination: "Adana Depo", oLat: 41.0082, oLng: 28.9784, dLat: 37.0000, dLng: 35.3213 },
  { origin: "Bursa OSB", destination: "Konya Depo", oLat: 40.1826, oLng: 29.0665, dLat: 37.8746, dLng: 32.4932 },
  { origin: "Gaziantep Depo", destination: "İstanbul Depo", oLat: 37.0662, oLng: 37.3833, dLat: 41.0082, dLng: 28.9784 },
];

const DRIVERS = [
  { name: "Ahmet", surname: "Yılmaz" },
  { name: "Mehmet", surname: "Kaya" },
  { name: "Ayşe", surname: "Demir" },
  { name: "Mustafa", surname: "Şahin" },
  { name: "Emre", surname: "Aydın" },
];

const PLATES = ["34 ABC 123", "06 XYZ 456", "35 DEF 789", "16 GHI 012", "27 JKL 345"];

const STATUS_CYCLE: RouteStatus[] = [
  RouteStatus.ACTIVE,
  RouteStatus.ACTIVE,
  RouteStatus.PLANNED,
  RouteStatus.COMPLETED,
  RouteStatus.ACTIVE,
  RouteStatus.PLANNED,
  RouteStatus.COMPLETED,
  RouteStatus.ACTIVE,
  RouteStatus.PLANNED,
  RouteStatus.COMPLETED,
  RouteStatus.ACTIVE,
  RouteStatus.PLANNED,
];

function buildRoute(index: number): RouteWithRelations {
  const leg = ROUTE_LEGS[index % ROUTE_LEGS.length]!;
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!;
  const driver = DRIVERS[index % DRIVERS.length]!;
  const date = new Date(Date.now() - (12 - index) * 24 * 60 * 60 * 1000);
  const endTime = new Date(date.getTime() + (4 + (index % 6)) * 60 * 60 * 1000);

  return {
    id: `demo-route-${index}`,
    name: `${leg.origin} → ${leg.destination}`,
    status,
    date,
    startTime: date,
    endTime,
    distanceKm: 250 + index * 45,
    durationMin: 210 + index * 25,
    stops: [
      { address: leg.origin, lat: leg.oLat, lng: leg.oLng },
      { address: leg.destination, lat: leg.dLat, lng: leg.dLng },
    ],
    driverId: `demo-driver-${index % DRIVERS.length}`,
    vehicleId: `demo-vehicle-${index % PLATES.length}`,
    companyId: "demo-company",
    shape: null,
    bufferMeters: null,
    createdAt: date,
    updatedAt: date,
    vehicle: {
      id: `demo-vehicle-${index % PLATES.length}`,
      plate: PLATES[index % PLATES.length]!,
      type: "TRUCK",
      brand: index % 2 === 0 ? "Mercedes" : "Ford",
      model: index % 2 === 0 ? "Actros" : "Cargo",
      currentLat: leg.oLat,
      currentLng: leg.oLng,
      fuelLevel: 45 + (index % 50),
    },
    driver: {
      id: `demo-driver-${index % DRIVERS.length}`,
      status: "ON_JOB",
      phone: "+90 555 000 00 00",
      employeeId: `EMP-${1000 + index}`,
      licenseNumber: `TR-${900000 + index}`,
      licenseType: "C+E",
      licenseExpiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      rating: 4.6,
      efficiencyScore: 88,
      safetyScore: 92,
      createdAt: date,
      updatedAt: date,
      user: {
        id: `demo-user-${index}`,
        name: driver.name,
        surname: driver.surname,
        avatarUrl: null,
      },
    },
    shipments: [],
  };
}

export function getRoutesMock(): RouteWithRelations[] {
  return Array.from({ length: 12 }, (_, i) => buildRoute(i));
}

export function getRoutesDashboardMock(): {
  routes: RouteWithRelations[];
  totalCount: number;
  stats: RouteStats;
  statsTrends?: {
    active?: { value: number; isUp: boolean };
    completedToday?: { value: number; isUp: boolean };
    delayed?: { value: number; isUp: boolean };
  };
  efficiency: RouteEfficiencyStats;
  mapData: MapRouteData[];
} {
  const routes = getRoutesMock();

  const stats: RouteStats = {
    active: routes.filter((r) => r.status === RouteStatus.ACTIVE).length,
    inProgress: routes.filter((r) => r.status === RouteStatus.ACTIVE).length,
    completedToday: routes.filter((r) => r.status === RouteStatus.COMPLETED).length,
    delayed: 2,
  };

  const efficiency: RouteEfficiencyStats = {
    fuelConsumption: 24.5,
    onTimePerformance: 89,
    vehicleUtilization: 76,
    recentNotifications: [
      {
        id: "demo-notif-1",
        title: "Route delayed",
        message: "İstanbul → Ankara is 25 min behind schedule.",
        date: new Date(Date.now() - 60 * 60 * 1000),
        type: "warning",
      },
      {
        id: "demo-notif-2",
        title: "Route completed",
        message: "İzmir → Bursa delivered on time.",
        date: new Date(Date.now() - 3 * 60 * 60 * 1000),
        type: "info",
      },
      {
        id: "demo-notif-3",
        title: "Corridor deviation",
        message: "Ankara → Antalya left the planned corridor near Afyon.",
        date: new Date(Date.now() - 5 * 60 * 60 * 1000),
        type: "error",
      },
    ],
  };

  const mapData: MapRouteData[] = routes
    .filter((r) => r.status === RouteStatus.ACTIVE && r.vehicle)
    .map((r) => ({
      position: {
        lat: r.vehicle!.currentLat ?? 39.0,
        lng: r.vehicle!.currentLng ?? 35.0,
      },
      name: r.vehicle!.plate,
      id: r.vehicle!.id,
      type: "vehicle",
      routeId: r.id,
      routeName: r.name ?? null,
    }));

  return {
    routes,
    totalCount: routes.length,
    stats,
    statsTrends: {
      active: { value: 12, isUp: true },
      completedToday: { value: 6, isUp: true },
      delayed: { value: 4, isUp: false },
    },
    efficiency,
    mapData,
  };
}
