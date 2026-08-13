"use client";

import { Box, Stack, Typography, Alert, Button, useTheme } from "@mui/material";
import { useState, useMemo } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  CompanyPageActions,
  CompanyProfile,
  CompanyStats,
  CompanyMember,
} from "@/app/lib/type/company";
import {
  useCompanyWithDashboard,
  useCompanyMutations,
} from "@/app/hooks/useCompany";
import CompanyInfoCard from "@/app/components/dashboard/company/companyInfoCard";
import CompanyMembersTable from "@/app/components/dashboard/company/companyMembersTable";
import PendingJoinRequestsTable from "@/app/components/dashboard/company/pendingJoinRequestsTable";
import AddCompanyMemberDialog from "@/app/components/dialogs/company/AddCompanyMemberDialog";
import {
  People,
  DirectionsCar,
  Badge,
  Warehouse,
  Groups,
  LocalShipping,
} from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function CompanyContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();

  /* ---------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: result,
    isLoading: loading,
    error,
  } = useCompanyWithDashboard({
    ...filters,
    ...pagination,
  });
  const { deleteMember: deleteMutation } = useCompanyMutations();

  /* --------------------------------- ACTIONS -------------------------------- */
  const state = useMemo(
    () => ({
      data: result
        ? {
            profile: result.profile as CompanyProfile,
            stats: result.stats as CompanyStats,
            statsTrends: result.statsTrends,
            members: result.members as CompanyMember[],
            totalCount: result.totalCount,
            meta: result.meta,
          }
        : null,
      loading,
      error: error
        ? error instanceof Error
          ? error.message
          : String(error)
        : null,
    }),
    [result, loading, error]
  );

  const actions: CompanyPageActions = useMemo(
    () => ({
      fetchData: async () => {},
      refreshAll: async () => {},
      deleteMember: async (memberId: string) => {
        await deleteMutation.mutateAsync(memberId);
      },
      updateFilters: (newFilters: Partial<{ search: string }>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination({ page: 1, pageSize: 10 });
      },
      updatePagination: (
        newPagination: Partial<{ page: number; pageSize: number }>
      ) => {
        setPagination((prev) => ({ ...prev, ...newPagination }));
      },
    }),
    [deleteMutation]
  );

  /* --------------------------------- KPI --------------------------------- */
  const kpis = [
    {
      label: dict.company.kpi.totalUsers,
      value: state.data?.stats?.users ?? 0,
      icon: <People />,
      color: theme.palette.primary.main,
      trend: state.data?.statsTrends?.users,
    },
    {
      label: dict.company.kpi.vehicles,
      value: state.data?.stats?.vehicles ?? 0,
      icon: <DirectionsCar />,
      color: theme.palette.info.main,
      trend: state.data?.statsTrends?.vehicles,
    },
    {
      label: dict.company.kpi.drivers,
      value: state.data?.stats?.drivers ?? 0,
      icon: <Badge />,
      color: theme.palette.success.main,
      trend: state.data?.statsTrends?.drivers,
    },
    {
      label: dict.company.kpi.warehouses,
      value: state.data?.stats?.warehouses ?? 0,
      icon: <Warehouse />,
      color: theme.palette.warning.main,
      trend: state.data?.statsTrends?.warehouses,
    },
    {
      label: dict.company.kpi.customers,
      value: state.data?.stats?.customers ?? 0,
      icon: <Groups />,
      color: theme.palette.kpi.pink,
      trend: state.data?.statsTrends?.customers,
    },
    {
      label: dict.company.kpi.shipments,
      value: state.data?.stats?.shipments ?? 0,
      icon: <LocalShipping />,
      color: theme.palette.kpi.violet,
      trend: state.data?.statsTrends?.shipments,
    },
  ];

  return (
    <Box position="relative" p={{ xs: 2, md: 4 }} width="100%">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography
            variant="h4" component="h1"
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}
          >
            {dict.company.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.company.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="company-add-member"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddMemberOpen(true)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.company.addMember}
        </Button>
      </Stack>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {state.error}
        </Alert>
      )}

      <Stack spacing={3}>
        <Box data-tour="company-kpi">
          <KpiCards kpis={kpis} loading={state.loading} />
        </Box>
        <Box data-tour="company-info">
          <CompanyInfoCard props={{ state, actions }} />
        </Box>
        <Box data-tour="company-join-requests">
          <PendingJoinRequestsTable />
        </Box>
        <Box data-tour="company-members">
          <CompanyMembersTable props={{ state, actions }} />
        </Box>
      </Stack>

      <AddCompanyMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onSuccess={actions.refreshAll}
      />
    </Box>
  );
}
