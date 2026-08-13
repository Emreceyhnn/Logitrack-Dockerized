"use client";

import { Box, Stack, Typography, Alert, Button, useTheme } from "@mui/material";
import { useMemo, useState, useCallback } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  CompanyPageActions,
  CompanyProfile,
  CompanyStats,
  CompanyMember,
} from "@/app/lib/type/company";
import { useDemoCompanyWithDashboard } from "@/app/hooks/demo/useDemoCompany";
import CompanyInfoCard from "@/app/components/dashboard/company/companyInfoCard";
import DemoCompanyMembersTable from "./DemoCompanyMembersTable";
import {
  People,
  DirectionsCar,
  Badge,
  Warehouse,
  Groups,
  LocalShipping,
} from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import CompanyMemberDetailsDialog from "@/app/components/dialogs/company/CompanyMemberDetailsDialog";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { toast } from "sonner";

/**
 * Demo-only counterpart to CompanyContent — same KPI/info/members layout,
 * backed by the fixed demo dataset. The members table is DemoCompanyMembersTable
 * (no edit/delete dialogs, no real mutation). Selecting a member opens the
 * read-only CompanyMemberDetailsDialog, which is purely presentational — it
 * renders the row it is handed and calls nothing. Add-member and the mutating
 * row actions show a "disabled in demo" toast.
 */
export default function DemoCompanyContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();

  /* ---------------------------------- STATE --------------------------------- */
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: result,
    isLoading: loading,
    error,
    refetch,
  } = useDemoCompanyWithDashboard();

  /* --------------------------------- ACTIONS -------------------------------- */
  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  const handleOpenDetails = useCallback((member: CompanyMember) => {
    setSelectedMember(member);
    setDetailOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailOpen(false);
    setSelectedMember(null);
  }, []);

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
      fetchData: async () => {
        await refetch();
      },
      refreshAll: async () => {
        await refetch();
      },
      // Never actually invoked — DemoCompanyMembersTable routes row actions to
      // the disabled-toast — but required by the CompanyPageActions contract.
      deleteMember: async () => {
        notifyDisabled();
      },
      updateFilters: () => {
        // Filters are inert in the demo — the dataset is fixed.
        notifyDisabled();
      },
      updatePagination: (
        newPagination: Partial<{ page: number; pageSize: number }>
      ) => {
        setPagination((prev) => ({ ...prev, ...newPagination }));
      },
    }),
    [refetch, notifyDisabled]
  );

  // pagination state kept for parity with the real content; the fixed demo
  // dataset fits on one page so it does not drive a refetch.
  void pagination;

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
          onClick={notifyDisabled}
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
        <Box data-tour="company-members">
          <DemoCompanyMembersTable
            props={{ state, actions }}
            onAction={notifyDisabled}
            onDetails={handleOpenDetails}
          />
        </Box>
      </Stack>

      <CompanyMemberDetailsDialog
        open={detailOpen}
        onClose={handleCloseDetails}
        member={selectedMember}
      />
    </Box>
  );
}
