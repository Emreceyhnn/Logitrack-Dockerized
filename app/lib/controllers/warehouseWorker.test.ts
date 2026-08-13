import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { WarehouseTaskStatus } from "@prisma/client";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

type MockedTx = {
  inventoryMovement: { create: ReturnType<typeof mock.fn> };
  inventory: { update: ReturnType<typeof mock.fn> };
};

const txMock: MockedTx = {
  inventoryMovement: { create: mock.fn() },
  inventory: { update: mock.fn() },
};

const dbMock = {
  warehouse: {
    findFirst: mock.fn(),
    findMany: mock.fn(async () => []),
  },
  user: {
    findFirst: mock.fn(async () => ({ assignedWarehouseId: null })),
  },
  inventory: {
    findFirst: mock.fn(),
  },
  inventoryMovement: {
    create: mock.fn(),
  },
  warehouseTask: {
    findFirst: mock.fn(),
    update: mock.fn(),
  },
  issue: {
    create: mock.fn(),
  },
  $transaction: mock.fn(async (cb: (tx: MockedTx) => Promise<unknown>) =>
    cb(txMock)
  ),
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb: unknown) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

const nextCacheMock = {
  revalidatePath: mock.fn(),
};

// The restock notifier is exercised on its own (see notifyRestock.test.ts); here
// it is stubbed so the mutation tests don't reach Firebase.
const notifyRestockMock = {
  notifyManagerOfRestockRequest: mock.fn(async () => {}),
};

mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("./utils/checkPermission.ts", { namedExports: checkPermissionMock });
mock.module("next/cache", { namedExports: nextCacheMock });
mock.module("./warehouseWorker/notifyRestock.ts", {
  namedExports: notifyRestockMock,
});

const user = { id: "user-1", companyId: "company-1", name: "Ayşe", surname: "Yılmaz" };

// 2. TEST GRUPLARI
describe("WarehouseWorker Controller", () => {
   
  let controller: unknown;

  before(async () => {
    controller = await import("./warehouseWorker");
  });

  beforeEach(() => {
    dbMock.warehouse.findFirst.mock.resetCalls();
    dbMock.warehouse.findMany.mock.resetCalls();
    dbMock.user.findFirst.mock.resetCalls();
    dbMock.inventory.findFirst.mock.resetCalls();
    dbMock.inventoryMovement.create.mock.resetCalls();
    dbMock.warehouseTask.findFirst.mock.resetCalls();
    dbMock.warehouseTask.update.mock.resetCalls();
    dbMock.issue.create.mock.resetCalls();
    txMock.inventoryMovement.create.mock.resetCalls();
    txMock.inventory.update.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
    nextCacheMock.revalidatePath.mock.resetCalls();
    notifyRestockMock.notifyManagerOfRestockRequest.mock.resetCalls();
  });

  describe("logWarehouseMovement()", () => {
    it("pozitif olmayan miktarı reddeder", async () => {
      await rejects(
        controller.logWarehouseMovement(user, "wh-1", "SKU-1", 0, "PICK"),
        /Quantity must be positive/
      );
    });

    it("şirkete ait olmayan depoyu reddeder", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => null);
      await rejects(
        controller.logWarehouseMovement(user, "wh-x", "SKU-1", 5, "PICK"),
        /Invalid warehouse or unauthorized/
      );
    });

    it("PICK hareketini negatif miktarla yazar ve envanteri düşer", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => ({
        id: "inv-1",
        name: "Widget",
        quantity: 10,
        allocatedQuantity: 4,
      }));
      txMock.inventoryMovement.create.mock.mockImplementationOnce(
        async () => ({ id: "mv-1" })
      );

      const res = await controller.logWarehouseMovement(
        user,
        "wh-1",
        "SKU-1",
        5,
        "PICK"
      );

      expect(res).toEqual({ success: true, movementId: "mv-1" });
      const createArg =
        txMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.quantity).toBe(-5);
      expect(createArg.data.type).toBe("PICK");
      // Envanter düşümü: min(quantity, mevcut) mantığı
      const updateArg = txMock.inventory.update.mock.calls[0].arguments[0];
      expect(updateArg.data.quantity.decrement).toBe(5);
      expect(updateArg.data.allocatedQuantity.decrement).toBe(4);
    });

    it("PACK hareketini pozitif miktarla yazar ve envantere dokunmaz", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(
        async () => null
      );
      txMock.inventoryMovement.create.mock.mockImplementationOnce(
        async () => ({ id: "mv-2" })
      );

      const res = await controller.logWarehouseMovement(
        user,
        "wh-1",
        "SKU-2",
        3,
        "PACK"
      );

      expect(res.movementId).toBe("mv-2");
      const createArg =
        txMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.quantity).toBe(3);
      expect(txMock.inventory.update.mock.calls.length).toBe(0);
    });
  });

  describe("adjustWarehouseStock()", () => {
    it("negatif sayımı reddeder", async () => {
      await rejects(
        controller.adjustWarehouseStock(user, "wh-1", "SKU-1", -1, "sebep"),
        /Counted quantity must be zero or positive/
      );
    });

    it("sebep zorunludur", async () => {
      await rejects(
        controller.adjustWarehouseStock(user, "wh-1", "SKU-1", 5, "   "),
        /Adjustment reason is required/
      );
    });

    it("envanter kaydı yoksa reddeder", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => null);
      await rejects(
        controller.adjustWarehouseStock(user, "wh-1", "SKU-1", 5, "sebep"),
        /No inventory record for this SKU to adjust/
      );
    });

    it("eksik sayımda negatif delta yazar ve on-hand'i sayılana çeker", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => ({
        id: "inv-1",
        quantity: 10,
      }));
      txMock.inventoryMovement.create.mock.mockImplementationOnce(async () => ({
        id: "mv-adj",
      }));

      const res = await controller.adjustWarehouseStock(
        user,
        "wh-1",
        "SKU-1",
        8,
        "raf sayımı"
      );

      expect(res).toEqual({
        success: true,
        movementId: "mv-adj",
        delta: -2,
        counted: 8,
      });
      const createArg =
        txMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.quantity).toBe(-2);
      expect(createArg.data.type).toBe("ADJUSTMENT");
      const updateArg = txMock.inventory.update.mock.calls[0].arguments[0];
      expect(updateArg.data.quantity).toBe(8);
    });

    it("fazla sayımda pozitif delta yazar", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => ({
        id: "inv-1",
        quantity: 4,
      }));
      txMock.inventoryMovement.create.mock.mockImplementationOnce(async () => ({
        id: "mv-adj2",
      }));

      const res = await controller.adjustWarehouseStock(
        user,
        "wh-1",
        "SKU-1",
        7,
        "fazla bulundu"
      );

      expect(res.delta).toBe(3);
      const createArg =
        txMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.quantity).toBe(3);
    });

    it("fark yoksa hareket yazmaz (no-op)", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => ({
        id: "inv-1",
        quantity: 6,
      }));

      const res = await controller.adjustWarehouseStock(
        user,
        "wh-1",
        "SKU-1",
        6,
        "kontrol"
      );

      expect(res).toEqual({
        success: true,
        movementId: null,
        delta: 0,
        counted: 6,
      });
      expect(txMock.inventoryMovement.create.mock.calls.length).toBe(0);
      expect(txMock.inventory.update.mock.calls.length).toBe(0);
    });
  });

  describe("advanceWarehouseTask()", () => {
    it("başka şirketin görevini reddeder", async () => {
      // Tenant-scoped findFirst({ where: { id, companyId } }) never returns a
      // row belonging to another company, so the mock reflects that as null.
      dbMock.warehouseTask.findFirst.mock.mockImplementationOnce(
        async () => null
      );
      await rejects(
        controller.advanceWarehouseTask(user, "t-1"),
        /Task not found or unauthorized/
      );
    });

    it("tamamlanmış görevi tekrar ilerletmez", async () => {
      dbMock.warehouseTask.findFirst.mock.mockImplementationOnce(
        async () => ({
          id: "t-1",
          companyId: "company-1",
          status: WarehouseTaskStatus.COMPLETED,
          doneUnits: 10,
          totalUnits: 10,
        })
      );

      const res = await controller.advanceWarehouseTask(user, "t-1");
      expect(res).toEqual({ success: true, done: 10, complete: true });
      expect(dbMock.warehouseTask.update.mock.calls.length).toBe(0);
    });

    it("görevi ilerletir ve hedefe ulaşınca COMPLETED yapar", async () => {
      dbMock.warehouseTask.findFirst.mock.mockImplementationOnce(
        async () => ({
          id: "t-1",
          companyId: "company-1",
          warehouseId: "wh-1",
          status: WarehouseTaskStatus.IN_PROGRESS,
          doneUnits: 8,
          totalUnits: 10,
        })
      );
      // The task's warehouse is re-checked before any write.
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
      }));

      const res = await controller.advanceWarehouseTask(user, "t-1", 5);
      expect(res).toEqual({ success: true, done: 10, complete: true });
      const updateArg = dbMock.warehouseTask.update.mock.calls[0].arguments[0];
      expect(updateArg.data.status).toBe("COMPLETED");
      expect(updateArg.data.doneUnits).toBe(10);
    });
  });

  describe("requestRestock()", () => {
    it("geçersiz depoda hata fırlatır", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => null);
      await rejects(
        controller.requestRestock(user, "wh-x", "A1"),
        /Invalid warehouse or unauthorized/
      );
    });

    it("RESTOCK_REQUEST hareketi oluşturur", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));

      const res = await controller.requestRestock(user, "wh-1", "A1");
      expect(res).toEqual({ success: true });
      const createArg =
        dbMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.type).toBe("RESTOCK_REQUEST");
      // Zone-wide requests (no sku given) carry no item — sku is empty rather
      // than a synthetic "ZONE-*" placeholder that could collide with a real SKU.
      expect(createArg.data.sku).toBe("");
      expect(createArg.data.zone).toBe("A1");
    });

    it("SKU + miktar verilince ürün bazlı talep yazar", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));

      const res = await controller.requestRestock(user, "wh-1", "A1", "SKU-9", 12);
      expect(res).toEqual({ success: true });
      const createArg =
        dbMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.sku).toBe("SKU-9");
      expect(createArg.data.quantity).toBe(12);
      expect(createArg.data.notes).toMatch(/SKU-9 × 12/);
    });

    it("SKU verilse de geçersiz miktarı 0'a indirir", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));

      await controller.requestRestock(user, "wh-1", "A1", "SKU-9", 0);
      const createArg =
        dbMock.inventoryMovement.create.mock.calls[0].arguments[0];
      expect(createArg.data.sku).toBe("SKU-9");
      expect(createArg.data.quantity).toBe(0);
    });

    // A request nobody is told about is just a ledger row, so the manager
    // notification is part of the contract, not a side effect.
    it("depo yöneticisine bildirim gönderir", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));

      await controller.requestRestock(user, "wh-1", "A1", "SKU-9", 12);

      const calls = notifyRestockMock.notifyManagerOfRestockRequest.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0].arguments[0]).toEqual({
        warehouseId: "wh-1",
        companyId: "company-1",
        zone: "A1",
        sku: "SKU-9",
        quantity: 12,
        requestedByName: "Ayşe Yılmaz",
      });
    });

    // The notifier swallows its own failures (see notifyRestock.ts), so the
    // movement is written and the worker still gets a success — the request
    // must never appear to have failed because a notification bounced.
    it("bildirim sessizce başarısız olsa da talep başarılı döner", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));

      const res = await controller.requestRestock(user, "wh-1", "A1", "SKU-9", 12);
      expect(res).toEqual({ success: true });
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(1);
    });
  });

  describe("reportWarehouseIssue()", () => {
    it("saha sorununu OPEN statüsüyle kaydeder", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.issue.create.mock.mockImplementationOnce(async () => ({
        id: "issue-1",
      }));

      const res = await controller.reportWarehouseIssue(
        user,
        "wh-1",
        "  Forklift arızalı  "
      );
      expect(res).toEqual({ success: true, issueId: "issue-1" });
      const createArg = dbMock.issue.create.mock.calls[0].arguments[0];
      expect(createArg.data.title).toBe("Forklift arızalı");
      expect(createArg.data.status).toBe("OPEN");
    });

    it("bildirimi depoya ve bölgeye bağlar", async () => {
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
        companyId: "company-1",
      }));
      dbMock.issue.create.mock.mockImplementationOnce(async () => ({
        id: "issue-2",
      }));

      await controller.reportWarehouseIssue(
        user,
        "wh-1",
        "Zemin hasarlı",
        undefined,
        " A "
      );
      const createArg = dbMock.issue.create.mock.calls[0].arguments[0];
      // Previously the warehouse was verified but never written, leaving floor
      // reports unfilterable by site.
      expect(createArg.data.warehouseId).toBe("wh-1");
      expect(createArg.data.zone).toBe("A");
    });
  });

  describe("depo kapsamı (kilitli operatör)", () => {
    const lockedUser = {
      id: "user-2",
      companyId: "company-1",
      roleName: "Warehouse Operator",
    };

    it("atanmamış bir depoya hareket yazmayı reddeder", async () => {
      // Attached to wh-1 only; wh-9 belongs to another site.
      dbMock.user.findFirst.mock.mockImplementationOnce(async () => ({
        assignedWarehouseId: "wh-1",
      }));
      dbMock.warehouse.findMany.mock.mockImplementationOnce(async () => []);

      await rejects(
        controller.logWarehouseMovement(lockedUser, "wh-9", "SKU-1", 5, "PICK"),
        /Invalid warehouse or unauthorized/
      );
      // Rejected before touching inventory.
      expect(dbMock.inventory.findFirst.mock.calls.length).toBe(0);
    });

    it("atanmış deposuna hareket yazmasına izin verir", async () => {
      dbMock.user.findFirst.mock.mockImplementationOnce(async () => ({
        assignedWarehouseId: "wh-1",
      }));
      dbMock.warehouse.findMany.mock.mockImplementationOnce(async () => []);
      dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
        id: "wh-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementationOnce(async () => ({
        id: "inv-1",
        name: "Widget",
        quantity: 10,
        allocatedQuantity: 0,
      }));
      txMock.inventoryMovement.create.mock.mockImplementationOnce(async () => ({
        id: "mv-1",
      }));

      const res = await controller.logWarehouseMovement(
        lockedUser,
        "wh-1",
        "SKU-1",
        5,
        "PICK"
      );
      expect(res).toEqual({ success: true, movementId: "mv-1" });
    });
  });
});
