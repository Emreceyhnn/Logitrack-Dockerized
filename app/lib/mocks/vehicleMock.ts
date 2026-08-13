import type {
  VehicleDashboardResponseType,
  VehicleWithRelations,
} from "@/app/lib/type/vehicle";
import type { TrailerWithRelations } from "@/app/lib/type/trailer";
import { VehicleStatus, VehicleType, TrailerStatus, TrailerType } from "@/app/lib/type/enums";

/**
 * Fixed mock data for the Live Demo vehicle dashboard. Shape mirrors
 * fetchVehicleDashboard()'s return type in app/hooks/useVehicles.ts:
 * VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] }.
 */

const PLATES = [
  "34 ABC 123", "06 DEF 456", "35 GHI 789", "16 JKL 321", "01 MNO 654",
  "42 PQR 987", "07 STU 159", "26 VWX 753", "38 YZA 246", "55 BCD 852",
];

const BRANDS: Array<{ brand: string; model: string }> = [
  { brand: "Mercedes-Benz", model: "Actros" },
  { brand: "Volvo", model: "FH16" },
  { brand: "MAN", model: "TGX" },
  { brand: "Scania", model: "R450" },
  { brand: "Ford", model: "Transit" },
];

const STATUS_CYCLE: VehicleStatus[] = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.ON_TRIP,
  VehicleStatus.ON_TRIP,
  VehicleStatus.MAINTENANCE,
  VehicleStatus.AVAILABLE,
  VehicleStatus.ON_TRIP,
  VehicleStatus.OUT_OF_ORDER,
  VehicleStatus.AVAILABLE,
  VehicleStatus.ON_TRIP,
  VehicleStatus.MAINTENANCE,
];

function buildVehicle(index: number): VehicleWithRelations {
  const { brand, model } = BRANDS[index % BRANDS.length]!;
  const status = STATUS_CYCLE[index % STATUS_CYCLE.length]!;
  const type = index % 4 === 0 ? VehicleType.VAN : VehicleType.TRUCK;
  const now = new Date();

  return {
    id: `demo-vehicle-${index}`,
    fleetNo: `FL-${100 + index}`,
    plate: PLATES[index % PLATES.length]!,
    brand,
    model,
    year: 2019 + (index % 6),
    type,
    maxLoadKg: 8000 + index * 500,
    fuelType: index % 5 === 0 ? "ELECTRIC" : "DIESEL",
    nextServiceKm: 5000 + index * 300,
    avgFuelConsumption: 28 + (index % 10),
    status,
    odometerKm: 40000 + index * 8000,
    fuelLevel: 40 + (index % 60),
    fuelCapacity: 400,
    currentLat: 41.0082 - index * 0.04,
    currentLng: 28.9784 + index * 0.04,
    driver:
      status === VehicleStatus.ON_TRIP
        ? {
            id: `demo-driver-${index % 5}`,
            rating: 4.2 + (index % 8) / 10,
            user: {
              name: ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Mustafa"][index % 5]!,
              surname: ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin"][index % 5]!,
              avatarUrl: null,
            },
          }
        : null,
    issues:
      index % 4 === 0
        ? [
            {
              id: `demo-issue-${index}`,
              title: "Brake pad wear warning",
              description: "Sensor flagged front brake pad wear.",
              status: "OPEN",
              priority: "MEDIUM",
              type: "VEHICLE",
              vehicleId: `demo-vehicle-${index}`,
              companyId: "demo-company",
              createdAt: now,
              updatedAt: now,
            },
          ]
        : [],
    documents: [
      {
        id: `demo-doc-reg-${index}`,
        type: "REGISTRATION",
        name: "Vehicle Registration",
        url: "#",
        expiryDate: new Date(now.getTime() + (30 + index * 5) * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
        vehicleId: `demo-vehicle-${index}`,
        companyId: "demo-company",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `demo-doc-ins-${index}`,
        type: "INSURANCE",
        name: "Insurance Policy",
        url: "#",
        expiryDate: new Date(now.getTime() + (5 + index) * 24 * 60 * 60 * 1000),
        status: index % 3 === 0 ? "EXPIRING_SOON" : "ACTIVE",
        vehicleId: `demo-vehicle-${index}`,
        companyId: "demo-company",
        createdAt: now,
        updatedAt: now,
      },
    ],
    maintenanceRecords:
      status === VehicleStatus.MAINTENANCE
        ? [
            {
              id: `demo-maint-${index}`,
              vehicleId: `demo-vehicle-${index}`,
              type: "ROUTINE_MAINTENANCE",
              date: now,
              cost: 1200 + index * 50,
              currency: "USD",
              status: "IN_PROGRESS",
              description: "Scheduled routine maintenance",
              createdAt: now,
              updatedAt: now,
            },
          ]
        : [],
    routes: [],
    photo: null,
    engineSize: "12.8L",
    transmission: "Automatic",
    techNotes: null,
    registrationExpiry: new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000),
    inspectionExpiry: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  } as VehicleWithRelations;
}

export function getVehiclesMock(): VehicleWithRelations[] {
  return Array.from({ length: 12 }, (_, i) => buildVehicle(i));
}

export function getVehicleDashboardMock(): VehicleDashboardResponseType & {
  vehicles: VehicleWithRelations[];
} {
  const vehicles = getVehiclesMock();
  const now = new Date();

  return {
    vehiclesKpis: {
      totalVehicles: vehicles.length,
      available: vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length,
      inService: vehicles.filter((v) => v.status === VehicleStatus.MAINTENANCE).length,
      onTrip: vehicles.filter((v) => v.status === VehicleStatus.ON_TRIP).length,
      openIssues: vehicles.reduce((sum, v) => sum + v.issues.length, 0),
      docsDueSoon: vehicles.reduce(
        (sum, v) => sum + v.documents.filter((d) => d.status === "EXPIRING_SOON").length,
        0
      ),
    },
    vehiclesCapacity: vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      maxLoadKg: v.maxLoadKg,
    })),
    expiringDocs: vehicles
      .flatMap((v) =>
        v.documents
          .filter((d) => d.status === "EXPIRING_SOON")
          .map((d) => ({
            id: d.id,
            plate: v.plate,
            documentType: d.type,
            expiryDate: d.expiryDate ?? null,
          }))
      )
      .slice(0, 6),
    plannedServices: vehicles
      .filter((v) => v.status === VehicleStatus.MAINTENANCE)
      .map((v) => ({
        id: `demo-service-${v.id}`,
        plate: v.plate,
        serviceType: "Routine Maintenance",
        serviceDate: now,
      })),
    kpiTrends: {
      totalVehicles: { value: 4, isUp: true },
    },
    vehicles,
  };
}

const TRAILER_PLATES = [
  "34 TR 001", "06 TR 002", "35 TR 003", "16 TR 004", "01 TR 005", "42 TR 006",
];

const TRAILER_STATUS_CYCLE: TrailerStatus[] = [
  TrailerStatus.AVAILABLE,
  TrailerStatus.IN_USE,
  TrailerStatus.IN_USE,
  TrailerStatus.MAINTENANCE,
  TrailerStatus.AVAILABLE,
  TrailerStatus.RETIRED,
];

const TRAILER_TYPE_CYCLE: TrailerType[] = [
  TrailerType.DRY_VAN,
  TrailerType.REEFER,
  TrailerType.FLATBED,
  TrailerType.TANKER,
  TrailerType.CURTAINSIDE,
  TrailerType.CONTAINER_CHASSIS,
];

function buildTrailer(index: number): TrailerWithRelations {
  const status = TRAILER_STATUS_CYCLE[index % TRAILER_STATUS_CYCLE.length]!;
  const type = TRAILER_TYPE_CYCLE[index % TRAILER_TYPE_CYCLE.length]!;
  return {
    id: `demo-trailer-${index}`,
    fleetNo: `TR-${200 + index}`,
    plate: TRAILER_PLATES[index % TRAILER_PLATES.length]!,
    type,
    capacityVolumeM3: 60 + index * 5,
    maxLoadKg: 20000 + index * 1000,
    isColdChain: type === TrailerType.REEFER,
    status,
    currentVehicleId: status === TrailerStatus.IN_USE ? `demo-vehicle-${index % 12}` : null,
    companyId: "demo-company",
    currentVehicle:
      status === TrailerStatus.IN_USE
        ? {
            id: `demo-vehicle-${index % 12}`,
            plate: PLATES[index % PLATES.length]!,
            fleetNo: `FL-${100 + (index % 12)}`,
          }
        : null,
    assignments: [],
    currentWeightKg: status === TrailerStatus.IN_USE ? 12000 + index * 300 : 0,
    currentVolumeM3: status === TrailerStatus.IN_USE ? 30 + index : 0,
    _count: { shipments: index % 5, issues: index % 3 === 0 ? 1 : 0, documents: 2 },
  } as TrailerWithRelations;
}

export function getTrailersMock(): TrailerWithRelations[] {
  return Array.from({ length: 6 }, (_, i) => buildTrailer(i));
}

export function getTrailerDashboardMock(): {
  trailers: TrailerWithRelations[];
  kpis: { total: number; available: number; inUse: number; maintenance: number; issues: number };
  meta: { total: number; page: number; limit: number };
} {
  const trailers = getTrailersMock();
  return {
    trailers,
    kpis: {
      total: trailers.length,
      available: trailers.filter((t) => t.status === TrailerStatus.AVAILABLE).length,
      inUse: trailers.filter((t) => t.status === TrailerStatus.IN_USE).length,
      maintenance: trailers.filter((t) => t.status === TrailerStatus.MAINTENANCE).length,
      issues: trailers.reduce((sum, t) => sum + (t._count?.issues ?? 0), 0),
    },
    meta: { total: trailers.length, page: 1, limit: 10 },
  };
}
