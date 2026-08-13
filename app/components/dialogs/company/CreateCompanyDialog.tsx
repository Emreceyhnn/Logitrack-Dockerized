"use client";

import { useState, useMemo } from "react";

import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  useTheme,
  Typography,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import { motion, AnimatePresence } from "framer-motion";
import { Formik } from "formik";
import { createCompanyValidationSchema } from "@/app/lib/validationSchema";
import {
  CompanyFormData,
  CreateCompanyDialogProps,
} from "@/app/lib/type/create-company";
import Step1Branding from "./Step1Branding";
import Step2Regional from "./Step2Regional";
import VerifyEmailGate from "./VerifyEmailGate";
import { useOptionalUserContext } from "@/app/lib/context/UserContext";
import { toast } from "sonner";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { createCompany } from "@/app/lib/controllers/company";
import { isEmailNotVerifiedError } from "@/app/lib/utils/emailVerificationError";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";
import { getRegionalDefaults } from "@/app/lib/constants";

export default function CreateCompanyDialog({
  open,
  onClose,
  onSuccess,
}: CreateCompanyDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { lang: locale, changeLanguage } = useLanguage();

  // Seed timezone/currency/language from the user's UI locale so the form opens
  // with region-appropriate defaults (e.g. Europe/Istanbul + TRY for tr) rather
  // than the neutral UTC + USD. All still editable in step 2.
  const initialFormData: CompanyFormData = useMemo(() => {
    const { timezone, currency } = getRegionalDefaults(locale);
    return {
      name: "",
      logo: null,
      industry: "",
      domain: "",
      timezone,
      currency,
      language: locale === "tr" ? "tr" : "en",
      regionalVisibility: true,
    };
  }, [locale]);

  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(0); // For framer-motion slide direction

  // createCompany rejects an unverified founder (requireVerifiedEmail), so the
  // form is pointless for them — the gate replaces it rather than letting them
  // fill in two steps and a logo upload before being turned away.
  //
  // Optional context, not useUser(): this dialog also renders on /onboarding,
  // which sits outside UserProvider, and the strict hook throws there (it broke
  // the prerender of /[lang]/onboarding). A null user means "can't tell from
  // here" — show the form and let the server-side check decide, which is the
  // pre-existing behaviour. `loading` is still honoured so an unresolved user
  // never flashes the gate.
  const { user, loading: userLoading } = useOptionalUserContext();
  const [emailVerificationBlocked, setEmailVerificationBlocked] = useState(false);
  const needsEmailVerification =
    (!userLoading && !!user && !user.emailVerified) || emailVerificationBlocked;

  // Hoisted out of the Formik prop: that JSX now sits behind the gate branch,
  // and a hook called conditionally breaks the rules of hooks.
  const validationSchema = useMemo(
    () => createCompanyValidationSchema(dict),
    [dict]
  );

  /* -------------------------------- Handlers -------------------------------- */
  const handleNext = () => {
    setDirection(1);
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => {
    setDirection(-1);
    setActiveStep((prev) => prev - 1);
  };

  // Reset the gate on the way out so a later reopen (e.g. after the user
  // verifies their email and comes back) starts from the form again rather
  // than being stuck showing the gate from the previous rejected attempt.
  const handleClose = () => {
    setEmailVerificationBlocked(false);
    onClose();
  };

  const handleSubmit = async (values: CompanyFormData) => {
    setActiveStep(0);

    // Run upload and create behind a loading toast. The dialog stays open
    // until we know the outcome: an EMAIL_NOT_VERIFIED rejection needs to
    // swap the form for VerifyEmailGate in place, which isn't possible if
    // we've already closed the dialog before awaiting the result.
    try {
      await toast.promise(
        (async () => {
          let logoUrl = values.logo;

          if (logoUrl && logoUrl.startsWith("data:image")) {
            const uploadResult = await uploadImageAction(
              logoUrl,
              "general",
              "logos"
            );
            logoUrl = uploadResult.url;
          }

          await createCompany(
            values.name,
            logoUrl || "",
            {
              timezone: values.timezone,
              currency: values.currency,
              language: values.language,
            },
            values.domain || undefined
          );
          if (values.language !== locale) {
            changeLanguage(values.language);
          }
          onSuccess?.(values.language);
        })(),
        {
          loading: dict.toasts?.loading || "Creating company...",
          success: dict.toasts.successAdd,
          error: (err: unknown) =>
            isEmailNotVerifiedError(err)
              ? dict.auth.emailNotVerifiedAction
              : err instanceof Error
                ? err.message
                : dict.toasts.errorGeneric,
        }
      );
      onClose();
    } catch (err) {
      if (isEmailNotVerifiedError(err)) {
        setEmailVerificationBlocked(true);
      } else {
        onClose();
      }
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const steps = [
    dict.company.dialogs.steps.branding,
    dict.company.dialogs.steps.regional,
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          bgcolor: theme.palette.mode === "dark" ? "#0B1019" : "#fff",
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
          // Cap the dialog to the viewport so the body scrolls instead of the
          // last fields being squeezed against the footer on short screens.
          maxHeight: "calc(100dvh - 48px)",
        },
      }}
    >
      {needsEmailVerification ? (
        <>
          <Stack
            direction="row"
            justifyContent="flex-end"
            sx={{ px: 4, pt: 3, flexShrink: 0 }}
          >
            <IconButton
              onClick={handleClose}
              sx={{
                color: "text.secondary",
                bgcolor: theme.palette.text.secondary_alpha.main_05,
                "&:hover": {
                  bgcolor: theme.palette.error._alpha.main_10,
                  color: theme.palette.error.main,
                },
              }}
              aria-label="close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <VerifyEmailGate onClose={handleClose} />
        </>
      ) : (
      <Formik
        initialValues={initialFormData}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        validateOnMount
      >
        {({ values, errors, setFieldValue, setTouched, submitForm }) => (
          <>
            <Box sx={{ px: 4, pt: 3, pb: 2.5, flexShrink: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2.5 }}
              >
                <Stack spacing={0.5}>
                  <Typography component="div"
                    variant="h6"
                    fontWeight={800}
                    sx={{ letterSpacing: "-0.02em" }}
                  >
                    {activeStep === 0
                      ? dict.company.dialogs.identityTitle
                      : dict.company.dialogs.regionalTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeStep === 0
                      ? dict.company.dialogs.identitySubtitle
                      : dict.company.dialogs.steps.regionalDesc}
                  </Typography>
                </Stack>
                <IconButton
                  onClick={handleClose}
                  sx={{
                    color: "text.secondary",
                    bgcolor: theme.palette.text.secondary_alpha.main_05,
                    "&:hover": {
                      bgcolor: theme.palette.error._alpha.main_10,
                      color: theme.palette.error.main,
                    },
                  }}
                 aria-label="close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stepper
                activeStep={activeStep}
                sx={{
                  "& .MuiStepLabel-label": {
                    color: theme.palette.text.primary_alpha.main_40,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  },
                  "& .MuiStepLabel-label.Mui-active": {
                    color: theme.palette.primary.main,
                  },
                  "& .MuiStepLabel-label.Mui-completed": {
                    color: theme.palette.text.primary_alpha.main_80,
                  },
                  "& .MuiStepIcon-root": {
                    color: theme.palette.divider_alpha.main_10,
                  },
                  "& .MuiStepIcon-root.Mui-active": {
                    color: theme.palette.primary.main,
                  },
                  "& .MuiStepIcon-root.Mui-completed": {
                    color: theme.palette.primary.main,
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <DialogContent
              sx={{
                px: 4,
                py: 3,
                // Scroll the form body rather than clipping it: the branding
                // step is taller than the dialog on laptop-height screens.
                overflowY: "auto",
                overflowX: "hidden",
                // The x-slide transition would otherwise trigger a horizontal
                // scrollbar mid-animation.
                overscrollBehavior: "contain",
              }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={activeStep}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  {activeStep === 0 && (
                    <Step1Branding
                      state={{
                        activeStep,
                        formData: values,
                        loading: false,
                        error: null,
                      }}
                      actions={{
                        handleNext,
                        handleBack,
                        updateFormData: (data) => {
                          Object.keys(data).forEach((key) => {
                            setFieldValue(key, data[key as keyof typeof data]);
                          });
                        },
                        submit: submitForm,
                        reset: () => {},
                      }}
                    />
                  )}
                  {activeStep === 1 && (
                    <Step2Regional
                      state={{
                        activeStep,
                        formData: values,
                        loading: false,
                        error: null,
                      }}
                      actions={{
                        handleNext,
                        handleBack,
                        updateFormData: (data) => {
                          Object.keys(data).forEach((key) => {
                            setFieldValue(key, data[key as keyof typeof data]);
                          });
                        },
                        submit: submitForm,
                        reset: () => {},
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </DialogContent>

            <DialogActions
              sx={{
                px: 4,
                py: 2.5,
                flexShrink: 0,
                borderTop: `1px solid ${theme.palette.divider_alpha.main_10}`,
                justifyContent: "space-between",
                bgcolor: theme.palette.background.paper_alpha.main_40,
              }}
            >
              <Button
                onClick={activeStep === 0 ? handleClose : handleBack}
                sx={{
                  color: "text.secondary",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  "&:hover": {
                    bgcolor: theme.palette.text.secondary_alpha.main_10,
                  },
                }}
                startIcon={activeStep > 0 ? <NavigateBeforeIcon /> : null}
              >
                {activeStep === 0 ? dict.common.cancel : dict.common.back}
              </Button>

              <Button
                variant="contained"
                onClick={() => {
                  if (activeStep === 0) {
                    // Advance only when step-1 fields are valid. On failure, mark
                    // them touched so the *specific* field errors render inline
                    // (name / industry) instead of a generic which-field-is-it
                    // toast.
                    if (!errors.name && !errors.industry && values.name) {
                      handleNext();
                    } else {
                      setTouched({ name: true, industry: true }, true);
                    }
                  } else {
                    submitForm();
                  }
                }}
                endIcon={
                  activeStep === 1 ? (
                    <CheckIcon />
                  ) : (
                    <NavigateNextIcon />
                  )
                }
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  px: 4,
                  minWidth: 160,
                  py: 1.2,
                  fontWeight: 800,
                  boxShadow: `0 8px 20px ${theme.palette.primary._alpha.main_25}`,
                  "&:hover": {
                    boxShadow: `0 12px 24px ${theme.palette.primary._alpha.main_35}`,
                  },
                }}
              >
                {activeStep === 1
                    ? dict.common.save
                    : dict.common.next}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
      )}
    </Dialog>
  );
}
