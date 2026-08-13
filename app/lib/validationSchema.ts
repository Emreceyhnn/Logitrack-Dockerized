// Client-safe validation schemas (Yup only). Server-action zod schemas live
// in ./validation/serverSchemas.ts — do NOT import zod or @prisma/client here:
// this module is bundled into every dialog on the client.
//
// Split by domain under ./validationSchema/ to keep each file focused and under
// ~400 lines. This barrel re-exports every schema plus the legacy aliases.
import type { Dictionary } from "./language/language";
import { getLoginValidationSchema, getSignUpValidationSchema } from "./validationSchema/auth";
import { getAddVehicleValidationSchema, getEditVehicleValidationSchema } from "./validationSchema/vehicle";
import { getAddDriverValidationSchema, getEditDriverValidationSchema } from "./validationSchema/driver";
import { getAddInventoryValidationSchema } from "./validationSchema/inventory";
import { getAddShipmentValidationSchema, getEditShipmentValidationSchema } from "./validationSchema/shipment";
import { getAddRouteValidationSchema, getEditRouteValidationSchema } from "./validationSchema/routeSchema";
import { getAddWarehouseValidationSchema } from "./validationSchema/warehouse";
import { getVehicleReportIssueValidationSchema } from "./validationSchema/issue";
import {
  getCreateCompanyValidationSchema,
  getAddCompanyMemberValidationSchema,
  getAddCompanyMemberDriverValidationSchema,
  getEditCompanyMemberValidationSchema,
} from "./validationSchema/company";
import { getAddCustomerValidationSchema, getEditCustomerValidationSchema } from "./validationSchema/customer";

export * from "./validationSchema/auth";
export * from "./validationSchema/vehicle";
export * from "./validationSchema/driver";
export * from "./validationSchema/inventory";
export * from "./validationSchema/shipment";
export * from "./validationSchema/routeSchema";
export * from "./validationSchema/warehouse";
export * from "./validationSchema/issue";
export * from "./validationSchema/company";
export * from "./validationSchema/customer";

/* --------------------------- Remaining Schemas (Temporary Backwards Compatibility) --------------------------- */
// These will be fully migrated as components are updated.
export const loginValidationSchema = (dict: Dictionary) =>
  getLoginValidationSchema(dict);
export const signUpValidationSchema = (dict: Dictionary) =>
  getSignUpValidationSchema(dict);
export const addVehicleValidationSchema = (dict: Dictionary) =>
  getAddVehicleValidationSchema(dict);
export const editVehicleValidationSchema = (dict: Dictionary) =>
  getEditVehicleValidationSchema(dict);
export const addDriverValidationSchema = (dict: Dictionary) =>
  getAddDriverValidationSchema(dict);
export const editDriverValidationSchema = (dict: Dictionary) =>
  getEditDriverValidationSchema(dict);
export const addInventoryValidationSchema = (dict: Dictionary) =>
  getAddInventoryValidationSchema(dict);
export const addShipmentValidationSchema = (dict: Dictionary) =>
  getAddShipmentValidationSchema(dict);
export const editShipmentValidationSchema = (dict: Dictionary) =>
  getEditShipmentValidationSchema(dict);
export const addRouteValidationSchema = (dict: Dictionary) =>
  getAddRouteValidationSchema(dict);
export const editRouteValidationSchema = (dict: Dictionary) =>
  getEditRouteValidationSchema(dict);
export const addWarehouseValidationSchema = (dict: Dictionary) =>
  getAddWarehouseValidationSchema(dict);
export const vehicleReportIssueValidationSchema = (dict: Dictionary) =>
  getVehicleReportIssueValidationSchema(dict);
export const createCompanyValidationSchema = (dict: Dictionary) =>
  getCreateCompanyValidationSchema(dict);
export const addCompanyMemberValidationSchema = (dict: Dictionary) =>
  getAddCompanyMemberValidationSchema(dict);
export const addCompanyMemberDriverValidationSchema = (dict: Dictionary) =>
  getAddCompanyMemberDriverValidationSchema(dict);
export const editCompanyMemberValidationSchema = (dict: Dictionary) =>
  getEditCompanyMemberValidationSchema(dict);
export const addCustomerValidationSchema = (dict: Dictionary) =>
  getAddCustomerValidationSchema(dict);
export const editCustomerValidationSchema = (dict: Dictionary) =>
  getEditCustomerValidationSchema(dict);
