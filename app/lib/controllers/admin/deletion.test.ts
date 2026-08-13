import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// Deletion is destructive and cross-tenant, so these tests pin the guards:
// self-lockout, platform-admin protection, typed confirmation for companies,
// session revocation, and idempotency reporting.
const userFindFirstMock = mock.fn(async (): Promise<unknown> => null);
const userUpdateMock = mock.fn(async () => ({}));
const userFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const userUpdateManyMock = mock.fn(async () => ({ count: 0 }));
const userDeleteMock = mock.fn(async () => ({}));
const companyFindFirstMock = mock.fn(async (): Promise<unknown> => null);
const companyUpdateMock = mock.fn(async () => ({}));
const vehicleFindFirstMock = mock.fn(async (): Promise<unknown> => null);
const vehicleUpdateMock = mock.fn(async () => ({}));

const invitationDeleteManyMock = mock.fn(async () => ({ count: 0 }));
const auditLogUpdateManyMock = mock.fn(async () => ({ count: 0 }));
const inventoryMovementUpdateManyMock = mock.fn(async () => ({ count: 0 }));
const shipmentHistoryUpdateManyMock = mock.fn(async () => ({ count: 0 }));
const warehouseUpdateManyMock = mock.fn(async () => ({ count: 0 }));
const warehouseTaskUpdateManyMock = mock.fn(async () => ({ count: 0 }));

const revokeAllUserSessionsMock = mock.fn(async () => undefined);

mock.module("server-only", { namedExports: {} });

// The transaction callback is invoked with a `tx` client shaped like the
// tables `hardDeleteUser` touches; reusing the same mocks as the top-level
// `db` keeps assertions simple since this suite never runs concurrent
// transactions.
const tx = {
  invitation: { deleteMany: invitationDeleteManyMock },
  auditLog: { updateMany: auditLogUpdateManyMock },
  inventoryMovement: { updateMany: inventoryMovementUpdateManyMock },
  shipmentHistory: { updateMany: shipmentHistoryUpdateManyMock },
  warehouse: { updateMany: warehouseUpdateManyMock },
  warehouseTask: { updateMany: warehouseTaskUpdateManyMock },
  user: { delete: userDeleteMock },
};
const transactionMock = mock.fn(
  async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)
);

// INCLUDE_DELETED lives in its own module (app/lib/softDelete.ts) precisely so
// db mocks like this one do not have to re-export it; the real constant is
// used here.
mock.module("@/app/lib/db", {
  namedExports: {
    db: {
      user: {
        findFirst: userFindFirstMock,
        update: userUpdateMock,
        findMany: userFindManyMock,
        updateMany: userUpdateManyMock,
        delete: userDeleteMock,
      },
      company: { findFirst: companyFindFirstMock, update: companyUpdateMock },
      vehicle: { findFirst: vehicleFindFirstMock, update: vehicleUpdateMock },
      trailer: { findFirst: async () => null, update: async () => ({}) },
      shipment: { findFirst: async () => null, update: async () => ({}) },
      route: { findFirst: async () => null, update: async () => ({}) },
      warehouse: { findFirst: async () => null, update: async () => ({}) },
      customer: { findFirst: async () => null, update: async () => ({}) },
      driver: { findFirst: async () => null, update: async () => ({}) },
      inventory: { findFirst: async () => null, update: async () => ({}) },
      $transaction: transactionMock,
    },
  },
});

mock.module("@/app/lib/logger", {
  namedExports: { logger: { warn: () => {}, error: () => {}, info: () => {} } },
});

mock.module("@/app/lib/controllers/session/manage", {
  namedExports: { revokeAllUserSessions: revokeAllUserSessionsMock },
});

const ADMIN = { id: "admin1", sessionId: "s1", companyId: "c1" };

type SoftDeleteFn = (
  admin: unknown,
  entity: string,
  id: string,
  confirmLabel?: string
) => Promise<{ label: string; deletedAt: string | null; cascadeSummary?: Record<string, number> }>;

describe("controllers/admin/deletion.ts", () => {
  let softDeleteRecord: SoftDeleteFn;
  let restoreRecord: (
    a: unknown,
    e: string,
    i: string
  ) => Promise<{ deletedAt: string | null }>;

  let hardDeleteUser: (
    admin: unknown,
    id: string
  ) => Promise<{ label: string; deletedAt: string | null }>;

  before(async () => {
    const mod = await import("./deletion");
    softDeleteRecord = mod.softDeleteRecord as unknown as SoftDeleteFn;
    restoreRecord = mod.restoreRecord as typeof restoreRecord;
    hardDeleteUser = mod.hardDeleteUser as typeof hardDeleteUser;
  });

  beforeEach(() => {
    for (const m of [
      userFindFirstMock,
      userUpdateMock,
      userFindManyMock,
      userUpdateManyMock,
      userDeleteMock,
      companyFindFirstMock,
      companyUpdateMock,
      vehicleFindFirstMock,
      vehicleUpdateMock,
      revokeAllUserSessionsMock,
      invitationDeleteManyMock,
      auditLogUpdateManyMock,
      inventoryMovementUpdateManyMock,
      shipmentHistoryUpdateManyMock,
      warehouseUpdateManyMock,
      warehouseTaskUpdateManyMock,
      transactionMock,
    ]) {
      m.mock.resetCalls();
    }
    userFindFirstMock.mock.mockImplementation(async () => null);
    companyFindFirstMock.mock.mockImplementation(async () => null);
    vehicleFindFirstMock.mock.mockImplementation(async () => null);
    userFindManyMock.mock.mockImplementation(async () => []);
    process.env.PLATFORM_ADMIN_USER_IDS = "admin1";
  });

  describe("self-lockout and admin protection", () => {
    it("refuses to delete the acting admin's own account", async () => {
      await expect(
        softDeleteRecord(ADMIN, "user", "admin1")
      ).rejects.toThrow("cannot delete your own account");
      expect(userUpdateMock.mock.callCount()).toBe(0);
    });

    // A two-admin platform must not be reducible to zero admins.
    it("refuses to delete another platform administrator", async () => {
      process.env.PLATFORM_ADMIN_USER_IDS = "admin1,admin2";
      await expect(
        softDeleteRecord(ADMIN, "user", "admin2")
      ).rejects.toThrow("platform administrator");
      expect(userUpdateMock.mock.callCount()).toBe(0);
    });

    it("allows deleting an ordinary user", async () => {
      userFindFirstMock.mock.mockImplementation(async () => ({
        id: "u9",
        email: "a@b.c",
        deletedAt: null,
      }));

      const result = await softDeleteRecord(ADMIN, "user", "u9");
      expect(result.label).toBe("a@b.c");
      expect(userUpdateMock.mock.callCount()).toBe(1);
    });
  });

  describe("session revocation", () => {
    // A deleted user who keeps a live token is not actually deleted.
    it("revokes sessions when a user is deleted", async () => {
      userFindFirstMock.mock.mockImplementation(async () => ({
        id: "u9",
        email: "a@b.c",
        deletedAt: null,
      }));

      await softDeleteRecord(ADMIN, "user", "u9");
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(1);
    });

    it("does not revoke sessions for non-user entities", async () => {
      vehicleFindFirstMock.mock.mockImplementation(async () => ({
        id: "v1",
        plate: "34ABC01",
        deletedAt: null,
      }));

      await softDeleteRecord(ADMIN, "vehicle", "v1");
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(0);
    });
  });

  describe("company deletion", () => {
    const company = { id: "c9", name: "Acme Logistics", deletedAt: null };

    it("requires the confirmation text to match the company name", async () => {
      companyFindFirstMock.mock.mockImplementation(async () => company);

      await expect(
        softDeleteRecord(ADMIN, "company", "c9", "acme logistics")
      ).rejects.toThrow("does not match");
      // Nothing may be written on a failed confirmation.
      expect(companyUpdateMock.mock.callCount()).toBe(0);
    });

    it("refuses when no confirmation is supplied", async () => {
      companyFindFirstMock.mock.mockImplementation(async () => company);

      await expect(softDeleteRecord(ADMIN, "company", "c9")).rejects.toThrow(
        "does not match"
      );
      expect(companyUpdateMock.mock.callCount()).toBe(0);
    });

    it("deletes when the confirmation matches exactly", async () => {
      companyFindFirstMock.mock.mockImplementation(async () => company);

      const result = await softDeleteRecord(
        ADMIN,
        "company",
        "c9",
        "Acme Logistics"
      );
      expect(result.deletedAt).not.toBe(null);
      expect(companyUpdateMock.mock.callCount()).toBe(1);
    });

    // A "deleted" company whose staff can still sign in is only cosmetically
    // deleted.
    it("soft-deletes the company's members and kills their sessions", async () => {
      companyFindFirstMock.mock.mockImplementation(async () => company);
      userFindManyMock.mock.mockImplementation(async () => [
        { id: "u1" },
        { id: "u2" },
      ]);

      const result = await softDeleteRecord(
        ADMIN,
        "company",
        "c9",
        "Acme Logistics"
      );

      expect(userUpdateManyMock.mock.callCount()).toBe(1);
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(2);
      expect(result.cascadeSummary).toEqual({ users: 2 });
    });
  });

  describe("idempotency", () => {
    it("reports a conflict when the record is already deleted", async () => {
      vehicleFindFirstMock.mock.mockImplementation(async () => ({
        id: "v1",
        plate: "34ABC01",
        deletedAt: new Date(),
      }));

      await expect(softDeleteRecord(ADMIN, "vehicle", "v1")).rejects.toThrow(
        "already deleted"
      );
      expect(vehicleUpdateMock.mock.callCount()).toBe(0);
    });

    it("throws NotFound for an unknown record", async () => {
      await expect(softDeleteRecord(ADMIN, "vehicle", "ghost")).rejects.toThrow();
    });

    it("rejects an unknown entity", async () => {
      await expect(
        softDeleteRecord(ADMIN, "nonsense", "x")
      ).rejects.toThrow();
    });
  });

  describe("restore", () => {
    it("clears deletedAt on a deleted record", async () => {
      vehicleFindFirstMock.mock.mockImplementation(async () => ({
        id: "v1",
        plate: "34ABC01",
        deletedAt: new Date(),
      }));

      const result = await restoreRecord(ADMIN, "vehicle", "v1");
      expect(result.deletedAt).toBe(null);

      const args = vehicleUpdateMock.mock.calls[0]?.arguments[0] as {
        data: { deletedAt: null };
      };
      expect(args.data.deletedAt).toBe(null);
    });

    it("reports a conflict when the record is not deleted", async () => {
      vehicleFindFirstMock.mock.mockImplementation(async () => ({
        id: "v1",
        plate: "34ABC01",
        deletedAt: null,
      }));

      await expect(restoreRecord(ADMIN, "vehicle", "v1")).rejects.toThrow(
        "not deleted"
      );
      expect(vehicleUpdateMock.mock.callCount()).toBe(0);
    });
  });

  describe("hardDeleteUser", () => {
    it("refuses to erase the acting admin's own account", async () => {
      await expect(hardDeleteUser(ADMIN, "admin1")).rejects.toThrow(
        "cannot delete your own account"
      );
      expect(transactionMock.mock.callCount()).toBe(0);
    });

    it("refuses to erase a platform administrator", async () => {
      process.env.PLATFORM_ADMIN_USER_IDS = "admin1,admin2";
      await expect(hardDeleteUser(ADMIN, "admin2")).rejects.toThrow(
        "platform administrator"
      );
      expect(transactionMock.mock.callCount()).toBe(0);
    });

    it("throws NotFound for an unknown user", async () => {
      await expect(hardDeleteUser(ADMIN, "ghost")).rejects.toThrow();
      expect(transactionMock.mock.callCount()).toBe(0);
    });

    // The whole point of the two-step flow: a live account must go through
    // softDeleteRecord first.
    it("refuses to erase a user that is not already soft-deleted", async () => {
      userFindFirstMock.mock.mockImplementation(async () => ({
        id: "u9",
        email: "a@b.c",
        deletedAt: null,
      }));

      await expect(hardDeleteUser(ADMIN, "u9")).rejects.toThrow(
        "already soft-deleted"
      );
      expect(transactionMock.mock.callCount()).toBe(0);
    });

    it("clears Restrict FKs and deletes the row inside one transaction", async () => {
      userFindFirstMock.mock.mockImplementation(async () => ({
        id: "u9",
        email: "a@b.c",
        deletedAt: new Date(),
      }));

      const result = await hardDeleteUser(ADMIN, "u9");

      expect(result.label).toBe("a@b.c");
      expect(result.deletedAt).toBe(null);
      expect(transactionMock.mock.callCount()).toBe(1);
      expect(invitationDeleteManyMock.mock.callCount()).toBe(1);
      expect(auditLogUpdateManyMock.mock.callCount()).toBe(1);
      expect(inventoryMovementUpdateManyMock.mock.callCount()).toBe(1);
      expect(shipmentHistoryUpdateManyMock.mock.callCount()).toBe(1);
      expect(warehouseUpdateManyMock.mock.callCount()).toBe(1);
      expect(warehouseTaskUpdateManyMock.mock.callCount()).toBe(1);
      expect(userDeleteMock.mock.callCount()).toBe(1);

      const auditArgs = auditLogUpdateManyMock.mock.calls[0]
        ?.arguments[0] as { where: { userId: string }; data: { userId: null } };
      expect(auditArgs.where.userId).toBe("u9");
      expect(auditArgs.data.userId).toBe(null);
    });
  });

  describe("lookup", () => {
    // The lookup must see deleted rows, or an already-deleted record would
    // look like it never existed and report NotFound instead of a conflict.
    it("opts out of the soft-delete filter when finding the target", async () => {
      vehicleFindFirstMock.mock.mockImplementation(async () => ({
        id: "v1",
        plate: "34ABC01",
        deletedAt: null,
      }));

      await softDeleteRecord(ADMIN, "vehicle", "v1");
      const args = vehicleFindFirstMock.mock.calls[0]?.arguments[0] as {
        where: { OR?: unknown[] };
      };
      expect(args.where.OR).toBeDefined();
    });
  });
});
