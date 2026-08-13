"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Grid,
  TextField,
  Typography,
  Box,
  IconButton,
  Stack,
  useTheme,
  Divider,
  MenuItem,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { Formik } from "formik";
import { CompanyMember } from "@/app/lib/type/company";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCompanyMutations } from "@/app/hooks/useCompany";
import { UserStatus } from "@/app/lib/type/enums";
import { editCompanyMemberValidationSchema } from "@/app/lib/validationSchema";
import { logger } from "@/app/lib/logger";
import { getWarehouses } from "@/app/lib/controllers/warehouse";

const isWarehouseRole = (roleId: string) => roleId === "role_warehouse" || roleId === "role_manager";

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}


const mapToStandardRoleId = (roleId: string | null, roleName: string | null): string => {
  if (!roleId) return "role_default";
  
  const idLower = roleId.toLocaleLowerCase('en-US');
  const nameLower = (roleName || "").toLocaleLowerCase('en-US');
  
  if (idLower === "role_admin" || nameLower.includes("admin")) return "role_admin";
  if (idLower === "role_manager" || nameLower.includes("manager")) return "role_manager";
  if (idLower === "role_dispatcher" || nameLower.includes("dispatcher")) return "role_dispatcher";
  if (idLower === "role_warehouse" || nameLower.includes("warehouse")) return "role_warehouse";
  if (idLower === "role_driver" || nameLower.includes("driver")) return "role_driver";
  
  return "role_default";
};

interface EditCompanyMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: CompanyMember | null;
  onSuccess: () => void;
}

type FormData = {
  name: string;
  surname: string;
  roleId: string;
  status: string;
  warehouseId: string;
};

export default function EditCompanyMemberDialog({
  open,
  onClose,
  member,
  onSuccess,
}: EditCompanyMemberDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { updateMember } = useCompanyMutations();

  const roleLabels = useMemo<Record<string, string>>(() => ({
    role_default: dict.company.roles.Customer || "User",
    role_admin: dict.company.roles.Administrator || "Admin",
    role_manager: dict.company.roles["Warehouse Manager"] || "Manager",
    role_dispatcher: dict.company.roles.Dispatcher || "Dispatcher",
    role_warehouse: dict.company.roles["Warehouse Operator"] || "Warehouse Worker",
    role_driver: dict.company.roles.Driver || "Driver",
  }), [dict]);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const list = await getWarehouses();
        if (active) setWarehouses(list.map((w) => ({ id: w.id, code: w.code, name: w.name })));
      } catch (err) {
        logger.error("Warehouse fetch error:", err);
        if (active) setWarehouses([]);
      }
    })();
    return () => { active = false; };
  }, [open]);

  const initialValues = useMemo(() => {
    if (member) {
      return {
        name: member.name || "",
        surname: member.surname || "",
        roleId: mapToStandardRoleId(member.roleId, member.roleName),
        status: member.status || "",
        warehouseId: member.assignedWarehouseId || "",
      };
    }
    return {
      name: "",
      surname: "",
      roleId: "",
      status: "",
      warehouseId: "",
    };
  }, [member]);

  const validationSchema = useMemo(() => editCompanyMemberValidationSchema(dict), [dict]);

  const handleSubmitForm = async (values: FormData) => {
    if (!member) return;

    // Close first; the mutation toasts its own success/failure.
    const payload = {
      id: member.id,
      data: {
        name: values.name,
        surname: values.surname,
        roleId: values.roleId,
        status: values.status as UserStatus,
        ...(isWarehouseRole(values.roleId) ? { warehouseId: values.warehouseId } : {}),
      },
      optimisticRoleName: roleLabels[values.roleId] ?? null,
    };
    onClose();

    try {
      await updateMember.mutateAsync(payload);
      onSuccess();
    } catch (error) {
      logger.error("Failed to update member", error);
    }
  };

  if (!member) return null;

  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: theme.palette.background.paper_alpha.main_05,
      borderRadius: 2.5,
      color: theme.palette.text.primary,
      "& fieldset": { borderColor: theme.palette.divider_alpha.main_10 },
      "&:hover fieldset": { borderColor: theme.palette.primary._alpha.main_30 },
      "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
    },
    "& .MuiInputLabel-root": { color: theme.palette.common.white_alpha.main_50 },
    "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.primary.main },
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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
              <EditIcon />
            </Box>
            <Box>
              <Typography component="div" variant="h6" fontWeight={700} color="white">
                {dict.company.editMember.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.company.editMember.subtitle.replace("{name}", member.name)}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
 
      <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />
 
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmitForm}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      name="name"
                      label={dict.company.editMember.firstName}
                      fullWidth
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && !!errors.name}
                      helperText={touched.name && errors.name}
                      sx={textFieldSx}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      name="surname"
                      label={dict.company.editMember.lastName}
                      fullWidth
                      value={values.surname}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.surname && !!errors.surname}
                      helperText={touched.surname && errors.surname}
                      sx={textFieldSx}
                    />
                  </Grid>
                </Grid>
 
                <TextField
                  name="roleId"
                  select
                  label={dict.company.editMember.systemRole}
                  fullWidth
                  value={values.roleId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={mapToStandardRoleId(member.roleId, member.roleName) === "role_driver"}
                  error={touched.roleId && !!errors.roleId}
                  helperText={
                    mapToStandardRoleId(member.roleId, member.roleName) === "role_driver"
                      ? dict.company.editMember.driverRoleWarning
                      : touched.roleId && (errors.roleId as string)
                  }
                  sx={textFieldSx}
                >
                  <MenuItem value="role_default">{dict.company.roles.Customer || "User"}</MenuItem>
                  <MenuItem value="role_admin">{dict.company.roles.Administrator || "Admin"}</MenuItem>
                  <MenuItem value="role_manager">{dict.company.roles["Warehouse Manager"] || "Manager"}</MenuItem>
                  <MenuItem value="role_dispatcher">{dict.company.roles.Dispatcher || "Dispatcher"}</MenuItem>
                  <MenuItem value="role_warehouse">{dict.company.roles["Warehouse Operator"] || "Warehouse Worker"}</MenuItem>
                  <MenuItem value="role_driver" disabled={mapToStandardRoleId(member.roleId, member.roleName) !== "role_driver"}>
                    {dict.company.roles.Driver || "Driver"}
                  </MenuItem>
                </TextField>

                {isWarehouseRole(values.roleId) && (
                  <Box>
                    {warehouses.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", opacity: 0.8 }}>
                        {dict.company.dialogs.noWarehouses}
                      </Typography>
                    ) : (
                      <>
                        <TextField
                          name="warehouseId"
                          select
                          label={dict.company.dialogs.assignWarehouse}
                          fullWidth
                          value={values.warehouseId}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.warehouseId && !!errors.warehouseId}
                          helperText={touched.warehouseId && (errors.warehouseId as string)}
                          sx={textFieldSx}
                        >
                          <MenuItem value="" disabled>{dict.company.dialogs.selectWarehouse}</MenuItem>
                          {warehouses.map((w) => (
                            <MenuItem key={w.id} value={w.id}>{w.code} · {w.name}</MenuItem>
                          ))}
                        </TextField>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", opacity: 0.7 }}>
                          {values.roleId === "role_manager" ? dict.company.dialogs.warehouseManagerNote : dict.company.dialogs.warehouseStaffNote}
                        </Typography>
                      </>
                    )}
                  </Box>
                )}

                <TextField
                  name="status"
                  select
                  label={dict.company.editMember.accountStatus}
                  fullWidth
                  value={values.status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.status && !!errors.status}
                  helperText={touched.status && (errors.status as string)}
                  sx={textFieldSx}
                >
                  <MenuItem value="ACTIVE">{dict.company.editMember.statuses.ACTIVE}</MenuItem>
                  <MenuItem value="INACTIVE">{dict.company.editMember.statuses.INACTIVE}</MenuItem>
                  <MenuItem value="SUSPENDED">{dict.company.editMember.statuses.SUSPENDED}</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
 
            <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />
 
            <Box sx={{ p: 3, px: 4, bgcolor: theme.palette.background.default_alpha.main_10 }}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button 
                  onClick={onClose}
                  sx={{ px: 3, fontWeight: 600, color: "text.secondary", textTransform: "none" }}
                >
                  {dict.common.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || (isWarehouseRole(values.roleId) && !values.warehouseId)}
                  startIcon={<SaveIcon />}
                  sx={{ 
                    minWidth: 160,
                    borderRadius: 2, 
                    fontWeight: 700,
                    textTransform: "none",
                    boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
                  }}
                >
                  {isSubmitting ? dict.company.editMember.saving : dict.common.save}
                </Button>
              </Stack>
            </Box>
          </form>
        )}
      </Formik>
    </Dialog>
  );
}
