// Shared constants and helpers for the driver-console submodules. Plain module
// (not a "use server" boundary) so it may export constants and sync/async helpers.

import { db } from "../../db";

export const DC_ROLES = [
  "role_admin",
  "role_manager",
  "role_dispatcher",
  "role_driver",
];

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Resolve the Driver record for a logged-in User, if one exists. */
export async function getDriverForUser(userId: string, companyId: string) {
  return db.driver.findFirst({
    where: { userId, companyId },
    include: {
      user: { select: { name: true, surname: true } },
      currentVehicle: true,
      homeBaseWarehouse: {
        select: { id: true, name: true, code: true, city: true },
      },
    },
  });
}

// tr-Artık app/lib/utils/documentStatus.ts'de yaşıyor; sürücü konsolu dışındaki okumaların
//    da aynı mantığı kullanması gerektiği için oraya taşındı. Mevcut içe aktarımlar
//    bozulmasın diye buradan yeniden dışa aktarılıyor.
// en-Now lives in app/lib/utils/documentStatus.ts, moved there because reads outside the
//    driver console need the same logic. Re-exported here so existing imports keep working.
export { computeDocumentStatus } from "../../utils/documentStatus";
