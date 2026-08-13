// Server/shared types for the driver-console feature. Mirrors the shape of
// app/lib/type/warehouseWorker.ts for the analogous Driver-role self-service
// console.

import type { DocumentStatus } from "@prisma/client";
import type { DeviationOutcome } from "@/app/lib/services/routeDeviation";

export interface DCDriverProfile {
  id: string;
  name: string;
  initials: string;
  employeeId: string;
  phone: string;
  status: "ON_JOB" | "OFF_DUTY" | "ON_LEAVE";
  safetyScore: number | null;
  efficiencyScore: number | null;
  rating: number | null;
  hazmatCertified: boolean;
  languages: string[];
  licenseExpiry: string | null;
  homeBaseWarehouse: { id: string; name: string; code: string; city: string } | null;
}

export interface DCVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  fleetNo: string;
  fuelLevel: number | null;
  fuelCapacity: number | null;
  odometerKm: number | null;
  currentLat: number | null;
  currentLng: number | null;
}

export interface DCRouteStop {
  id: string;
  sequence: number;
  address: string;
  lat: number | null;
  lng: number | null;
  arrivedAt: string | null;
}

export interface DCDeviation {
  status: DeviationOutcome["status"];
  distanceMeters: number | null;
  bufferMeters: number;
}

export interface DCActiveRoute {
  id: string;
  status: "PLANNED" | "ACTIVE";
  date: string;
  startTime: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  shape: string | null;
  bufferMeters: number | null;
  stops: DCRouteStop[];
  deviation: DCDeviation | null;
}

export interface DCShipmentSummary {
  id: string;
  trackingId: string;
  status: string;
  destination: string;
  cargoType: string | null;
  priority: string;
  slaDeadline: string | null;
  slaBreach: boolean;
  stopsTotal: number;
  stopsDone: number;
}

export interface DCFuelLogEntry {
  id: string;
  date: string;
  volumeLiter: number;
  cost: number;
  currency: string;
}

export interface DCIssueEntry {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
}

export interface DCDocumentEntry {
  id: string;
  type: string;
  name: string;
  expiryDate: string | null;
  status: DocumentStatus;
}

export interface DriverConsoleDashboard {
  driver: DCDriverProfile | null;
  vehicle: DCVehicle | null;
  activeRoute: DCActiveRoute | null;
  kpis: {
    safetyScore: number | null;
    efficiencyScore: number | null;
    rating: number | null;
  };
  shipments: DCShipmentSummary[];
  fuelLogs: DCFuelLogEntry[];
  issues: DCIssueEntry[];
  documents: DCDocumentEntry[];
}
