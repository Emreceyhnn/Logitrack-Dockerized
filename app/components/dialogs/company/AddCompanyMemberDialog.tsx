"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, IconButton, useTheme, Stack, MenuItem, Select, FormControl, InputAdornment } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { AddMemberDialogProps, DriverStateData } from "@/app/lib/type/add-company-member";
import { toast } from "sonner";
import { searchPlatformUsers } from "@/app/lib/controllers/users";
import { useCompanyMutations } from "@/app/hooks/useCompany";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { createCompanyInvitation } from "@/app/lib/controllers/invitations";
import { isEmailNotVerifiedError } from "@/app/lib/utils/emailVerificationError";
import { addCompanyMemberDriverValidationSchema } from "@/app/lib/validationSchema";
import { ValidationError } from "yup";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

import UserSearchResults from "./sections/UserSearchResults";
import DriverDetailsForm from "./sections/DriverDetailsForm";

interface SearchedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

// tr-Depo ataması gerektiren roller: operatör (çalışan) ve depo yöneticisi
// en-Roles that require a warehouse assignment: operator (staff) and warehouse manager
const isWarehouseRole = (roleId: string) => roleId === "role_warehouse" || roleId === "role_manager";

const initialDriverData: DriverStateData = { employeeId: "", phone: "", licenseNumber: "", licenseType: "", licenseExpiry: "" };

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  background?: {
    default_alpha?: Record<string, string>;
    paper_alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  text?: {
    secondary_alpha?: Record<string, string>;
  };
}

export default function AddCompanyMemberDialog({ open, onClose, onSuccess }: AddMemberDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const { addMember } = useCompanyMutations();

  const roles = useMemo(() => [
    { id: "role_admin", label: dict.company.roles.Administrator || "Admin" },
    { id: "role_manager", label: dict.company.roles["Warehouse Manager"] || "Manager" },
    { id: "role_dispatcher", label: dict.company.roles.Dispatcher || "Dispatcher" },
    { id: "role_warehouse", label: dict.company.roles["Warehouse Operator"] || "Warehouse Worker" },
    { id: "role_default", label: dict.company.roles.Customer || "User" },
    { id: "role_driver", label: dict.company.roles.Driver || "Driver" },
  ], [dict]);

  const [mode, setMode] = useState<"search" | "invite">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("role_default");
  const [inviteRole, setInviteRole] = useState("role_driver");
  const [inviteEmail, setInviteEmail] = useState("");
  const [driverData, setDriverData] = useState<DriverStateData>(initialDriverData);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [inviteWarehouseId, setInviteWarehouseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleDriverDataChange = (field: keyof DriverStateData, value: string) => setDriverData((prev) => ({ ...prev, [field]: value }));

  const resetDialog = () => {
    setMode("search");
    setSearchQuery(""); setResults([]); setSelectedUserId(null); setSelectedRole("role_default");
    setInviteRole("role_driver"); setInviteEmail(""); setDriverData(initialDriverData);
    setSelectedWarehouseId(""); setInviteWarehouseId(""); setError(null); setValidationErrors({});
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    if (mode === "invite") {
      setError(null); setValidationErrors({});
      try {
        if (inviteRole === "role_driver") {
          const schema = addCompanyMemberDriverValidationSchema(dict);
          await schema.validate(driverData, { abortEarly: false });
        }
        if (!isValidEmail(inviteEmail)) {
          setValidationErrors({ email: dict.validation.genericFormError });
          return;
        }
        if (isWarehouseRole(inviteRole) && !inviteWarehouseId) {
          return;
        }
        onClose();
        resetDialog();
        await toast.promise(
          createCompanyInvitation(
            inviteEmail,
            inviteRole,
            inviteRole === "role_driver" ? driverData : undefined,
            isWarehouseRole(inviteRole) ? inviteWarehouseId : undefined
          ),
          {
            loading: dict.toasts?.loading || "Sending invitation...",
            success: dict.toasts.successInvite,
            error: (err: unknown) =>
              isEmailNotVerifiedError(err)
                ? dict.auth.emailNotVerifiedAction
                : err instanceof Error
                  ? err.message
                  : dict.toasts.errorGeneric,
          }
        );
        onSuccess?.();
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          const errors: Record<string, string> = {};
          err.inner.forEach((e) => { if (e.path) errors[e.path] = e.message; });
          setValidationErrors(errors);
          toast.error(dict.validation.genericFormError);
        } else {
          setError(dict.toasts.errorGeneric);
          const message = err instanceof Error ? err.message : dict.toasts.errorGeneric;
          toast.error(message);
        }
      }
      return;
    }

    if (!selectedUserId) return;
    setError(null); setValidationErrors({});

    const selectedUser = results.find((r) => r.id === selectedUserId);
    if (!selectedUser) return;

    try {
      if (selectedRole === "role_driver") {
        const schema = addCompanyMemberDriverValidationSchema(dict);
        await schema.validate(driverData, { abortEarly: false });
      }
      onClose();
      resetDialog();
      const roleLabel = roles.find((r) => r.id === selectedRole)?.label ?? null;
      try {
        await addMember.mutateAsync({
          userId: selectedUserId,
          roleName: selectedRole,
          driverData: selectedRole === "role_driver" ? driverData : undefined,
          warehouseId: isWarehouseRole(selectedRole) ? selectedWarehouseId : undefined,
          optimisticMember: {
            id: selectedUser.id,
            name: selectedUser.name,
            surname: "",
            email: selectedUser.email,
            avatarUrl: selectedUser.avatar,
            status: "ACTIVE",
            roleId: selectedRole,
            roleName: roleLabel,
            assignedWarehouseId: isWarehouseRole(selectedRole) ? selectedWarehouseId : null,
            createdAt: new Date().toISOString(),
          },
        });
        onSuccess?.();
      } catch {
        // useCompanyMutations() already toasted the error
      }
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((e) => { if (e.path) errors[e.path] = e.message; });
        setValidationErrors(errors);
        toast.error(dict.validation.genericFormError);
      } else {
        setError(dict.toasts.errorGeneric);
        const message = err instanceof Error ? err.message : dict.toasts.errorGeneric;
        toast.error(message);
      }
    }
  };

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const searchResults = await searchPlatformUsers(searchQuery);
          setResults(searchResults);
        } catch (err) { logger.error("Search error:", err); setResults([]); }
      } else if (searchQuery.length === 0) {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: paletteTheme.background?.default_alpha?.main_98, backdropFilter: "blur(20px)", backgroundImage: "none", border: `1px solid ${paletteTheme.divider_alpha?.main_10}`, boxShadow: theme.shadows[24] } }}>
      <DialogTitle sx={{ m: 0, p: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography component="div" variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{dict.company.dialogs.addMemberTitle}</Typography>
          <Typography variant="caption" color="text.secondary">{dict.company.dialogs.addMemberSubtitle}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "text.secondary", bgcolor: paletteTheme.text?.secondary_alpha?.main_05 }} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} sx={{ p: 0.5, borderRadius: 2.5, bgcolor: paletteTheme.background?.paper_alpha?.main_40 }}>
            <Button
              fullWidth onClick={() => setMode("search")}
              variant={mode === "search" ? "contained" : "text"}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 12.5, boxShadow: "none" }}
            >
              {dict.company.dialogs.existingUser}
            </Button>
            <Button
              fullWidth onClick={() => setMode("invite")}
              variant={mode === "invite" ? "contained" : "text"}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 12.5, boxShadow: "none" }}
            >
              {dict.company.dialogs.inviteByEmail}
            </Button>
          </Stack>

          {mode === "search" ? (
            <>
              <TextField
                fullWidth placeholder={dict.company.dialogs.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} /></InputAdornment>), sx: { bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2 } }}
              />

              <UserSearchResults results={results} selectedUserId={selectedUserId} setSelectedUserId={setSelectedUserId} error={error} dict={dict} />

              <Box sx={{ p: 2, borderRadius: 3, bgcolor: paletteTheme.primary?._alpha?.main_02, border: `1px solid ${paletteTheme.divider_alpha?.main_05}` }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block" }}>{dict.company.dialogs.assignRole}</Typography>
                <FormControl fullWidth>
                  <Select
                    value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} IconComponent={KeyboardArrowDownIcon}
                    sx={{ bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2, "& .MuiSelect-select": { py: 1.5, px: 2, fontSize: 13, fontWeight: 600 } }}
                  >
                    {roles.map((role) => <MenuItem key={role.id} value={role.id} sx={{ fontSize: 13 }}>{role.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", opacity: 0.7 }}>{dict.company.dialogs.invitationNote}</Typography>
              </Box>

              {isWarehouseRole(selectedRole) && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: paletteTheme.primary?._alpha?.main_02, border: `1px solid ${paletteTheme.divider_alpha?.main_05}` }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block" }}>
                    {dict.company.dialogs.assignWarehouse} *
                  </Typography>
                  {warehouses.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", opacity: 0.8 }}>
                      {dict.company.dialogs.noWarehouses}
                    </Typography>
                  ) : (
                    <>
                      <FormControl fullWidth>
                        <Select
                          value={selectedWarehouseId}
                          onChange={(e) => setSelectedWarehouseId(e.target.value)}
                          displayEmpty
                          IconComponent={KeyboardArrowDownIcon}
                          sx={{ bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2, "& .MuiSelect-select": { py: 1.5, px: 2, fontSize: 13, fontWeight: 600 } }}
                        >
                          <MenuItem value="" disabled sx={{ fontSize: 13 }}>{dict.company.dialogs.selectWarehouse}</MenuItem>
                          {warehouses.map((w) => (
                            <MenuItem key={w.id} value={w.id} sx={{ fontSize: 13 }}>{w.code} · {w.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", opacity: 0.7 }}>
                        {selectedRole === "role_manager" ? dict.company.dialogs.warehouseManagerNote : dict.company.dialogs.warehouseStaffNote}
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {selectedRole === "role_driver" && (
                <DriverDetailsForm driverData={driverData} handleDriverDataChange={handleDriverDataChange} validationErrors={validationErrors} dict={dict} />
              )}
            </>
          ) : (
            <>
              <TextField
                fullWidth type="email" label={dict.auth.email} placeholder={dict.company.dialogs.inviteEmailPlaceholder}
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                error={!!validationErrors.email} helperText={validationErrors.email}
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2 } }}
              />

              <Box sx={{ p: 2, borderRadius: 3, bgcolor: paletteTheme.primary?._alpha?.main_02, border: `1px solid ${paletteTheme.divider_alpha?.main_05}` }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block" }}>{dict.company.dialogs.assignRole}</Typography>
                <FormControl fullWidth>
                  <Select
                    value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} IconComponent={KeyboardArrowDownIcon}
                    sx={{ bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2, "& .MuiSelect-select": { py: 1.5, px: 2, fontSize: 13, fontWeight: 600 } }}
                  >
                    {roles.map((role) => <MenuItem key={role.id} value={role.id} sx={{ fontSize: 13 }}>{role.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", opacity: 0.7 }}>{dict.company.dialogs.invitationNote}</Typography>
              </Box>

              {isWarehouseRole(inviteRole) && (
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: paletteTheme.primary?._alpha?.main_02, border: `1px solid ${paletteTheme.divider_alpha?.main_05}` }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block" }}>
                    {dict.company.dialogs.assignWarehouse} *
                  </Typography>
                  {warehouses.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", opacity: 0.8 }}>
                      {dict.company.dialogs.noWarehouses}
                    </Typography>
                  ) : (
                    <>
                      <FormControl fullWidth>
                        <Select
                          value={inviteWarehouseId}
                          onChange={(e) => setInviteWarehouseId(e.target.value)}
                          displayEmpty
                          IconComponent={KeyboardArrowDownIcon}
                          sx={{ bgcolor: paletteTheme.background?.paper_alpha?.main_40, borderRadius: 2, "& .MuiSelect-select": { py: 1.5, px: 2, fontSize: 13, fontWeight: 600 } }}
                        >
                          <MenuItem value="" disabled sx={{ fontSize: 13 }}>{dict.company.dialogs.selectWarehouse}</MenuItem>
                          {warehouses.map((w) => (
                            <MenuItem key={w.id} value={w.id} sx={{ fontSize: 13 }}>{w.code} · {w.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", opacity: 0.7 }}>
                        {inviteRole === "role_manager" ? dict.company.dialogs.warehouseManagerNote : dict.company.dialogs.warehouseStaffNote}
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {inviteRole === "role_driver" && (
                <DriverDetailsForm driverData={driverData} handleDriverDataChange={handleDriverDataChange} validationErrors={validationErrors} dict={dict} />
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>{dict.common.cancel}</Button>
        <Button
          variant="contained" onClick={handleSubmit}
          disabled={
            mode === "invite"
              ? !inviteEmail
                || (inviteRole === "role_driver" && (!driverData.employeeId || !driverData.phone))
                || (isWarehouseRole(inviteRole) && !inviteWarehouseId)
              : !selectedUserId
                || (selectedRole === "role_driver" && (!driverData.employeeId || !driverData.phone))
                || (isWarehouseRole(selectedRole) && !selectedWarehouseId)
          }
          startIcon={<GroupAddIcon />} sx={{ borderRadius: 2.5, textTransform: "none", px: 4, transition: "all 0.3s ease", boxShadow: `0 8px 16px ${paletteTheme.primary?._alpha?.main_20}` }}
        >
          {mode === "invite" ? dict.company.dialogs.sendInvite : dict.company.dialogs.addToCompany}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
