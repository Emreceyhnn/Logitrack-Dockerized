"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import Link from "next/link";
import { Formik } from "formik";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import {
  submitDemoRequest,
  type DemoRequestKind,
} from "@/app/lib/actions/demoRequest";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface ContactFormValues {
  fullName: string;
  email: string;
  company: string;
  message: string;
}

const initialValues: ContactFormValues = {
  fullName: "",
  email: "",
  company: "",
  message: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactClient({
  kind = "CONTACT",
  lang = "tr",
}: {
  kind?: DemoRequestKind;
  lang?: string;
}) {
  const dict = useDictionary();
  const cDict = dict?.landing?.contactPage;
  const [submitted, setSubmitted] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  // Set when the requester was already a verified account: submitDemoRequest
  // granted the trial immediately instead of queuing a PENDING row, so the
  // success card should say "you're in" rather than "we'll be in touch".
  const [trialGranted, setTrialGranted] = useState(false);
  // Demo requesters can skip the manual-approval wait entirely: signup grants a
  // 7-day trial instantly, so we offer it as a self-serve shortcut. The signed
  // demoToken (set on successful submit below) is what actually authorizes the
  // trial server-side — a direct/organic sign-up never carries one.
  const signUpBaseHref = `/${lang}${getLocalizedPath("/auth/sign-up", lang)}`;
  const signUpHref = demoToken
    ? `${signUpBaseHref}?demoToken=${encodeURIComponent(demoToken)}`
    : signUpBaseHref;

  if (!cDict) {
    return (
      <Box sx={{ p: 10, color: "white", bgcolor: "#0f172a" }}>
        Error: contactPage dictionary is missing.
      </Box>
    );
  }

  const validate = (values: ContactFormValues) => {
    const errors: Partial<Record<keyof ContactFormValues, string>> = {};
    if (!values.fullName.trim())
      errors.fullName = cDict.validation.fullNameRequired;
    if (!values.email.trim()) errors.email = cDict.validation.emailRequired;
    else if (!EMAIL_RE.test(values.email.trim()))
      errors.email = cDict.validation.emailInvalid;
    return errors;
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "rgba(255,255,255,0.03)",
      color: "#f1f5f9",
      "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset": { borderColor: "rgba(56,189,248,0.4)" },
      "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
    },
    "& .MuiInputLabel-root": { color: "rgba(241,245,249,0.6)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#38bdf8" },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0f172a",
        color: "#f1f5f9",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background gradients */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, #3b82f626 0%, transparent 40%)," +
            "radial-gradient(circle at 80% 80%, #6366f11a 0%, transparent 50%)",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="sm"
        sx={{
          position: "relative",
          zIndex: 1,
          pt: { xs: 14, md: 20 },
          pb: { xs: 10, md: 16 },
        }}
      >
        <Stack
          spacing={3}
          alignItems="center"
          textAlign="center"
          mb={6}
          sx={{ animation: `${fadeIn} 0.8s ease-out` }}
        >
          <Chip
            label={cDict.badge}
            sx={{
              borderRadius: "999px",
              px: 2,
              py: 0.5,
              bgcolor: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.3)",
              color: "#38bdf8",
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              background:
                "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {cDict.title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(241,245,249,0.7)",
              maxWidth: 520,
              lineHeight: 1.6,
            }}
          >
            {cDict.subtitle}
          </Typography>
        </Stack>

        {submitted && trialGranted ? (
          <Box
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: "linear-gradient(135deg, #22d3ee1a 0%, #2563eb0d 100%)",
              border: "1px solid rgba(34,211,238,0.3)",
              animation: `${fadeIn} 0.5s ease-out`,
              textAlign: "center",
            }}
          >
            <Stack spacing={3} alignItems="center">
              <RocketLaunchRoundedIcon sx={{ fontSize: 48, color: "#22d3ee" }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {cDict.successCard.trialGrantedTitle}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(241,245,249,0.75)", maxWidth: 420 }}
              >
                {cDict.successCard.trialGrantedBody}
              </Typography>
              <Button
                component={Link}
                href={`/${lang}${getLocalizedPath("/onboarding", lang)}`}
                variant="contained"
                endIcon={<RocketLaunchRoundedIcon />}
                sx={{
                  py: 1.25,
                  px: 3,
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #22d3ee, #2563eb)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
                  },
                }}
              >
                {cDict.successCard.trialGrantedCta}
              </Button>
            </Stack>
          </Box>
        ) : submitted ? (
          <Box
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: "linear-gradient(135deg, #38bdf81a 0%, #6366f10d 100%)",
              border: "1px solid rgba(56,189,248,0.2)",
              animation: `${fadeIn} 0.5s ease-out`,
            }}
          >
            <Stack spacing={4}>
              {/* Header + expected timeframe */}
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <CheckCircleRoundedIcon
                  sx={{ fontSize: 48, color: "#38bdf8" }}
                />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {cDict.successCard.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ color: "rgba(241,245,249,0.75)" }}
                >
                  <ScheduleRoundedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2">
                    {cDict.successCard.timeframe}
                  </Typography>
                </Stack>
              </Stack>

              {/* Numbered next steps */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: "rgba(15,23,42,0.4)",
                  border: "1px solid rgba(56,189,248,0.1)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "rgba(241,245,249,0.6)",
                    fontSize: "0.7rem",
                  }}
                >
                  {cDict.successCard.stepsTitle}
                </Typography>
                <Stack spacing={2}>
                  {[
                    cDict.successCard.step1,
                    cDict.successCard.step2,
                    cDict.successCard.step3,
                  ].map((step, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          bgcolor: "rgba(56,189,248,0.15)",
                          color: "#38bdf8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                        }}
                      >
                        {i + 1}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(241,245,249,0.85)", lineHeight: 1.6 }}
                      >
                        {step}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Email note */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ color: "rgba(241,245,249,0.6)" }}
              >
                <MarkEmailReadRoundedIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption">
                  {cDict.successCard.emailNote}
                </Typography>
              </Stack>

              {/* Self-serve trial shortcut — only for demo requesters, who want
                  to try the product; a plain contact message doesn't get this. */}
              {kind === "DEMO" && (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background:
                      "linear-gradient(135deg, #22d3ee1a, #2563eb14)",
                    border: "1px solid rgba(34,211,238,0.3)",
                    textAlign: "center",
                  }}
                >
                  <RocketLaunchRoundedIcon
                    sx={{ fontSize: 28, color: "#22d3ee", mb: 1 }}
                  />
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                    {cDict.successCard.selfServeTitle}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(241,245,249,0.75)",
                      mb: 2,
                      lineHeight: 1.6,
                    }}
                  >
                    {cDict.successCard.selfServeBody}
                  </Typography>
                  <Button
                    component={Link}
                    href={signUpHref}
                    variant="contained"
                    endIcon={<RocketLaunchRoundedIcon />}
                    sx={{
                      py: 1.25,
                      px: 3,
                      fontWeight: 800,
                      textTransform: "none",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #22d3ee, #2563eb)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
                      },
                    }}
                  >
                    {cDict.successCard.selfServeCta}
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>
        ) : (
          <Formik
            initialValues={initialValues}
            validate={validate}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              const result = await submitDemoRequest({
                fullName: values.fullName,
                email: values.email,
                company: values.company || undefined,
                message: values.message || undefined,
                type: kind,
              });
              setSubmitting(false);

              if (result.success) {
                toast.success(
                  result.trialGranted
                    ? cDict.successCard.trialGrantedToast
                    : cDict.success
                );
                setDemoToken(result.demoToken ?? null);
                setTrialGranted(Boolean(result.trialGranted));
                resetForm();
                setSubmitted(true);
              } else {
                toast.error(cDict.error);
              }
            }}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
            }) => (
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  background: "rgba(15,23,42,0.5)",
                  border: "1px solid rgba(56,189,248,0.1)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Stack spacing={3}>
                  <TextField
                    name="fullName"
                    label={cDict.form.fullName}
                    value={values.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.fullName && Boolean(errors.fullName)}
                    helperText={touched.fullName && errors.fullName}
                    fullWidth
                    required
                    sx={inputSx}
                  />
                  <TextField
                    name="email"
                    type="email"
                    label={cDict.form.email}
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    fullWidth
                    required
                    sx={inputSx}
                  />
                  <TextField
                    name="company"
                    label={cDict.form.company}
                    value={values.company}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    sx={inputSx}
                  />
                  <TextField
                    name="message"
                    label={cDict.form.message}
                    placeholder={cDict.form.messagePlaceholder}
                    value={values.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    multiline
                    minRows={4}
                    sx={inputSx}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    endIcon={<SendIcon />}
                    sx={{
                      py: 1.5,
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "1rem",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #22d3ee, #2563eb)",
                      boxShadow: "0 12px 30px rgba(37, 99, 235, 0.35)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
                      },
                    }}
                  >
                    {isSubmitting ? cDict.form.submitting : cDict.form.submit}
                  </Button>
                </Stack>
              </Box>
            )}
          </Formik>
        )}
      </Container>
    </Box>
  );
}
