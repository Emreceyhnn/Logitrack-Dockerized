"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Stack, TextField, Button, Typography, Alert } from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { acceptDriverInvitation } from "@/app/lib/controllers/invitations";
import { formatMessage } from "@/app/lib/language/language";

interface AcceptInviteFormClientProps {
  token: string;
  email: string;
  companyName: string;
  lang: string;
}

export default function AcceptInviteFormClient({ token, email, companyName, lang }: AcceptInviteFormClientProps) {
  const dict = useDictionary();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { name: "", surname: "", password: "", repeatPassword: "" },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, formatMessage(dict.validation.min, { field: dict.drivers.fields.firstName, min: 2 }))
        .required(formatMessage(dict.validation.required, { field: dict.drivers.fields.firstName })),
      surname: Yup.string()
        .min(2, formatMessage(dict.validation.min, { field: dict.drivers.fields.lastName, min: 2 }))
        .required(formatMessage(dict.validation.required, { field: dict.drivers.fields.lastName })),
      password: Yup.string()
        .min(8, formatMessage(dict.validation.min, { field: dict.auth.password, min: 8 }))
        .matches(/[a-z]/, dict.validation.passwordLowercase)
        .matches(/[A-Z]/, dict.validation.passwordUppercase)
        .matches(/[0-9]/, dict.validation.passwordNumber)
        .required(formatMessage(dict.validation.required, { field: dict.auth.password })),
      repeatPassword: Yup.string()
        .oneOf([Yup.ref("password")], dict.validation.passwordsMatch || "Passwords must match")
        .required(formatMessage(dict.validation.required, { field: dict.auth?.repeatPassword || "Repeat password" })),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitError(null);
      try {
        const result = await acceptDriverInvitation(token, values.name, values.surname, values.password);
        if ("error" in result) {
          setSubmitError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(dict.toasts.successAdd);
        router.push(`/${lang}`);
        router.refresh();
      } catch {
        setSubmitError(dict.toasts.errorGeneric);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 14, mb: 3, textAlign: "center" }}>
        {companyName}
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField fullWidth label={dict.auth.email} value={email} disabled />
        <TextField
          fullWidth
          name="name"
          label={dict.drivers.fields.firstName}
          value={formik.values.name}
          onChange={formik.handleChange}
          error={formik.touched.name && !!formik.errors.name}
          helperText={formik.touched.name && formik.errors.name}
        />
        <TextField
          fullWidth
          name="surname"
          label={dict.drivers.fields.lastName}
          value={formik.values.surname}
          onChange={formik.handleChange}
          error={formik.touched.surname && !!formik.errors.surname}
          helperText={formik.touched.surname && formik.errors.surname}
        />
        <TextField
          fullWidth
          type="password"
          name="password"
          label={dict.auth.password}
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && !!formik.errors.password}
          helperText={formik.touched.password && formik.errors.password}
        />
        <TextField
          fullWidth
          type="password"
          name="repeatPassword"
          label={dict.auth?.repeatPassword || "Repeat password"}
          value={formik.values.repeatPassword}
          onChange={formik.handleChange}
          error={formik.touched.repeatPassword && !!formik.errors.repeatPassword}
          helperText={formik.touched.repeatPassword && formik.errors.repeatPassword}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formik.isSubmitting}
          sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, py: 1.5 }}
        >
          {dict.auth.register}
        </Button>
      </Stack>
    </Box>
  );
}
