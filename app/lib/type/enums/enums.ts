/**
 * CLIENT-SAFE ENUMS
 * =================
 * These enums EXACTLY mirror the Prisma schema. They are defined here as plain
 * TypeScript so they can be safely imported by both Server and Client components
 * without triggering Prisma's browser-side bundling error.
 */

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const VehicleType = {
  TRUCK: "TRUCK",
  VAN: "VAN",
} as const;
export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

export const TrailerType = {
  DRY_VAN: "DRY_VAN",
  REEFER: "REEFER",
  FLATBED: "FLATBED",
  TANKER: "TANKER",
  CURTAINSIDE: "CURTAINSIDE",
  CONTAINER_CHASSIS: "CONTAINER_CHASSIS",
} as const;
export type TrailerType = typeof TrailerType[keyof typeof TrailerType];

export const TrailerStatus = {
  AVAILABLE: "AVAILABLE",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  RETIRED: "RETIRED",
} as const;
export type TrailerStatus = typeof TrailerStatus[keyof typeof TrailerStatus];

export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_ORDER: "OUT_OF_ORDER",
} as const;
export type VehicleStatus = typeof VehicleStatus[keyof typeof VehicleStatus];

export const DriverStatus = {
  ON_JOB: "ON_JOB",
  OFF_DUTY: "OFF_DUTY",
  ON_LEAVE: "ON_LEAVE",
} as const;
export type DriverStatus = typeof DriverStatus[keyof typeof DriverStatus];

export const WarehouseType = {
  DISTRIBUTION_CENTER: "DISTRIBUTION_CENTER",
  CROSSDOCK: "CROSSDOCK",
  WAREHOUSE: "WAREHOUSE",
} as const;
export type WarehouseType = typeof WarehouseType[keyof typeof WarehouseType];

export const WarehouseTaskStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type WarehouseTaskStatus = typeof WarehouseTaskStatus[keyof typeof WarehouseTaskStatus];

export const RouteStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
} as const;
export type RouteStatus = typeof RouteStatus[keyof typeof RouteStatus];

export const ShipmentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  ASSIGNED: "ASSIGNED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  RETURNED: "RETURNED",
  DELAYED: "DELAYED",
  CANCELLED: "CANCELLED",
} as const;
export type ShipmentStatus = typeof ShipmentStatus[keyof typeof ShipmentStatus];

export const ShipmentPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type ShipmentPriority = typeof ShipmentPriority[keyof typeof ShipmentPriority];

export const ShipmentServiceType = {
  STANDARD_FREIGHT: "STANDARD_FREIGHT",
  EXPRESS: "EXPRESS",
  HAZARDOUS: "HAZARDOUS",
} as const;
export type ShipmentServiceType = typeof ShipmentServiceType[keyof typeof ShipmentServiceType];

export const MaintenanceType = {
  ROUTINE_MAINTENANCE: "ROUTINE_MAINTENANCE",
  REPAIR: "REPAIR",
  INSPECTION: "INSPECTION",
  TIRE_CHANGE: "TIRE_CHANGE",
  OIL_CHANGE: "OIL_CHANGE",
  OTHER: "OTHER",
} as const;
export type MaintenanceType = typeof MaintenanceType[keyof typeof MaintenanceType];

export const DocumentType = {
  REGISTRATION: "REGISTRATION",
  TRAILER_REGISTRATION: "TRAILER_REGISTRATION",
  INSURANCE: "INSURANCE",
  LICENSE: "LICENSE",
  INSPECTION: "INSPECTION",
  MAINTENANCE: "MAINTENANCE",
  OTHER: "OTHER",
} as const;
export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const DocumentStatus = {
  ACTIVE: "ACTIVE",
  MISSING: "MISSING",
  EXPIRING_SOON: "EXPIRING_SOON",
  EXPIRED: "EXPIRED",
} as const;
export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];

export const FuelType = {
  DIESEL: "DIESEL",
  GASOLINE: "GASOLINE",
  ELECTRIC: "ELECTRIC",
  HYBRID: "HYBRID",
} as const;
export type FuelType = typeof FuelType[keyof typeof FuelType];

export const MovementType = {
  STOCK_IN: "STOCK_IN",
  PUTAWAY: "PUTAWAY",
  PICK: "PICK",
  PACK: "PACK",
  RESTOCK: "RESTOCK",
  RESTOCK_REQUEST: "RESTOCK_REQUEST",
  ADJUSTMENT: "ADJUSTMENT",
  ALLOCATION: "ALLOCATION",
  ALLOCATION_REVERT: "ALLOCATION_REVERT",
  ALLOCATION_CANCEL: "ALLOCATION_CANCEL",
} as const;
export type MovementType = typeof MovementType[keyof typeof MovementType];

export const IssueStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type IssueStatus = typeof IssueStatus[keyof typeof IssueStatus];

export const IssuePriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type IssuePriority = typeof IssuePriority[keyof typeof IssuePriority];

export const IssueType = {
  VEHICLE: "VEHICLE",
  DRIVER: "DRIVER",
  SHIPMENT: "SHIPMENT",
  TRAILER: "TRAILER",
  OTHER: "OTHER",
} as const;
export type IssueType = typeof IssueType[keyof typeof IssueType];

export const MaintenanceStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type MaintenanceStatus = typeof MaintenanceStatus[keyof typeof MaintenanceStatus];

export const AuditAction = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  TOKEN_REFRESH: "TOKEN_REFRESH",
  SESSION_REVOKE: "SESSION_REVOKE",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  LOGIN_FAILED: "LOGIN_FAILED",
} as const;
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];
