"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  Visibility,
  VisibilityOff,
  LockResetOutlined,
} from "@mui/icons-material";
import { useFormik } from "formik";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { getResetPasswordValidationSchema } from "@/app/lib/validationSchema/auth";
import { resetPassword } from "@/app/lib/controllers/users/passwordReset";

export default function ResetPasswordForm({
  token,
  tokenValid,
}: {
  token: string;
  tokenValid: boolean;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const params = useParams();
  const lang = typeof params?.lang === "string" ? params.lang : "en";

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  const formik = useFormik({
    initialValues: { password: "", repeatPassword: "" },
    validationSchema: getResetPasswordValidationSchema(dict),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const result = await resetPassword(token, values.password);
        if (result && "error" in result && result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(
          dict.auth?.passwordResetSuccess ||
            "Your password has been reset. Please sign in."
        );
        // Every session was revoked server-side, so there is nothing to keep
        // the user signed into — send them to sign in with the new password.
        router.push(`/${lang}/auth/sign-in`);
      } catch {
        toast.error(
          dict.auth?.resetLinkError || "Something went wrong. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!tokenValid) {
    return (
      <Box>
        <Stack spacing={3}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {dict.auth?.resetLinkInvalid ||
              "This reset link is invalid or has expired."}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {dict.auth?.resetLinkInvalidHint ||
              "Reset links expire after 60 minutes and can only be used once. Request a new one to continue."}
          </Typography>
          <Button
            component={Link}
            href={`/${lang}/auth/forgot-password`}
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5, borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {dict.auth?.requestNewLink || "Request a new link"}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {dict.auth?.resetPasswordTitle || "Set a new password"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dict.auth?.resetPasswordDescription ||
              "Choose a new password for your account. You'll be signed out of all other devices."}
          </Typography>
        </Box>

        <form onSubmit={formik.handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              fullWidth
              name="password"
              label={dict.auth?.newPassword || "New Password"}
              type={showPassword ? "text" : "password"}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        aria-label={dict.auth?.togglePassword || "Toggle password visibility"}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              name="repeatPassword"
              label={dict.auth?.repeatPassword || "Repeat Password"}
              type={showRepeat ? "text" : "password"}
              value={formik.values.repeatPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.repeatPassword &&
                Boolean(formik.errors.repeatPassword)
              }
              helperText={
                formik.touched.repeatPassword && formik.errors.repeatPassword
              }
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowRepeat((v) => !v)}
                        edge="end"
                        aria-label={dict.auth?.togglePassword || "Toggle password visibility"}
                      >
                        {showRepeat ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={formik.isSubmitting}
              startIcon={<LockResetOutlined />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {formik.isSubmitting
                ? dict.auth?.sending || "Saving..."
                : dict.auth?.resetPasswordButton || "Reset Password"}
            </Button>
          </Stack>
        </form>

        <Box textAlign="center" mt={2}>
          <Button
            component={Link}
            href={`/${lang}/auth/sign-in`}
            startIcon={<ArrowBack />}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            {dict.auth?.backToSignIn || "Back to Sign In"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
