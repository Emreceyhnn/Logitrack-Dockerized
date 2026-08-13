"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Typography,
  useTheme,
  Button,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useMemo, useState } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { AddCustomerDialogProps } from "@/app/lib/type/add-customer";
import { toast } from "sonner";
import { useCustomerMutations } from "@/app/hooks/useCustomers";
import { useUser } from "@/app/hooks/useUser";
import IdentitySection from "./sections/IdentitySection";
import ContactSection from "./sections/ContactSection";

import { Formik, FormikHelpers } from "formik";
import { addCustomerValidationSchema } from "@/app/lib/validationSchema";

const initialIdentity = {
  name: "",
  code: "",
  industry: "",
  taxId: "",
};

const initialContact = {
  email: "",
  phone: "",
  locations: [
    {
      name: "Main Office",
      address: "",
      lat: undefined as number | undefined,
      lng: undefined as number | undefined,
      isDefault: true,
    },
  ],
};

const AddCustomerDialog = ({
  open,
  onClose,
  onSuccess,
}: AddCustomerDialogProps) => {
  /* ---------------------------------- State --------------------------------- */
  const theme = useTheme();
  const { user } = useUser();
  const dict = useDictionary();
  const { createCustomer } = useCustomerMutations();

  const [currentStep, setCurrentStep] = useState(1);

  const initialValues = {
    ...initialIdentity,
    ...initialContact,
  };

  const closeDialog = () => {
    onClose();
    setTimeout(() => {
      setCurrentStep(1);
    }, 300);
  };

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    if (!user) return;

    // 1. Close dialog immediately
    closeDialog();
    resetForm();

    // 2. useCustomerMutations() already toasts success/error and applies the
    // optimistic cache update; just await the submission.
    try {
      await createCustomer.mutateAsync({
        name: values.name,
        code: values.code,
        industry: values.industry || undefined,
        taxId: values.taxId || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        locations: values.locations.filter((l) => l.address.trim() !== ""),
      });
      onSuccess?.();
    } catch {
      // useCustomerMutations() already toasted the error
    }
  };

  const steps = [
    dict.customers.dialogs.steps.identity,
    dict.customers.dialogs.steps.contact,
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(8px)",
              backgroundColor: theme.palette.background.default_alpha.main_40,
            },
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            backgroundImage:
              "radial-gradient(circle at top right, rgba(37, 99, 235, 0.05), transparent), radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.03), transparent)",
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider_alpha.main_10}`,
            maxHeight: "90vh",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.5)",
          },
        }}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={useMemo(
            () => addCustomerValidationSchema(dict),
            [dict]
          )}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit, validateForm }) => (
            <>
              <Box sx={{ p: 3, pb: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: theme.palette.primary._alpha.main_10,
                        border: `1px solid ${theme.palette.primary._alpha.main_20}`,
                        color: theme.palette.primary.main,
                      }}
                    >
                      <BusinessIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography component="div"
                        variant="h6"
                        fontWeight={700}
                        color="text.primary"
                        lineHeight={1.2}
                      >
                        {dict.customers.dialogs.addTitle}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={500}
                      >
                        {dict.customers.registerNewPartner}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    onClick={closeDialog}
                    sx={{
                      color: "text.secondary",
                      bgcolor: theme.palette.common.white_alpha.main_03,
                      "&:hover": {
                        bgcolor: theme.palette.action.hover,
                        color: "text.primary",
                      },
                    }}
                   aria-label="close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stepper
                  activeStep={currentStep - 1}
                  sx={{
                    mb: 4,
                    px: 1,
                    "& .MuiStepLabel-label": {
                      color: theme.palette.text.secondary_alpha.main_60,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      mt: 1,
                    },
                    "& .MuiStepLabel-label.Mui-active": {
                      color: "text.primary",
                    },
                    "& .MuiStepLabel-label.Mui-completed": {
                      color: theme.palette.text.secondary,
                    },
                    "& .MuiStepIcon-root": {
                      width: 28,
                      height: 28,
                      color: theme.palette.action.hover,
                      border: `1px solid ${theme.palette.divider_alpha.main_10}`,
                      borderRadius: "50%",
                      transition: "all 0.3s ease",
                    },
                    "& .MuiStepIcon-root.Mui-active": {
                      color: theme.palette.primary.main,
                      border: `1px solid ${theme.palette.primary._alpha.main_50}`,
                      boxShadow: `0 0 12px ${theme.palette.primary._alpha.main_30}`,
                    },
                    "& .MuiStepIcon-root.Mui-completed": {
                      color: theme.palette.primary.main,
                    },
                    "& .MuiStepIcon-text": {
                      fill: "white",
                      fontWeight: 700,
                    },
                    "& .MuiStepConnector-line": {
                      borderColor: theme.palette.divider_alpha.main_10,
                      borderTopWidth: 2,
                    },
                    "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line":
                      {
                        borderColor: theme.palette.primary.main,
                      },
                    "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line":
                      {
                        borderColor: theme.palette.primary.main,
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

              <DialogContent sx={{ pb: 4, minHeight: 350 }}>
                {currentStep === 1 && <IdentitySection />}
                {currentStep === 2 && <ContactSection />}
              </DialogContent>

              <DialogActions
                sx={{
                  p: 3,
                  pt: 2,
                  borderTop: `1px solid ${theme.palette.divider_alpha.main_10}`,
                  justifyContent: "space-between",
                }}
              >
                <Button
                  onClick={
                    currentStep === 1
                      ? closeDialog
                      : () => setCurrentStep(currentStep - 1)
                  }
                  sx={{
                    color: theme.palette.text.secondary,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    "&:hover": {
                      color: "text.primary",
                      bgcolor: theme.palette.action.hover,
                    },
                  }}
                >
                  {currentStep === 1 ? dict.common.cancel : dict.common.back}
                </Button>

                <Button
                  variant="contained"
                  onClick={async () => {
                    if (currentStep < 2) {
                      const stepErrors = await validateForm();
                      const hasStep1Errors = Object.keys(stepErrors).some(
                        (key) =>
                          ["name", "code", "industry", "taxId"].includes(key)
                      );

                      if (!hasStep1Errors) {
                        setCurrentStep(2);
                      } else {
                        // Formik will show errors automatically since fields were likely touched or validateOnBlur is true
                        toast.error(dict.common.fillRequired);
                      }
                    } else {
                      formikSubmit();
                    }
                  }}
                  sx={{
                    minWidth: 160,
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 700,
                    boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_25}`,
                    py: 1.2,
                    px: 4,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: `0 12px 32px ${theme.palette.primary._alpha.main_40}`,
                      transform: "translateY(-1px)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                  endIcon={
                    currentStep < 2 ? (
                      <ArrowForwardIcon />
                    ) : undefined
                  }
                >
                  {currentStep < 2
                      ? dict.common.nextStep
                      : dict.customers.addCustomer}
                </Button>
              </DialogActions>
            </>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default AddCustomerDialog;
