/**
 * GET /api/vehicles/dashboard
 *
 * Client-side data endpoint for the vehicle dashboard.
 *
 * Why a Route Handler instead of a Server Action?
 * ────────────────────────────────────────────────
 * Next.js automatically triggers router.refresh() after every Server Action
 * completes (even read-only ones). When TanStack Query uses a Server Action
 * as its queryFn, this causes a full page re-render on every filter/search
 * change. Route Handlers do NOT have this side-effect — they behave like
 * plain HTTP endpoints and return data without touching the router.
 *
 * SSR prefetch in page.tsx still calls getVehiclesWithDashboard() directly
 * (server-to-server, no HTTP overhead), so we get the best of both worlds:
 *   • First paint: SSR data, no loading spinner
 *   • Filter changes: API route fetch, no page reload
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { parseQueryParams, searchParam, enumArrayParam, boolParam } from "@/app/lib/api/queryParams";
import { z } from "zod";
import { db } from "@/app/lib/db";
import {
  VehicleCapacityConverter,
  VehicleDocumentConverter,
  VehicleKpiConverter,
  VehicleServiceConverter,
} from "@/app/lib/controllers/utils/vehicleUtils";
import { calcTrend, daysAgo } from "@/app/lib/controllers/utils/trendUtils";
import {
  withCache,
  hashFilters,
  vehicleCacheKeys,
  VEHICLE_CACHE_TTL,
} from "@/app/lib/redis";
import {
  checkPermission,
} from "@/app/lib/controllers/utils/checkPermission";
import { Prisma, VehicleStatus, VehicleType } from "@prisma/client";
import type { VehicleDashboardProps, VehicleFilters, VehicleWithRelations } from "@/app/lib/type/vehicle";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { withLiveDocumentStatus } from "@/app/lib/utils/documentStatus";


const querySchema = z.object({
  search: searchParam,
  status: enumArrayParam(VehicleStatus),
  type: enumArrayParam(VehicleType),
  hasIssues: boolParam,
  hasDriver: boolParam,
});

export async function GET(req: NextRequest) {
  try {
    /* ── Auth ─────────────────────────────────────────────────────────── */
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, companyId } = user;
    if (!companyId) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    await checkPermission(userId, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    /* ── Parse filters from query params ─────────────────────────────── */
    const query = parseQueryParams(req, querySchema);
    if (!query.success) return query.response;
    
    // Zod infers the exact same types that VehicleFilters expects
    const filters: VehicleFilters = query.data;

    /* ── Cache key ────────────────────────────────────────────────────── */
    const cacheKey = vehicleCacheKeys.dashboard(
      companyId,
      hashFilters(filters as Record<string, unknown>)
    );

    const data = await withCache(cacheKey, VEHICLE_CACHE_TTL, async () => {
      /* ── Build where clause ─────────────────────────────────────────── */
      const whereClause: Prisma.VehicleWhereInput = { companyId };

      if (filters.search) {
        whereClause.OR = [
          { plate: { contains: filters.search, mode: "insensitive" } },
          { brand: { contains: filters.search, mode: "insensitive" } },
          { model: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      if (filters.status && filters.status.length > 0) {
        whereClause.status = { in: filters.status };
      }
      if (filters.type && filters.type.length > 0) {
        whereClause.type = { in: filters.type };
      }
      if (filters.hasIssues) {
        whereClause.issues = {
          some: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        };
      }
      if (filters.hasDriver === true) {
        whereClause.driver = { isNot: null };
      } else if (filters.hasDriver === false) {
        whereClause.driver = { is: null };
      }

      /* ── DB query ───────────────────────────────────────────────────── */
      const [vehicles, prevTotalVehicles] = await Promise.all([
        db.vehicle.findMany({
          where: whereClause,
          select: {
            id: true, fleetNo: true, plate: true, brand: true, model: true,
            year: true, type: true, fuelType: true, maxLoadKg: true,
            nextServiceKm: true, avgFuelConsumption: true, status: true,
            odometerKm: true, fuelLevel: true, fuelCapacity: true, currentLat: true,
            currentLng: true, photo: true, createdAt: true, updatedAt: true,
            engineSize: true, transmission: true, techNotes: true,
            driver: {
              select: {
                id: true, rating: true,
                user: { select: { name: true, surname: true, avatarUrl: true } },
              },
            },
            issues: {
              select: {
                id: true, title: true, type: true, priority: true,
                status: true, description: true, vehicleId: true,
                companyId: true, createdAt: true, updatedAt: true,
              },
            },
            documents: {
              select: {
                id: true, type: true, name: true, url: true,
                expiryDate: true, status: true, vehicleId: true,
                companyId: true, createdAt: true, updatedAt: true,
              },
            },
            maintenanceRecords: {
              select: {
                id: true, type: true, date: true, cost: true, currency: true,
                status: true, description: true, vehicleId: true,
                createdAt: true, updatedAt: true,
              },
            },
            routes: {
              select: {
                id: true, status: true, date: true, stops: true,
                createdAt: true, updatedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.vehicle.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } })
      ]);

      const vehiclesWithRelations: VehicleWithRelations[] = vehicles.map(
        (vehicle) => ({
          ...vehicle,
          // tr-Saklı belge durumu bayat; tarihten türetilenle değiştir (bkz. documentStatus.ts)
          // en-Stored document status is stale; swap in the date-derived one
          documents: withLiveDocumentStatus(vehicle.documents),
          maintenanceRecords: vehicle.maintenanceRecords.map((record) => ({
            ...record,
            cost: Number(record.cost),
          })),
          routes: vehicle.routes.map((route) => ({
            ...route,
            stops: route.stops.map((stop) => ({
              address: stop.address,
              lat: stop.lat ?? undefined,
              lng: stop.lng ?? undefined,
            })),
          })),
        })
      );
      const dashboardInput: VehicleDashboardProps[] = vehicles;

      return {
        vehicles: vehiclesWithRelations,
        vehiclesKpis: VehicleKpiConverter(dashboardInput),
        vehiclesCapacity: VehicleCapacityConverter(dashboardInput),
        expiringDocs: VehicleDocumentConverter(dashboardInput),
        plannedServices: VehicleServiceConverter(dashboardInput),
        kpiTrends: {
          totalVehicles: calcTrend(vehicles.length, prevTotalVehicles),
        },
      };
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleApiError("/api/vehicles/dashboard", error);
  }
}
