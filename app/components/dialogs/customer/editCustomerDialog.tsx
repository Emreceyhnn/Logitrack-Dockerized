"use client";

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Stack,
  useTheme,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  CustomerWithRelations,
  CustomerFormValues,
} from "@/app/lib/type/customer";
import { useCustomerMutations } from "@/app/hooks/useCustomers";
import { useMemo, useState } from "react";
import { useUser } from "@/app/hooks/useUser";
import IdentitySection from "./addCustomerDialog/sections/IdentitySection";
import ContactSection from "./addCustomerDialog/sections/ContactSection";

import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface EditCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: CustomerWithRelations | null;
}

import { Formik, Form } from "formik";
import { editCustomerValidationSchema } from "@/app/lib/validationSchema";

export default function EditCustomerDialog({
  open,
  onClose,
  onSuccess,
  customer,
}: EditCustomerDialogProps) {
  const { user } = useUser();
  const theme = useTheme();
  const dict = useDictionary();
  const { updateCustomer } = useCustomerMutations();

  const [currentStep, setCurrentStep] = useState(1);

  const handleSubmit = async (values: CustomerFormValues) => {
    if (!customer || !user) return;

    // 1. Close dialog immediately
    onClose();
    setCurrentStep(1);

    // 2. useCustomerMutations() already toasts success/error and applies the
    // optimistic cache update; just await the submission.
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: {
          name: values.name,
          code: values.code,
          industry: values.industry,
          taxId: values.taxId,
          email: values.email,
          phone: values.phone,
          locations: values.locations.filter((l) => l.address.trim() !== ""),
        },
      });
      onSuccess();
    } catch {
      // useCustomerMutations() already toasted the error
    }
  };

  const validationSchema = useMemo(
    () => editCustomerValidationSchema(dict),
    [dict]
  );
  if (!customer) return null;

  const steps = [
    dict.customers.dialogs.steps.identity,
    dict.customers.dialogs.steps.contact,
  ];

  const customerInitialValues = {
    name: customer.name || "",
    code: customer.code || "",
    industry: customer.industry || "",
    taxId: customer.taxId || "",
    email: customer.email || "",
    phone: customer.phone || "",
    locations: customer.locations?.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      lat: loc.lat ?? undefined,
      lng: loc.lng ?? undefined,
      isDefault: loc.isDefault,
    })) || [
      {
        name: dict.customers.fields.mainOffice,
        address: "",
        lat: undefined,
        lng: undefined,
        isDefault: true,
      },
    ],
  };

  return (
    <>
      <Formik
        initialValues={customerInitialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors }) => (
          <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: theme.palette.background.paper,
                backgroundImage: "none",
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider_alpha.main_10}`,
                maxHeight: "90vh",
              },
            }}
          >
            <Form>
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
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: theme.palette.primary._alpha.main_10,
                        color: theme.palette.primary.main,
                      }}
                    >
                      <Typography
                        component="div"
                        variant="h6"
                        sx={{ lineHeight: 1 }}
                      >
                        🏢
                      </Typography>
                    </Box>
                    <Stack spacing={0.2}>
                      <Typography
                        component="div"
                        variant="h6"
                        fontWeight={700}
                        color="white"
                      >
                        {dict.customers.dialogs.editTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dict.customers.dialogs.editSubtitle.replace(
                          "{name}",
                          customer.name
                        )}
                      </Typography>
                    </Stack>
                  </Stack>
                  <IconButton
                    onClick={onClose}
                    sx={{ color: "text.secondary" }}
                   aria-label="close">
                    <CloseIcon />
                  </IconButton>
                </Stack>

                <Stepper
                  activeStep={currentStep - 1}
                  sx={{
                    mb: 4,
                    "& .MuiStepLabel-label": {
                      color: theme.palette.common.white_alpha.main_30,
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                    },
                    "& .MuiStepLabel-label.Mui-active": {
                      color: theme.palette.primary.main,
                    },
                    "& .MuiStepLabel-label.Mui-completed": {
                      color: theme.palette.common.white_alpha.main_50,
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
                    "& .MuiStepConnector-line": {
                      borderColor: theme.palette.divider_alpha.main_10,
                    },
                    "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line":
                      { borderColor: theme.palette.primary.main },
                    "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line":
                      { borderColor: theme.palette.primary.main },
                  }}
                >
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <DialogContent sx={{ pb: 4, minHeight: 450 }}>
                {currentStep === 1 && <IdentitySection />}
                {currentStep === 2 && <ContactSection />}
              </DialogContent>

              <DialogActions
                sx={{
                  p: 3,
                  pt: 1,
                  borderTop: `1px solid ${theme.palette.divider_alpha.main_05}`,
                  justifyContent: "space-between",
                }}
              >
                <Button
                  onClick={
                    currentStep === 1 ? onClose : () => setCurrentStep(1)
                  }
                  sx={{
                    color: "text.secondary",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {currentStep === 1 ? dict.common.cancel : dict.common.back}
                </Button>

                <Button
                  variant="contained"
                  type={currentStep === 2 ? "submit" : "button"}
                  disabled={
                    currentStep === 1 &&
                    (!values.name ||
                      !!errors.name ||
                      !!errors.industry ||
                      !!errors.code)
                  }
                  onClick={
                    currentStep === 1 ? () => setCurrentStep(2) : undefined
                  }
                  sx={{
                    minWidth: 160,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
                    py: 1.2,
                  }}
                >
                  {currentStep < 2
                    ? dict.common.nextStep
                    : dict.common.saveChanges}
                </Button>
              </DialogActions>
            </Form>
          </Dialog>
        )}
      </Formik>
    </>
  );
}
