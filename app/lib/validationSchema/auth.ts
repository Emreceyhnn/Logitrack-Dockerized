import * as Yup from "yup";
import { Dictionary, formatMessage } from "../language/language";

/* --------------------------- Auth Validation --------------------------- */
export const getLoginValidationSchema = (dict: Dictionary) =>
  Yup.object({
    email: Yup.string()
      .email(dict.validation.email)
      .required(
        formatMessage(dict.validation.required, { field: dict.auth.email })
      ),
    password: Yup.string().required(
      formatMessage(dict.validation.required, { field: dict.auth.password })
    ),
  });

// Mirrors the password rules from sign-up — a reset must never be a path to a
// weaker password. The server re-validates via resetPasswordSchema (zod).
export const getResetPasswordValidationSchema = (dict: Dictionary) =>
  Yup.object({
    password: Yup.string()
      .min(
        8,
        formatMessage(dict.validation.min, {
          field: dict.auth.password,
          min: 8,
        })
      )
      .matches(/[a-z]/, dict.validation.passwordLowercase)
      .matches(/[A-Z]/, dict.validation.passwordUppercase)
      .matches(/[0-9]/, dict.validation.passwordNumber)
      .required(
        formatMessage(dict.validation.required, { field: dict.auth.password })
      ),
    repeatPassword: Yup.string()
      .oneOf([Yup.ref("password")], dict.validation.passwordsMatch || "Passwords must match")
      .required(
        formatMessage(dict.validation.required, {
          field: dict.auth?.repeatPassword || "Repeat password",
        })
      ),
  });

export const getSignUpValidationSchema = (dict: Dictionary) => [
  Yup.object({
    name: Yup.string()
      .min(
        2,
        formatMessage(dict.validation.min, {
          field: dict.drivers.fields.firstName,
          min: 2,
        })
      )
      .required(
        formatMessage(dict.validation.required, {
          field: dict.drivers.fields.firstName,
        })
      ),
    surname: Yup.string()
      .min(
        2,
        formatMessage(dict.validation.min, {
          field: dict.drivers.fields.lastName,
          min: 2,
        })
      )
      .required(
        formatMessage(dict.validation.required, {
          field: dict.drivers.fields.lastName,
        })
      ),
    email: Yup.string()
      .email(dict.validation.email)
      .required(
        formatMessage(dict.validation.required, { field: dict.auth.email })
      ),
  }),
  Yup.object({
    password: Yup.string()
      .min(
        8,
        formatMessage(dict.validation.min, {
          field: dict.auth.password,
          min: 8,
        })
      )
      .matches(/[a-z]/, dict.validation.passwordLowercase)
      .matches(/[A-Z]/, dict.validation.passwordUppercase)
      .matches(/[0-9]/, dict.validation.passwordNumber)
      .required(
        formatMessage(dict.validation.required, { field: dict.auth.password })
      ),
    repeatPassword: Yup.string()
      .oneOf([Yup.ref("password")], dict.validation.passwordsMatch || "Passwords must match")
      .required(
        formatMessage(dict.validation.required, { field: dict.auth?.repeatPassword || "Repeat password" })
      ),
  }),
  Yup.object({}),
];
