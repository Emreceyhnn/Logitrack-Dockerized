"use client";

import { useMemo, useState } from "react";
import { Avatar, Chip, Stack, Typography, useTheme } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DataTable from "@/app/components/ui/DataTable";
import type {
  DataTableColumn,
  DataTableRowAction,
} from "@/app/lib/type/dataTable";
import { CompanyPageProps, CompanyMember } from "@/app/lib/type/company";
import CompanyMemberDetailsDialog from "../../dialogs/company/CompanyMemberDetailsDialog";
import EditCompanyMemberDialog from "../../dialogs/company/EditCompanyMemberDialog";
import DeleteConfirmationDialog from "../../dialogs/deleteConfirmationDialog";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";

import { Dictionary } from "@/app/lib/language/language";
import { logger } from "@/app/lib/logger";


function StatusChip({ status, dict }: { status: string; dict: Dictionary }) {
  const normalized = status.toLocaleUpperCase('en-US');
  const colorMap: Record<string, "success" | "error" | "warning" | "default"> =
    {
      ACTIVE: "success",
      INACTIVE: "error",
      SUSPENDED: "warning",
    };

  const labelMap: Record<string, string> = {
    ACTIVE: dict.company.members.statuses.active,
    INACTIVE: dict.company.members.statuses.inactive,
    SUSPENDED: dict.company.members.statuses.suspended,
  };

  return (
    <Chip
      label={labelMap[normalized] ?? normalized}
      color={colorMap[normalized] ?? "default"}
      size="small"
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
}

interface CompanyMembersTableProps {
  props: CompanyPageProps;
}

export default function CompanyMembersTable({
  props,
}: CompanyMembersTableProps) {
  const dict = useDictionary();
  const { state, actions } = props;
  const theme = useTheme();
  const members = state.data?.members ?? [];
  const loading = state.loading;
  const meta = state.data?.meta ?? {
    page: 1,
    limit: 10,
    total: 0,
  };
  const dateSettings = useDateSettings();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleAction = (
    action: "details" | "edit" | "delete",
    member: CompanyMember
  ) => {
    setSelectedMember(member);
    if (action === "details") setDetailsOpen(true);
    if (action === "edit") setEditOpen(true);
    if (action === "delete") setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMember) return;
    setDeleteLoading(true);
    try {
      await actions.deleteMember(selectedMember.id);
      setDeleteOpen(false);
    } catch (error) {
      logger.error("Delete failed", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: DataTableColumn<CompanyMember>[] = useMemo(
    () => [
      {
        key: "member",
        label: dict.company.members.columns.member,
        render: (row) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={row.avatarUrl ?? undefined}
              sx={{
                width: 32,
                height: 32,
                fontSize: 13,
                bgcolor: theme.palette.primary?._alpha?.main_10 ?? "primary.main",
                color: theme.palette.primary?.main,
              }}
            >
              {!row.avatarUrl && row.name && row.surname && `${row.name[0]}${row.surname[0]}`}
            </Avatar>
            <Typography fontSize={13} fontWeight={600}>
              {row.name} {row.surname}
            </Typography>
          </Stack>
        ),
      },
      {
        key: "email",
        label: dict.company.members.columns.email,
        render: (row) => (
          <Typography fontSize={13} color="text.secondary">
            {row.email}
          </Typography>
        ),
      },
      {
        key: "role",
        label: dict.company.members.columns.role,
        render: (row) =>
          row.roleName ? (
            <Chip
              label={dict.company?.roles?.[row.roleName as keyof typeof dict.company.roles] || row.roleName}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, fontWeight: 600 }}
            />
          ) : (
            <Typography fontSize={13} color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        key: "status",
        label: dict.company.members.columns.status,
        render: (row) => <StatusChip status={row.status} dict={dict} />,
      },
      {
        key: "joined",
        label: dict.company.members.columns.joined,
        render: (row) => (
          <Typography fontSize={13} color="text.secondary">
            {formatDisplayDate(row.createdAt, dateSettings)}
          </Typography>
        ),
      },
    ],
    [theme, dict, dateSettings]
  );

  const rowActions: DataTableRowAction<CompanyMember>[] = useMemo(
    () => [
      {
        label: dict.company.members.actions.details,
        icon: <InfoIcon fontSize="small" color="info" />,
        onClick: (row) => handleAction("details", row),
      },
      {
        label: dict.company.members.actions.edit,
        icon: <EditIcon fontSize="small" />,
        onClick: (row) => handleAction("edit", row),
      },
      {
        label: dict.company.members.actions.delete,
        icon: <DeleteIcon fontSize="small" />,
        onClick: (row) => handleAction("delete", row),
        color: "error",
      },
    ],
    [dict]
  );

  return (
    <>
      <DataTable<CompanyMember>
        rows={members}
        columns={columns}
        loading={loading}
        emptyMessage={dict.company.members.empty}
        meta={meta}
        onPageChange={(p) => actions.updatePagination({ page: p })}
        onLimitChange={(lim) =>
          actions.updatePagination({ pageSize: lim, page: 1 })
        }
        onSearchChange={(v) => actions.updateFilters({ search: v })}
        rowActions={rowActions}
        wrapCard={true}
        tableTitle={dict.company.members.title}
      />

      <CompanyMemberDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        member={selectedMember}
      />

      <EditCompanyMemberDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={selectedMember}
        onSuccess={actions.refreshAll}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.company.members.deleteDialog.title}
        description={dict.company.members.deleteDialog.description.replace(
          "{name}",
          selectedMember?.name ?? ""
        )}
        loading={deleteLoading}
      />
    </>
  );
}
