import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Customer Validation --------------------------- */
export const getAddCustomerValidationSchema = (dict: Dictionary) =>
  Yup.object().shape({
    name: Yup.string()
      .required(
        formatMessage(dict.validation.required, { field: dict.customers?.fields?.companyName || "Company Name" })
      )
      .min(
        2,
        formatMessage(dict.validation.min, { field: dict.customers?.fields?.companyName || "Company Name", min: 2 })
      ),
    code: Yup.string()
      .optional()
      .min(2, formatMessage(dict.validation.min, { field: dict.warehouses?.fields?.code || "Code", min: 2 })),
    industry: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.industry || "Industry" })
    ),
    taxId: Yup.string().optional(),
    email: Yup.string().email(dict.validation.email).optional(),
    phone: Yup.string().optional(),
    locations: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required(
          formatMessage(dict.validation.required, { field: dict.customers?.fields?.locationName || "Location Name" })
        ),
        address: Yup.string().required(
          formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.address || "Address" })
        ),
        lat: Yup.number().optional(),
        lng: Yup.number().optional(),
        isDefault: Yup.boolean().optional(),
      })
    ),
  });

export const getEditCustomerValidationSchema = (dict: Dictionary) =>
  getAddCustomerValidationSchema(dict);
