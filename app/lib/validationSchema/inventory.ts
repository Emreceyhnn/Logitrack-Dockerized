import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Inventory Validation --------------------------- */
export const getAddInventoryValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    warehouseId: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.inventory.fields.warehouse,
      })
    ),
    sku: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.inventory.fields.sku,
        })
      )
      .min(
        3,
        formatMessage(dict.validation.min, {
          field: dict.inventory.fields.sku,
          min: 3,
        })
      ),
    name: Yup.string()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.inventory.fields.name,
        })
      )
      .min(
        2,
        formatMessage(dict.validation.min, {
          field: dict.inventory.fields.name,
          min: 2,
        })
      ),
    quantity: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.inventory.fields.quantity,
        })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.quantity,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.inventory.fields.quantity,
        })
      ),
    minStock: Yup.number()
      .required(
        formatMessage(dict.validation.required, {
          field: dict.inventory.fields.minStock,
        })
      )
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.minStock,
        })
      )
      .integer(
        formatMessage(dict.validation.integer, {
          field: dict.inventory.fields.minStock,
        })
      ),
    unit: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.inventory?.fields?.unit || "Unit" })
    ),
    unitValue: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.unitValue,
        })
      ),
    imageUrl: Yup.string().url(dict.validation.url).nullable().optional(),
    weightKg: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.weight,
        })
      ),
    volumeM3: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.volume,
        })
      ),
    palletCount: Yup.number()
      .nullable()
      .min(
        0,
        formatMessage(dict.validation.positive, {
          field: dict.inventory.fields.pallets,
        })
      ),
    cargoType: Yup.string().optional(),
  });
