"use client";

import { useMemo, useState } from "react";
import { useDemoWarehouseWorker } from "@/app/hooks/demo/useDemoWarehouseWorker";
import type { WWCatalogItem } from "@/app/lib/type/warehouseWorker";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { getTourStepsForPage } from "@/app/components/guidedTour/tourSteps";
import {
  View,
  Task,
  Zone,
  Movement,
  SkuInfo,
  LowStockItem,
} from "@/app/lib/type/warehouseWorkerClient";
import {
  PICKS_TARGET,
  PACKS_TARGET,
  relativeTime,
  prioFromServer,
  sortTasksByPriority,
  pickNextTask,
  I,
} from "@/app/lib/utils/warehouseWorkerUi";

/**
 * Demo-only fork of useWarehouseWorkerState. Identical return shape (so the
 * shared WW client + tabs render unchanged), but:
 *   • data comes from the public mock endpoint via useDemoWarehouseWorker
 *   • every mutating action (log / adjust / advanceTask / onRestock / onReport)
 *     is replaced by a "disabled in demo" toast — no warehouseWorker controller
 *     (logWarehouseMovement, adjustWarehouseStock, …) is imported here.
 * Read-only local interactions (scan lookup against the mock catalog, view
 * switching, quantity steppers) are kept so the panel still feels alive.
 */
export function useDemoWarehouseWorkerState(
  selectedWarehouseId: string | undefined
) {
  const { dict } = useLanguage();
  const ww = dict.warehouseWorker;
  const { startTour } = useGuidedTour();

  const { data } = useDemoWarehouseWorker(selectedWarehouseId);

  const warehouseId = data?.warehouse?.id ?? "";
  const warehouse = data?.warehouse
    ? {
        name: data.warehouse.name,
        code: data.warehouse.code,
        city: data.warehouse.city,
      }
    : { name: ww.noWarehouseAssigned, code: "—", city: "—" };

  const worker = {
    name: data?.worker?.name ?? "—",
    initials: data?.worker?.initials ?? "WW",
    role: data?.worker?.role
      ? dict.company?.roles?.[
          data.worker.role as keyof typeof dict.company.roles
        ] || data.worker.role
      : ww.warehouseWorker,
  };

  const warehouseOptions = data?.warehouses ?? [];
  const catalog: WWCatalogItem[] = useMemo(
    () => data?.catalog ?? [],
    [data?.catalog]
  );

  // The demo panel is always interactive; mutations are simulated in-memory.
  const canWrite = data?.canWrite ?? true;
  const unassignedPallets = data?.unassignedPallets ?? 0;

  const picks = data?.kpis.picks ?? 0;
  const packs = data?.kpis.packs ?? 0;
  const rate = data?.kpis.rate ?? 0;
  const picksTarget = data?.kpis.picksTarget ?? PICKS_TARGET;
  const packsTarget = data?.kpis.packsTarget ?? PACKS_TARGET;

  const tasks: Task[] = sortTasksByPriority(
    (data?.tasks ?? []).map((t) => ({
      id: t.id,
      kind: t.kind,
      name: t.name,
      order: t.orderRef,
      zone: t.zone,
      done: t.done,
      total: t.total,
      priority: prioFromServer(t.priority),
    }))
  );

  const nextTask: Task | null = pickNextTask(tasks);

  const zones: Zone[] = (data?.zones ?? []).map((z) => ({
    name: z.code,
    pct: z.pct,
    ...(z.isUnassigned ? { isUnassigned: true } : {}),
  }));

  const feed: Movement[] = (data?.feed ?? []).map((m) => ({
    id: m.id,
    type: m.type,
    name: m.name,
    sku: m.sku,
    qty: m.qty,
    zone: m.zone,
    who: m.self
      ? ww.dashboard.you
      : m.who === "System"
      ? ww.dashboard.system
      : m.who,
    self: m.self,
    t: relativeTime(m.at, ww),
  }));

  const lowStock: LowStockItem[] = data?.lowStock ?? [];

  const [view, setView] = useState<View>("dashboard");
  const [currentZone, setCurrentZone] = useState("A");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<SkuInfo | null>(null);
  const [scanQty, setScanQty] = useState(1);
  const [toast, setToast] = useState<{
    msg: string;
    tone: "success" | "warning" | "error" | "info";
  } | null>(null);
  // Drives the restock item picker; the demo opens it for real and only the
  // submit is stubbed, so visitors still see the dialog.
  const [restockOpen, setRestockOpen] = useState(false);

  const zonesKey = zones.map((z) => z.name).join(",");
  const [prevZonesKey, setPrevZonesKey] = useState<string | null>(null);
  if (prevZonesKey !== zonesKey) {
    setPrevZonesKey(zonesKey);
    if (zones.length && !zones.some((z) => z.name === currentZone)) {
      const firstZone = zones[0];
      if (firstZone) setCurrentZone(firstZone.name);
    }
  }

  const showToast = (
    msg: string,
    tone: "success" | "warning" | "error" | "info" = "success"
  ) => setToast({ msg, tone });

  // Every mutating action becomes this in the demo — the panel stays fully
  // navigable but nothing is persisted and no server action runs.
  const notifyDisabled = () =>
    showToast(dict.toasts.demoActionDisabled, "info");

  const handleHelpClick = () => {
    const steps = getTourStepsForPage(
      `warehouse-worker-${view}`,
      dict as Record<string, unknown>
    );
    if (steps.length > 0) {
      setTimeout(() => startTour(`warehouse-worker-${view}`, steps), 200);
    }
  };

  const openTasks = tasks.filter((t) => t.done < t.total).length;
  const highCount = tasks.filter(
    (t) => t.priority === "high" && t.done < t.total
  ).length;
  const picksPct = picksTarget
    ? Math.min(100, Math.round((picks / picksTarget) * 100))
    : 0;
  const packsPct = packsTarget
    ? Math.min(100, Math.round((packs / packsTarget) * 100))
    : 0;
  const capUsed = data?.capacity.used ?? 0;
  const capTotal = data?.capacity.total ?? 0;
  const capacityPct = data?.capacity.pct ?? 0;
  const anyCritical = zones.some((z) => z.pct >= 85);

  // Read-only scan lookup against the mock catalog (no persistence).
  const doScan = (raw: string) => {
    if (!raw.trim()) return;
    const q = raw.trim().toLocaleUpperCase("en-US");
    const hit = catalog.find(
      (s) =>
        s.sku.toLocaleUpperCase("en-US") === q ||
        s.name.toLocaleUpperCase("en-US").includes(q)
    );
    const info: SkuInfo = hit
      ? {
          sku: hit.sku,
          name: hit.name,
          zone: hit.zone,
          onHand: hit.quantity,
          available: hit.available,
          minStock: hit.minStock,
          lowStock: hit.lowStock,
        }
      : {
          sku: q.startsWith("SKU") ? q : `SKU-${q || "00000"}`,
          name: ww.unrecognizedItem,
          zone: currentZone,
        };
    setScanResult(info);
    setScanQty(1);
    setScanInput("");
    setCurrentZone(info.zone);
  };

  const simScan = () => {
    if (!catalog.length) return showToast(ww.noInventoryToScan, "warning");
    const item = catalog[Math.floor(Math.random() * catalog.length)];
    if (item) doScan(item.sku);
  };

  // ---- Mutating actions: all disabled in the demo -----------------------
  const log = async (_kind: "PICK" | "PACK" | "STOCK_IN" | "PUTAWAY") => {
    void _kind;
    setScanResult(null);
    setScanQty(1);
    notifyDisabled();
  };

  const adjust = async (_counted: number, _reason: string) => {
    void _counted;
    void _reason;
    setScanResult(null);
    setScanQty(1);
    notifyDisabled();
  };

  const advanceTask = async (_id: string, _delta?: number) => {
    void _id;
    void _delta;
    notifyDisabled();
  };

  const onRestock = async (_item: {
    sku: string;
    zone: string;
    suggestedQty?: number;
  }) => {
    void _item;
    notifyDisabled();
    setRestockOpen(false);
  };

  const onReport = async () => {
    notifyDisabled();
  };

  const NAV: { key: View; title: string; d: string }[] = [
    { key: "dashboard", title: ww.nav.overview, d: I.grid },
    { key: "scan", title: ww.nav.scan, d: I.scan },
    { key: "tasks", title: ww.nav.tasks, d: I.tasks },
    { key: "capacity", title: ww.nav.capacity, d: I.capacity },
    { key: "activity", title: ww.nav.activity, d: I.activity },
  ];

  return {
    dict,
    ww,
    warehouseId,
    warehouse,
    worker,
    warehouseOptions,
    canWrite,
    unassignedPallets,
    picks,
    packs,
    rate,
    picksTarget,
    packsTarget,
    picksPct,
    packsPct,
    tasks,
    nextTask,
    zones,
    feed,
    lowStock,
    view,
    setView,
    currentZone,
    setCurrentZone,
    scanInput,
    setScanInput,
    scanResult,
    setScanResult,
    scanQty,
    setScanQty,
    toast,
    setToast,
    openTasks,
    highCount,
    capUsed,
    capTotal,
    capacityPct,
    anyCritical,
    doScan,
    simScan,
    log,
    adjust,
    advanceTask,
    onRestock,
    onReport,
    // Mirrors the real hook: WWDashboardTab reads these to drive the restock
    // item picker, and `catalog` must be a real array — the dialog filters it
    // on mount, before it is ever opened.
    catalog,
    restockOpen,
    setRestockOpen,
    restockPending: false,
    NAV,
    handleHelpClick,
  };
}
