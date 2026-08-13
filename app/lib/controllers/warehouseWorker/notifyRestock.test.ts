import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

const dbMock = {
  warehouse: {
    findFirst: mock.fn(),
  },
};

const notificationsMock = {
  sendNotificationAction: mock.fn(async () => ({ success: true })),
};

const loggerMock = {
  logger: { info: mock.fn(), warn: mock.fn(), error: mock.fn() },
};

mock.module("../../db.ts", { namedExports: { db: dbMock } });
mock.module("../../actions/notifications.ts", {
  namedExports: notificationsMock,
});
mock.module("../../logger.ts", { namedExports: loggerMock });

const base = {
  warehouseId: "wh-1",
  companyId: "company-1",
  zone: "A1",
};

// 2. TEST GRUPLARI
describe("notifyManagerOfRestockRequest()", () => {
  let notifier: unknown;

  before(async () => {
    notifier = await import("./notifyRestock");
  });

  beforeEach(() => {
    dbMock.warehouse.findFirst.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
    loggerMock.logger.info.mock.resetCalls();
    loggerMock.logger.warn.mock.resetCalls();
  });

  it("yöneticisi olmayan depoda bildirim göndermez", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
      id: "wh-1",
      name: "Ana Depo",
      code: "AD",
      managerId: null,
    }));

    await notifier.notifyManagerOfRestockRequest(base);

    expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(0);
    expect(loggerMock.logger.info.mock.calls.length).toBe(1);
  });

  it("şirkete ait olmayan depoda bildirim göndermez", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => null);

    await notifier.notifyManagerOfRestockRequest(base);

    expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(0);
  });

  it("ürün bazlı talepte SKU ve adedi yöneticiye bildirir", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
      id: "wh-1",
      name: "Ana Depo",
      code: "AD",
      managerId: "mgr-1",
    }));

    await notifier.notifyManagerOfRestockRequest({
      ...base,
      sku: "SKU-9",
      quantity: 12,
      requestedByName: "Ayşe Yılmaz",
    });

    const call = notificationsMock.sendNotificationAction.mock.calls[0];
    // Tenant boundary travels with the target, not just the user id.
    expect(call.arguments[0]).toEqual({
      userId: "mgr-1",
      companyId: "company-1",
    });
    expect(call.arguments[1].title).toBe("Besleme Talebi — SKU-9 × 12");
    expect(call.arguments[1].message).toMatch(/Ayşe Yılmaz/);
    expect(call.arguments[1].message).toMatch(/Ana Depo/);
    expect(call.arguments[1].type).toBe("WARNING");
    // Category-less on purpose: an operational event must not be silenced by
    // shipment/maintenance preferences.
    expect(call.arguments[1].category).toBe(undefined);
  });

  it("ürünsüz talepte bölge başlığı kullanılır", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
      id: "wh-1",
      name: "Ana Depo",
      code: "AD",
      managerId: "mgr-1",
    }));

    await notifier.notifyManagerOfRestockRequest(base);

    const call = notificationsMock.sendNotificationAction.mock.calls[0];
    expect(call.arguments[1].title).toBe("Besleme Talebi — Bölge A1");
  });

  it("isim verilmezse genel bir ifade kullanır", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
      id: "wh-1",
      name: "Ana Depo",
      code: "AD",
      managerId: "mgr-1",
    }));

    await notifier.notifyManagerOfRestockRequest({
      ...base,
      requestedByName: "   ",
    });

    const call = notificationsMock.sendNotificationAction.mock.calls[0];
    expect(call.arguments[1].message).toMatch(/Bir depo çalışanı/);
  });

  // The RESTOCK_REQUEST movement is already committed by the time this runs, so
  // a failure here must be logged, never rethrown into the caller.
  it("bildirim hatasını yutar ve fırlatmaz", async () => {
    dbMock.warehouse.findFirst.mock.mockImplementationOnce(async () => ({
      id: "wh-1",
      name: "Ana Depo",
      code: "AD",
      managerId: "mgr-1",
    }));
    notificationsMock.sendNotificationAction.mock.mockImplementationOnce(
      async () => {
        throw new Error("firebase down");
      }
    );

    await notifier.notifyManagerOfRestockRequest(base);

    expect(loggerMock.logger.warn.mock.calls.length).toBe(1);
  });
});
