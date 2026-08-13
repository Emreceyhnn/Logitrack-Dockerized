import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Company Validation --------------------------- */
export const getCreateCompanyValidationSchema = (dict: Dictionary) =>
  Yup.object({
    name: Yup.string()
      .min(
        2,
        formatMessage(dict.validation.min, { field: dict.customers?.fields?.companyName || "Company Name", min: 2 })
      )
      .required(
        formatMessage(dict.validation.required, { field: dict.customers?.fields?.companyName || "Company Name" })
      ),
    industry: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.industry || "Industry" })
    ),
    timezone: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.warehouses?.fields?.timezone || "Timezone" })
    ),
    currency: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.currency || "Currency" })
    ),
  });

export const getAddCompanyMemberValidationSchema = (dict: Dictionary) =>
  Yup.object({
    email: Yup.string()
      .email(dict.validation.email)
      .required(
        formatMessage(dict.validation.required, { field: dict.auth.email })
      ),
    role: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.role || "Role" })
    ),
    firstName: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.firstName || "First Name" })
    ),
    lastName: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.lastName || "Last Name" })
    ),
  });

export const getAddCompanyMemberDriverValidationSchema = (dict: Dictionary) =>
  Yup.object({
    employeeId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.drivers?.fields?.employeeId || "Employee ID" })
    ),
    phone: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.drivers.fields.phoneNumber,
      })
    ),
    licenseNumber: Yup.string().optional(),
    licenseType: Yup.string().optional(),
    licenseExpiry: Yup.string().nullable().optional(),
  });

export const getEditCompanyMemberValidationSchema = (dict: Dictionary) =>
  Yup.object({
    name: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.firstName || "First Name" })
    ),
    surname: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.lastName || "Last Name" })
    ),
    roleId: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.role || "Role" })
    ),
    status: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.customers?.fields?.status || "Status" })
    ),
  });
