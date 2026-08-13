import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Driver Validation --------------------------- */
export const getAddDriverValidationSchema = (dict: Dictionary) =>
  Yup.object({
    userId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.employee || "Employee" })
    ),
    phone: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.phoneNumber,
      })
    ),
    licenseNumber: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.licenseNumber,
      })
    ),
    licenseType: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.licenseType || "License Type" })
    ),
    licenseExpiry: Yup.date()
      .nullable()
      .required(
        formatMessage(dict.validation.required, { field: dict.drivers?.fields?.licenseExpiry || "License Expiry" })
      ),
    employeeId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.employeeId || "Employee ID" })
    ),
    status: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.status,
      })
    ),
    homeWareHouseId: Yup.string().optional(),
    currentVehicleId: Yup.string().optional(),
    languages: Yup.array().of(Yup.string()).optional(),
    hazmatCertified: Yup.boolean().optional(),
  });

export const getEditDriverValidationSchema = (dict: Dictionary) =>
  Yup.object({
    phone: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.phoneNumber,
      })
    ),
    licenseNumber: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.licenseNumber,
      })
    ),
    licenseType: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.licenseType || "License Type" })
    ),
    licenseExpiry: Yup.date()
      .nullable()
      .required(
        formatMessage(dict.validation.required, { field: dict.drivers?.fields?.licenseExpiry || "License Expiry" })
      ),
    employeeId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.employeeId || "Employee ID" })
    ),
    status: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.status,
      })
    ),
    homeWareHouseId: Yup.string().optional(),
    currentVehicleId: Yup.string().optional(),
    languages: Yup.array().of(Yup.string()).optional(),
    hazmatCertified: Yup.boolean().optional(),
  });
