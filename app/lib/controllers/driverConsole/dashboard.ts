"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { evaluateDeviation } from "../../services/routeDeviation";
import { isValidLatLon, type LatLon } from "../../utils/geo";

import type { DriverConsoleDashboard, DCShipmentSummary } from "../../type/driverConsole";
import { DC_ROLES, getDriverForUser, computeDocumentStatus, startOfToday, endOfToday } from "./shared";

/**
 * tr-sürücü konsolu için genel durum, rota, sevkiyat ve kpi verilerini getirir
 * en-retrieves overall status, route, shipment, and kpi data for the driver console
 * input (user: AuthenticatedUser)
 * output (Promise<DriverConsoleDashboard>)
 */
export const getDriverConsoleDashboard = authenticatedAction(
  async (user): Promise<DriverConsoleDashboard> => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    await checkPermission(user, companyId, DC_ROLES);
    if (!companyId) throw new Error("User has no company");

    const driverRow = await getDriverForUser(userId, companyId);

    // Not a driver (e.g. an admin browsing the console) → empty-but-valid payload.
    if (!driverRow) {
      return {
        driver: null,
        vehicle: null,
        activeRoute: null,
        kpis: { safetyScore: null, efficiencyScore: null, rating: null },
        shipments: [],
        fuelLogs: [],
        issues: [],
        documents: [],
      };
    }

    const [activeRouteRaw, plannedRouteRaw, shipmentsRaw, fuelLogsRaw, issuesRaw, documentsRaw] =
      await Promise.all([
        db.route.findFirst({
          where: {
            driverId: driverRow.id,
            companyId,
            status: "ACTIVE",
            date: { gte: startOfToday(), lt: endOfToday() },
          },
          orderBy: { date: "desc" },
          include: { stops: { orderBy: { sequence: "asc" } } },
        }),
        db.route.findFirst({
          where: {
            driverId: driverRow.id,
            companyId,
            status: "PLANNED",
            date: { gte: startOfToday(), lt: endOfToday() },
          },
          orderBy: { date: "desc" },
          include: { stops: { orderBy: { sequence: "asc" } } },
        }),
        db.shipment.findMany({
          where: { driverId: driverRow.id, companyId },
          include: { stops: { orderBy: { sequence: "asc" } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.fuelLog.findMany({
          where: { driverId: driverRow.id, companyId },
          orderBy: { date: "desc" },
          take: 10,
        }),
        db.issue.findMany({
          where: { driverId: driverRow.id, companyId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.document.findMany({
          where: { driverId: driverRow.id, companyId },
          orderBy: { expiryDate: "asc" },
        }),
      ]);

    const routeRaw = activeRouteRaw ?? plannedRouteRaw;

    let deviation: DriverConsoleDashboard["activeRoute"] extends null
      ? never
      : NonNullable<DriverConsoleDashboard["activeRoute"]>["deviation"] = null;

    const vehiclePoint: LatLon = [
      driverRow.currentVehicle?.currentLat ?? NaN,
      driverRow.currentVehicle?.currentLng ?? NaN,
    ];

    if (
      routeRaw &&
      routeRaw.status === "ACTIVE" &&
      driverRow.currentVehicle &&
      isValidLatLon(vehiclePoint)
    ) {
      const outcome = await evaluateDeviation({
        routeId: routeRaw.id,
        vehicleId: driverRow.currentVehicle.id,
        shape: routeRaw.shape,
        bufferMeters: routeRaw.bufferMeters,
        point: vehiclePoint,
      });
      deviation = {
        status: outcome.status,
        distanceMeters: "distanceMeters" in outcome ? outcome.distanceMeters : null,
        bufferMeters: routeRaw.bufferMeters ?? 0,
      };
    }

    const now = new Date();
    const shipments: DCShipmentSummary[] = shipmentsRaw.map((s) => ({
      id: s.id,
      trackingId: s.trackingId,
      status: s.status,
      destination: s.destination,
      cargoType: s.cargoType,
      priority: s.priority,
      slaDeadline: s.slaDeadline ? s.slaDeadline.toISOString() : null,
      slaBreach: Boolean(
        s.slaDeadline &&
          s.slaDeadline < now &&
          s.status !== "DELIVERED" &&
          s.status !== "CANCELLED"
      ),
      stopsTotal: s.stops.length,
      stopsDone: s.stops.filter((st) => st.status === "DELIVERED" || st.status === "FAILED").length,
    }));

    return {
      driver: {
        id: driverRow.id,
        name: `${driverRow.user.name} ${driverRow.user.surname}`.trim(),
        initials:
          `${driverRow.user.name?.[0] ?? ""}${driverRow.user.surname?.[0] ?? ""}`.toLocaleUpperCase(
            "en-US"
          ) || "DR",
        employeeId: driverRow.employeeId,
        phone: driverRow.phone,
        status: driverRow.status,
        safetyScore: driverRow.safetyScore,
        efficiencyScore: driverRow.efficiencyScore,
        rating: driverRow.rating,
        hazmatCertified: driverRow.hazmatCertified,
        languages: driverRow.languages,
        licenseExpiry: driverRow.licenseExpiry ? driverRow.licenseExpiry.toISOString() : null,
        homeBaseWarehouse: driverRow.homeBaseWarehouse,
      },
      vehicle: driverRow.currentVehicle
        ? {
            id: driverRow.currentVehicle.id,
            plate: driverRow.currentVehicle.plate,
            brand: driverRow.currentVehicle.brand,
            model: driverRow.currentVehicle.model,
            fleetNo: driverRow.currentVehicle.fleetNo,
            fuelLevel: driverRow.currentVehicle.fuelLevel,
            fuelCapacity: driverRow.currentVehicle.fuelCapacity,
            odometerKm: driverRow.currentVehicle.odometerKm,
            currentLat: driverRow.currentVehicle.currentLat,
            currentLng: driverRow.currentVehicle.currentLng,
          }
        : null,
      activeRoute: routeRaw
        ? {
            id: routeRaw.id,
            status: routeRaw.status as "PLANNED" | "ACTIVE",
            date: routeRaw.date.toISOString(),
            startTime: routeRaw.startTime ? routeRaw.startTime.toISOString() : null,
            distanceKm: routeRaw.distanceKm,
            durationMin: routeRaw.durationMin,
            shape: routeRaw.shape,
            bufferMeters: routeRaw.bufferMeters,
            stops: routeRaw.stops.map((st) => ({
              id: st.id,
              sequence: st.sequence,
              address: st.address,
              lat: st.lat,
              lng: st.lng,
              arrivedAt: st.arrivedAt ? st.arrivedAt.toISOString() : null,
            })),
            deviation,
          }
        : null,
      kpis: {
        safetyScore: driverRow.safetyScore,
        efficiencyScore: driverRow.efficiencyScore,
        rating: driverRow.rating,
      },
      shipments,
      fuelLogs: fuelLogsRaw.map((f) => ({
        id: f.id,
        date: f.date.toISOString(),
        volumeLiter: f.volumeLiter,
        cost: Number(f.cost),
        currency: f.currency,
      })),
      issues: issuesRaw.map((i) => ({
        id: i.id,
        title: i.title,
        priority: i.priority,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      })),
      documents: documentsRaw.map((d) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        expiryDate: d.expiryDate ? d.expiryDate.toISOString() : null,
        status: computeDocumentStatus(d.expiryDate),
      })),
    };
  }
);
