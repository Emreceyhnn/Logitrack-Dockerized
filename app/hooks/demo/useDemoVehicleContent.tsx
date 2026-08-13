import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { LocalShipping, CheckCircle, Build, DirectionsCar, ReportProblem, Description } from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { toast } from "sonner";
import { useDemoVehicleWithDashboard, useDemoTrailers } from "@/app/hooks/demo/useDemoVehicles";
import { VehiclePageState, VehiclePageActions, VehicleWithRelations } from "@/app/lib/type/vehicle";
import { TrailerFilters, TrailerWithRelations } from "@/app/lib/type/trailer";

export const useDemoVehicleContent = () => {
  const theme = useTheme();
  const dict = useDictionary();
  const searchParams = useSearchParams();
  const vehicleIdFromUrl = searchParams?.get("id");
  const tabFromUrl = searchParams?.get("tab");

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

  const { data: dashboardData, isLoading: isVehiclesLoading, isFetching: isVehiclesFetching, isError: isVehiclesError, refetch: refetchVehicleWithDashboard } = useDemoVehicleWithDashboard();
  const { data: trailerData, isLoading: isTrailersLoading, isFetching: isTrailersFetching, isError: isTrailersError, refetch: refetchTrailers } = useDemoTrailers();

  const trailers = useMemo(() => trailerData?.trailers || [], [trailerData?.trailers]);
  const trailerMeta = trailerData?.meta;
  const vehicles = dashboardData?.vehicles;
  const kpiLoading = isVehiclesLoading;

  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchVehicleWithDashboard()]);
  }, [refetchVehicleWithDashboard]);

  const selectVehicle = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedVehicleId: id }));
  }, []);

  useEffect(() => {
    if (vehicleIdFromUrl) {
      selectVehicle(vehicleIdFromUrl);
    }
  }, [vehicleIdFromUrl, selectVehicle]);

  const updateFilters = useCallback(
    (newFilters: Partial<VehiclePageState["filters"]>) => {
      void newFilters;
      notifyDisabled();
    },
    [notifyDisabled]
  );

  const updateTrailerFilters = useCallback(
    (newFilters: Partial<TrailerFilters>) => {
      setTrailerFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const actions: VehiclePageActions = useMemo(() => ({ fetchVehicles: async () => {}, fetchDashboardData: async () => {}, refreshAll, selectVehicle, updateFilters }), [refreshAll, selectVehicle, updateFilters]);

  const handleEdit = useCallback((id: string) => {
    const v = vehicles?.find((item) => item.id === id) || null;
    setActionVehicle(v);
    setEditDialogOpen(true);
  }, [vehicles]);

  const handleDelete = useCallback((id: string) => {
    const v = vehicles?.find((item) => item.id === id) || null;
    setActionVehicle(v);
    setDeleteDialogOpen(true);
  }, [vehicles]);

  const handleTrailerEdit = useCallback((trailer: TrailerWithRelations) => {
    setActionTrailer(trailer);
    setEditTrailerOpen(true);
  }, []);

  const handleTrailerDelete = useCallback((trailer: TrailerWithRelations) => {
    setActionTrailer(trailer);
    setDeleteDialogOpen(true);
  }, []);

  const handleTrailerAssign = useCallback((trailer: TrailerWithRelations) => {
    setActionTrailer(trailer);
    setAssignTrailerOpen(true);
  }, []);

  const handleTrailerDetach = useCallback(async (trailer: TrailerWithRelations) => {
    setActionTrailer(trailer);
    setAssignTrailerOpen(true);
  }, []);

  const handleAddSuccess = useCallback(() => {
    setAddDialogOpen(false);
    notifyDisabled();
  }, [notifyDisabled]);

  const handleEditFormSuccess = useCallback(() => {
    setEditDialogOpen(false);
    setActionVehicle(null);
    notifyDisabled();
  }, [notifyDisabled]);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteDialogOpen(false);
    setActionVehicle(null);
    setActionTrailer(null);
    notifyDisabled();
  }, [notifyDisabled]);

  const handleDialogDeleteSuccess = useCallback(() => {
    selectVehicle(null);
    notifyDisabled();
  }, [selectVehicle, notifyDisabled]);

  const selectedVehicle = useMemo(
    () => vehicles?.find((v: VehicleWithRelations) => v.id === state.selectedVehicleId) || null,
    [vehicles, state.selectedVehicleId]
  );

  const deleteMutation = useMemo(() => ({ isPending: false }), []);
  const deleteTrailerMut = useMemo(() => ({ isPending: false }), []);

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
    dict, activeTab, setActiveTab, state, trailerFilters,
    dashboardData, isVehiclesLoading, isVehiclesFetching, isVehiclesError, refetchVehicleWithDashboard,
    isTrailersLoading, isTrailersFetching, isTrailersError, refetchTrailers,
    trailers, trailerMeta, vehicles, kpiLoading,
    actions, handleEdit, handleDelete,
    handleTrailerEdit, handleTrailerDelete, handleTrailerAssign, handleTrailerDetach, kpiItems,
    updateTrailerFilters, refreshAll, notifyDisabled,
    addDialogOpen, setAddDialogOpen,
    editDialogOpen, setEditDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    actionVehicle, setActionVehicle,
    addTrailerOpen, setAddTrailerOpen,
    editTrailerOpen, setEditTrailerOpen,
    assignTrailerOpen, setAssignTrailerOpen,
    actionTrailer, setActionTrailer,
    handleAddSuccess, handleEditFormSuccess, handleDeleteConfirm, handleDialogDeleteSuccess,
    deleteMutation, deleteTrailerMut, tabFromUrl, selectedVehicle,
  };
};
