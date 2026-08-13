import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Vehicle Validation --------------------------- */
export const getAddVehicleValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    fleetNo: Yup.string()
      .optional()
      .min(
        3,
        formatMessage(dict.validation.min, { field: dict.vehicles?.fields?.fleetNo || "Fleet No", min: 3 })
      ),
    plate: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.plate,
        })
      )
      .min(
        5,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.plate,
          min: 5,
        })
      ),
    type: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.type,
        })
      )
      .oneOf(
        ["TRUCK", "VAN"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.type,
        })
      ),
    brand: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.brand,
        })
      )
      .min(
        2,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.brand,
          min: 2,
        })
      ),
    model: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.model,
        })
      )
      .min(
        1,
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.model,
        })
      ),
    year: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.year,
        })
      )
      .min(
        1900,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.year,
          min: 1900,
        })
      )
      .max(
        2100,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.year,
          max: 2100,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.year,
        })
      ),
    maxLoadKg: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.capacity,
        })
      )
      .min(
        1,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.capacity,
        })
      )
      .max(
        2_000_000,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.capacity,
          max: "2,000,000",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.capacity,
        })
      ),
    fuelType: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.fuelType,
        })
      )
      .oneOf(
        ["DIESEL", "GASOLINE", "ELECTRIC", "HYBRID"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.fuelType,
        })
      ),
    odometerKm: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.odometer,
        })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.odometer,
        })
      )
      .max(
        9_999_999,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.odometer,
          max: "9,999,999",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.odometer,
        })
      ),
    nextServiceKm: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.service,
        })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.service,
        })
      )
      .max(
        9_999_999,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.service,
          max: "9,999,999",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.service,
        })
      ),
    avgFuelConsumption: Yup.number()
      .required(
        formatMessage(dict.validation.required, { field: dict.vehicles?.fields?.fuelConsumption || "Fuel Consumption" })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, { field: dict.vehicles?.fields?.fuelConsumption || "Fuel Consumption" })
      ),
    techNotes: Yup.string().optional(),
    transmission: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.transmission,
        })
      )
      .oneOf(
        ["MANUAL", "AUTOMATIC", "SEMI_AUTOMATIC"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.transmission,
        })
      ),
    engineSize: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.vehicles?.fields?.engineSize || "Engine Size" })
    ),
    fuelLevel: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.fuelLevel,
        })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.fuelLevel,
        })
      )
      .max(
        100,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.fuelLevel,
          max: 100,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.fuelLevel,
        })
      ),
    fuelCapacity: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, { field: dict.vehicles?.fields?.fuelCapacity || "Fuel Capacity" })
      )
      .max(
        10_000,
        formatMessage(dict.validation.max, {
          field: dict.vehicles?.fields?.fuelCapacity || "Fuel Capacity",
          max: "10,000",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, { field: dict.vehicles?.fields?.fuelCapacity || "Fuel Capacity" })
      ),
  });

export const getEditVehicleValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    plate: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.plate,
        })
      )
      .min(
        5,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.plate,
          min: 5,
        })
      ),
    fleetNo: Yup.string()
      .optional()
      .min(
        3,
        formatMessage(dict.validation.min, { field: dict.vehicles?.fields?.fleetNo || "Fleet No", min: 3 })
      ),
    type: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.type,
        })
      )
      .oneOf(
        ["TRUCK", "VAN"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.type,
        })
      ),
    brand: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.brand,
        })
      )
      .min(
        2,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.brand,
          min: 2,
        })
      ),
    model: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.model,
        })
      )
      .min(
        1,
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.model,
        })
      ),
    year: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.year,
        })
      )
      .min(
        1900,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.fields.year,
          min: 1900,
        })
      )
      .max(
        2100,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.year,
          max: 2100,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.year,
        })
      ),
    maxLoadKg: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.capacity,
        })
      )
      .min(
        1,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.capacity,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.capacity,
        })
      ),
    fuelType: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.fuelType,
        })
      )
      .oneOf(
        ["DIESEL", "GASOLINE", "ELECTRIC", "HYBRID"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.fuelType,
        })
      ),
    status: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.status,
        })
      )
      .oneOf(
        ["AVAILABLE", "ON_TRIP", "MAINTENANCE"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.status,
        })
      ),
    odometerKm: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.odometer,
        })
      )
      .max(
        9_999_999,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.odometer,
          max: "9,999,999",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.odometer,
        })
      ),
    nextServiceKm: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.service,
        })
      )
      .max(
        9_999_999,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.service,
          max: "9,999,999",
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.vehicles.fields.service,
        })
      ),
    avgFuelConsumption: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, { field: dict.vehicles?.fields?.fuelConsumption || "Fuel Consumption" })
      ),
    engineSize: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.vehicles?.fields?.engineSize || "Engine Size" })
    ),
    transmission: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.fields.transmission,
        })
      )
      .oneOf(
        ["MANUAL", "AUTOMATIC", "SEMI_AUTOMATIC"],
        formatMessage(dict.validation.oneOf, {
          field: dict.vehicles.fields.transmission,
        })
      ),
    techNotes: Yup.string().optional(),
    fuelLevel: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.vehicles.fields.fuelLevel,
        })
      )
      .max(
        100,
        formatMessage(dict.validation.max, {
          field: dict.vehicles.fields.fuelLevel,
          max: 100,
        })
      ),
  });
