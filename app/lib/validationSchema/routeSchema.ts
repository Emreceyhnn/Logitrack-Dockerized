import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";
import {
  MIN_ROUTE_BUFFER_METERS,
  MAX_ROUTE_BUFFER_METERS,
} from "../type/routeDeviation";

/* --------------------------- Route Validation --------------------------- */

/** Buffer bounds message, tolerant of a dictionary that lacks the key. */
const bufferInvalidMessage = (dict: Dictionary): string =>
  formatMessage(
    dict.routes?.dialogs?.bufferInvalid ||
      "Tolerance must be between {min} and {max} m.",
    { min: MIN_ROUTE_BUFFER_METERS, max: MAX_ROUTE_BUFFER_METERS }
  );

export const getAddRouteValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    name: Yup.string()
      .required(formatMessage(dict.validation.required, { field: dict.routes?.fields?.name || "Name" }))
      .min(3, formatMessage(dict.validation.min, { field: dict.routes?.fields?.name || "Name", min: 3 })),
    startTime: Yup.date()
      .nullable()
      .required(
        formatMessage(dict.validation.required, { field: dict.routes?.fields?.startTime || "Start Time" })
      ),
    endTime: Yup.date()
      .nullable()
      .required(formatMessage(dict.validation.required, { field: dict.routes?.fields?.endTime || "End Time" }))
      .min(Yup.ref("startTime"), dict.validation?.endTimeAfterStart || "End time must be after start time"),
    startAddress: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.routes?.fields?.startAddress || "Start Address" })
    ),
    endAddress: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.routes?.fields?.endAddress || "End Address" })
    ),
    driverId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.routes?.fields?.driver || "Driver" })
    ),
    vehicleId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.routes?.fields?.vehicle || "Vehicle" })
    ),
    stops: Yup.array().of(
      Yup.object().shape({
        address: Yup.string().required(formatMessage(dict.validation.required, { field: dict.routes?.fields?.address || "Address" })),
        lat: Yup.number().nullable().optional(),
        lng: Yup.number().nullable().optional(),
      })
    ).optional(),
    // Optional override: an empty field means "use the default corridor", so
    // only a value that is present has to fall within the supported bounds.
    // The message falls back like the fields above — callers may pass a partial
    // dictionary, and a missing key must not throw inside formatMessage.
    bufferMeters: Yup.number()
      .transform((value, original) => (original === "" || original === null ? undefined : value))
      .integer(bufferInvalidMessage(dict))
      .min(MIN_ROUTE_BUFFER_METERS, bufferInvalidMessage(dict))
      .max(MAX_ROUTE_BUFFER_METERS, bufferInvalidMessage(dict))
      .optional(),
  });

export const getEditRouteValidationSchema = (dict: Dictionary) =>
  getAddRouteValidationSchema(dict);
