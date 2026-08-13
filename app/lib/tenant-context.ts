import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  companyId: string | null;
  /**
   * When true, the tenant-guard fail-closed check in `db.ts` is bypassed and
   * queries may run across every tenant. Reserved for trusted system jobs
   * (e.g. cron) that legitimately operate on all companies at once. Never set
   * this from a user-facing request path.
   */
  system?: boolean;
}

/**
 * Ambient tenant context for the current request. Set by
 * `authenticatedAction` / `maybeAuthenticatedAction` so the Prisma client
 * extension in `db.ts` can enforce tenant scoping on every query without
 * relying on each call site remembering to add `where: { companyId }`.
 */
declare global {
  var __tenantContext: AsyncLocalStorage<TenantContext> | undefined;
}

// Fix Next.js double-instantiation bug by using globalThis
const globalContext =
  globalThis.__tenantContext || new AsyncLocalStorage<TenantContext>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__tenantContext = globalContext;
}

export const tenantContext = globalContext;

/**
 * tr-Mevcut iş parçacığı için kiracı kimliğini alır
 * en-Gets the tenant ID for the current thread
 * input ()
 * output (string | null)
 */
export function getTenantCompanyId(): string | null {
  return tenantContext.getStore()?.companyId ?? null;
}

/**
 * tr-Mevcut bağlamın çapraz kiracı erişimine izin verilen güvenilir bir sistem işi olup olmadığını kontrol eder
 * en-True when the current context is a trusted system job allowed cross-tenant access.
 * input ()
 * output (boolean)
 */
export function isSystemContext(): boolean {
  return tenantContext.getStore()?.system === true;
}

/**
 * tr-Belirtilen kiracı kimliğiyle bir işlev çalıştırır ve bu işlev için ortam bağlamını ayarlar
 * en-Runs a function with the given tenant ID, setting the environment context for that function
 * input (
  companyId: string | null,
  fn: () => T
)
 * output (T)
 */
export function runWithTenant<T>(companyId: string | null, fn: () => T): T {
  return tenantContext.run({ companyId }, fn);
}

/**
 * tr- tenant-guard fail-closed denetimini atlayarak çapraz kiracı sorgularına izin veren güvenilir bir sistem işinde `fn` çalıştırır. Yalnızca dahili sistem işleri (cron, bakım betikleri) için — asla kullanıcıya dönük bir istek yolundan değil.
 * en-Runs `fn` in a trusted system context that bypasses the tenant-guard fail-closed check, permitting cross-tenant queries. Only for internal system jobs (cron, maintenance scripts) — never a user-facing request path.
 * input (
  fn: () => T
)
 * output (T)
 */
export function runAsSystem<T>(fn: () => T): T {
  return tenantContext.run({ companyId: null, system: true }, fn);
}
