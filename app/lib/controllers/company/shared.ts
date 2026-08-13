"use server";

import { db } from "../../db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { logger } from "@/app/lib/logger";
import { redis, invalidatePattern, companyCacheKeys } from "../../redis";

/**
 * tr-belirtilen şirkete ait tüm önbellek kayıtlarını temizler
 * en-clears all cache records belonging to the specified company
 * input (companyId: string)
 * output (Promise<void>)
 */
export async function invalidateCompanyCache(companyId: string) {
  await Promise.all([
    invalidatePattern(companyCacheKeys.companyPattern(companyId)),
    redis.del(companyCacheKeys.detail(companyId)),
  ]);
  revalidatePath("/", "layout");
}

/**
 * tr-standart sistem rollerinin veritabanında var olduğundan emin olur, yoksa oluşturur
 * en-ensures standard system roles exist in the database, creating them if necessary
 * input ()
 * output (Promise<void>)
 */
export async function ensureStandardRoles() {
  const standardRoles = [
    { id: "role_admin", name: "Administrator", description: "Full system access" },
    { id: "role_manager", name: "Manager", description: "Company management access" },
    { id: "role_dispatcher", name: "Dispatcher", description: "Shipment and route management" },
    { id: "role_driver", name: "Driver", description: "Limited access for drivers" },
    { id: "role_warehouse", name: "Warehouse", description: "Warehouse and inventory management" },
    { id: "role_default", name: "Default", description: "Standard system access" },
  ];

  for (const r of standardRoles) {
    try {
      await db.role.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: [],
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("name")
      ) {
        const conflict = await db.role.findFirst({
          where: { name: r.name, companyId: null },
        });
        if (conflict && conflict.id !== r.id) {
          await db.role.update({
            where: { id: conflict.id },
            data: { name: `${r.name}_legacy_${Date.now()}` },
          });
          await db.role.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              name: r.name,
              description: r.description,
              permissions: [],
            },
          });
        }
      } else {
        logger.error("[CompanyShared] Role işlemi başarısız:", error);
        throw error;
      }
    }
  }
}
