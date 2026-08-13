/**
 * CLIENT-SAFE ENTITY INTERFACES
 * =============================
 * Plain TypeScript mirrors of the Prisma models, safe to import from both
 * Server and Client components. Enum shapes live alongside in ./enums.
 */

import type {
  UserStatus,
  DriverStatus,
  WarehouseType,
  VehicleType,
  VehicleStatus,
  TrailerType,
  TrailerStatus,
  ShipmentStatus,
  ShipmentPriority,
  RouteStatus,
  IssueStatus,
  IssuePriority,
  IssueType,
  MaintenanceStatus,
} from "./enums";

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  password?: string | null;
  avatarUrl?: string | null;
  roleId?: string | null;
  status?: UserStatus;
  lastLoginAt?: Date | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Driver {
  id: string;
  userId: string;
  phone: string;
  employeeId: string;
  licenseNumber?: string | null;
  licenseType?: string | null;
  licenseExpiry?: Date | null;
  status: DriverStatus;
  safetyScore?: number | null;
  efficiencyScore?: number | null;
  rating?: number | null;
  hazmatCertified: boolean;
  languages: string[];
  currentVehicleId?: string | null;
  companyId?: string | null;
  homeBaseWarehouseId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  user: User;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type?: WarehouseType;
  address: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  capacityPallets?: number;
  capacityVolumeM3?: number;
  operatingHours?: string | null;
  timezone: string;
  specifications?: string[];
  managerId?: string | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Vehicle {
  id: string;
  fleetNo?: string;
  plate: string;
  type?: VehicleType;
  brand: string;
  model: string;
  year?: number;
  status: VehicleStatus;
  maxLoadKg?: number;
  fuelType?: string;
  currentLat?: number | null;
  currentLng?: number | null;
  fuelLevel?: number | null;
  odometerKm?: number | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Trailer {
  id: string;
  fleetNo: string;
  plate: string;
  type: TrailerType;
  capacityVolumeM3: number;
  maxLoadKg: number;
  isColdChain: boolean;
  status: TrailerStatus;
  currentVehicleId?: string | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrailerAssignment {
  id: string;
  trailerId: string;
  vehicleId: string;
  assignedAt: Date;
  detachedAt?: Date | null;
  notes?: string | null;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  industry?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomerLocation {
  id: string;
  customerId: string;
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Shipment {
  id: string;
  trackingId: string;
  customerId?: string | null;
  customerLocationId?: string | null;
  driverId?: string | null;
  status: ShipmentStatus;
  origin: string | null;
  originWarehouseId?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  itemsCount: number;
  priority?: ShipmentPriority | null;
  type?: string | null;
  slaDeadline?: Date | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  palletCount?: number | null;
  cargoType?: string | null;
  contactEmail?: string | null;
  billingAccount?: string | null;
  routeId?: string | null;
  trailerId?: string | null;
  companyId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShipmentHistory {
  id: string;
  shipmentId: string;
  status: string;
  location?: string | null;
  description?: string | null;
  createdAt: Date;
  createdById?: string | null;
}

export interface Route {
  id: string;
  name?: string | null;
  status: RouteStatus;
  date: Date;
  startTime?: Date | null;
  endTime?: Date | null;
  distanceKm?: number | null;
  durationMin?: number | null;
  stops?: { address: string; lat?: number | undefined; lng?: number | undefined }[] | null;
  driverId?: string | null;
  vehicleId?: string | null;
  companyId?: string | null;
  /** Valhalla-encoded polyline (precision 6) of the planned corridor. */
  shape?: string | null;
  /** Corridor half-width in metres for deviation alerts. */
  bufferMeters?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Inventory {
  id: string;
  warehouseId: string;
  sku: string;
  name: string;
  zone?: string | null;
  quantity: number;
  allocatedQuantity: number;
  minStock: number;
  imageUrl?: string | null;
  unitValue?: number | null;
  unit?: string;
  currency: string;
  weightKg?: number | null;
  volumeM3?: number | null;
  palletCount?: number | null;
  cargoType?: string | null;
  companyId?: string | null;
  updatedAt?: Date;
}

export interface Issue {
  id: string;
  title: string;
  description?: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  vehicleId?: string | null;
  driverId?: string | null;
  shipmentId?: string | null;
  companyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  date: Date;
  cost: number;
  currency: string;
  status: MaintenanceStatus;
  description?: string | null;
  documentUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  expiryDate?: Date | null;
  status: string;
  driverId?: string | null;
  vehicleId?: string | null;
  companyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  weightKg?: number | null;
  volumeM3?: number | null;
  palletCount?: number | null;
  cargoType?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  date: Date;
  volumeLiter: number;
  cost: number;
  odometerKm: number;
  location?: string | null;
  fuelType: string;
  currency: string;
  receiptUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
