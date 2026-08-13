"use client";

import { Box, Stack, Typography, Button, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { DriverFilters } from "@/app/lib/type/driver";
import { useDemoDriverWithDashboard } from "@/app/hooks/demo/useDemoDrivers";
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

import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";

/**
 * Demo-only counterpart to DriverContent — same table/KPI/chart layout, backed
 * by the fixed demo dataset. Add/Edit/Delete/details actions stay visible for
 * visual fidelity but never open a real dialog or call a real mutation; they
 * just show a "disabled in demo" toast. No Add/Edit/Delete/details dialogs are
 * ever mounted, so no real mutation hook is reachable from this tree.
 */
import DriverDialog from "@/app/components/dialogs/driver";
import AddDriverDialog from "@/app/components/dialogs/driver/addDriverDialog";
import EditDriverDialog from "@/app/components/dialogs/driver/editDriverDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import { DriverWithRelations } from "@/app/lib/type/driver";
import { useSearchParams } from "next/navigation";

export default function DemoDriverContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const driverIdFromUrl = searchParams?.get("id");
  const tabFromUrl = searchParams?.get("tab");

  /* ---------------------------------- STATES --------------------------------- */
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [sort, setSort] = useState<{ field: string; order: "asc" | "desc" }>({
    field: "createdAt",
    order: "desc",
  });
  const [filters] = useState<DriverFilters>({
    page: 1,
    limit: 10,
    search: "",
    status: [],
    hasVehicle: undefined,
  });

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<DriverWithRelations | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: combinedData,
    isLoading,
    isFetching,
    isError,
    refetch: refreshAllData,
  } = useDemoDriverWithDashboard();

  const drivers = (combinedData?.drivers || []) as DriverWithRelations[];
  const totalCount = combinedData?.meta.total || 0;
  const dashboardData = combinedData;

  useEffect(() => {
    if (driverIdFromUrl) {
      setSelectedDriverId(driverIdFromUrl);
      setIsDetailsOpen(true);
    }
  }, [driverIdFromUrl]);

  /* --------------------------------- ACTIONS -------------------------------- */
  const refreshAll = useCallback(async () => {
    await refreshAllData();
  }, [refreshAllData]);

  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleFilterChange = () => {
    notifyDisabled();
  };
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };
  const handleLimitChange = (newLimit: number) => {
    setPagination({ page: 1, limit: newLimit });
  };
  const handleSort = (property: string) => {
    setSort((prev) => ({
      field: property,
      order:
        prev.field === property && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const handleDriverSelect = (id: string) => {
    setSelectedDriverId(id);
    setIsDetailsOpen(true);
  };

  const handleEdit = (driver: DriverWithRelations) => {
    setDriverToEdit(driver);
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteOpen(true);
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

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

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
          filters={filters}
          onFilterChange={handleFilterChange}
          drivers={drivers}
          loading={isLoading}
          refreshing={isFetching}
          meta={{
            total: totalCount,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(totalCount / pagination.limit),
          }}
          onDriverSelect={handleDriverSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={refreshAll}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          sortField={sort.field}
          sortOrder={sort.order}
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
        onSuccess={() => { setIsAddDialogOpen(false); notifyDisabled(); }}
      />

      <EditDriverDialog
        key={driverToEdit?.id}
        open={isEditOpen}
        driver={driverToEdit}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => { setIsEditOpen(false); notifyDisabled(); }}
      />

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        title={dict.drivers.deleteTitle}
        description={dict.drivers.deleteDesc}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => { setIsDeleteOpen(false); notifyDisabled(); }}
        loading={false}
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
        onDelete={() => {
          setIsDeleteOpen(true);
        }}
        initialTab={tabFromUrl ? parseInt(tabFromUrl) : 0}
      />
    </Box>
  );
}
