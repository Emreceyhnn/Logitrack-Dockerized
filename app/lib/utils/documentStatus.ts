import type { DocumentStatus } from "@prisma/client";

/**
 * tr-Bir belgenin durumunu son geçerlilik tarihinden hesaplar.
 * en-Computes a document's status from its expiry date.
 *
 * tr-`Document.status` yalnızca kayıt oluşturulurken yazılır ve bir daha hiç güncellenmez:
 *    check-expirations cron'u sadece bildirim gönderir, satırı değiştirmez. Bu yüzden dün
 *    geçerli olan bir belge bugün süresi dolmuş olsa da veritabanında ACTIVE görünmeye
 *    devam eder. Güvenilebilecek tek alan `expiryDate` olduğundan, durum okuma anında
 *    türetilmelidir — saklı değer gösterim için kullanılmamalıdır.
 * en-`Document.status` is written once at creation and never updated afterwards: the
 *    check-expirations cron only sends notifications, it never touches the row. So a
 *    document that was valid yesterday keeps reading ACTIVE today even after it lapsed.
 *    `expiryDate` is the only trustworthy field, so status must be derived at read time —
 *    the stored value must not be used for display.
 *
 * input (expiryDate: Date | null)
 * output (DocumentStatus)
 */
export function computeDocumentStatus(
  expiryDate: Date | null
): DocumentStatus {
  const now = new Date();
  if (!expiryDate) return "MISSING";
  if (expiryDate < now) return "EXPIRED";
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 1);
  if (expiryDate <= oneMonthLater) return "EXPIRING_SOON";
  return "ACTIVE";
}

/**
 * tr-Bir belgenin süresinin dolup dolmadığını söyler.
 * en-Whether a document has lapsed.
 * input (expiryDate: Date | null)
 * output (boolean)
 */
export function isDocumentExpired(expiryDate: Date | null): boolean {
  return computeDocumentStatus(expiryDate) === "EXPIRED";
}

/**
 * tr-Belge listesindeki saklı `status` alanlarını, tarihten türetilmiş güncel değerle
 *    değiştirir. Sorgudan dönen satırları arayüze vermeden önce bundan geçirin.
 * en-Replaces the stale stored `status` on a list of documents with the value derived from
 *    the expiry date. Run query results through this before handing them to the UI.
 * input (documents: T[])
 * output (T[])
 */
export function withLiveDocumentStatus<
  T extends { expiryDate: Date | null; status?: DocumentStatus },
>(documents: T[]): T[] {
  return documents.map((doc) => ({
    ...doc,
    status: computeDocumentStatus(doc.expiryDate),
  }));
}
