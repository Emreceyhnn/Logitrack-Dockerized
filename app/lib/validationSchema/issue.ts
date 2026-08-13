import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Issue Validation --------------------------- */
export const getVehicleReportIssueValidationSchema = (dict: Dictionary) =>
  Yup.object({
    title: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.vehicles.dialogs.issueTitle,
      })
    ),
    priority: Yup.string().required(
      formatMessage(dict.validation.required, {
        field: dict.vehicles.dialogs.priorityLevel,
      })
    ),
    description: Yup.string()
      .min(
        10,
        formatMessage(dict.validation.min, {
          field: dict.vehicles.dialogs.details,
          min: 10,
        })
      )
      .required(
        formatMessage(dict.validation.required, {
          field: dict.vehicles.dialogs.details,
        })
      ),
  });
