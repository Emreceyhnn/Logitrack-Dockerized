"use client";

import { Box, Stack, Typography, Button, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  DriverPageActions,
  DriverWithRelations,
  DriverFilters,
} from "@/app/lib/type/driver";
import {
  useDriverWithDashboard,
  useDriverMutations,
} from "@/app/hooks/useDrivers";
import {
  Shield,
  Groups,
  Work,
  Home,
  ReportProblem,
  RocketLaunch,
} from "@mui/icons-material";
import DriverTable from "@/app/components/dashboard/driver/driverTable";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// chart component lazily keeps it out of this route's First Load JS.
const DriverPerformanceCharts = dynamic(
  () => import("@/app/components/dashboard/driver/driverPerformanceCharts"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

import DriverDialog from "@/app/components/dialogs/driver";
import AddDriverDialog from "@/app/components/dialogs/driver/addDriverDialog";
import EditDriverDialog from "@/app/components/dialogs/driver/editDriverDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";
import { logger } from "@/app/lib/logger";


export default function DriverContentPage() {
  const dict = useDictionary();
  return (
    <Suspense fallback={<Box p={4}>{dict.common.loading}</Box>}>
      <DriverContent />
    </Suspense>
  );
}

function DriverContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const driverIdFromUrl = searchParams.get("id");
  const tabFromUrl = searchParams.get("tab");

  /* ---------------------------------- STATES --------------------------------- */
  const [state, setState] = useState<{
    filters: DriverFilters;
    pagination: { page: number; limit: number };
    sort: { field: string; order: "asc" | "desc" };
    selectedDriverId: string | null;
  }>({
    filters: {
      page: 1,
      limit: 10,
      search: "",
      status: [],
      hasVehicle: undefined,
    },
    pagination: {
      page: 1,
      limit: 10,
    },
    sort: {
      field: "createdAt",
      order: "desc",
    },
    selectedDriverId: null,
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<DriverWithRelations | null>(
    null
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: combinedData,
    isLoading,
    isFetching,
    isError,
    refetch: refreshAllData,
  } = useDriverWithDashboard(
    state.pagination.page,
    state.pagination.limit,
    state.filters.search,
    state.filters.status,
    state.filters.hasVehicle,
    state.sort.field,
    state.sort.order
  );

  const { deleteDriver: deleteMutation } = useDriverMutations();

  const drivers = combinedData?.drivers || [];
  const totalCount = combinedData?.meta.total || 0;
  const dashboardData = combinedData;

  /* --------------------------------- ACTIONS -------------------------------- */
  const noop = useCallback(async () => {}, []);

  const actions: DriverPageActions = useMemo(
    () => ({
      fetchDrivers: async () => {}, // Handled by React Query
      fetchDashboardData: async () => {}, // Handled by React Query
      selectDriver: (id: string | null) => {
        setState((prev) => ({ ...prev, selectedDriverId: id }));
        if (id) setIsDetailsOpen(true);
      },
      updateFilters: (newFilters: Partial<DriverFilters>) => {
        setState((prev) => ({
          ...prev,
          filters: { ...prev.filters, ...newFilters },
          pagination: { ...prev.pagination, page: 1 },
        }));
      },
      changePage: async () => {}, // Handled by state
      refreshAll: noop,
    }),
    [noop]
  );

  /* -------------------------------- LIFECYCLE --------------------------------- */
  useEffect(() => {
    if (driverIdFromUrl) {
      actions.selectDriver(driverIdFromUrl);
    }
  }, [driverIdFromUrl, actions]);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleEdit = (driver: DriverWithRelations) => {
    setDriverToEdit(driver);
    setIsEditOpen(true);
  };
  const handleDelete = (id: string) => {
    setDriverToDelete(id);
    setIsDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!driverToDelete) return;

    try {
      await deleteMutation.mutateAsync(driverToDelete);
      setIsDeleteOpen(false);
      setDriverToDelete(null);
    } catch (error) {
      logger.error("Failed to delete driver:", error);
      toast.error(dict.common.actionFailed);
    }
  };

  const handleFilterChange = (newFilters: Partial<DriverFilters>) => {
    actions.updateFilters(newFilters);
  };
  const handlePageChange = (newPage: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: newPage },
    }));
  };
  const handleLimitChange = (newLimit: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, limit: newLimit, page: 1 },
    }));
  };
  const handleSort = (property: string) => {
    setState((prev) => ({
      ...prev,
      sort: {
        field: property,
        order:
          prev.sort.field === property && prev.sort.order === "asc"
            ? "desc"
            : "asc",
      },
    }));
  };

  /* ----------------------------------- KPI ---------------------------------- */
  const kpis = useMemo(
    () => [
      {
        label: dict.drivers.totalDrivers,
        value: dashboardData?.driversKpis?.totalDrivers ?? 0,
        icon: <Groups />,
        color: theme.palette.primary.main,
        trend: dashboardData?.kpiTrends?.totalDrivers,
      },
      {
        label: dict.drivers.onDuty,
        value: dashboardData?.driversKpis?.onDuty ?? 0,
        icon: <Work />,
        color: theme.palette.success.main,
      },
      {
        label: dict.drivers.offDuty,
        value: dashboardData?.driversKpis?.offDuty ?? 0,
        icon: <Home />,
        color: theme.palette.warning.main,
      },
      {
        label: dict.drivers.complianceIssues,
        value: dashboardData?.driversKpis?.complianceIssues ?? 0,
        icon: <ReportProblem />,
        color:
          (dashboardData?.driversKpis?.complianceIssues ?? 0) > 0
            ? theme.palette.error.main
            : theme.palette.success.main,
      },
      {
        label: dict.drivers.safetyRating,
        value: dashboardData?.driversKpis?.avgSafetyScore?.toFixed(1) ?? 0,
        icon: <Shield />,
        color: theme.palette.info.main,
      },
      {
        label: dict.drivers.efficiencyRating,
        value: dashboardData?.driversKpis?.avgEfficiencyScore?.toFixed(1) ?? 0,
        icon: <RocketLaunch />,
        color: theme.palette.kpi.violet,
      },
    ],
    [dashboardData, theme, dict]
  );

  const selectedDriver = drivers.find((d) => d.id === state.selectedDriverId);

  return (
    <Box position={"relative"} p={4} width={"100%"}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography
            variant="h4" component="h1"
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}
          >
            {dict.drivers.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.drivers.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="driver-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsAddDialogOpen(true)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.drivers.addDriver}
        </Button>
      </Stack>

      <KpiCards kpis={kpis} loading={isLoading} />

      {isError ? (
        <Stack mt={2}>
          <QueryErrorState onRetry={() => refreshAllData()} />
        </Stack>
      ) : (
      <Stack gap={2} mt={2} data-tour="driver-table">
        <DriverTable
          filters={state.filters}
          onFilterChange={handleFilterChange}
          drivers={drivers}
          // Previous rows survive a filter/sort change via keepPreviousData;
          // only blank the table when there is genuinely nothing to show.
          loading={isLoading}
          refreshing={isFetching}
          meta={{
            total: totalCount,
            page: state.pagination.page,
            limit: state.pagination.limit,
            totalPages: Math.ceil(totalCount / state.pagination.limit),
          }}
          onDriverSelect={actions.selectDriver}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={noop}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          sortField={state.sort.field}
          sortOrder={state.sort.order}
          onRequestSort={handleSort}
        />
      </Stack>
      )}

      <DriverPerformanceCharts
        data={dashboardData?.performanceCharts}
        loading={isLoading}
      />

      <AddDriverDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => setIsAddDialogOpen(false)}
      />

      <EditDriverDialog
        key={driverToEdit?.id}
        open={isEditOpen}
        driver={driverToEdit}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => setIsEditOpen(false)}
      />

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        title={dict.drivers.deleteTitle}
        description={dict.drivers.deleteDesc}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />

      <DriverDialog
        key={selectedDriver?.id}
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        driverData={selectedDriver ?? null}
        onEdit={(driver) => {
          setDriverToEdit(driver);
          setIsEditOpen(true);
        }}
        onDelete={(id) => {
          setDriverToDelete(id);
          setIsDeleteOpen(true);
        }}
        initialTab={tabFromUrl ? parseInt(tabFromUrl) : 0}
      />
    </Box>
  );
}
