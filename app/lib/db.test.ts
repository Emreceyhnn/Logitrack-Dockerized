 
import { describe, it, before, beforeEach, mock } from "node:test";
import { expect } from "expect";

// Capture the $extends config instead of connecting to a real database so the
// tenant-guard logic can be exercised in isolation.
const extendsCapture: { config?: unknown } = {};

class FakePrismaClient {
  $extends(config: Record<string, unknown>) {
    extendsCapture.config = config;
    return { __extension: config };
  }
}

mock.module("@prisma/client", {
  namedExports: { PrismaClient: FakePrismaClient },
});

type GuardHandler = (params: {
  model: string;
  operation: string;
  args: unknown;
  query: (args: Record<string, unknown>) => unknown;
}) => unknown;

describe("db.ts tenant-guard extension", () => {
  let handler: GuardHandler;
  let runWithTenant: <T>(companyId: string | null, fn: () => T) => T;
  let runAsSystem: <T>(fn: () => T) => T;
  let queryMock: unknown;
  let INCLUDE_DELETED: { OR: unknown[] };

  before(async () => {
    // Importing ./db registers the extension via extendsCapture; the
    // opt-out constant lives in its own module.
    await import("./db");
    ({ INCLUDE_DELETED } = await import("./softDelete"));
    ({ runWithTenant, runAsSystem } = await import("./tenant-context"));
    handler = extendsCapture.config?.query?.$allModels?.$allOperations;
    expect(typeof handler).toBe("function");
    expect(extendsCapture.config.name).toBe("tenant-guard");
  });

  beforeEach(() => {
    queryMock = mock.fn(async (args: Record<string, unknown>) => args);
  });

  const invoke = (
    companyId: string | null,
    model: string,
    operation: string,
    args: unknown
  ) =>
    runWithTenant(companyId, () =>
      handler({ model, operation, args, query: queryMock })
    );

  const passedArgs = () => queryMock.mock.calls[0].arguments[0];

  describe("tenant scoping on reads", () => {
    // NOTE: Shipment is both a tenant model and a soft-delete model, so reads
    // pick up `deletedAt: null` alongside the injected companyId.
    it("should_InjectCompanyIdIntoWhere_WhenTenantModelQueriedInTenantContext", async () => {
      await invoke("comp-A", "Shipment", "findMany", {});
      expect(passedArgs().where).toEqual({
        companyId: "comp-A",
        deletedAt: null,
      });
    });

    it("should_PreserveExistingWhereFilters_WhenInjectingCompanyId", async () => {
      await invoke("comp-A", "Shipment", "findMany", {
        where: { status: "PENDING" },
      });
      expect(passedArgs().where).toEqual({
        status: "PENDING",
        companyId: "comp-A",
        deletedAt: null,
      });
    });

    it("should_NotOverrideExplicitCompanyIdFilter", async () => {
      await invoke("comp-A", "Shipment", "findMany", {
        where: { companyId: "comp-B" },
      });
      // Manual filters are the caller's responsibility; the guard must not
      // silently rewrite them.
      expect(passedArgs().where.companyId).toBe("comp-B");
    });

    it("should_FailClosed_WhenTenantModelReadHasNoContextAndNoExplicitCompanyId", () => {
      // Fail-open regression guard: an unscoped read of a tenant model without a
      // tenant context must be blocked, not run across every company.
      expect(() =>
        runWithTenant(null, () =>
          handler({
            model: "Shipment",
            operation: "findMany",
            args: { where: { id: "s1" } },
            query: queryMock,
          })
        )
      ).toThrow(/Tenant guard: findMany on Shipment without tenant context/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_AllowUnscopedCrossTenantRead_InSystemContext", async () => {
      // Trusted system jobs (cron) legitimately scan every tenant, so the
      // fail-closed check is bypassed and args are left untouched.
      await runAsSystem(() =>
        handler({
          model: "Shipment",
          operation: "findMany",
          args: { where: { status: "PENDING" } },
          query: queryMock,
        })
      );
      // Soft-delete filtering still applies: a system job scanning every
      // tenant should not resurrect deleted rows.
      expect(passedArgs().where).toEqual({
        status: "PENDING",
        deletedAt: null,
      });
      expect(passedArgs().where.companyId).toBeUndefined();
    });

    it("should_AllowRead_WhenNoContextButCallerExplicitlyScopesCompanyId", async () => {
      // The second line of defense (manual where: { companyId }) stays valid even
      // when the ambient context is missing.
      await runWithTenant(null, () =>
        handler({
          model: "Shipment",
          operation: "findMany",
          args: { where: { companyId: "comp-A", id: "s1" } },
          query: queryMock,
        })
      );
      expect(passedArgs().where).toEqual({
        companyId: "comp-A",
        id: "s1",
        deletedAt: null,
      });
    });

    it("should_LeaveNonTenantModelsUntouched", async () => {
      await invoke("comp-A", "Company", "findMany", {});
      expect(passedArgs()?.where?.companyId).toBeUndefined();
      await invoke("comp-A", "ExchangeRate", "findFirst", {});
      expect(queryMock.mock.calls[1].arguments[0]?.where?.companyId).toBeUndefined();
    });
  });

  describe("tenant scoping on writes", () => {
    it("should_ScopeUpdateAndDeleteMany_ToTenantCompany", async () => {
      await invoke("comp-A", "Shipment", "deleteMany", {
        where: { status: "CANCELLED" },
      });
      expect(passedArgs().where).toEqual({
        status: "CANCELLED",
        companyId: "comp-A",
      });
    });

    it("should_ThrowTenantGuardError_WhenCreateTargetsAnotherCompany", () => {
      expect(() =>
        invoke("comp-A", "Shipment", "create", {
          data: { companyId: "comp-B", origin: "Istanbul" },
        })
      ).toThrow(/Tenant guard: attempted to create Shipment for another company/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_ThrowTenantGuardError_WhenUpsertCreatesForAnotherCompany", () => {
      expect(() =>
        invoke("comp-A", "Vehicle", "upsert", {
          where: { id: "v1" },
          create: { companyId: "comp-B" },
          update: {},
        })
      ).toThrow(/Tenant guard/);
    });

    it("should_AllowCreate_WhenCompanyIdMatchesTenant", async () => {
      await invoke("comp-A", "Shipment", "create", {
        data: { companyId: "comp-A", origin: "Istanbul" },
      });
      expect(queryMock.mock.calls.length).toBe(1);
      expect(passedArgs().data.companyId).toBe("comp-A");
    });

    it("should_AllowCreate_WhenNoTenantContextIsActive", async () => {
      // Auth flows (e.g. company bootstrap) run before a tenant is assigned but
      // still name their companyId explicitly, which the fail-closed guard allows.
      await invoke(null, "Driver", "create", {
        data: { companyId: "comp-X" },
      });
      expect(queryMock.mock.calls.length).toBe(1);
    });

    it("should_FailClosed_WhenCreateHasNoContextAndNoExplicitCompanyId", () => {
      expect(() =>
        invoke(null, "Driver", "create", { data: { name: "Ali" } })
      ).toThrow(/Tenant guard: create on Driver without tenant context/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_FailClosed_WhenUpdateHasNoContextAndNoExplicitCompanyId", () => {
      expect(() =>
        invoke(null, "Shipment", "update", {
          where: { id: "s1" },
          data: { status: "DELIVERED" },
        })
      ).toThrow(/Tenant guard: update on Shipment without tenant context/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_FailClosed_WhenCreateManyHasRowMissingCompanyIdAndNoContext", () => {
      expect(() =>
        invoke(null, "ShipmentItem", "createMany", {
          data: [{ sku: "A-1", companyId: "comp-X" }, { sku: "A-2" }],
        })
      ).toThrow(/Tenant guard: createMany on ShipmentItem without tenant context/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_InjectCompanyIdIntoEveryRow_OnCreateMany", async () => {
      await invoke("comp-A", "ShipmentItem", "createMany", {
        data: [{ sku: "A-1" }, { sku: "A-2", companyId: "comp-A" }],
      });
      expect(passedArgs().data).toEqual([
        { sku: "A-1", companyId: "comp-A" },
        { sku: "A-2", companyId: "comp-A" },
      ]);
    });

    it("should_ThrowTenantGuardError_WhenCreateManyTargetsAnotherCompany", () => {
      expect(() =>
        invoke("comp-A", "ShipmentItem", "createMany", {
          data: [{ sku: "A-1" }, { sku: "B-1", companyId: "comp-B" }],
        })
      ).toThrow(/Tenant guard: attempted to create ShipmentItem for another company/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_ThrowTenantGuardError_WhenUpdateReassignsCompanyId", () => {
      expect(() =>
        invoke("comp-A", "Shipment", "update", {
          where: { id: "s1" },
          data: { companyId: "comp-B" },
        })
      ).toThrow(/Tenant guard: attempted to move Shipment to another company/);
      expect(queryMock.mock.calls.length).toBe(0);
    });

    it("should_ThrowTenantGuardError_WhenUpdateReassignsCompanyIdViaSet", () => {
      expect(() =>
        invoke("comp-A", "Shipment", "updateMany", {
          where: { status: "PENDING" },
          data: { companyId: { set: "comp-B" } },
        })
      ).toThrow(/Tenant guard: attempted to move Shipment to another company/);
    });

    it("should_ThrowTenantGuardError_WhenUpsertUpdateReassignsCompanyId", () => {
      expect(() =>
        invoke("comp-A", "Vehicle", "upsert", {
          where: { id: "v1" },
          create: { companyId: "comp-A" },
          update: { companyId: "comp-B" },
        })
      ).toThrow(/Tenant guard: attempted to move Vehicle to another company/);
    });

    it("should_AllowUpdate_WhenCompanyIdMatchesTenant", async () => {
      await invoke("comp-A", "Shipment", "update", {
        where: { id: "s1" },
        data: { companyId: "comp-A", status: "DELIVERED" },
      });
      expect(queryMock.mock.calls.length).toBe(1);
    });
  });

  describe("soft delete filtering", () => {
    it("should_HideSoftDeletedRows_OnReads", async () => {
      await invoke("comp-A", "Vehicle", "findMany", {});
      expect(passedArgs().where).toEqual({
        companyId: "comp-A",
        deletedAt: null,
      });
    });

    it("should_RespectExplicitDeletedAtFilter", async () => {
      await invoke("comp-A", "Vehicle", "findMany", {
        where: { deletedAt: { not: null } },
      });
      expect(passedArgs().where.deletedAt).toEqual({ not: null });
    });

    // Models brought into soft-delete by the admin console's delete actions.
    it("should_HideSoftDeletedRows_ForNewlyCoveredModels", async () => {
      for (const model of [
        "Shipment",
        "Route",
        "Warehouse",
        "Customer",
        "Driver",
        "Inventory",
      ]) {
        queryMock.mock.resetCalls();
        await invoke("comp-A", model, "findMany", {});
        expect(passedArgs().where.deletedAt).toBe(null);
      }
    });

    // User and Company are NOT tenant models, so this also proves the filter
    // applies on the strength of soft-delete membership alone.
    it("should_HideSoftDeletedRows_ForUserAndCompany", async () => {
      queryMock.mock.resetCalls();
      await invoke("comp-A", "User", "findMany", {});
      expect(passedArgs().where.deletedAt).toBe(null);
      expect(passedArgs().where.companyId).toBeUndefined();

      queryMock.mock.resetCalls();
      await invoke("comp-A", "Company", "findMany", {});
      expect(passedArgs().where.deletedAt).toBe(null);
    });

    // INCLUDE_DELETED expresses "any deletion state" as a top-level OR. The
    // guard must recognise it and not clamp the result back to live rows —
    // uniqueness checks depend on seeing deleted records.
    it("should_RespectIncludeDeleted_OptOut", async () => {
      await invoke("comp-A", "User", "findFirst", {
        where: { email: "a@b.c", ...INCLUDE_DELETED },
      });
      expect(passedArgs().where.deletedAt).toBeUndefined();
      expect(passedArgs().where.OR).toEqual([
        { deletedAt: null },
        { deletedAt: { not: null } },
      ]);
    });

    // A caller's own OR that says nothing about deletion must still be
    // filtered — otherwise any OR query would silently leak deleted rows.
    it("should_StillFilter_WhenOrDoesNotMentionDeletedAt", async () => {
      await invoke("comp-A", "User", "findMany", {
        where: { OR: [{ name: "a" }, { surname: "b" }] },
      });
      expect(passedArgs().where.deletedAt).toBe(null);
    });

    it("should_NotInjectDeletedAt_OnWriteOperations", async () => {
      await invoke("comp-A", "Trailer", "update", {
        where: { id: "t1" },
        data: { status: "AVAILABLE" },
      });
      expect(passedArgs().where.deletedAt).toBeUndefined();
      expect(passedArgs().where.companyId).toBe("comp-A");
    });
  });

  it("should_ReturnQueryResult_FromHandler", async () => {
    queryMock = mock.fn(async () => [{ id: "s1" }]);
    const result = await invoke("comp-A", "Shipment", "findMany", {});
    expect(result).toEqual([{ id: "s1" }]);
  });
});
