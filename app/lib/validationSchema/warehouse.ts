import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Warehouse Validation --------------------------- */
export const getAddWarehouseValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    name: Yup.string()
      .required(formatMessage(dict.validation.required, { field: dict.routes?.fields?.name || "Name" }))
      .min(3, formatMessage(dict.validation.min, { field: dict.routes?.fields?.name || "Name", min: 3 })),
    code: Yup.string().optional(),
    type: Yup.string()
      .required(formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.type || "Type" }))
      .oneOf(
        ["DISTRIBUTION_CENTER", "CROSSDOCK", "WAREHOUSE"],
        formatMessage(dict.validation.oneOf, { field: dict.warehouses?.fields?.type || "Type" })
      ),
    timezone: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.timezone || "Timezone" })
    ),
    address: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.address || "Address" })
    ),
    city: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.city || "City" })
    ),
    country: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.country || "Country" })
    ),
    capacityPallets: Yup.number()
      .required(formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.capacity || "Capacity" }))
      .min(0, formatMessage(dict.validation.positive, { field: dict.warehouses?.fields?.capacity || "Capacity" }))
      .integer(formatMessage(dict.validation.integer, { field: dict.warehouses?.fields?.capacity || "Capacity" })),
    capacityVolumeM3: Yup.number()
      .required(formatMessage(dict.validation.required, { field: dict.shipments?.fields?.volume || "Volume" }))
      .min(0, formatMessage(dict.validation.positive, { field: dict.shipments?.fields?.volume || "Volume" }))
      .integer(formatMessage(dict.validation.integer, { field: dict.shipments?.fields?.volume || "Volume" })),
  });
