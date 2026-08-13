"use client";

import { Box, Typography, Stack, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

// Components
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import VehicleTable from "@/app/components/dashboard/vehicle/vehicleTable";
import DocumentCalenderCard from "@/app/components/dashboard/vehicle/documentCalenderCard";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";
import TrailerTable from "@/app/components/dashboard/vehicle/trailerTable";

import { useDemoVehicleContent } from "@/app/hooks/demo/useDemoVehicleContent";
import VehicleTabsSection from "@/app/[lang]/(pages)/(dashboard)/vehicle/components/VehicleTabsSection";
import { VehiclePageState } from "@/app/lib/type/vehicle";

const VehicleCapacityChart = dynamic(
  () => import("@/app/components/dashboard/vehicle/maxLoad"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

import VehicleDialogs from "@/app/[lang]/(pages)/(dashboard)/vehicle/components/VehicleDialogs";

export default function DemoVehicleContent() {
  const contentState = useDemoVehicleContent();
  const {
    dict,
    activeTab,
    setActiveTab,
    state,
    trailerFilters,
    dashboardData,
    isVehiclesLoading,
    isVehiclesFetching,
    isVehiclesError,
    refetchVehicleWithDashboard,
    isTrailersLoading,
    isTrailersFetching,
    isTrailersError,
    refetchTrailers,
    trailers,
    trailerMeta,
    vehicles,
    kpiLoading,
    actions,
    handleEdit,
    handleDelete,
    handleTrailerEdit,
    handleTrailerDelete,
    handleTrailerAssign,
    handleTrailerDetach,
    kpiItems,
    updateTrailerFilters,
    setAddDialogOpen,
    setAddTrailerOpen,
  } = contentState;

  return (
    <Box position={"relative"} p={4} width={"100%"}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: -0.5 }}>
            {activeTab === 0 ? dict.vehicles.title : dict.trailers.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {activeTab === 0 ? dict.vehicles.subtitle : dict.trailers.subtitle}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <VehicleTabsSection dict={dict} activeTab={activeTab} setActiveTab={setActiveTab} />

          <Button
            data-tour="vehicle-add"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => activeTab === 0 ? setAddDialogOpen(true) : setAddTrailerOpen(true)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {activeTab === 0 ? dict.vehicles.addVehicle : dict.trailers.addTrailer}
          </Button>
        </Stack>
      </Stack>

      <KpiCards kpis={kpiItems} loading={kpiLoading} />

      <Stack mt={2} data-tour="vehicle-table">
        {activeTab === 0 && isVehiclesError ? (
          <QueryErrorState onRetry={() => refetchVehicleWithDashboard()} />
        ) : activeTab === 1 && isTrailersError ? (
          <QueryErrorState onRetry={() => refetchTrailers()} />
        ) : activeTab === 0 ? (
          <VehicleTable
            state={{ ...state, vehicles: vehicles ?? [], dashboardData: dashboardData ?? null, loading: isVehiclesLoading, refreshing: isVehiclesFetching, error: null } as VehiclePageState}
            actions={{ ...actions, onEdit: handleEdit, onDelete: handleDelete }}
          />
        ) : (
          <TrailerTable
            trailers={trailers || []}
            loading={isTrailersLoading}
            refreshing={isTrailersFetching}
            onEdit={handleTrailerEdit}
            onDelete={handleTrailerDelete}
            onAssign={handleTrailerAssign}
            onDetach={handleTrailerDetach}
            filters={trailerFilters}
            meta={trailerMeta}
            actions={{ updateFilters: updateTrailerFilters, setPage: (page: number) => updateTrailerFilters({ page }), setLimit: (limit: number) => updateTrailerFilters({ limit }) }}
          />
        )}
      </Stack>

      {activeTab === 0 && (
        <Stack mt={2} direction={{ xs: "column", md: "row" }} spacing={2}>
          <DocumentCalenderCard data={dashboardData?.expiringDocs || []} maintenanceData={dashboardData?.plannedServices || []} />
          <VehicleCapacityChart data={dashboardData?.vehiclesCapacity || []} loading={isVehiclesLoading} />
        </Stack>
      )}

      <VehicleDialogs contentState={contentState} />
    </Box>
  );
}
