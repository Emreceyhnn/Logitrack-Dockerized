/**
 * Backend server-action schemas (Zod).
 *
 * These live in their own module — NOT in validationSchema.ts — on purpose:
 * validationSchema.ts is imported by client-side dialogs, and having zod +
 * @prisma/client in that file shipped both to the browser (~350 kB of chunk).
 * Only server controllers may import this file.
 */
import { z } from "zod";
import {
  WarehouseType,
  VehicleType,
  VehicleStatus,
  TrailerType,
  ShipmentStatus,
  ShipmentPriority,
  ShipmentServiceType,
  MaintenanceType,
  MaintenanceStatus,
  FuelType,
  DocumentType,
  DriverStatus,
  MovementType,
} from "@prisma/client";

// ─── Auth ───────────────────────────────────────────────────────────────────
// Server-side mirror of the client rules in validationSchema/auth.ts. The auth
// server actions are directly callable from the network, so the client-side
// yup schema alone is not a security boundary.
export const registerUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  surname: z.string().trim().min(2, "Surname must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    // bcrypt only uses the first 72 bytes; longer input silently truncates
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a digit"),
  avatarUrl: z.string().max(2048).optional(),
});

export const loginUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1024),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
});

// The new password reuses the exact strength rules from registration — a reset
// must never be a way to downgrade an account to a weaker password.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(512),
  password: registerUserSchema.shape.password,
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required").max(512),
});

// ─── Invitations ────────────────────────────────────────────────────────────
export const createDriverInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  employeeId: z.string().min(1, "Employee ID is required"),
  phone: z.string().min(1, "Phone is required"),
  licenseType: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
});

export const VALID_INVITATION_ROLES = [
  "role_admin",
  "role_manager",
  "role_dispatcher",
  "role_warehouse",
  "role_default",
  "role_driver",
] as const;

export const createCompanyInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  roleId: z.enum(VALID_INVITATION_ROLES),
});

export const acceptInvitationSchema = registerUserSchema.pick({
  name: true,
  surname: true,
  password: true,
});

export const updateWarehouseSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  type: z.nativeEnum(WarehouseType).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  capacityPallets: z.number().optional(),
  capacityVolumeM3: z.number().optional(),
  operatingHours: z.string().optional(),
  timezone: z.string().optional(),
  specifications: z.array(z.string()).optional(),
  managerId: z.string().nullable().optional(),
});

export const createWarehouseSchema = updateWarehouseSchema.required({
  name: true,
  type: true,
  address: true,
  city: true,
  country: true,
});

export const vehicleSchema = z.object({
  year: z.union([z.string(), z.number()]).transform(v => parseInt(v.toString())),
  maxLoadKg: z.union([z.string(), z.number()]).transform(v => parseInt(v.toString())),
  plate: z.string().min(1, "Plate is required"),
  type: z.nativeEnum(VehicleType),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  fleetNo: z.string().optional(),
  fuelType: z.nativeEnum(FuelType).optional().default("DIESEL"),
  odometerKm: z.union([z.string(), z.number()]).optional().transform(v => v ? parseInt(v.toString()) : null),
  fuelLevel: z.union([z.string(), z.number()]).optional().transform(v => v ? parseInt(v.toString()) : null),
  avgFuelConsumption: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(v.toString()) : null),
  fuelCapacity: z.union([z.string(), z.number()]).optional().transform(v => v ? parseInt(v.toString()) : null),
  nextServiceKm: z.union([z.string(), z.number()]).optional().transform(v => v ? parseInt(v.toString()) : null),
  registrationExpiry: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : null),
  inspectionExpiry: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : null),
  engineSize: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  techNotes: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  enableAlerts: z.boolean().optional().default(false),
  status: z.nativeEnum(VehicleStatus).optional().default(VehicleStatus.AVAILABLE),
});

export const trailerSchema = z.object({
  plate: z.string().min(1, "Plate is required"),
  fleetNo: z.string().min(1, "Fleet Number is required"),
  type: z.nativeEnum(TrailerType),
  capacityVolumeM3: z.union([z.string(), z.number()]).transform(v => parseFloat(v.toString()) || 0),
  maxLoadKg: z.union([z.string(), z.number()]).transform(v => parseInt(v.toString()) || 0),
  isColdChain: z.boolean().optional().default(false),
});

// ─── Shipments ──────────────────────────────────────────────────────────────
const shipmentBaseSchema = z.object({
  customerId: z.string().optional().nullable(),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  status: z.nativeEnum(ShipmentStatus).optional().default("PENDING"),
  itemsCount: z.number().int().nonnegative().optional().default(1),
  weightKg: z.number().nonnegative().optional().default(0),
  volumeM3: z.number().nonnegative().optional().default(0),
  palletCount: z.number().int().nonnegative().optional().default(0),
  cargoType: z.string().optional().default("General Cargo"),
  destinationLat: z.number().nullable().optional(),
  destinationLng: z.number().nullable().optional(),
  originLat: z.number().nullable().optional(),
  originLng: z.number().nullable().optional(),
  trackingId: z.string().optional(),
  referenceNumber: z.string().nullable().optional(),
  customerLocationId: z.string().optional(),
  priority: z.nativeEnum(ShipmentPriority).optional().default("MEDIUM"),
  type: z.nativeEnum(ShipmentServiceType).optional().default("STANDARD_FREIGHT"),
  slaDeadline: z.union([z.string(), z.date()]).nullable().optional().transform(v => v ? new Date(v) : null),
  contactEmail: z.string().email().optional().or(z.literal("")),
  billingAccount: z.string().optional(),
  originWarehouseId: z.string().optional(),
  trailerId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  inventoryItems: z.array(z.object({
    id: z.string().optional(),
    sku: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string().optional(),
    weightKg: z.number().optional(),
    volumeM3: z.number().optional(),
    palletCount: z.number().optional(),
    cargoType: z.string().optional(),
  })).optional(),
  stops: z.array(z.object({
    id: z.string().optional(),
    customerId: z.string().optional().nullable(),
    customerLocationId: z.string().optional().nullable(),
    address: z.string(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    sequence: z.number().optional(),
    status: z.nativeEnum(ShipmentStatus).optional(),
    contactEmail: z.string().optional().nullable(),
  })).optional(),
});

// Selecting real inventory implies stock is coming out of a specific
// warehouse — without originWarehouseId the allocation, the
// InventoryMovement, and the warehouse worker's pick task never get
// created, so the shipment silently never shows up on the warehouse floor
// even though it "succeeded". Applied to both schemas so this can't be
// bypassed by going through the update path with inventoryItems.
const requireOriginWarehouseWithInventory = (
  data: { inventoryItems?: unknown[] | undefined; originWarehouseId?: string | undefined },
  ctx: z.RefinementCtx
) => {
  if ((data.inventoryItems?.length ?? 0) > 0 && !data.originWarehouseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["originWarehouseId"],
      message: "Origin warehouse is required when inventory items are selected",
    });
  }
};

export const createShipmentSchema = shipmentBaseSchema.superRefine(
  requireOriginWarehouseWithInventory
);

export const updateShipmentSchema = shipmentBaseSchema
  .partial()
  .superRefine(requireOriginWarehouseWithInventory);

// ─── Routes ─────────────────────────────────────────────────────────────────
export const createRouteSchema = z.object({
  name: z.string().optional(),
  date: z.union([z.string(), z.date()]).transform(v => new Date(v)),
  startTime: z.union([z.string(), z.date()]).transform(v => new Date(v)),
  endTime: z.union([z.string(), z.date()]).transform(v => new Date(v)),
  distanceKm: z.number().nonnegative(),
  durationMin: z.number().nonnegative(),
  driverId: z.string().min(1, "Driver is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  shipmentId: z.string().optional(),
  stops: z.array(z.object({
    address: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })).optional(),
  shape: z.string().optional(),
  bufferMeters: z.number().int().positive().optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

// ─── Customers ──────────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  industry: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  locations: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    address: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    isDefault: z.boolean().optional(),
  })).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Drivers ────────────────────────────────────────────────────────────────
export const createDriverSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  employeeId: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  licenseExpiry: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : null),
  phone: z.string().min(1, "Phone is required"),
  hazmatCertified: z.boolean().optional().default(false),
  languages: z.array(z.string()).optional(),
  currentVehicleId: z.string().optional(),
  homeBaseWarehouseId: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  licensePhotoUrl: z.string().optional(),
  documents: z.array(z.object({
    type: z.nativeEnum(DocumentType),
    name: z.string(),
    url: z.string(),
    expiryDate: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
  })).optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

// ─── Maintenance ────────────────────────────────────────────────────────────
export const createMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  type: z.nativeEnum(MaintenanceType),
  date: z.union([z.string(), z.date()]).transform(v => new Date(v)),
  cost: z.number().nonnegative(),
  description: z.string().optional(),
  currency: z.string().optional().default("USD"),
  documentUrl: z.string().optional(),
});

// ─── Fuel ───────────────────────────────────────────────────────────────────
export const createFuelLogSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  volumeLiter: z.number().positive(),
  cost: z.number().nonnegative(),
  odometerKm: z.number().nonnegative(),
  location: z.string().optional(),
  fuelType: z.nativeEnum(FuelType),
  date: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : new Date()),
  receiptUrl: z.string().optional(),
  currency: z.string().optional().default("USD"),
});

// ─── Documents ──────────────────────────────────────────────────────────────
export const createDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  expiryDate: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
}).refine(data => data.driverId || data.vehicleId, {
  message: "Document must be associated with either a driver or a vehicle",
  path: ["driverId"],
});

// ─── Roles ──────────────────────────────────────────────────────────────────
export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional().default([]),
});

// ─── Inventory ──────────────────────────────────────────────────────────────
export const createInventorySchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  sku: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  zone: z.string().nullable().optional(),
  quantity: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative().optional().default(0),
  weightKg: z.number().nonnegative().optional().default(0),
  volumeM3: z.number().nonnegative().optional().default(0),
  palletCount: z.number().int().nonnegative().optional().default(0),
  cargoType: z.string().optional().default("General Cargo"),
  unitValue: z.number().nonnegative().optional().default(0),
  currency: z.string().optional().default("USD"),
});

export const updateInventorySchema = createInventorySchema.partial();

export const adjustInventoryStockSchema = z.object({
  inventoryId: z.string().min(1, "Inventory ID is required"),
  delta: z.number(),
  type: z.nativeEnum(MovementType).optional().default(MovementType.ADJUSTMENT),
  notes: z.string().optional(),
});

export const logWarehouseFulfillmentSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  type: z.enum(["PICK", "PACK"]),
});

// ─── Company ────────────────────────────────────────────────────────────────
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  avatarUrl: z.string().optional(),
  domain: z.string().trim().toLowerCase().optional(),
  regional: z.object({
    timezone: z.string(),
    currency: z.string(),
    language: z.string(),
  }).optional(),
});

// ─── Maintenance ────────────────────────────────────────────────────────────────
export const createMaintenanceRecordSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  type: z.nativeEnum(MaintenanceType),
  date: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
  cost: z.number().min(0, "Cost must be a positive number"),
  description: z.string().optional(),
  currency: z.string().optional().default("USD"),
  documentUrl: z.string().optional(),
});

export const updateMaintenanceRecordSchema = z.object({
  type: z.nativeEnum(MaintenanceType).optional(),
  date: z.union([z.string(), z.date()]).optional().transform((v) => v ? new Date(v) : undefined),
  cost: z.number().min(0, "Cost must be a positive number").optional(),
  currency: z.string().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  description: z.string().optional(),
  documentUrl: z.string().optional(),
});
