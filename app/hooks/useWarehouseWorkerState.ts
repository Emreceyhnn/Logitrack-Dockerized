import { useMemo, useState } from "react";
import { useWarehouseWorker, useWarehouseWorkerMutations } from "@/app/hooks/useWarehouseWorker";
import type { WWCatalogItem } from "@/app/lib/type/warehouseWorker";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { getTourStepsForPage } from "@/app/components/guidedTour/tourSteps";
import { View, Task, Zone, Movement, SkuInfo, LowStockItem } from "@/app/lib/type/warehouseWorkerClient";
import { PICKS_TARGET, PACKS_TARGET, relativeTime, prioFromServer, sortTasksByPriority, pickNextTask, isUnassignedZone, I } from "@/app/lib/utils/warehouseWorkerUi";

export function useWarehouseWorkerState(selectedWarehouseId: string | undefined) {
  const { dict } = useLanguage();
  const ww = dict.warehouseWorker;
  const { startTour } = useGuidedTour();

  const { data } = useWarehouseWorker(selectedWarehouseId);
  const {
    logMovement,
    adjustStock,
    advanceTask: advanceTaskMutation,
    requestRestock: requestRestockMutation,
    reportIssue: reportIssueMutation,
  } = useWarehouseWorkerMutations();

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
      ? dict.company?.roles?.[data.worker.role as keyof typeof dict.company.roles] || data.worker.role
      : ww.warehouseWorker,
  };

  const warehouseOptions = data?.warehouses ?? [];
  const catalog: WWCatalogItem[] = useMemo(() => data?.catalog ?? [], [data?.catalog]);

  // Read-only roles (e.g. Dispatcher) see the floor but may not write to it.
  // The server enforces this too — this only keeps dead controls off screen.
  const canWrite = data?.canWrite ?? false;
  // Pallets whose stock carries no valid zone; surfaced so nobody reads the
  // capacity bars as if every pallet had been located.
  const unassignedPallets = data?.unassignedPallets ?? 0;

  const picks = data?.kpis.picks ?? 0;
  const packs = data?.kpis.packs ?? 0;
  const rate = data?.kpis.rate ?? 0;
  const picksTarget = data?.kpis.picksTarget ?? PICKS_TARGET;
  const packsTarget = data?.kpis.packsTarget ?? PACKS_TARGET;

  // Order the queue so the worker never has to hunt for what's next: open tasks
  // before completed ones, then high → med → low (see sortTasksByPriority).
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

  // The "do this next" recommendation surfaced in the dashboard's Next-task card.
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
    who: m.self ? ww.dashboard.you : m.who === "System" ? ww.dashboard.system : m.who,
    self: m.self,
    t: relativeTime(m.at, ww),
  }));

  // Proactive shortage signal: SKUs already at/below reorder point, worst first.
  const lowStock: LowStockItem[] = data?.lowStock ?? [];

  const [view, setView] = useState<View>("dashboard");
  const [currentZone, setCurrentZone] = useState("A");
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<SkuInfo | null>(null);
  const [scanQty, setScanQty] = useState(1);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "warning" | "error" | "info" } | null>(null);
  // Drives the item+quantity picker behind the control panel's restock action.
  const [restockOpen, setRestockOpen] = useState(false);
  // Session-local tally of logged movements, used only to warn (never block)
  // when a task is completed without any scan/log activity this session.
  const [scanActivityCount, setScanActivityCount] = useState(0);

  const zonesKey = zones.map((z) => z.name).join(",");
  const [prevZonesKey, setPrevZonesKey] = useState<string | null>(null);
  if (prevZonesKey !== zonesKey) {
    setPrevZonesKey(zonesKey);
    if (zones.length && !zones.some((z) => z.name === currentZone)) {
      const firstZone = zones[0];
      if (firstZone) setCurrentZone(firstZone.name);
    }
  }

  const showToast = (msg: string, tone: "success" | "warning" | "error" | "info" = "success") => setToast({ msg, tone });

  const handleHelpClick = () => {
    const steps = getTourStepsForPage(`warehouse-worker-${view}`, dict as Record<string, unknown>);
    if (steps.length > 0) {
      setTimeout(() => startTour(`warehouse-worker-${view}`, steps), 200);
    }
  };

  const openTasks = tasks.filter((t) => t.done < t.total).length;
  const highCount = tasks.filter((t) => t.priority === "high" && t.done < t.total).length;
  const picksPct = picksTarget ? Math.min(100, Math.round((picks / picksTarget) * 100)) : 0;
  const packsPct = packsTarget ? Math.min(100, Math.round((packs / packsTarget) * 100)) : 0;
  const capUsed = data?.capacity.used ?? 0;
  const capTotal = data?.capacity.total ?? 0;
  const capacityPct = data?.capacity.pct ?? 0;
  const anyCritical = zones.some((z) => z.pct >= 85);

  const doScan = (raw: string) => {
    if (!raw.trim()) return;
    const q = raw.trim().toLocaleUpperCase("en-US");
    const hit = catalog.find((s) => s.sku.toLocaleUpperCase("en-US") === q || s.name.toLocaleUpperCase("en-US").includes(q));
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
    // Switching the active zone to match the scanned item is convenient, but
    // only follow the item into a *real* zone. Unlocated stock must not become
    // the active zone.
    if (!isUnassignedZone(info.zone)) {
      if (info.zone !== currentZone) {
        showToast(`${ww.ui.zone} ${info.zone}`, "info");
      }
      setCurrentZone(info.zone);
    }
  };

  const simScan = () => {
    if (!catalog.length) return showToast(ww.noInventoryToScan, "warning");
    const item = catalog[Math.floor(Math.random() * catalog.length)];
    if (item) doScan(item.sku);
  };

  const log = async (kind: "PICK" | "PACK" | "STOCK_IN" | "PUTAWAY") => {
    if (!canWrite) return showToast(ww.readOnlyRole, "warning");
    if (!scanResult || !warehouseId) return;
    const qty = scanQty;
    const result = scanResult;
    setScanResult(null);
    setScanQty(1);
    try {
      // The scanned item's own zone, not the active-zone toggle, is what's
      // actually authoritative for where this movement happened.
      await logMovement.mutateAsync({ warehouseId, sku: result.sku, quantity: qty, kind, zone: result.zone });
      setScanActivityCount((c) => c + 1);
      const label = (ww.ui[kind] || kind).toLocaleLowerCase("en-US");
      // PICK removes stock (warning tone); everything else adds/settles (success).
      showToast(`${ww.logged} ${label} · ${qty} × ${result.sku}`, kind === "PICK" ? "warning" : "success");
    } catch {
      showToast(ww.couldNotLog, "error");
    }
  };

  // Reconcile a physical count for the scanned SKU (eksik/fazla). `counted` is
  // the shelf count; the server computes the signed delta against live on-hand.
  const adjust = async (counted: number, reason: string) => {
    if (!canWrite) return showToast(ww.readOnlyRole, "warning");
    if (!scanResult || !warehouseId) return;
    const result = scanResult;
    const expected = result.onHand;
    setScanResult(null);
    setScanQty(1);
    try {
      const res = await adjustStock.mutateAsync({ warehouseId, sku: result.sku, counted, reason, expected, zone: result.zone });
      setScanActivityCount((c) => c + 1);
      if (res.delta === 0) {
        showToast(`${ww.adjustNoChange} · ${result.sku}`, "info");
      } else {
        const sign = res.delta > 0 ? "+" : "";
        showToast(`${ww.adjusted} ${sign}${res.delta} · ${result.sku}`, res.delta < 0 ? "warning" : "success");
      }
    } catch {
      showToast(ww.couldNotAdjust, "error");
    }
  };

  // delta lets the task row commit a counted unit total in one step (Start →
  // count → Complete); omitted, the backend falls back to its default step so
  // the Next-task card's single-tap "Start" still works. Never blocks on it —
  // the counter is a best-effort nudge, not a hard gate, since a worker may
  // legitimately batch several scans before committing progress.
  const advanceTask = async (id: string, delta?: number) => {
    if (!canWrite) return showToast(ww.readOnlyRole, "warning");
    const willComplete = tasks.some(
      (t) => t.id === id && delta && t.done + delta >= t.total
    );
    try {
      const res = await advanceTaskMutation.mutateAsync({ taskId: id, delta });
      if (res.complete) {
        showToast(
          scanActivityCount > 0 ? ww.taskComplete : ww.ui.taskCompleteNoScan,
          scanActivityCount > 0 ? "success" : "warning"
        );
      } else if (willComplete && scanActivityCount === 0) {
        showToast(ww.ui.taskCompleteNoScan, "warning");
      }
    } catch {
      showToast(ww.couldNotUpdateTask, "error");
    }
  };

  // Files a SKU-specific replenishment request: this product, this many units.
  // A request without an item is not actionable on the floor (a replenisher
  // can't work "zone A" — they move a pallet of one SKU to one pick face), so
  // every caller goes through the item picker; see WWRestockDialog.
  const onRestock = async (item: {
    sku: string;
    zone: string;
    suggestedQty?: number;
  }) => {
    if (!canWrite) return showToast(ww.readOnlyRole, "warning");
    if (!warehouseId) return;
    try {
      if (item) {
        await requestRestockMutation.mutateAsync({
          warehouseId,
          // Unlocated stock has no zone to replenish into; fall back to where
          // the worker actually is so the request stays actionable.
          zone: isUnassignedZone(item.zone) ? currentZone : item.zone,
          sku: item.sku,
          quantity: item.suggestedQty,
        });
        const qtyPart = item.suggestedQty ? ` × ${item.suggestedQty}` : "";
        showToast(`${ww.restockRequested} · ${item.sku}${qtyPart}`, "info");
        setRestockOpen(false);
      } else {
        await requestRestockMutation.mutateAsync({ warehouseId, zone: currentZone });
        showToast(`${ww.restockRequested} · Zone ${currentZone}`, "info");
        setRestockOpen(false);
      }
    } catch {
      showToast(ww.couldNotRequestRestock, "error");
    }
  };

  const onReport = async () => {
    if (!canWrite) return showToast(ww.readOnlyRole, "warning");
    if (!warehouseId) return;
    try {
      await reportIssueMutation.mutateAsync({
        warehouseId,
        title: `Floor issue — Zone ${currentZone}`,
        // Persisted as a column too, so reports stay filterable by site/zone
        // rather than only being greppable out of the title.
        zone: currentZone,
      });
      showToast(ww.issueReported, "error");
    } catch {
      showToast(ww.couldNotReportIssue, "error");
    }
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
    catalog,
    restockOpen,
    setRestockOpen,
    restockPending: requestRestockMutation.isPending,
    NAV,
    handleHelpClick,
  };
}

export type WWState = ReturnType<typeof useWarehouseWorkerState>;
