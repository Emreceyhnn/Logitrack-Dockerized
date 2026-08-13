"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useSearchParams } from "next/navigation";
import { LocalShipping, CheckCircle, Build, DirectionsCar, ReportProblem, Description } from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { toast } from "sonner";
import { useVehicleWithDashboard, useVehicleMutations, useVehicle } from "@/app/hooks/useVehicles";
import { useTrailers, useTrailerMutations } from "@/app/hooks/useTrailers";
import { VehiclePageState, VehiclePageActions, VehicleWithRelations } from "@/app/lib/type/vehicle";
import { TrailerWithRelations, TrailerFilters } from "@/app/lib/type/trailer";
import { logger } from "@/app/lib/logger";

export const useVehicleContent = () => {
  const theme = useTheme();
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const vehicleIdFromUrl = searchParams.get("id");
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(0);
  const [state, setState] = useState<{ filters: VehiclePageState["filters"]; selectedVehicleId: string | null; }>({ filters: {}, selectedVehicleId: null });
  const [trailerFilters, setTrailerFilters] = useState<TrailerFilters>({ page: 1, limit: 10, search: "" });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionVehicle, setActionVehicle] = useState<VehicleWithRelations | null>(null);

  const [addTrailerOpen, setAddTrailerOpen] = useState(false);
  const [editTrailerOpen, setEditTrailerOpen] = useState(false);
  const [assignTrailerOpen, setAssignTrailerOpen] = useState(false);
  const [actionTrailer, setActionTrailer] = useState<TrailerWithRelations | null>(null);

  const { data: dashboardData, isLoading: isVehiclesLoading, isFetching: isVehiclesFetching, isError: isVehiclesError, refetch: refetchVehicleWithDashboard } = useVehicleWithDashboard(state.filters);
  const noop = useCallback(async () => {}, []);
  const { data: trailerData, isLoading: isTrailersLoading, isFetching: isTrailersFetching, isError: isTrailersError, refetch: refetchTrailers } = useTrailers(trailerFilters);

  const trailers = trailerData?.trailers || [];
  const trailerMeta = trailerData?.meta;
  const vehicles = dashboardData?.vehicles;
  const kpiLoading = activeTab === 0 ? isVehiclesLoading : isTrailersLoading;

  const { deleteVehicle: deleteMutation } = useVehicleMutations();
  const { deleteTrailer: deleteTrailerMut, assignTrailer: detachTrailerMut } = useTrailerMutations();

  const selectVehicle = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedVehicleId: id }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<VehiclePageState["filters"]>) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, ...newFilters } }));
  }, []);

  const updateTrailerFilters = useCallback((newFilters: Partial<TrailerFilters>) => {
    setTrailerFilters((prev) => ({ ...prev, ...newFilters, ...(newFilters.page === undefined ? { page: 1 } : {}) }));
  }, []);

  const actions: VehiclePageActions = useMemo(() => ({ fetchVehicles: async () => {}, fetchDashboardData: async () => {}, refreshAll: noop, selectVehicle, updateFilters }), [noop, selectVehicle, updateFilters]);

  useEffect(() => {
    if (vehicleIdFromUrl) {
      actions.selectVehicle(vehicleIdFromUrl);
    }
  }, [vehicleIdFromUrl, actions]);

  const handleAddSuccess = () => {};

  const handleEdit = useCallback((id: string) => {
    const v = vehicles?.find((v) => v.id === id);
    if (v) { setActionVehicle(v); setEditDialogOpen(true); }
  }, [vehicles]);

  const handleDelete = useCallback((id: string) => {
    const v = vehicles?.find((v) => v.id === id);
    if (v) { setActionVehicle(v); setDeleteDialogOpen(true); }
  }, [vehicles]);

  const handleEditFormSuccess = () => {
    setEditDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (activeTab === 0 && actionVehicle) {
      try {
        await deleteMutation.mutateAsync(actionVehicle.id);
        setDeleteDialogOpen(false);
        if (state.selectedVehicleId === actionVehicle.id) actions.selectVehicle(null);
      } catch (error) {
        logger.error("Failed to delete vehicle:", error);
        toast.error(dict.common.actionFailed);
      }
    } else if (activeTab === 1 && actionTrailer) {
      try {
        await deleteTrailerMut.mutateAsync(actionTrailer.id);
        setDeleteDialogOpen(false);
      } catch (error) {
        logger.error("Failed to delete trailer:", error);
        toast.error(dict.common.actionFailed);
      }
    }
  };

  const handleDialogDeleteSuccess = () => actions.selectVehicle(null);

  const handleTrailerEdit = (trailer: TrailerWithRelations) => { setActionTrailer(trailer); setEditTrailerOpen(true); };
  const handleTrailerDelete = (trailer: TrailerWithRelations) => { setActionTrailer(trailer); setDeleteDialogOpen(true); };
  const handleTrailerAssign = (trailer: TrailerWithRelations) => { setActionTrailer(trailer); setAssignTrailerOpen(true); };
  const handleTrailerDetach = async (trailer: TrailerWithRelations) => {
    try {
      await detachTrailerMut.mutateAsync({ trailerId: trailer.id, vehicleId: null });
    } catch (error) {
      logger.error("Failed to detach trailer:", error);
      toast.error(dict.common.actionFailed);
    }
  };

  const { data: individualVehicle } = useVehicle(
    state.selectedVehicleId && !vehicles?.find((v) => v.id === state.selectedVehicleId)
      ? state.selectedVehicleId
      : null
  );

  const selectedVehicle = vehicles?.find((v) => v.id === state.selectedVehicleId) || individualVehicle || null;

  const kpiItems = useMemo(() => {
    if (activeTab === 1) {
      return [
        { label: dict.trailers.kpis?.totalTrailers || "Total Trailers", value: trailerData?.kpis?.total ?? 0, icon: <LocalShipping />, color: theme.palette.primary.main },
        { label: dict.trailers.kpis?.available || "Available", value: trailerData?.kpis?.available ?? 0, icon: <CheckCircle />, color: theme.palette.success.main },
        { label: dict.trailers.kpis?.inUse || "In Use", value: trailerData?.kpis?.inUse ?? 0, icon: <DirectionsCar />, color: theme.palette.info.main },
        { label: dict.trailers.kpis?.maintenance || "In Maintenance", value: trailerData?.kpis?.maintenance ?? 0, icon: <Build />, color: theme.palette.warning.main },
        { label: dict.trailers.kpis?.openIssues || "Open Issues", value: trailerData?.kpis?.issues ?? 0, icon: <ReportProblem />, color: (trailerData?.kpis?.issues ?? 0) > 0 ? theme.palette.error.main : theme.palette.success.main },
      ];
    }
    return [
      { label: dict.vehicles.kpis.totalVehicles, value: dashboardData?.vehiclesKpis?.totalVehicles ?? 0, icon: <LocalShipping />, color: theme.palette.primary.main, trend: dashboardData?.kpiTrends?.totalVehicles },
      { label: dict.vehicles.kpis.available, value: dashboardData?.vehiclesKpis?.available ?? 0, icon: <CheckCircle />, color: theme.palette.success.main },
      { label: dict.vehicles.kpis.inService, value: dashboardData?.vehiclesKpis?.inService ?? 0, icon: <Build />, color: theme.palette.warning.main },
      { label: dict.vehicles.kpis.onTrip, value: dashboardData?.vehiclesKpis?.onTrip ?? 0, icon: <DirectionsCar />, color: theme.palette.info.main },
      { label: dict.vehicles.kpis.openIssues, value: dashboardData?.vehiclesKpis?.openIssues ?? 0, icon: <ReportProblem />, color: (dashboardData?.vehiclesKpis?.openIssues ?? 0) > 0 ? theme.palette.error.main : theme.palette.success.main },
      { label: dict.vehicles.kpis.docsExpiring, value: dashboardData?.vehiclesKpis?.docsDueSoon ?? 0, icon: <Description />, color: (dashboardData?.vehiclesKpis?.docsDueSoon ?? 0) > 0 ? theme.palette.warning.main : theme.palette.success.main },
    ];
  }, [activeTab, dashboardData, trailerData, theme, dict]);

  return {
    theme, dict, tabFromUrl, activeTab, setActiveTab, state, trailerFilters,
    addDialogOpen, setAddDialogOpen, editDialogOpen, setEditDialogOpen, deleteDialogOpen, setDeleteDialogOpen,
    actionVehicle, setActionVehicle, addTrailerOpen, setAddTrailerOpen, editTrailerOpen, setEditTrailerOpen,
    assignTrailerOpen, setAssignTrailerOpen, actionTrailer, setActionTrailer,
    dashboardData, isVehiclesLoading, isVehiclesFetching, isVehiclesError, refetchVehicleWithDashboard,
    trailerData, isTrailersLoading, isTrailersFetching, isTrailersError, refetchTrailers,
    trailers, trailerMeta, vehicles, kpiLoading, deleteMutation, deleteTrailerMut, detachTrailerMut,
    actions, handleAddSuccess, handleEdit, handleDelete, handleEditFormSuccess, handleDeleteConfirm, handleDialogDeleteSuccess,
    handleTrailerEdit, handleTrailerDelete, handleTrailerAssign, handleTrailerDetach, selectedVehicle, kpiItems,
    updateTrailerFilters, refreshAll: noop
  };
};
