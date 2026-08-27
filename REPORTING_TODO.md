# Reporting Sistemi — Yapılacaklar / Test Edilecekler

Bu dosya, `reporting.report_events` tabanlı rapor altyapısının şu anki durumunu,
kalan işleri ve test edilmesi gerekenleri özetler.

---

## 1. Tarayıcıda Canlı Test Edilmesi Gerekenler

Aşağıdaki 3 özellik kod seviyesinde (tip kontrolü + unit test + gerçek DB'ye
karşı SQL doğrulaması) test edildi, ama tarayıcıda gerçek tıklama ile henüz
denenmedi.

- [ + ] **Araç issue formu — Issue type dropdown**
  `app/components/dialogs/vehicle/reportIssueDialog/index.tsx`
  Dropdown açılıyor mu, "Vehicle fault" / "Cargo/load damage" seçenekleri
  görünüyor mu, seçim submit'e doğru gidiyor mu.

- [x] **Depo quick actions — 3 yeni buton** — Playwright ile canlı doğrulandı
  `app/components/warehouse-worker/tabs/WWDashboardTab.tsx`
  - "Log vehicle arrival" (yeşil) → toast "Arrival logged" çıktı, DB'de `INBOUND_ARRIVED` event'i yazıldı ✅
  - "Report Issue" (kırmızı, mevcut) → toast çıktı, DB'de `ISSUE_OPENED` (payload.type=OTHER) yazıldı ✅
  - "Report damage" (turuncu, yeni) → toast çıktı, DB'de `ISSUE_OPENED` (payload.type=DAMAGE) yazıldı ✅

  **Bulunan ve düzeltilen pre-existing sorun:** Proje `next dev` ile hiç
  çalıştırılmamıştı. `middleware.ts` (eski `proxy.ts`) `app/lib/redis.ts`'i
  import ediyor, o da Node.js-only `redis` paketini (`node:crypto`)
  kullanıyor — middleware varsayılan olarak Edge Runtime'da çalıştığı için
  sunucu her istekte 500 veriyordu. Ayrıca dev modunda webpack'in HMR
  runtime'ı `eval()` kullanıyor, mevcut strict CSP (`unsafe-eval` yok) bunu
  engelleyip tüm client-side JS'i (form submit dahil) sessizce kırıyordu.
  Bu benim değişikliklerimden tamamen bağımsız (temiz/stash'lenmiş ağaçta da
  aynı hata doğrulandı), ama tarayıcı testini yapabilmek için düzeltildi:
  - `middleware.ts` → `export const config = { ..., runtime: "nodejs" }`
  - `middleware.ts` → `buildCsp()`'ye `NODE_ENV !== "production"` koşuluyla `'unsafe-eval'` eklendi (sadece dev'de, prod'da hiç eklenmiyor)

- [ +] **Sayım düzeltme formu — Discrepancy type dropdown**
  `app/components/warehouse-worker/WWScanSection.tsx` (AdjustForm)
  Bir SKU sayarken "Fark türü (opsiyonel)" dropdown'ı görünüyor mu,
  seçim yapılmadan da submit edilebiliyor mu (opsiyonel olmalı).

- [ +] **Depo formu — Cut-off Time alanı**
  `app/components/dialogs/warehouse/shared/sections/BasicInfoSection.tsx`
  Add/Edit warehouse dialoglarında "Dispatch Cut-off Time" saat inputu
  görünüyor mu, kayıt sonrası geri geldiğinde doğru değer geliyor mu.

---

## 2. Tamamlanan İşler (Referans)

| #   | Özellik                         | Event / Alan                                            | Durum         |
| --- | ------------------------------- | ------------------------------------------------------- | ------------- |
| 1   | SLA / OTD                       | `slaDeadline`, `isOnTime` kolonları                     | ✅ Tamamlandı |
| 2   | Cut-off / Dispatch              | `SHIPMENT_DISPATCHED`, `Warehouse.cutoffTime`           | ✅ Tamamlandı |
| 3   | Dock-to-stock süresi            | `INBOUND_ARRIVED` event'i (yeni "Log Arrival" aksiyonu) | ✅ Tamamlandı |
| 4   | Worker/aktör kimliği            | `actorUserId` kolonu                                    | ✅ Tamamlandı |
| 5   | Pick accuracy %                 | `reasonCode` (STOCK_ADJUSTED, discrepancyType)          | ✅ Tamamlandı |
| 6   | Failure reason breakdown        | `reasonCode` (DELIVERY_FAILED, 5 sabit kod)             | ✅ Tamamlandı |
| 7   | Damage count/rate               | `IssueType.DAMAGE`, iki ayrı UI akışı (araç/depo)       | ✅ Tamamlandı |
| 8   | İade oranı                      | `ORDER_RETURNED` event'i                                | ✅ Tamamlandı |
| 9   | Araç doluluk oranı (fill rate)  | `ROUTE_STARTED`/`ROUTE_COMPLETED` payload               | ✅ Tamamlandı |
| 10  | Yakıt maliyeti                  | `FUEL_LOGGED` event'i                                   | ✅ Tamamlandı |
| 11  | FTDR (first-time delivery rate) | Mevcut event'lerden türetilebilir, ek iş gerekmedi      | ✅ Doğrulandı |
| 12  | Packing accuracy %              | `reasonCode` (STOCK_ADJUSTED, PACK_ERROR eklendi)       | ✅ Tamamlandı |

**`yesterday_summary` artık %100 tamamlandı** — mock objedeki tüm alanların veri kaynağı hazır.

---

## 3. Ertelenen İşler (Veri Kaynağı Yok, İş Süreci Kararı Gerekiyor)

- [x] **carrierId — İPTAL EDİLDİ, PROJEDEN ÇIKARILDI.** Şirket sadece kendi
      filosuyla çalışıyor, 3. parti taşıyıcı hiç kullanılmıyor/planlanmıyor.
      `logReportEvent`'in `ReportEventInput` tipinden ve SQL insert'inden
      `carrierId` kaldırıldı; hiçbir çağrı noktası zaten kullanmıyordu.
      `reporting.report_events.carrierId` kolonu DB'den de silindi
      (migration: `20260827140309_drop_carrier_id_from_report_events`,
      silmeden önce sıfır satırda dolu olduğu doğrulandı). Taşıyıcı bazlı
      kırılım/carrier scorecard rapor kapsamından tamamen çıkarıldı.

- [x] **Teslimat/km/desi başına maliyet — TAMAMLANDI.** `Shipment`'a üç yeni
      alan eklendi: `revenue` (navlun bedeli), `extraCostAmount` +
      `extraCostNote` (hamaliye/gümrük/sigorta gibi tek seferlik ekstra
      maliyet kalemi), `currency`. Sipariş oluşturma formuna (`LogisticsSection.tsx`)
      3 yeni alan eklendi, `createShipment` controller'ı bağlandı.
      `SHIPMENT_CREATED` event'i artık `revenue` ve `amount` (extraCost) alanlarını
      ayrı kolonlar olarak taşıyor — `amount` genel "bu event'in maliyeti"
      anlamına geldi (yakıt/bakım event'lerinde de kullanılıyor), `revenue`
      sadece gelir tarafı. İkisi ayrı olduğu için kâr sorgusu
      (`sum(revenue) - sum(amount) - yakıt - bakım`) doğrudan SQL'de
      hesaplanabiliyor, sign convention'a güvenmiyor.
      - Migration: `20260827141833_add_shipment_revenue_and_extra_cost` (Shipment tablosu)
      - Migration: `20260827141843_add_revenue_to_report_events` (report_events.revenue kolonu)
      - Gerçek DB'ye karşı doğrulandı: event yazımı + gross margin hesaplaması (1500.5 - 200.25 = 1300.25) doğru
      - km/desi başına maliyet hâlâ ertelendi — `Route.distanceKm` var ama
        rota bazlı toplam gelir/maliyet agregasyonu microservice'in işi

- [x] **Hasar parasal değeri — İPTAL EDİLDİ.** `damage_count`/`damage_rate`
      (sayı bazlı) yeterli görüldü, parasal değer takibi kapsam dışı
      bırakıldı — worker'ın sahada güvenilir bir tutar tahmini yapması
      riskli olurdu.

---

## 4. `public` Şema Erişimi — ✅ Karar Verildi ve Uygulandı

`today_actions` bölümünün tamamı, rapor microservice'inin (`report_reader`
rolü) ana `public` şemasındaki tablolara erişip erişemeyeceğine bağlıydı —
bu **event log'dan cevaplanamaz**, çünkü "hâlâ açık", "hâlâ atanmamış",
"hâlâ düşük stok" gibi sorular canlı/anlık durum sorgusu gerektirir, event
akışı sadece "olan şeyleri" tutar.

**Karar:** `report_reader`'a ilgili 6 `public` tablosuna doğrudan SELECT
GRANT'ı verildi (migration:
`prisma/migrations/20260827135826_grant_report_reader_public_select`).
Senkronize snapshot job'ı yerine anlık/canlı sorgu tercih edildi.

- `report_reader` artık `shipments`, `routes`, `vehicles`, `drivers`,
  `warehouse_tasks`, `inventory` tablolarında **sadece SELECT** yapabiliyor
  — INSERT/UPDATE/DELETE hâlâ reddediliyor, diğer `public` tablolara
  (`users` dahil) hâlâ erişimi yok. Gerçek DB'ye karşı doğrulandı.

Bu erişim artık şu alt bölümlerin tamamını açıyor (sorgu örnekleri gerçek
DB'ye karşı `report_reader` ile test edildi, hepsi çalışıyor):

- [x] `sla_monitoring` — `shipments` (status + slaDeadline filtreli)
- [x] `inactive_shipments` — `shipments` (updatedAt bazlı)
- [x] `unassigned_jobs` — `routes` (driverId/vehicleId NULL) + `shipments`
- [x] `pending_picking_queue` — `warehouse_tasks` (status=OPEN, yaş hesaplı)
- [x] `inventory_alerts` — `inventory` (quantity <= minStock)
- [x] `today_plan` — `routes` + `vehicles` + `drivers`

Ayrıca aynı erişimle açılan ek maddeler:

- [x] **Anlık envanter sorgusu** (stok devir hızı, DOH, ölü stok değeri) — `inventory` tablosuna erişim artık var, hesaplama mantığı microservice'te yazılacak
- [x] **Kapasite projeksiyonu** — veri (hacim trendi + fill rate) zaten hazırdı, artık canlı kapasite verisine de erişim var

**Not:** Bu madde Next.js/DB tarafında tamamlandı — sorgu mantığının
kendisi (hangi eşik "kritik", "24 saat" gibi parametreler) senin
microservice'inde yazılacak, burada sadece erişim ve veri kaynağı hazır
hale getirildi.

---

## 5. Bilinen Pre-existing Test Hataları (Bu Çalışmayla İlgisiz)

Aşağıdaki test hataları `git stash` ile bu oturumdaki değişikliklerden
**önce de var olduğu** doğrulandı, dokunulmadı:

- `app/lib/controllers/inventory.test.ts` → `should_CreateInventoryAndMovement_WhenValidDataProvided` (STOCK_IN/PUTAWAY tutarsızlığı)
- `app/lib/controllers/fuel.test.ts` → `should_CreateFuelLog_AndNormalizeCurrency` (kur çevirme kodu hiç yazılmamış)
- `app/components/dialogs/warehouse/editWarehouseDialog/index.test.tsx` ve `addWarehouseDialog/index.test.tsx` (mock modül `createWarehouseZone` export etmiyor)
- `app/components/dashboard/warehouse/warehouseList.test.tsx` → `should_RenderColumns_Properly` (sayı formatı/locale sorunu)
- `app/lib/controllers/overview.test.ts` (detay incelenmedi, pre-existing)

---

## 6. Genel Mimari Hatırlatma

- Event yazımı **her zaman aynı transaction içinde** (`db.$transaction`) yapılır — asıl domain yazımıyla atomik olması için.
- `reporting` şeması `public`'ten ayrı, `app_writer` sadece `report_events`'e INSERT atabilir (append-only), `report_reader` sadece `reporting` şemasında SELECT yapabilir.
- Rapor microservice'i (Express, ayrı, senin kuracağın) bu event log'u okuyup günlük/haftalık/aylık raporları hesaplayacak — cron/agregasyon mantığı Next.js'te değil, microservice'te.
