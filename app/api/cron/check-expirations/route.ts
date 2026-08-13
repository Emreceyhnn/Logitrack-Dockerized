import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { sendNotificationAction } from "@/app/lib/actions/notifications";
import { logger } from "@/app/lib/logger";
import { timingSafeEqual } from "@/app/lib/utils/timingSafeEqual";
import { runAsSystem } from "@/app/lib/tenant-context";

// Outbound email is throttled to stay under the provider's 10 req/s limit, so a
// large fan-out takes real wall-clock time. The default 10s budget would cut the
// job off mid-batch and silently drop every remaining recipient.
export const maxDuration = 300;


export async function GET(req: NextRequest) {
  // Security check: validate the authorization header
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    !authHeader ||
    !timingSafeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This job legitimately scans every tenant's expiring records to fan out
    // notifications, so it runs in a trusted system context that bypasses the
    // tenant-guard fail-closed check (see runAsSystem / db.ts).
    return await runAsSystem(async () => {
    const now = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(now.getDate() + 15);

    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(now.getDate() + 5);

    // 1. Check General Documents
    const expiringDocs = await db.document.findMany({
      where: {
        expiryDate: { lte: fifteenDaysFromNow },
      },
      include: {
        driver: {
          include: { user: { select: { name: true, surname: true } } },
        },
        vehicle: { select: { plate: true } },
      },
    });

    for (const doc of expiringDocs) {
      if (!doc.expiryDate || !doc.companyId) continue;

      const daysLeft = Math.ceil(
        (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const type: "ERROR" | "WARNING" = daysLeft <= 0 ? "ERROR" : "WARNING";
      const title =
        daysLeft <= 0
          ? "Belge Süresi Doldu! 🚫"
          : "Belge Süresi Yaklaşıyor! ⏳";
      let message = "";

      const entityName = doc.driver
        ? `${doc.driver.user.name} ${doc.driver.user.surname} (Sürücü)`
        : doc.vehicle
          ? `${doc.vehicle.plate} (Araç)`
          : "Sistem";

      if (daysLeft <= 0) {
        message = `${entityName} için '${doc.name}' belgesinin süresi ${Math.abs(daysLeft)} gün önce doldu!`;
      } else {
        message = `${entityName} için '${doc.name}' belgesinin süresinin dolmasına ${daysLeft} gün kaldı.`;
      }

      await sendNotificationAction(
        { companyId: doc.companyId },
        // tr-"documents" diye bir sayfa yok; belgeler araç detayının sekmesi (bkz. documents.ts)
        // en-No standalone "documents" page; documents live in the vehicle detail tab
        { title, message, type, link: "/vehicle" }
      );
    }

    // 2. Check Driver Licenses
    const expiringLicenses = await db.driver.findMany({
      where: {
        licenseExpiry: { lte: fifteenDaysFromNow },
      },
      include: { user: { select: { name: true, surname: true } } },
    });

    for (const driver of expiringLicenses) {
      if (!driver.licenseExpiry || !driver.companyId) continue;

      const daysLeft = Math.ceil(
        (driver.licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const type: "ERROR" | "WARNING" = daysLeft <= 0 ? "ERROR" : "WARNING";
      const title =
        daysLeft <= 0
          ? "Ehliyet Süresi Doldu! 🪪"
          : "Ehliyet Süresi Yaklaşıyor! ⏳";
      const message =
        daysLeft <= 0
          ? `${driver.user.name} ${driver.user.surname} isimli sürücünün ehliyet süresi dolmuş durumda!`
          : `${driver.user.name} ${driver.user.surname} isim bir sürücünün ehliyet süresinin dolmasına ${daysLeft} gün kaldı.`;

      await sendNotificationAction(
        { companyId: driver.companyId },
        { title, message, type, link: `/drivers?id=${driver.id}` }
      );
    }

    // 3. Check Vehicle Registration & Inspection
    const expiringVehicles = await db.vehicle.findMany({
      where: {
        deletedAt: null,
        OR: [
          { registrationExpiry: { lte: fifteenDaysFromNow } },
          { inspectionExpiry: { lte: fifteenDaysFromNow } },
        ],
      },
    });

    for (const vehicle of expiringVehicles) {
      if (!vehicle.companyId) continue;

      // Registration
      if (vehicle.registrationExpiry) {
        const regDays = Math.ceil(
          (vehicle.registrationExpiry.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (regDays <= 15) {
          await sendNotificationAction(
            { companyId: vehicle.companyId },
            {
              title:
                regDays <= 0
                  ? "Araç Ruhsat Süresi Doldu! 📄"
                  : "Araç Ruhsat Süresi Yaklaşıyor! ⏳",
              message: `${vehicle.plate} plakalı aracın ruhsat süresi ${regDays <= 0 ? "doldu" : regDays + " gün kaldı"}.`,
              type: regDays <= 0 ? "ERROR" : "WARNING",
              link: `/vehicle?id=${vehicle.id}`,
            }
          );
        }
      }

      // Inspection
      if (vehicle.inspectionExpiry) {
        const inspDays = Math.ceil(
          (vehicle.inspectionExpiry.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (inspDays <= 15) {
          await sendNotificationAction(
            { companyId: vehicle.companyId },
            {
              title:
                inspDays <= 0
                  ? "Araç Muayene Süresi Doldu! 🛠️"
                  : "Araç Muayene Süresi Yaklaşıyor! ⏳",
              message: `${vehicle.plate} plakalı aracın muayene süresi ${inspDays <= 0 ? "doldu" : inspDays + " gün kaldı"}.`,
              type: inspDays <= 0 ? "ERROR" : "WARNING",
              link: `/vehicle?id=${vehicle.id}`,
            }
          );
        }
      }
    }

    // 4. Check Routes (Delayed and Upcoming)
    const routesToCheck = await db.route.findMany({
      where: {
        status: { in: ["PLANNED", "ACTIVE"] },
      },
    });

    for (const route of routesToCheck) {
      if (!route.companyId) continue;

      // Delayed check: not completed and past endTime
      if (
        route.endTime &&
        route.endTime < now &&
        route.status !== "COMPLETED"
      ) {
        await sendNotificationAction(
          { companyId: route.companyId },
          {
            title: "Rota Gecikti! ⏰",
            message: `${route.name} numaralı rotanın bitiş saati geçti fakat henüz tamamlanmadı!`,
            type: "ERROR",
            link: `/routes`,
          }
        );
      }

      // Upcoming check: planned and starts within 1 hour
      if (route.status === "PLANNED" && route.startTime) {
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        if (route.startTime > now && route.startTime <= oneHourFromNow) {
          const minutesLeft = Math.ceil(
            (route.startTime.getTime() - now.getTime()) / (1000 * 60)
          );
          await sendNotificationAction(
            { companyId: route.companyId },
            {
              title: "Rota Başlamak Üzere! 🚚",
              message: `${route.name} numaralı rotanın başlamasına yaklaşık ${minutesLeft} dakika kaldı.`,
              type: "INFO",
              link: `/routes`,
            }
          );
        }
      }
    }

    // 5. Check Shipments (SLA Deadline)
    // Only active, not-yet-delayed shipments qualify; terminal states
    // (DELIVERED/FAILED/RETURNED/CANCELLED) and already-DELAYED ones are
    // skipped so we transition + notify exactly once per breach.
    const overdueShipments = await db.shipment.findMany({
      where: {
        slaDeadline: { lt: now },
        status: {
          in: ["PENDING", "PROCESSING", "ASSIGNED", "IN_TRANSIT"],
        },
      },
    });

    for (const shipment of overdueShipments) {
      if (!shipment.companyId) continue;

      await db.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "DELAYED",
          history: {
            create: {
              status: "DELAYED",
              companyId: shipment.companyId,
              description: `SLA deadline breached (due ${shipment.slaDeadline?.toISOString()})`,
            },
          },
        },
      });

      await sendNotificationAction(
        { companyId: shipment.companyId },
        {
          title: "SLA Süresi Doldu! ⚠️",
          message: `${shipment.trackingId} numaralı sevkiyatın SLA teslim süresi doldu! Durum GECİKMİŞ olarak güncellendi.`,
          type: "ERROR",
          category: "DELAY_ALERT",
          link: `/shipments?id=${shipment.id}`,
        }
      );
    }

    // 6. Check Warehouse Capacity
    const warehouses = await db.warehouse.findMany({
      include: {
        inventory: {
          select: {
            palletCount: true,
            volumeM3: true,
            quantity: true,
          },
        },
      },
    });

    for (const wh of warehouses) {
      if (!wh.companyId) continue;

      const currentPallets = wh.inventory.reduce(
        (acc: number, item: { palletCount: number | null; quantity: number }) =>
          acc + (item.palletCount || 0) * item.quantity,
        0
      );
      const currentVolume = wh.inventory.reduce(
        (acc: number, item: { volumeM3: number | null; quantity: number }) =>
          acc + (item.volumeM3 || 0) * item.quantity,
        0
      );

      const palletUsage = wh.capacityPallets
        ? (currentPallets / wh.capacityPallets) * 100
        : 0;
      const volumeUsage = wh.capacityVolumeM3
        ? (currentVolume / wh.capacityVolumeM3) * 100
        : 0;

      if (palletUsage >= 90 || volumeUsage >= 90) {
        await sendNotificationAction(
          { companyId: wh.companyId },
          {
            title: "Depo Kapasitesi Dolmak Üzere! 🏗️",
            message: `${wh.name} deposunun kapasite kullanımı %${Math.max(palletUsage, volumeUsage).toFixed(1)} seviyesine ulaştı.`,
            type: "WARNING",
            link: `/warehouses?id=${wh.id}`,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      checked:
        expiringDocs.length +
        expiringLicenses.length +
        expiringVehicles.length +
        routesToCheck.length +
        overdueShipments.length +
        warehouses.length,
    });
    });
  } catch (error) {
    logger.error("Cron check-expirations failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
