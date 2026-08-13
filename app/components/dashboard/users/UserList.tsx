"use client";

import { useMemo, useState } from "react";
import { Chip, Box } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { UserListProps, UserWithRelations } from "@/app/lib/type/users";
import CustomCard from "../../cards/card";
import DataTable from "@/app/components/ui/DataTable";
import type { DataTableColumn, DataTableRowAction } from "@/app/lib/type/dataTable";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const UserList = ({ users, loading, onSelect }: UserListProps) => {
  const dict = useDictionary();
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const paginatedUsers = users.slice(
    (localPage - 1) * localLimit,
    localPage * localLimit
  );

  const meta = {
    page: localPage,
    limit: localLimit,
    total: users.length,
  };

  const columns: DataTableColumn<UserWithRelations>[] = useMemo(() => [
    {
      key: "fullName",
      label: dict.dashboard.users.fullName,
      sortable: true,
      sortKey: "name",
      render: (row) => `${row.name || ""} ${row.surname || ""}`.trim(),
    },
    {
      key: "email",
      label: dict.dashboard.users.email,
      sortable: true,
      render: (row) => row.email,
    },
    {
      key: "role",
      label: dict.dashboard.users.role,
      sortable: true,
      sortKey: "roleId",
      render: (row) => {
        const roleName = row.role?.name || "User";
        let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
        const roleNameDisplay = dict.company?.roles?.[roleName as keyof typeof dict.company.roles] || roleName;

        if (roleName.toLocaleLowerCase('en-US').includes("admin")) {
          color = "error";
        } else if (roleName.toLocaleLowerCase('en-US').includes("manager")) {
          color = "warning";
        } else if (roleName.toLocaleLowerCase('en-US').includes("driver")) {
          color = "info";
        } else if (roleName.toLocaleLowerCase('en-US').includes("warehouse")) {
          color = "info";
        } else if (roleName.toLocaleLowerCase('en-US').includes("dispatcher")) {
          color = "primary";
        }

        return (
          <Chip
            label={roleNameDisplay}
            size="small"
            variant="outlined"
            color={color}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
  ], [dict]);

  const rowActions: DataTableRowAction<UserWithRelations>[] = useMemo(() => [
    {
      label: dict.common.edit,
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => onSelect(row.id),
    },
  ], [onSelect, dict]);

  return (
    <CustomCard sx={{ p: 0, overflow: "hidden" }}>
      <Box sx={{ p: 0 }}>
        <DataTable<UserWithRelations>
          rows={paginatedUsers}
          columns={columns}
          loading={loading}
          emptyMessage={dict.dashboard.users.noUsers}
          meta={meta}
          onPageChange={setLocalPage}
          onLimitChange={(lim) => { setLocalLimit(lim); setLocalPage(1); }}
          rowActions={rowActions}
        />
      </Box>
    </CustomCard>
  );
};

export default UserList;
