"use client";

import {
  Box,
  Stack,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Field, FieldProps, useFormikContext } from "formik";
import { useState } from "react";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { StyledTextFieldAuth } from "@/app/lib/styled/styledFieldBox";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/**
 * Live password-rule checklist. Reads the current `password` value straight
 * from Formik so each rule flips ✓/✗ as the user types, instead of only
 * surfacing a generic error on submit. Rules mirror the Yup schema in
 * validationSchema/auth.ts — keep the two in sync.
 */
function PasswordChecklist() {
  const dict = useDictionary();
  const { values } = useFormikContext<{ password: string }>();
  const password = values.password || "";

  const rules = [
    { label: dict.auth.passwordRules.minLength, passed: password.length >= 8 },
    { label: dict.auth.passwordRules.lowercase, passed: /[a-z]/.test(password) },
    { label: dict.auth.passwordRules.uppercase, passed: /[A-Z]/.test(password) },
    { label: dict.auth.passwordRules.number, passed: /[0-9]/.test(password) },
  ];

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        sx={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", mb: 0.5 }}
      >
        {dict.auth.passwordRules.title}
      </Typography>
      <Stack spacing={0.5}>
        {rules.map((rule) => (
          <Stack
            key={rule.label}
            direction="row"
            spacing={1}
            alignItems="center"
          >
            {rule.passed ? (
              <CheckCircleOutlineIcon
                sx={{ fontSize: 16, color: "#22c55e" }}
              />
            ) : (
              <RadioButtonUncheckedIcon
                sx={{ fontSize: 16, color: "rgba(255,255,255,0.35)" }}
              />
            )}
            <Typography
              sx={{
                fontSize: "12px",
                color: rule.passed ? "#22c55e" : "rgba(255,255,255,0.55)",
                transition: "color 0.2s ease",
              }}
            >
              {rule.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function Step2Security() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();

  /* --------------------------------- STATES --------------------------------- */
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
          {dict.auth.security}
        </Typography>
        <Typography
          sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}
        >
          {dict.auth.securityDescription}
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Field name="password">
          {({ field, meta }: FieldProps) => (
            <StyledTextFieldAuth
              {...field}
              type={showPassword ? "text" : "password"}
              placeholder={dict.auth.password}
              fullWidth
              // Rule feedback lives in the live checklist below, so the field
              // only signals error state (red border) without a redundant
              // per-rule helperText message.
              error={meta.touched && Boolean(meta.error)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
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

        <PasswordChecklist />

        <Field name="repeatPassword">
          {({ field, meta }: FieldProps) => (
            <StyledTextFieldAuth
              {...field}
              type={showRepeatPassword ? "text" : "password"}
              placeholder={dict.auth.repeatPassword}
              fullWidth
              error={meta.touched && Boolean(meta.error)}
              helperText={meta.touched && meta.error}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                      sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                    >
                      {showRepeatPassword ? (
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
      </Stack>
    </Stack>
  );
}
