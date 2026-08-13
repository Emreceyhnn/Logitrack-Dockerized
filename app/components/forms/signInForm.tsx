"use client";

import Link from "next/link";
import {
  Box,
  Stack,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Field, Form, Formik } from "formik";
import type { FormikHelpers, FieldProps } from "formik";
import { useMemo, useState } from "react";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { StyledTextFieldAuth } from "@/app/lib/styled/styledFieldBox";
import AuthButton from "../ui/AuthButton";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { LoginUser, LoginWithGoogle } from "@/app/lib/controllers/users";
import { loginValidationSchema } from "@/app/lib/validationSchema";
import { logger } from "@/app/lib/logger";
import GoogleSignInButton from "../ui/GoogleSignInButton";


interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginForm() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const router = useRouter();
  const { lang, dict } = useLanguage();

  /* --------------------------------- STATES --------------------------------- */
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  // Set after a rejected credential attempt so the recovery prompt appears at
  // the moment it's actually useful. Never distinguishes "no such account"
  // from "wrong password" — the server deliberately returns one error for both.
  const [credentialsFailed, setCredentialsFailed] = useState<boolean>(false);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleSubmit = async (
    values: LoginFormValues,
    actions: FormikHelpers<LoginFormValues>
  ) => {
    setLoading(true);
    setCredentialsFailed(false);
    try {
      const res = await LoginUser(values.email, values.password);

      if (res && "error" in res && res.error) {
        let errorMsg = res.error;
        if (res.error === "Invalid credentials") {
          errorMsg = dict.auth.invalidCredentials;
          setCredentialsFailed(true);
        } else if (res.error === "Too many login attempts. Please try again later.") {
          errorMsg = dict.auth.tooManyAttempts;
        } else if (res.error === "Too many login attempts for this account. Please try again later.") {
          errorMsg = dict.auth.tooManyAttemptsAccount;
        }

        actions.setFieldError("email", errorMsg);
        actions.setFieldError("password", errorMsg);
        setLoading(false);
        return;
      }

      if (res && "user" in res && res.user) {
        router.refresh();
        if (res.user.companyId) {
          router.push(`/${lang}/overview`);
        } else {
          router.push(`/${lang}`);
        }
      }
    } catch (error: unknown) {
      logger.error("Login failed:", error);
      const message =
        error instanceof Error ? error.message : dict.auth.loginFailed;
      actions.setFieldError("email", message);
      actions.setFieldError("password", message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleCredential = async (idToken: string) => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const res = await LoginWithGoogle(idToken);

      if (res && "error" in res && res.error) {
        setGoogleError(res.error);
        return;
      }

      if (res && "user" in res && res.user) {
        router.refresh();
        if (res.user.companyId) {
          router.push(`/${lang}/overview`);
        } else {
          router.push(`/${lang}`);
        }
      }
    } catch (error: unknown) {
      logger.error("Google login failed:", error);
      setGoogleError(dict.auth.googleSignInFailed);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Box
      maxWidth={{ sm: 420, xs: "95%" }}
      width={"100%"}
      bgcolor={"rgba(8, 12, 24, 0.75)"}
      sx={{
        backdropFilter: "blur(25px)",
        border: "1px solid rgba(56, 189, 248, 0.15)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
      }}
      borderRadius={"24px"}
    >
      <Box p={{ xs: "30px", sm: "50px" }}>
        <Stack
          direction="row"
          spacing={3}
          mb={4}
          alignItems="center"
          justifyContent="center"
        >
          <Link
            href={`/${lang}/auth/sign-up`}
            style={{ textDecoration: "none" }}
          >
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: "24px",
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.3)",
                transition: "color 0.2s ease",
                "&:hover": {
                  color: "rgba(255, 255, 255, 0.6)",
                },
              }}
            >
              {dict.auth.register}
            </Typography>
          </Link>

          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "24px",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: -8,
                left: 0,
                width: "100%",
                height: 2,
                bgcolor: "#38bdf8",
                borderRadius: 2,
              },
            }}
          >
            {dict.auth.login}
          </Typography>
        </Stack>

        <Formik<LoginFormValues>
          initialValues={{ email: "", password: "" }}
          onSubmit={handleSubmit}
          validationSchema={useMemo(() => loginValidationSchema(dict), [dict])}
        >
          <Form>
            <Stack spacing={3}>
              <Box mb={2}>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ color: "#fff", fontWeight: 600, mb: 1 }}
                >
                  {dict.auth.welcome}
                </Typography>
                <Typography
                  sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}
                >
                  {dict.auth.signInDescription}
                </Typography>
              </Box>

              <Field name="email">
                {({ field, meta }: FieldProps<LoginFormValues>) => (
                  <StyledTextFieldAuth
                    {...field}
                    type="email"
                    placeholder={dict.auth.email}
                    inputProps={{ "aria-label": dict.auth.email }}
                    fullWidth
                    error={meta.touched && Boolean(meta.error)}
                    helperText={meta.touched && meta.error}
                  />
                )}
              </Field>

              <Field name="password">
                {({ field, meta }: FieldProps<LoginFormValues>) => (
                  <StyledTextFieldAuth
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder={dict.auth.password}
                    inputProps={{ "aria-label": dict.auth.password }}
                    fullWidth
                    error={meta.touched && Boolean(meta.error)}
                    helperText={meta.touched && meta.error}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleShowPassword}
                            aria-label={
                              showPassword ? "hide password" : "show password"
                            }
                            sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                          >
                            {showPassword ? (
                              <VisibilityIcon />
                            ) : (
                              <VisibilityOffIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Field>

              <Box sx={{ mt: -1, textAlign: "right" }}>
                <Link
                  href={`/${lang}/auth/forgot-password`}
                  style={{ textDecoration: "none" }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.5)",
                      transition: "color 0.2s ease",
                      "&:hover": {
                        color: "#38bdf8",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {dict.auth.forgotPassword}
                  </Typography>
                </Link>
              </Box>

              <AuthButton
                type="submit"
                loading={loading}
                loadingText={dict.auth.loggingIn}
                sx={{
                  mt: 2,
                  backgroundImage:
                    "linear-gradient(95deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)",
                  color: "#fff",
                  boxShadow: "0 8px 20px rgba(14, 165, 233, 0.35)",
                  "&:hover": {
                    backgroundImage:
                      "linear-gradient(95deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)",
                    boxShadow: "0 10px 24px rgba(14, 165, 233, 0.45)",
                  },
                }}
              >
                {dict.auth.logInNow}
              </AuthButton>

              {credentialsFailed && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "12px",
                    bgcolor: "rgba(56, 189, 248, 0.08)",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}
                  >
                    {dict.auth.forgotPasswordPrompt}{" "}
                  </Typography>
                  <Link
                    href={`/${lang}/auth/forgot-password`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#38bdf8",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {dict.auth.resetPasswordButton}
                    </Typography>
                  </Link>
                </Box>
              )}

              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                onError={() => setGoogleError(dict.auth.googleSignInFailed)}
                disabled={googleLoading}
              />
              {googleError && (
                <Typography sx={{ color: "#f87171", fontSize: "13px", textAlign: "center" }}>
                  {googleError}
                </Typography>
              )}
            </Stack>
          </Form>
        </Formik>
      </Box>
    </Box>
  );
}
