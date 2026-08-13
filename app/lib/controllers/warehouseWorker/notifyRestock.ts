"use server";

import { db } from "../../db";
import { logger } from "../../logger";
import { sendNotificationAction } from "../../actions/notifications";

/**
 * tr-Bir besleme (replenishment) talebini depo yöneticisine uygulama içi bildirimle haber verir.
 *    Talep sahadan gelir ve karşılığında biri rezervden pick face'e mal indirmek zorundadır;
 *    yönetici haberdar olmazsa talep envanter defterinde kimsenin bakmadığı bir satır olarak kalır.
 *
 *    Alıcı deponun atanmış yöneticisidir (Warehouse.managerId). Depoya yönetici atanmamışsa
 *    bildirim üretilmez — şirket geneline yayın yapmak, ilgisiz kullanıcıları saha gürültüsüne
 *    boğardı; bu durum yalnızca günlüğe yazılır.
 *
 *    Bu fonksiyon asla hata fırlatmaz: çağrıldığı noktada RESTOCK_REQUEST hareketi zaten
 *    yazılmıştır ve bildirim gönderilemedi diye talebi geri almak, işçiyi talebinin kaydedilip
 *    kaydedilmediğini bilemez halde bırakır. Hatalar yalnızca günlüğe yazılır.
 * en-Tells the warehouse manager that a replenishment request was raised from the floor. The
 *    request only means something if someone moves stock from reserve to the pick face, so an
 *    unnotified manager leaves it as a ledger row nobody is watching.
 *
 *    The recipient is the warehouse's assigned manager (Warehouse.managerId). When the warehouse
 *    has no manager, nothing is sent — broadcasting company-wide would bury unrelated users in
 *    floor noise — and the gap is logged instead.
 *
 *    It never throws: by the time it runs the RESTOCK_REQUEST movement is already committed, and
 *    failing the request because a notification bounced would leave the worker unsure whether
 *    their request registered at all. Failures are logged.
 * input (params: { warehouseId: string; companyId: string; zone: string; sku?: string; quantity?: number; requestedByName?: string })
 * output (Promise<void>)
 */
export async function notifyManagerOfRestockRequest(params: {
  warehouseId: string;
  companyId: string;
  zone: string;
  sku?: string | undefined;
  quantity?: number | undefined;
  requestedByName?: string | undefined;
}): Promise<void> {
  const { warehouseId, companyId, zone, sku, quantity, requestedByName } = params;

  try {
    const warehouse = await db.warehouse.findFirst({
      where: { id: warehouseId, companyId },
      select: { id: true, name: true, code: true, managerId: true },
    });

    if (!warehouse?.managerId) {
      logger.info(
        `[notifyManagerOfRestockRequest] Warehouse ${warehouseId} has no manager assigned — restock request not notified.`
      );
      return;
    }

    const requester = requestedByName?.trim() || "Bir depo çalışanı";
    const zoneLabel = zone?.trim() || "—";
    // tr-Ürün bazlı talepte SKU ve adet başlığa taşınır: yönetici bildirimi açmadan
    //    neyin, nereye, kaç adet indirileceğini görmelidir.
    // en-Item-level requests carry the SKU and quantity in the title so the manager sees
    //    what moves where, and how much, without opening the notification.
    const qtyPart = quantity && quantity > 0 ? ` × ${quantity}` : "";

    const title = sku
      ? `Besleme Talebi — ${sku}${qtyPart}`
      : `Besleme Talebi — Bölge ${zoneLabel}`;
    const message = sku
      ? `${requester}, ${warehouse.name} deposunda Bölge ${zoneLabel} için ${sku}${qtyPart} besleme talebi oluşturdu.`
      : `${requester}, ${warehouse.name} deposunda Bölge ${zoneLabel} için besleme talebi oluşturdu.`;

    // tr-Kategori verilmiyor: bu doğrudan yöneticiye ait operasyonel bir olay ve
    //    sevkiyat/bakım tercihleriyle susturulmamalı (bkz. notifyInviter).
    // en-Deliberately category-less: this is an operational event addressed to the manager
    //    and must not be silenced by shipment/maintenance preferences (cf. notifyInviter).
    await sendNotificationAction(
      { userId: warehouse.managerId, companyId },
      {
        title,
        message,
        type: "WARNING",
        link: "/warehouses",
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[notifyManagerOfRestockRequest] Could not notify manager for warehouse ${warehouseId}: ${msg}`
    );
  }
}
