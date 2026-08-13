import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// Prisma mock covering only what transfer.ts touches.
const dbMock = {
  shipment: {
    findMany: mock.fn(),
    updateMany: mock.fn(),
    aggregate: mock.fn(),
    groupBy: mock.fn(),
  },
  shipmentHistory: {
    createMany: mock.fn(),
  },
  trailer: {
    findFirst: mock.fn(),
    findMany: mock.fn(),
  },
  vehicle: {
    findFirst: mock.fn(),
  },
  $transaction: mock.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(dbMock)),
};

mock.module("../../db.ts", { namedExports: { db: dbMock } });
mock.module("../../auth-middleware.ts", {
  namedExports: { authenticatedAction: mock.fn((cb: unknown) => cb) },
});
mock.module("../utils/checkPermission.ts", {
  namedExports: { checkPermission: mock.fn() },
});
mock.module("./cache.ts", {
  namedExports: { invalidateShipmentCache: mock.fn(async () => {}) },
});
mock.module("@/app/lib/actions/notifications.ts", {
  namedExports: { sendNotificationAction: mock.fn(async () => {}) },
});

const user = { id: "user-1", companyId: "company-1" };

describe("Shipments Transfer Controller", () => {
  let controller: {
    getVehicleLinkedShipments: (u: unknown, v: string) => Promise<unknown>;
    getEligibleTargetTrailers: (u: unknown, x?: string) => Promise<unknown>;
    bulkReassignTrailer: (
      u: unknown,
      ids: string[],
      t: string
    ) => Promise<{ success: boolean; reassigned: number }>;
  };

  before(async () => {
    controller = (await import("./transfer")) as typeof controller;
  });

  beforeEach(() => {
    Object.values(dbMock).forEach((m) => {
      if (typeof m === "object")
        Object.values(m).forEach(
          (fn) => typeof fn?.mock?.resetCalls === "function" && fn.mock.resetCalls()
        );
    });
    dbMock.$transaction.mock.resetCalls();
  });

  describe("getVehicleLinkedShipments()", () => {
    it("boş liste döner (araçta dorse yoksa)", async () => {
      dbMock.vehicle.findFirst.mock.mockImplementationOnce(async () => ({
        companyId: "company-1",
        currentTrailer: null,
      }));
      const res = (await controller.getVehicleLinkedShipments(user, "v1")) as {
        trailerId: string | null;
        shipments: unknown[];
      };
      expect(res.trailerId).toBeNull();
      expect(res.shipments).toEqual([]);
    });

    it("başka şirketin aracını reddeder", async () => {
      dbMock.vehicle.findFirst.mock.mockImplementationOnce(async () => ({
        companyId: "other",
        currentTrailer: { id: "t1" },
      }));
      await rejects(controller.getVehicleLinkedShipments(user, "v1"));
    });
  });

  describe("bulkReassignTrailer()", () => {
    const availableTarget = {
      id: "t-target",
      companyId: "company-1",
      status: "AVAILABLE",
      maxLoadKg: 1000,
      capacityVolumeM3: 50,
      currentVehicle: { status: "AVAILABLE" },
    };

    it("hedef dorse müsait değilse reddeder", async () => {
      dbMock.trailer.findFirst.mock.mockImplementationOnce(async () => ({
        ...availableTarget,
        status: "MAINTENANCE",
      }));
      await rejects(
        controller.bulkReassignTrailer(user, ["s1"], "t-target"),
        /not available/
      );
    });

    it("hedef dorsenin aracı arızalıysa reddeder", async () => {
      dbMock.trailer.findFirst.mock.mockImplementationOnce(async () => ({
        ...availableTarget,
        currentVehicle: { status: "OUT_OF_ORDER" },
      }));
      await rejects(
        controller.bulkReassignTrailer(user, ["s1"], "t-target"),
        /out of service/
      );
    });

    it("kapasite aşımında reddeder", async () => {
      dbMock.trailer.findFirst.mock.mockImplementationOnce(async () => availableTarget);
      dbMock.shipment.findMany.mock.mockImplementationOnce(async () => [
        { id: "s1", weightKg: 900, volumeM3: 10, trailerId: "src" },
        { id: "s2", weightKg: 900, volumeM3: 10, trailerId: "src" },
      ]);
      dbMock.shipment.aggregate.mock.mockImplementationOnce(async () => ({
        _sum: { weightKg: 0, volumeM3: 0 },
      }));
      await rejects(
        controller.bulkReassignTrailer(user, ["s1", "s2"], "t-target"),
        /capacity exceeded/
      );
    });

    it("geçerli durumda hepsini aktarır ve history yazar", async () => {
      dbMock.trailer.findFirst.mock.mockImplementationOnce(async () => availableTarget);
      dbMock.shipment.findMany.mock.mockImplementationOnce(async () => [
        { id: "s1", weightKg: 100, volumeM3: 2, trailerId: "src" },
        { id: "s2", weightKg: 100, volumeM3: 2, trailerId: "src" },
      ]);
      dbMock.shipment.aggregate.mock.mockImplementationOnce(async () => ({
        _sum: { weightKg: 0, volumeM3: 0 },
      }));
      dbMock.shipment.updateMany.mock.mockImplementationOnce(async () => ({ count: 2 }));
      dbMock.shipmentHistory.createMany.mock.mockImplementationOnce(async () => ({ count: 2 }));

      const res = await controller.bulkReassignTrailer(user, ["s1", "s2"], "t-target");
      expect(res).toEqual({ success: true, reassigned: 2, movedFrom: 2 });

      const updateArg = dbMock.shipment.updateMany.mock.calls[0]!.arguments[0] as {
        data: { trailerId: string };
      };
      expect(updateArg.data.trailerId).toBe("t-target");
      expect(dbMock.shipmentHistory.createMany.mock.calls.length).toBe(1);
    });

    it("boş seçim reddeder", async () => {
      await rejects(
        controller.bulkReassignTrailer(user, [], "t-target"),
        /No shipments selected/
      );
    });
  });
});
