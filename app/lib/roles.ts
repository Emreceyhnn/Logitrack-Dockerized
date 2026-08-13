import rolesConfig from "@/roles.json";

/**
 * tr-Ana paneline asla ulaşmaması gereken depo işçi paneline zorlanan rollerin adlarının alt kümesi (küçük harf)
en-Role names (lowercased) whose users are confined to the Warehouse Worker
 * input ()
 * output (Set<string>)
 */
const WAREHOUSE_ONLY_ROLE_NAMES: ReadonlySet<string> = new Set(
  rolesConfig.flatMap((r) => {
    if (r.id === "role_warehouse") {
      return (r.names ?? [r.name]).map((n) => n.toLocaleLowerCase("en-US"));
    }
    if (r.id === "role_manager") {
      return (r.names ?? [r.name])
        .filter((n) => n.toLocaleLowerCase("en-US").includes("warehouse"))
        .map((n) => n.toLocaleLowerCase("en-US"));
    }
    return [];
  })
);

/**
tr-Verilen rol adının depo personeline ait olup olmadığını ve depo işçi paneline yönlendirilmesi gerekip gerekmediğini kontrol eder
en-True when the given role name belongs to warehouse-only staff who should be locked to the `/warehouse-worker` panel.
 * input (
  roleName: string | null | undefined
)
 * output (boolean)
 */
export function isWarehouseOnlyRole(
  roleName: string | null | undefined
): boolean {
  if (!roleName) return false;
  return WAREHOUSE_ONLY_ROLE_NAMES.has(
    roleName.trim().toLocaleLowerCase("en-US")
  );
}

const DRIVER_ONLY_ROLE_NAMES: ReadonlySet<string> = new Set(
  rolesConfig.flatMap((r) =>
    r.id === "role_driver"
      ? (r.names ?? [r.name]).map((n) => n.toLocaleLowerCase("en-US"))
      : []
  )
);

/**
 * tr-Verilen rol adının sürücü personeline ait olup olmadığını ve sürücü konsoluna yönlendirilmesi gerekip gerekmediğini kontrol eder
 * en-True when the given role name belongs to driver staff who should be locked to the `/driver-console` panel.
 * input (
  roleName: string | null | undefined
)
 * output (boolean)
 */
export function isDriverOnlyRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return DRIVER_ONLY_ROLE_NAMES.has(roleName.trim().toLocaleLowerCase("en-US"));
}

// tr-role_default (Personel) rolü herhangi bir dashboard paneline erişemez, sadece landing page'de kalır
// en-The role_default (Staff) role has no dashboard access at all and is confined to the landing page
const NO_DASHBOARD_ACCESS_ROLE_NAMES: ReadonlySet<string> = new Set([
  "default",
  "role_default",
]);

/**
 * tr-Verilen rol adının hiçbir dashboard paneline erişimi olmayan varsayılan role ait olup olmadığını kontrol eder
 * en-True when the given role name belongs to the default role that has no dashboard access whatsoever.
 * input (
  roleName: string | null | undefined
)
 * output (boolean)
 */
export function hasNoDashboardAccess(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return NO_DASHBOARD_ACCESS_ROLE_NAMES.has(roleName.trim().toLocaleLowerCase("en-US"));
}
