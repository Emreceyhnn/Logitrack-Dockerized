import type { Dictionary } from "../language/language";
import type { DCDeviation } from "./driverConsole";

export type View = "dashboard" | "route" | "shipments" | "vehicle" | "documents";
export type DutyStatus = "ON_JOB" | "OFF_DUTY" | "ON_LEAVE";

/** The `driverConsole` translation subtree passed around as `dc`. */
export type DriverConsoleDict = Dictionary["driverConsole"];

export interface ClientDriverProfile {
  id: string;
  name: string;
  initials: string;
  employeeId: string;
  phone: string;
  status: DutyStatus;
  safetyScore: number | null;
  efficiencyScore: number | null;
  rating: number | null;
  hazmatCertified: boolean;
  languages: string[];
  licenseExpiry: string | null;
  licenseDaysLeft: number | null;
  homeBaseWarehouse: { id: string; name: string; code: string; city: string } | null;
}

export interface ClientVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  fleetNo: string;
  fuelLevel: number | null;
  odometerKm: number | null;
}

export interface ClientRouteStop {
  id: string;
  sequence: number;
  address: string;
  lat: number | null;
  lng: number | null;
  isDone: boolean;
  eta: string | null;
}

export interface ClientActiveRoute {
  id: string;
  status: "PLANNED" | "ACTIVE";
  date: string;
  startTime: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  shape: string | null;
  bufferMeters: number | null;
  stops: ClientRouteStop[];
  deviation: DCDeviation | null;
  remainingStopsCount: number;
  nextStop: ClientRouteStop | null;
}

export interface ClientShipment {
  id: string;
  trackingId: string;
  status: string;
  destination: string;
  cargoType: string | null;
  priority: string;
  slaBreach: boolean;
  stopsTotal: number;
  stopsDone: number;
}

export interface ClientFuelLog {
  id: string;
  date: string;
  volumeLiter: number;
  cost: number;
  currency: string;
}

export interface ClientIssue {
  id: string;
  title: string;
  priority: string;
  status: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  expiryDate: string | null;
  status: "ACTIVE" | "MISSING" | "EXPIRING_SOON" | "EXPIRED";
}
