"use client";

import ShipmentTable from "@/app/components/dashboard/shipments/shipmentTable";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// analytics block lazily keeps it out of this route's First Load JS.
const ShipmentAnalytics = dynamic(
  () => import("@/app/components/dashboard/shipments/ShipmentAnalytics"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShipmentPageState,
  ShipmentPageActions,
  ShipmentWithRelations,
} from "@/app/lib/type/shipment";
import { ShipmentStatus } from "@prisma/client";
import {
  useShipmentsWithDashboard,
  useShipmentMutations,
  useShipmentDetails,
} from "@/app/hooks/useShipments";
import EditShipmentDialog from "@/app/components/dialogs/shipment/edit-shipment-dialog";
import AddShipmentDialog from "@/app/components/dialogs/shipment/addShipmentDialog";
import ShipmentDetailDialog from "@/app/components/dialogs/shipment/shipmentDetailDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import AddIcon from "@mui/icons-material/Add";

import {
  LocalShipping,
  AccessTime,
  DirectionsBoat,
  Inventory,
} from "@mui/icons-material";
import KpiCards from "@/app/components/cards/KpiCards";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


export default function ShipmentContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const shipmentIdFromUrl = searchParams.get("id");
  // Deep-link from an overview KPI tile (e.g. "Delayed 3" → ?status=DELAYED).
  // Validated against the enum so a hand-typed junk value is ignored, not sent
  // to the query.
  const statusParam = searchParams.get("status");
  const statusFromUrl =
    statusParam && statusParam in ShipmentStatus
      ? (statusParam as ShipmentStatus)
      : undefined;

  /* ---------------------------------- STATES --------------------------------- */
  const [filters, setFilters] = useState<ShipmentPageState["filters"]>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionShipment, setActionShipment] =
    useState<ShipmentWithRelations | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch,
  } = useShipmentsWithDashboard(
    pagination.page,
    pagination.pageSize,
    filters.status,
    filters.search
  );

  const { deleteShipment: deleteMutation } = useShipmentMutations();

  /* --------------------------------- ACTIONS -------------------------------- */
  const noop = useCallback(async () => {}, []);

  const actions: ShipmentPageActions = useMemo(
    () => ({
      fetchShipments: async () => {},
      fetchStats: async () => {},
      fetchCharts: async () => {},
      refreshAll: noop,
      selectShipment: (id: string | null) => setSelectedShipmentId(id),
      updateFilters: (newFilters: Partial<ShipmentPageState["filters"]>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, page: 1 }));
      },
    }),
    [noop]
  );

  // tr-Detay dialog'u sevkiyat nesnesinin kendisini bekler. Kimliği listeden aramak yerine
  //    ayrıca çekiyoruz: bildirimden gelen kayıt çoğu zaman ilk sayfada değildir, listeden
  //    arasaydık dialog sessizce açılmazdı. `enabled: !!id` sayesinde seçim yokken istek atılmaz.
  // en-The detail dialog wants the shipment object itself. We fetch it rather than looking it
  //    up in the list: a record arriving from a notification usually isn't on page one, so a
  //    list lookup would silently fail to open. The hook is `enabled: !!id`, so no request
  //    is made without a selection.
  const { data: selectedShipment = null } =
    useShipmentDetails(selectedShipmentId);

  /* -------------------------- COMPATIBILITY LAYER --------------------------- */
  const state: ShipmentPageState = {
    shipments: dashboardData?.shipments || [],
    stats: dashboardData?.stats || null,
    totalCount: dashboardData?.totalCount || 0,
    volumeHistory: dashboardData?.volumeHistory || [],
    statusDistribution: dashboardData?.statusDistribution || [],
    selectedShipmentId,
    filters,
    // `isLoading` (first load) blanks the view; `isFetching` also fires on
    // every filter/sort refetch, which was wiping the table, KPIs and charts
    // even though keepPreviousData still had the previous results to show.
    loading: isLoading,
    refreshing: isFetching,
    error: isError ? (queryError as Error)?.message || "error" : null,
  };

  /* -------------------------------- LIFECYCLE --------------------------------- */
  useEffect(() => {
    // tr-`temp-` iyimser kimlikler sunucuda yok, sorgu boşuna 404 döner (bkz. CustomerContent)
    // en-Optimistic `temp-` ids don't exist server-side; skip them (same as CustomerContent)
    if (shipmentIdFromUrl && !shipmentIdFromUrl.startsWith("temp-")) {
      actions.selectShipment(shipmentIdFromUrl);
    }
  }, [shipmentIdFromUrl, actions]);

  // Seed the status filter from the URL once it resolves, so arriving at
  // ?status=DELAYED lands on the pre-filtered list. Only fires when the param
  // changes, so a user clearing the filter in-page isn't overridden.
  useEffect(() => {
    if (statusFromUrl) {
      actions.updateFilters({ status: statusFromUrl });
    }
  }, [statusFromUrl, actions]);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleEdit = (id: string) => {
    const shipment = state.shipments.find((s) => s.id === id);
    if (shipment) {
      setActionShipment(shipment);
      setEditOpen(true);
    }
  };
  const handleDelete = (id: string) => {
    const shipment = state.shipments.find((s) => s.id === id);
    if (shipment) {
      setActionShipment(shipment);
      setDeleteOpen(true);
    }
  };
  const handleDeleteConfirm = async () => {
    if (!actionShipment) return;
    try {
      await deleteMutation.mutateAsync(actionShipment.id);
      setDeleteOpen(false);
    } catch (error) {
      logger.error("Failed to delete shipment:", error);
      toast.error(dict.common.actionFailed);
    }
  };

  /* --------------------------------- RENDER --------------------------------- */

  const kpiItems = useMemo(() => [
    {
      label: dict.shipments.dashboard.totalShipments,
      value: state.stats?.total || 0,
      icon: <Inventory />,
      color: theme.palette.primary.main,
      trend: dashboardData?.statsTrends?.total,
    },
    {
      label: dict.shipments.dashboard.activeShipments,
      value: state.stats?.active || 0,
      icon: <LocalShipping />,
      color: theme.palette.info.main,
      trend: dashboardData?.statsTrends?.active,
    },
    {
      label: dict.shipments.dashboard.delayedShipments,
      value: state.stats?.delayed || 0,
      icon: <AccessTime />,
      color:
        (state.stats?.delayed || 0) > 0
          ? theme.palette.error.main
          : theme.palette.success.main,
      trend: dashboardData?.statsTrends?.delayed,
    },
    {
      label: dict.shipments.dashboard.inTransit,
      value: state.stats?.inTransit || 0,
      icon: <DirectionsBoat />,
      color: theme.palette.success.main,
      trend: dashboardData?.statsTrends?.inTransit,
    },
  ], [state.stats, dashboardData?.statsTrends, theme, dict]);

  return (
    <div style={{ width: "100%" }}>
      <Box position={"relative"} p={{ xs: 2, md: 4 }} width={"100%"}>
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
            {dict.shipments.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {dict.shipments.subtitle}
          </Typography>
        </Box>
        <Button
          data-tour="shipment-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.shipments.addShipment}
        </Button>
      </Stack>

      <KpiCards kpis={kpiItems} loading={isLoading} />

      {isError ? (
        <Box mt={2}>
          <QueryErrorState onRetry={() => refetch()} />
        </Box>
      ) : (
        <>
          <Stack mt={2} data-tour="shipment-table">
            <ShipmentTable
              state={state}
              actions={{
                ...actions,
                onEdit: handleEdit,
                onDelete: handleDelete,
              }}
              pagination={{
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: state.totalCount,
              }}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
              onLimitChange={(pageSize) =>
                setPagination({ page: 1, pageSize: pageSize })
              }
            />
          </Stack>

          <Box mt={3}>
            <ShipmentAnalytics state={state} actions={actions} />
          </Box>
        </>
      )}

      <ShipmentDetailDialog
        open={!!selectedShipment}
        onClose={() => actions.selectShipment(null)}
        shipment={selectedShipment}
      />

      <EditShipmentDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        shipment={actionShipment}
        onSuccess={noop}
      />

      <AddShipmentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={noop}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.shipments.deleteTitle}
        description={dict.shipments.deleteDesc.replace(
          "{id}",
          actionShipment?.trackingId || ""
        )}
        loading={deleteMutation.isPending}
      />
      </Box>
    </div>
  );
}
