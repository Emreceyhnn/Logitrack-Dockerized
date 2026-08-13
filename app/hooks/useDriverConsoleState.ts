import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDriverConsole } from "@/app/hooks/useDriverConsole";
import { driverConsoleKeys } from "@/app/lib/query-keys/driverConsole.keys";
import {
  updateDriverDutyStatus,
  updateRouteStopArrival,
  submitFuelLog,
  reportVehicleIssue,
  updateMyShipmentStatus,
} from "@/app/lib/controllers/driverConsole";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { getTourStepsForPage } from "@/app/components/guidedTour/tourSteps";
import type {
  View,
  DutyStatus,
  ClientActiveRoute,
  ClientRouteStop,
  ClientShipment,
  ClientFuelLog,
  ClientIssue,
  ClientDocument,
} from "@/app/lib/type/driverConsoleClient";
import { I, DUTY_ORDER, daysUntil } from "@/app/lib/utils/driverConsoleUi";
import type { FuelType, IssuePriority, ShipmentStatus } from "@prisma/client";

type Toast = { msg: string; tone: "success" | "warning" | "error" | "info" };

export function useDriverConsoleState() {
  const { dict } = useLanguage();
  const dc = dict.driverConsole;
  const { startTour } = useGuidedTour();
  const queryClient = useQueryClient();

  const { data } = useDriverConsole();
  const refresh = () => queryClient.invalidateQueries({ queryKey: driverConsoleKeys.all });

  const driver = data?.driver ?? null;
  const vehicle = data?.vehicle ?? null;

  const [view, setView] = useState<View>("dashboard");
  const [pendingDutyChange, setPendingDutyChange] = useState<DutyStatus | null>(null);
  const [shipmentFilter, setShipmentFilter] = useState<string>("ALL");
  const [issuePriority, setIssuePriority] = useState<IssuePriority>("MEDIUM");
  const [fuelForm, setFuelForm] = useState({ volumeLiter: "", cost: "", odometerKm: "" });
  const [issueTitle, setIssueTitle] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, tone: Toast["tone"] = "success") => setToast({ msg, tone });

  const licenseDaysLeft = daysUntil(driver?.licenseExpiry ?? null);
  const licenseWarning = licenseDaysLeft !== null && licenseDaysLeft <= 45;

  const activeRoute: ClientActiveRoute | null = useMemo(() => {
    const r = data?.activeRoute;
    if (!r) return null;
    const stops: ClientRouteStop[] = r.stops.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      isDone: s.arrivedAt !== null,
      eta: null,
    }));
    const remainingStopsCount = stops.filter((s) => !s.isDone).length;
    const nextStop = stops.find((s) => !s.isDone) ?? null;
    return {
      id: r.id,
      status: r.status,
      date: r.date,
      startTime: r.startTime,
      distanceKm: r.distanceKm,
      durationMin: r.durationMin,
      shape: r.shape,
      bufferMeters: r.bufferMeters,
      stops,
      deviation: r.deviation,
      remainingStopsCount,
      nextStop,
    };
  }, [data?.activeRoute]);

  const shipments: ClientShipment[] = useMemo(
    () => data?.shipments.map((s) => ({ ...s })) ?? [],
    [data?.shipments]
  );
  const shipmentsFiltered =
    shipmentFilter === "ALL" ? shipments : shipments.filter((s) => s.status === shipmentFilter);

  const fuelLogs: ClientFuelLog[] = data?.fuelLogs ?? [];
  const issues: ClientIssue[] = data?.issues ?? [];
  const documents: ClientDocument[] = data?.documents ?? [];

  const handleHelpClick = () => {
    const steps = getTourStepsForPage(`driver-console-${view}`, dict as Record<string, unknown>);
    if (steps.length > 0) {
      setTimeout(() => startTour(`driver-console-${view}`, steps), 200);
    }
  };

  const requestDutyChange = async (target: DutyStatus) => {
    if (!driver || target === driver.status) return;
    if (activeRoute?.status === "ACTIVE" && target !== "ON_JOB") {
      setPendingDutyChange(target);
      return;
    }
    await changeDutyStatus(target);
  };

  const changeDutyStatus = async (target: DutyStatus) => {
    try {
      await updateDriverDutyStatus(target);
      showToast(dc.dutyChanged, "success");
      await refresh();
    } catch {
      showToast(dc.couldNotChangeDuty, "error");
    } finally {
      setPendingDutyChange(null);
    }
  };

  const confirmDutyChange = () => {
    if (pendingDutyChange) void changeDutyStatus(pendingDutyChange);
  };
  const cancelDutyChange = () => setPendingDutyChange(null);

  const markStopArrived = async (routeStopId: string, arrived: boolean) => {
    try {
      await updateRouteStopArrival(routeStopId, arrived);
      showToast(arrived ? dc.stopMarkedArrived : dc.stopMarkedPending, "success");
      await refresh();
    } catch {
      showToast(dc.couldNotUpdateStop, "error");
    }
  };

  const setFuelField = (field: keyof typeof fuelForm, value: string) =>
    setFuelForm((f) => ({ ...f, [field]: value }));

  const submitFuel = async () => {
    const volumeLiter = Number(fuelForm.volumeLiter);
    const cost = Number(fuelForm.cost);
    const odometerKm = Number(fuelForm.odometerKm);
    if (!volumeLiter || !cost || !odometerKm) {
      showToast(dc.couldNotLogFuel, "warning");
      return;
    }
    try {
      await submitFuelLog({
        volumeLiter,
        cost,
        odometerKm,
        fuelType: "DIESEL" as FuelType,
        currency: "USD",
      });
      setFuelForm({ volumeLiter: "", cost: "", odometerKm: "" });
      showToast(dc.fuelLogged, "success");
      await refresh();
    } catch {
      showToast(dc.couldNotLogFuel, "error");
    }
  };

  const submitIssue = async () => {
    if (!issueTitle.trim()) {
      showToast(dc.couldNotReportIssue, "warning");
      return;
    }
    try {
      await reportVehicleIssue({ title: issueTitle.trim(), priority: issuePriority });
      setIssueTitle("");
      showToast(dc.issueReported, "error");
      await refresh();
    } catch {
      showToast(dc.couldNotReportIssue, "error");
    }
  };

  const updateShipmentStatusAction = async (shipmentId: string, status: ShipmentStatus) => {
    try {
      await updateMyShipmentStatus(shipmentId, status);
      showToast(dc.shipmentStatusUpdated, "success");
      await refresh();
    } catch {
      showToast(dc.couldNotUpdateShipment, "error");
    }
  };

  const NAV: { key: View; title: string; d: string }[] = [
    { key: "dashboard", title: dc.nav.dashboard, d: I.dashboard },
    { key: "route", title: dc.nav.route, d: I.route },
    { key: "shipments", title: dc.nav.shipments, d: I.shipments },
    { key: "vehicle", title: dc.nav.vehicle, d: I.vehicle },
    { key: "documents", title: dc.nav.documents, d: I.documents },
  ];

  return {
    dict,
    dc,
    view,
    setView,
    driver,
    vehicle,
    kpis: data?.kpis ?? { safetyScore: null, efficiencyScore: null, rating: null },
    activeRoute,
    licenseDaysLeft,
    licenseWarning,
    shipmentFilter,
    setShipmentFilter,
    shipments: shipmentsFiltered,
    fuelLogs,
    issues,
    documents,
    fuelForm,
    setFuelField,
    submitFuel,
    issueTitle,
    setIssueTitle,
    issuePriority,
    setIssuePriority,
    submitIssue,
    pendingDutyChange,
    requestDutyChange,
    confirmDutyChange,
    cancelDutyChange,
    markStopArrived,
    updateShipmentStatusAction,
    DUTY_ORDER,
    toast,
    setToast,
    NAV,
    handleHelpClick,
  };
}

export type DriverConsoleState = ReturnType<typeof useDriverConsoleState>;
