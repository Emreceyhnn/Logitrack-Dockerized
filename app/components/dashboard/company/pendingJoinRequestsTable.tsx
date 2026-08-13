"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Stack,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  Box,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import SendIcon from "@mui/icons-material/Send";
import BlockIcon from "@mui/icons-material/Block";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import DataTable from "@/app/components/ui/DataTable";
import type { DataTableColumn, DataTableRowAction } from "@/app/lib/type/dataTable";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import DriverDetailsForm from "@/app/components/dialogs/company/sections/DriverDetailsForm";
import { addCompanyMemberDriverValidationSchema } from "@/app/lib/validationSchema";
import { ValidationError } from "yup";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";
import type { DriverStateData } from "@/app/lib/type/add-company-member";
import {
  useAllJoinRequests,
  useJoinRequestMutations,
  useCompanyInvitations,
  useInvitationMutations,
} from "@/app/hooks/useCompany";

interface CombinedRow {
  id: string;
  type: "JOIN_REQUEST" | "INVITATION";
  status: string; // "PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "REVOKED"
  isExpired?: boolean;
  createdAt: string | Date;
  email: string;
  name?: string;
  surname?: string;
  avatarUrl?: string | null;
  roleName?: string;
  invitedBy?: string; // Optional: who invited them
}

const initialDriverData: DriverStateData = {
  employeeId: "",
  phone: "",
  licenseNumber: "",
  licenseType: "",
  licenseExpiry: "",
};

export default function PendingJoinRequestsTable() {
  const dict = useDictionary();
  const theme = useTheme();
  const dateSettings = useDateSettings();
  
  const { data: joinRequestsData, isLoading: isLoadingJoinRequests, refetch: refetchJoinRequests } = useAllJoinRequests();
  const { data: invitationsData, isLoading: isLoadingInvitations, refetch: refetchInvitations } = useCompanyInvitations("ALL");
  
  const { accept, reject } = useJoinRequestMutations();
  const { resend, revoke } = useInvitationMutations();

  const isLoading = isLoadingJoinRequests || isLoadingInvitations;

  const rows: CombinedRow[] = useMemo(() => {
    const combined: CombinedRow[] = [];
    
    if (joinRequestsData) {
      combined.push(...joinRequestsData.map(req => ({
        id: req.id,
        type: "JOIN_REQUEST" as const,
        status: req.status,
        createdAt: req.createdAt,
        email: req.user.email,
        name: req.user.name,
        surname: req.user.surname,
        avatarUrl: req.user.avatarUrl,
      })));
    }
    
    if (invitationsData) {
      combined.push(...invitationsData.map(inv => ({
        id: inv.id,
        type: "INVITATION" as const,
        status: inv.isExpired ? "EXPIRED" : inv.status,
        createdAt: inv.createdAt,
        email: inv.email,
        roleName: inv.role.name,
        invitedBy: `${inv.invitedBy.name} ${inv.invitedBy.surname}`,
      })));
    }
    
    // Sort by createdAt descending
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [joinRequestsData, invitationsData]);

  const [acceptTarget, setAcceptTarget] = useState<CombinedRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CombinedRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CombinedRow | null>(null);
  const [resendTarget, setResendTarget] = useState<CombinedRow | null>(null);
  
  const [selectedRole, setSelectedRole] = useState("role_default");
  const [driverData, setDriverData] = useState<DriverStateData>(initialDriverData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [rejectLoading, setRejectLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const roles = useMemo(
    () => [
      { id: "role_admin", label: dict.company.roles.Administrator || "Admin" },
      { id: "role_manager", label: dict.company.roles["Warehouse Manager"] || "Manager" },
      { id: "role_dispatcher", label: dict.company.roles.Dispatcher || "Dispatcher" },
      { id: "role_warehouse", label: dict.company.roles["Warehouse Operator"] || "Warehouse Worker" },
      { id: "role_default", label: dict.company.roles.Customer || "User" },
      { id: "role_driver", label: dict.company.roles.Driver || "Driver" },
    ],
    [dict]
  );

  const handleDriverDataChange = (field: keyof DriverStateData, value: string) =>
    setDriverData((prev) => ({ ...prev, [field]: value }));

  const openAccept = (row: CombinedRow) => {
    setAcceptTarget(row);
    setSelectedRole("role_default");
    setDriverData(initialDriverData);
    setValidationErrors({});
  };

  const closeAccept = () => setAcceptTarget(null);

  const handleAccept = async () => {
    if (!acceptTarget) return;
    try {
      if (selectedRole === "role_driver") {
        const schema = addCompanyMemberDriverValidationSchema(dict);
        await schema.validate(driverData, { abortEarly: false });
      }
      const id = acceptTarget.id;
      closeAccept();
      await toast.promise(
        accept.mutateAsync(
          selectedRole === "role_driver"
            ? { id, roleName: selectedRole, driverData }
            : { id, roleName: selectedRole }
        ),
        {
          loading: dict.toasts?.loading || "Accepting...",
          success: dict.toasts.successJoinRequestAccepted,
          error: (err: unknown) => (err instanceof Error ? err.message : dict.toasts.errorGeneric),
        }
      );
      await refetchJoinRequests();
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((e) => {
          if (e.path) errors[e.path] = e.message;
        });
        setValidationErrors(errors);
        toast.error(dict.validation.genericFormError);
      } else {
        toast.error(err instanceof Error ? err.message : dict.toasts.errorGeneric);
      }
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await reject.mutateAsync(rejectTarget.id);
      toast.success(dict.toasts.successJoinRequestRejected);
      setRejectTarget(null);
      await refetchJoinRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : dict.toasts.errorGeneric);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await revoke.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
      await refetchInvitations();
    } catch {
      // toast is handled in mutation
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendTarget) return;
    setResendLoading(true);
    try {
      await resend.mutateAsync(resendTarget.id);
      setResendTarget(null);
      await refetchInvitations();
    } catch {
      // toast is handled in mutation
    } finally {
      setResendLoading(false);
    }
  };

  const columns: DataTableColumn<CombinedRow>[] = useMemo(
    () => [
      {
        key: "type",
        label: dict.company.joinRequests.columns?.type || "Type",
        render: (row) => (
          <Chip 
            label={row.type === "JOIN_REQUEST" ? (dict.company.joinRequests.columns?.request || "Request") : (dict.company.joinRequests.columns?.invitation || "Invitation")}
            size="small"
            color={row.type === "JOIN_REQUEST" ? "primary" : "secondary"}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: 11 }}
          />
        ),
      },
      {
        key: "requester",
        label: dict.company.joinRequests.columns.requester,
        render: (row) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {row.type === "JOIN_REQUEST" ? (
              <>
                <Avatar
                  src={row.avatarUrl ?? undefined}
                  sx={{ width: 32, height: 32, fontSize: 13 }}
                >
                  {!row.avatarUrl && `${row.name?.[0] || ""}${row.surname?.[0] || ""}`}
                </Avatar>
                <Typography fontSize={13} fontWeight={600}>
                  {row.name} {row.surname}
                </Typography>
              </>
            ) : (
              <Stack>
                <Typography fontSize={13} fontWeight={600}>
                  {row.email}
                </Typography>
                <Typography fontSize={11} color="text.secondary">
                  {/* tr-roles sabit anahtarlı; roleName serbest string olduğu için indekslemeden
                          önce Record'a daraltılır, karşılığı yoksa ham ad gösterilir.
                      en-roles has fixed keys while roleName is a free string, so narrow to a
                          Record before indexing and fall back to the raw name. */}
                  {(dict.company.roles as Record<string, string | undefined>)[
                    row.roleName || ""
                  ] || row.roleName}
                </Typography>
              </Stack>
            )}
          </Stack>
        ),
      },
      {
        key: "email",
        label: dict.company.joinRequests.columns.email,
        render: (row) => (
          <Typography fontSize={13} color="text.secondary">
            {row.type === "JOIN_REQUEST" ? row.email : "-"}
          </Typography>
        ),
      },
      {
        key: "requestedAt",
        label: dict.company.joinRequests.columns.requestedAt,
        render: (row) => (
          <Typography fontSize={13} color="text.secondary">
            {formatDisplayDate(row.createdAt, dateSettings)}
          </Typography>
        ),
      },
      {
        key: "status",
        label: dict.company.joinRequests.columns?.status || "Status",
        render: (row) => {
          let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
          let label = row.status;
          
          // tr-`common.status` bir etiket string'i ("Durum"); durum adları ayrı bir
          //    `statusLabels` nesnesinde tutuluyor.
          // en-`common.status` is a column label ("Status"); the state names live in a
          //    separate `statusLabels` object.
          const statusLabels = dict.common.statusLabels;

          if (row.status === "PENDING") {
            color = "warning";
            label = statusLabels.pending;
          } else if (row.status === "ACCEPTED") {
            color = "success";
            label = statusLabels.accepted;
          } else if (row.status === "REJECTED") {
            color = "error";
            label = statusLabels.rejected;
          } else if (row.status === "EXPIRED") {
            color = "default";
            label = statusLabels.expired;
          } else if (row.status === "REVOKED") {
            color = "error";
            label = statusLabels.revoked;
          }
          
          return (
            <Chip 
              label={label} 
              size="small" 
              color={color} 
              sx={{ fontWeight: 600, fontSize: 11 }} 
            />
          );
        }
      }
    ],
    [dict, dateSettings]
  );

  const rowActions: DataTableRowAction<CombinedRow>[] = useMemo(
    () => [
      {
        label: dict.company.joinRequests.actions.accept,
        icon: <CheckIcon fontSize="small" color="success" />,
        onClick: openAccept,
        hidden: (row) => row.type !== "JOIN_REQUEST" || row.status !== "PENDING",
      },
      {
        label: dict.company.joinRequests.actions.reject,
        icon: <ClearIcon fontSize="small" />,
        onClick: (row) => setRejectTarget(row),
        color: "error",
        hidden: (row) => row.type !== "JOIN_REQUEST" || row.status !== "PENDING",
      },
      {
        label: dict.company.joinRequests.actions?.resend || "Resend",
        icon: <SendIcon fontSize="small" />,
        onClick: (row) => setResendTarget(row),
        hidden: (row) =>
          row.type !== "INVITATION" ||
          (row.status !== "PENDING" && row.status !== "EXPIRED"),
      },
      {
        label: dict.company.joinRequests.actions?.revoke || "Revoke",
        icon: <BlockIcon fontSize="small" />,
        onClick: (row) => setRevokeTarget(row),
        color: "error",
        hidden: (row) => row.type !== "INVITATION" || row.status !== "PENDING",
      },
    ],
    [dict]
  );

  return (
    <>
      <DataTable<CombinedRow>
        rows={rows}
        columns={columns}
        loading={isLoading}
        emptyMessage={dict.company.joinRequests.empty}
        rowActions={rowActions}
        wrapCard={true}
        tableTitle={dict.company.joinRequests.title}
        getRowDisabled={(row) =>
          row.status === "ACCEPTED" || row.status === "REJECTED" || row.status === "REVOKED"
        }
      />

      <Dialog open={!!acceptTarget} onClose={closeAccept} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {dict.company.dialogs.acceptJoinRequestTitle}
          <IconButton onClick={closeAccept} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: theme.palette.primary._alpha?.main_02 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block" }}>
                {dict.company.dialogs.assignRole}
              </Typography>
              <FormControl fullWidth>
                <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {selectedRole === "role_driver" && (
              <DriverDetailsForm
                driverData={driverData}
                handleDriverDataChange={handleDriverDataChange}
                validationErrors={validationErrors}
                dict={dict}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeAccept} sx={{ color: "text.secondary" }}>
            {dict.common.cancel}
          </Button>
          <Button onClick={handleAccept} variant="contained" sx={{ px: 4, fontWeight: 700, borderRadius: 2 }}>
            {dict.common.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!rejectTarget}
        title={dict.company.dialogs.rejectJoinRequestTitle}
        description={dict.company.dialogs.rejectJoinRequestDescription}
        onConfirm={handleReject}
        onClose={() => setRejectTarget(null)}
        loading={rejectLoading}
      />

      <DeleteConfirmationDialog
        open={!!revokeTarget}
        title={dict.company.dialogs.revokeInvitationTitle}
        description={dict.company.dialogs.revokeInvitationDesc}
        onConfirm={handleRevoke}
        onClose={() => setRevokeTarget(null)}
        loading={revokeLoading}
      />

      <DeleteConfirmationDialog
        open={!!resendTarget}
        title={dict.company.dialogs.resendInvitationTitle}
        description={dict.company.dialogs.resendInvitationDesc}
        onConfirm={handleResend}
        onClose={() => setResendTarget(null)}
        loading={resendLoading}
      />
    </>
  );
}
