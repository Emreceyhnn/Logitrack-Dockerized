"use client";

import { Box, Stack, Typography } from "@mui/material";
import { Field, FieldProps } from "formik";
import { StyledTextFieldAuth } from "@/app/lib/styled/styledFieldBox";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function Step1PersonalInfo() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
          {dict.auth.personalInfo}
        </Typography>
        <Typography
          sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}
        >
          {dict.auth.signUpDescription}
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Field name="name">
          {({ field, meta }: FieldProps) => (
            <StyledTextFieldAuth
              {...field}
              type="text"
              placeholder={dict.auth.firstName}
              fullWidth
              error={meta.touched && Boolean(meta.error)}
              helperText={meta.touched && meta.error}
            />
          )}
        </Field>
        <Field name="surname">
          {({ field, meta }: FieldProps) => (
            <StyledTextFieldAuth
              {...field}
              type="text"
              placeholder={dict.auth.lastName}
              fullWidth
              error={meta.touched && Boolean(meta.error)}
              helperText={meta.touched && meta.error}
            />
          )}
        </Field>
        <Field name="email">
          {({ field, meta }: FieldProps) => (
            <StyledTextFieldAuth
              {...field}
              type="email"
              placeholder={dict.auth.email}
              fullWidth
              error={meta.touched && Boolean(meta.error)}
              helperText={meta.touched && meta.error}
            />
          )}
        </Field>
      </Stack>
    </Stack>
  );
}
