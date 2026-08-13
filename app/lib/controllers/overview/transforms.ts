// Pure data-transformation helpers for the overview dashboard. Kept in a plain
// (non-"use server") module so getOverviewDashboardData stays focused on
// orchestration while the row → view-model mapping lives here.

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { Document, FuelLog, Issue } from "@prisma/client";
import { IssueType } from "@prisma/client";
import {
  palletUsageByWarehouse,
  type WarehouseScopedInventoryRow,
} from "../../utils/palletOccupancy";
import type {
  ActionRequiredItems,
  FuelStat,
  WarehouseCapacityStat,
  ShipmentDayStat,
  MapData,
} from "../../type/overview";

dayjs.extend(utc);
dayjs.extend(timezone);

type AlertIssue = Pick<
  Issue,
  "type" | "title" | "priority" | "status" | "vehicleId" | "driverId" | "shipmentId"
>;
type AlertDocument = Pick<
  Document,
  "name" | "type" | "expiryDate" | "driverId" | "vehicleId"
> & {
  vehicle?: { plate: string } | null;
  driver?: { user: { name: string; surname: string } } | null;
};

/**
 * tr-Belgenin son geçerlilik tarihine göre aciliyetini hesaplar.
 * en-Derives a document's urgency from its expiry date.
 *
 *    Computed, never read from `Document.status`: nothing in the app writes
 *    DocumentStatus.EXPIRED (the check-expirations cron only sends
 *    notifications), so a lapsed document keeps reporting ACTIVE. The date is
 *    the only field that can be trusted.
 * input (expiryDate: Date | null)
 * output ({ urgency, daysLeft })
 */
export function deriveDocumentUrgency(expiryDate: Date | null): {
  urgency: "EXPIRED" | "EXPIRING_SOON";
  daysLeft: number;
} {
  if (!expiryDate) return { urgency: "EXPIRING_SOON", daysLeft: 0 };

  // Compare whole days: a document expiring later today is not yet expired, and
  // millisecond drift must not flip the label back and forth on refresh.
  const today = dayjs().startOf("day");
  const daysLeft = dayjs(expiryDate).startOf("day").diff(today, "day");

  return {
    urgency: daysLeft < 0 ? "EXPIRED" : "EXPIRING_SOON",
    daysLeft,
  };
}

/**
 * tr-açık olan sorunları ve süresi yaklaşan/dolan belgeleri eyleme dönüştürülebilir uyarılar olarak birleştirir
 * en-combines open issues and approaching/expired documents into actionable alerts
 * input (openIssues: AlertIssue[], expiringDocs: AlertDocument[])
 * output (ActionRequiredItems[])
 */
export function buildAlerts(
  openIssues: AlertIssue[],
  expiringDocs: AlertDocument[]
): ActionRequiredItems[] {
  const issueAlerts: ActionRequiredItems[] = openIssues.map((issue) => ({
    type: (issue.type === IssueType.VEHICLE
      ? "vehicle"
      : issue.type === IssueType.DRIVER
      ? "driver"
      : issue.type === IssueType.SHIPMENT
      ? "SHIPMENT_DELAY"
      : "vehicle") as ActionRequiredItems["type"],
    title: issue.title,
    messageKey: "ISSUE_ALERT",
    messageParams: { priority: issue.priority, status: issue.status },
    link: issue.type === IssueType.VEHICLE && issue.vehicleId
      ? `/vehicle?id=${issue.vehicleId}&tab=2`
      : issue.type === IssueType.DRIVER && issue.driverId
      ? `/drivers?id=${issue.driverId}`
      : issue.type === IssueType.SHIPMENT && issue.shipmentId
      ? `/shipments?id=${issue.shipmentId}`
      : undefined,
  }));

  const docAlerts: ActionRequiredItems[] = expiringDocs.map((doc) => {
    const { urgency, daysLeft } = deriveDocumentUrgency(doc.expiryDate);

    // Who the document belongs to. Without this the alert reads "the
    // inspection certificate expired" with no way to tell which vehicle.
    const owner = doc.vehicle?.plate
      ? doc.vehicle.plate
      : doc.driver
        ? `${doc.driver.user.name} ${doc.driver.user.surname}`.trim()
        : null;

    return {
      type: "DOCUMENT_DUE" as const,
      title: doc.name,
      // The renderer picks the phrasing; it also needs the raw parts to build
      // "the inspection certificate of vehicle 34ABC123 has expired".
      messageKey:
        urgency === "EXPIRED" ? "DOC_EXPIRED_DETAIL" : "DOC_EXPIRING_DETAIL",
      messageParams: {
        ...(doc.expiryDate ? { date: doc.expiryDate.toISOString() } : {}),
        ...(owner ? { owner } : {}),
        docType: doc.type,
        ownerKind: doc.vehicle?.plate ? "vehicle" : doc.driver ? "driver" : "none",
        daysLeft,
      },
      urgency,
      link: doc.driverId
        ? `/drivers?id=${doc.driverId}`
        : doc.vehicleId
          ? `/vehicle?id=${doc.vehicleId}&tab=1`
          : undefined,
    };
  });

  // Expired documents outrank open issues: they are a live compliance breach,
  // not something merely scheduled.
  const expiredFirst = docAlerts.filter((a) => a.urgency === "EXPIRED");
  const expiringNext = docAlerts.filter((a) => a.urgency !== "EXPIRED");

  return [...expiredFirst, ...issueAlerts, ...expiringNext];
}

/**
 * tr-yakıt kayıtlarını gruplayarak her aracın yakıt tüketimi ve maliyet istatistiklerini hesaplar
 * en-groups fuel logs to calculate fuel consumption and cost statistics for each vehicle
 * input (fuelLogsRaw: FuelLog[], vehicleMap: Map<string, string>, rates: Record<string, number>)
 * output (FuelStat[])
 */
export function buildFuelStats(
  fuelLogsRaw: FuelLog[],
  vehicleMap: Map<string, string>,
  rates: Record<string, number>
): FuelStat[] {
  const fuelStatsMap = new Map<string, { volume: number; costUsd: number }>();

  fuelLogsRaw.forEach((log) => {
    const current = fuelStatsMap.get(log.vehicleId) || { volume: 0, costUsd: 0 };
    const rate = rates[log.currency || "USD"] || 1;
    const costUsd = Number(log.cost) / rate;

    fuelStatsMap.set(log.vehicleId, {
      volume: current.volume + log.volumeLiter,
      costUsd: current.costUsd + costUsd,
    });
  });

  return Array.from(fuelStatsMap.entries())
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 8)
    .map(([id, data]) => ({
      id,
      plate: vehicleMap.get(id) ?? id,
      value: Math.round(data.volume * 10) / 10,
      totalCost: Math.round(data.costUsd),
    }));
}

interface WarehouseCapacityInput {
  id: string;
  name: string;
  capacityPallets: number | null;
  capacityVolumeM3: number | null;
}

/**
 * tr-depoların hacim ve palet bazında kapasite kullanım oranlarını hesaplar
 * en-calculates warehouse capacity utilization rates based on volume and pallets
 *
 *    Takes raw inventory rows rather than a groupBy _sum: pallet occupancy is
 *    quantity ÷ units-per-pallet per row (see palletOccupancy), which SQL can't
 *    aggregate for us.
 * input (warehousesRaw: WarehouseCapacityInput[], inventoryRows: WarehouseScopedInventoryRow[])
 * output (WarehouseCapacityStat[])
 */
export function buildWarehouseCapacity(
  warehousesRaw: WarehouseCapacityInput[],
  inventoryRows: WarehouseScopedInventoryRow[]
): WarehouseCapacityStat[] {
  const palletMap = palletUsageByWarehouse(inventoryRows);

  return warehousesRaw.map((w) => {
    const used = palletMap.get(w.id) ?? { pallets: 0, volume: 0 };
    const palletCapacity = w.capacityPallets || 5000;
    const volumeCapacity = w.capacityVolumeM3 || 100000;
    const palletUsed = Math.round(used.pallets);
    const volumeUsed = Math.round(used.volume);
    return {
      warehouseName: w.name,
      warehouseId: w.id,
      capacity: Math.min(Math.round((palletUsed / palletCapacity) * 100), 100),
      volume: Math.min(Math.round((volumeUsed / volumeCapacity) * 100), 100),
      palletUsed,
      palletCapacity,
      volumeUsed,
      volumeCapacity,
    };
  });
}

/**
 * tr-son 180 gün için günlük sevkiyat hacmini hesaplar ve gün bazında listeler
 * en-calculates the daily shipment volume for the last 180 days and lists them by day
 * input (shipmentVolumeRaw: { createdAt: Date }[], tz: string)
 * output (ShipmentDayStat[])
 */
export function buildShipmentVolume(
  shipmentVolumeRaw: { createdAt: Date }[],
  tz: string
): ShipmentDayStat[] {
  // O(n) single pass instead of O(n×180): build a "YYYY-MM-DD" → count map first.
  const shipmentCountByDay = new Map<string, number>();
  for (const s of shipmentVolumeRaw) {
    const d = new Date(s.createdAt);
    const localDate = dayjs.utc(d).tz(tz).format("YYYY-MM-DD");
    shipmentCountByDay.set(localDate, (shipmentCountByDay.get(localDate) ?? 0) + 1);
  }

  const shipmentVolume: ShipmentDayStat[] = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayjsDate = dayjs.utc(d).tz(tz);
    const label = dayjsDate.format("MMM DD");
    const key = dayjsDate.format("YYYY-MM-DD");
    shipmentVolume.push({ date: label, count: shipmentCountByDay.get(key) ?? 0 });
  }
  return shipmentVolume;
}

interface MapWarehouse { id: string; name: string; lat: number | null; lng: number | null }
interface MapVehicle { id: string; plate: string; currentLat: number | null; currentLng: number | null }
interface MapCustomer {
  id: string;
  name: string;
  locations: { lat: number | null; lng: number | null; isDefault: boolean }[];
}

/**
 * tr-harita üzerinde gösterilecek depo, araç ve müşteri konumlarını birleştirilmiş formatta döndürür
 * en-returns warehouse, vehicle, and customer locations in a combined format to be displayed on the map
 * input (mapDataRaw: [MapWarehouse[], MapVehicle[], MapCustomer[]])
 * output (MapData[])
 */
export function buildMapData(
  mapDataRaw: [MapWarehouse[], MapVehicle[], MapCustomer[]]
): MapData[] {
  const [mapWarehouses, mapVehicles, mapCustomers] = mapDataRaw;

  const warehouseMarkers = mapWarehouses
    .filter((w) => w.lat != null && w.lng != null)
    .map((w) => ({
      position: { lat: w.lat as number, lng: w.lng as number },
      name: w.name,
      id: w.id,
      type: "W" as const,
    }));

  const vehicleMarkers = mapVehicles
    .filter((v) => v.currentLat != null && v.currentLng != null)
    .map((v) => ({
      position: { lat: v.currentLat as number, lng: v.currentLng as number },
      name: v.plate,
      id: v.id,
      type: "V" as const,
    }));

  const customerMarkers = mapCustomers.flatMap((c) => {
    const defaultLoc = c.locations.find((l) => l.isDefault) || c.locations[0];
    if (!defaultLoc || defaultLoc.lat == null || defaultLoc.lng == null) return [];
    return [{
      position: { lat: defaultLoc.lat as number, lng: defaultLoc.lng as number },
      name: c.name,
      id: c.id,
      type: "C" as const,
    }];
  });

  return [...warehouseMarkers, ...vehicleMarkers, ...customerMarkers];
}
