"use client";

import { useMemo, useState } from "react";
import { useDemoDriverConsole } from "@/app/hooks/demo/useDemoDriverConsole";
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
import type { IssuePriority } from "@prisma/client";

type Toast = { msg: string; tone: "success" | "warning" | "error" | "info" };

/**
 * Demo-only fork of useDriverConsoleState. Identical return shape (so the
 * shared tab/view components render unchanged), but:
 *   • data comes from the public mock endpoint via useDemoDriverConsole
 *   • every mutating action is replaced by a "disabled in demo" toast — no
 *     driverConsole controller (Server Actions) is imported here.
 */
export function useDemoDriverConsoleState() {
  const { dict } = useLanguage();
  const dc = dict.driverConsole;
  const { startTour } = useGuidedTour();

  const { data } = useDemoDriverConsole();
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
  const notifyDisabled = () => showToast(dict.toasts.demoActionDisabled, "info");

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

  // ---- Mutating actions: all disabled in the demo -----------------------
  const requestDutyChange = async (_target: DutyStatus) => {
    void _target;
    notifyDisabled();
  };
  const confirmDutyChange = () => {
    setPendingDutyChange(null);
    notifyDisabled();
  };
  const cancelDutyChange = () => setPendingDutyChange(null);

  const markStopArrived = async (_routeStopId: string, _arrived: boolean) => {
    void _routeStopId;
    void _arrived;
    notifyDisabled();
  };

  const setFuelField = (field: keyof typeof fuelForm, value: string) =>
    setFuelForm((f) => ({ ...f, [field]: value }));

  const submitFuel = async () => {
    notifyDisabled();
  };

  const submitIssue = async () => {
    notifyDisabled();
  };

  const updateShipmentStatusAction = async () => {
    notifyDisabled();
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
