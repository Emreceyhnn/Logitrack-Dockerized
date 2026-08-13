import { describe, it } from "node:test";
import { expect } from "expect";
import { getTenantCompanyId, runWithTenant } from "./tenant-context";

describe("tenant-context.ts", () => {
  it("should_ReturnNull_WhenOutsideTenantContext", () => {
    expect(getTenantCompanyId()).toBeNull();
  });

  it("should_ReturnCompanyId_InsideRunWithTenant", () => {
    const seen = runWithTenant("comp-A", () => getTenantCompanyId());
    expect(seen).toBe("comp-A");
  });

  it("should_ReturnNull_WhenTenantContextIsExplicitlyNull", () => {
    const seen = runWithTenant(null, () => getTenantCompanyId());
    expect(seen).toBeNull();
  });

  it("should_RestoreOuterContext_AfterNestedRun", () => {
    const seen: Array<string | null> = [];
    runWithTenant("comp-A", () => {
      seen.push(getTenantCompanyId());
      runWithTenant("comp-B", () => {
        seen.push(getTenantCompanyId());
      });
      seen.push(getTenantCompanyId());
    });
    expect(seen).toEqual(["comp-A", "comp-B", "comp-A"]);
    expect(getTenantCompanyId()).toBeNull();
  });

  it("should_PropagateContext_AcrossAwaitBoundaries", async () => {
    const seen = await runWithTenant("comp-A", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return getTenantCompanyId();
    });
    expect(seen).toBe("comp-A");
  });

  it("should_IsolateConcurrentTenantContexts", async () => {
    const [a, b] = await Promise.all([
      runWithTenant("comp-A", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getTenantCompanyId();
      }),
      runWithTenant("comp-B", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return getTenantCompanyId();
      }),
    ]);
    expect(a).toBe("comp-A");
    expect(b).toBe("comp-B");
  });
});
