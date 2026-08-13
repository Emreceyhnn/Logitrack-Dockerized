import type {
  DriverWithRelations,
  DriverDashboardResponseType,
} from "@/app/lib/type/driver";
import { DriverStatus } from "@/app/lib/type/enums";

/**
 * Fixed mock data for the Live Demo drivers dashboard. Shape mirrors the
 * return type of fetchDriverDashboard() in app/hooks/useDrivers.ts —
 * { drivers, meta, driversKpis, topPerformers, performanceCharts, kpiTrends } —
 * as served by /api/drivers/dashboard.
 */

const DRIVERS: Array<{ name: string; surname: string; base: string }> = [
  { name: "Ahmet", surname: "Yılmaz", base: "İstanbul Merkez" },
  { name: "Mehmet", surname: "Kaya", base: "Ankara Depo" },
  { name: "Ayşe", surname: "Demir", base: "İzmir Liman" },
  { name: "Fatma", surname: "Çelik", base: "Bursa Depo" },
  { name: "Mustafa", surname: "Şahin", base: "Antalya Depo" },
  { name: "Emre", surname: "Aydın", base: "İstanbul Merkez" },
  { name: "Zeynep", surname: "Arslan", base: "Adana Depo" },
  { name: "Hasan", surname: "Doğan", base: "Konya Depo" },
  { name: "Elif", surname: "Kılıç", base: "Gaziantep Depo" },
  { name: "Ali", surname: "Öztürk", base: "İstanbul Merkez" },
  { name: "Merve", surname: "Yıldız", base: "İzmir Liman" },
  { name: "Burak", surname: "Aksoy", base: "Trabzon Depo" },
  { name: "Selin", surname: "Erdoğan", base: "Ankara Depo" },
  { name: "Onur", surname: "Koç", base: "Bursa Depo" },
];

const STATUS_CYCLE: DriverStatus[] = [
  DriverStatus.ON_JOB,
  DriverStatus.ON_JOB,
  DriverStatus.OFF_DUTY,
  DriverStatus.ON_JOB,
  DriverStatus.ON_LEAVE,
  DriverStatus.OFF_DUTY,
  DriverStatus.ON_JOB,
];

const PLATES = [
  "34 ABC 123",
  "06 XYZ 456",
  "35 DEF 789",
  "16 GHI 012",
  "07 JKL 345",
];

function buildDriver(index: number): DriverWithRelations {
  const d = DRIVERS[index % DRIVERS.length]!;
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!;
  const hasVehicle = status === DriverStatus.ON_JOB;
  const createdAt = new Date(Date.now() - (30 - index) * 24 * 60 * 60 * 1000);
  const licenseExpiry = new Date(Date.now() + (index % 6 === 0 ? -10 : 200) * 24 * 60 * 60 * 1000);

  return {
    id: `demo-driver-${index}`,
    status,
    phone: `+90 5${(30 + index).toString().slice(0, 2)} 555 ${(1000 + index).toString().slice(0, 4)}`,
    employeeId: `EMP-${1000 + index}`,
    licenseNumber: `TR-${900000 + index}`,
    licenseType: index % 2 === 0 ? "C+E" : "B",
    licenseExpiry,
    rating: 4.9 - (index % 5) * 0.3,
    efficiencyScore: 92 - (index % 7) * 3,
    safetyScore: 96 - (index % 5) * 4,
    hazmatCertified: index % 3 === 0,
    languages: index % 2 === 0 ? ["tr", "en"] : ["tr"],
    homeBaseWarehouseId: `demo-warehouse-${index % 3}`,
    user: {
      id: `demo-user-${index}`,
      name: d.name,
      surname: d.surname,
      email: `${d.name.toLowerCase()}.${d.surname.toLowerCase()}@logitrack.com`,
      avatarUrl: null,
      roleId: "demo-role-driver",
    },
    currentVehicle: hasVehicle
      ? {
          id: `demo-vehicle-${index % 5}`,
          plate: PLATES[index % PLATES.length]!,
          brand: index % 2 === 0 ? "Mercedes" : "Ford",
          model: index % 2 === 0 ? "Actros" : "Cargo",
        }
      : null,
    homeBaseWarehouse: {
      id: `demo-warehouse-${index % 3}`,
      name: d.base,
      code: `WH-${index % 3}`,
    },
    _count: {
      shipments: 8 + (index % 15),
      issues: index % 6 === 0 ? 1 : 0,
    },
    documents: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function getDriversMock(): DriverWithRelations[] {
  return Array.from({ length: 14 }, (_, i) => buildDriver(i));
}

export function getDriversDashboardMock(): {
  drivers: DriverWithRelations[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  driversKpis: DriverDashboardResponseType["driversKpis"];
  topPerformers: DriverDashboardResponseType["topPerformers"];
  performanceCharts: DriverDashboardResponseType["performanceCharts"];
  kpiTrends: DriverDashboardResponseType["kpiTrends"];
} {
  const all = getDriversMock();
  const drivers = all.slice(0, 10);

  const onDuty = all.filter((d) => d.status === DriverStatus.ON_JOB).length;
  const offDuty = all.filter((d) => d.status === DriverStatus.OFF_DUTY).length;
  const onLeave = all.filter((d) => d.status === DriverStatus.ON_LEAVE).length;
  const complianceIssues = all.filter(
    (d) => d.licenseExpiry && d.licenseExpiry.getTime() < Date.now()
  ).length;

  const performanceCharts: DriverDashboardResponseType["performanceCharts"] =
    all.slice(0, 8).map((d, i) => ({
      name: `${d.user.name} ${d.user.surname}`,
      rating: d.rating ?? 0,
      workingHours: 32 + (i % 8) * 2,
      safetyScore: d.safetyScore ?? 0,
      efficiencyScore: d.efficiencyScore ?? 0,
      weeklyDelivered: 12 + (i % 10),
      weeklyDelayed: i % 4 === 0 ? 1 : 0,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [4, 6, 5, 8, 7, 3, 2].map((v) => v + i),
    }));

  return {
    drivers,
    meta: {
      total: all.length,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(all.length / 10),
    },
    driversKpis: {
      totalDrivers: all.length,
      onDuty,
      offDuty,
      onLeave,
      complianceIssues,
      avgSafetyScore:
        all.reduce((s, d) => s + (d.safetyScore ?? 0), 0) / all.length,
      avgEfficiencyScore:
        all.reduce((s, d) => s + (d.efficiencyScore ?? 0), 0) / all.length,
    },
    topPerformers: all.slice(0, 5).map((d) => ({
      id: d.id,
      name: d.user.name,
      surname: d.user.surname,
      rating: d.rating ?? 0,
      tripsCompleted: d._count?.shipments ?? 0,
    })),
    performanceCharts,
    kpiTrends: {
      totalDrivers: { value: 8, isUp: true },
    },
  };
}
