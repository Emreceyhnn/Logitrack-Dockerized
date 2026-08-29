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

### Weekly report mock kontrolü — eklenen alanlar

- [x] **OTD by_route / top_delayed_routes** — `report_events.routeId` kolonu
      eklendi (migration: `20260829150909_add_route_id_to_report_events`).
      `updateShipmentStatus` (SHIPMENT_DISPATCHED, ORDER_DELIVERED,
      DELIVERY_FAILED, ORDER_RETURNED) ve `updateRouteStatus`
      (SHIPMENT_DISPATCHED, ORDER_DELIVERED, ROUTE_STARTED, ROUTE_COMPLETED)
      artık tüm event çağrılarında `routeId` taşıyor. Rota bazlı OTD/gecikme
      kırılımı artık mümkün.

- [x] **complete_shipment_rate + accurate_documentation_rate (Perfect Order Rate bileşenleri)**
      — `report_events`'e `isPartial` ve `hasDocumentIssue` boolean kolonları
      eklendi (migration: `20260829151656_add_quality_flags_to_report_events`,
      ikisi de `NOT NULL DEFAULT false`). `updateShipmentStatus`'a iki opsiyonel
      parametre eklendi, sadece `ORDER_DELIVERED` event'ine yazılıyor.
      `StatusUpdateDialog`'a, durum DELIVERED seçiliyken görünen iki checkbox
      eklendi ("Delivered partially" / "Documentation issue"), UI→hook→controller
      zinciri (`shipmentTable/index.tsx`, `useShipments.ts`) tamamlandı, TR/EN
      çevirileri eklendi.
      Gerçek DB'ye karşı doğrulandı: `isOnTime=true AND isPartial=false AND
      hasDocumentIssue=false` filtresiyle perfect order sayısı doğru
      hesaplanıyor (4 test event'inden 1'i perfect, 3'ü complete, 3'ü accurate-doc
      çıktı, beklenenle birebir eşleşti).

- [x] **empty_return_rate / empty_return_trips / empty_travel_distance_km +
      average_volume_utilization_rate (fleet_utilization) — TAMAMLANDI.**
      `Route` modeline `trailerId` (Trailer'a FK) ve `isEmptyReturn` boolean
      (`@default(false)`) eklendi (migration:
      `20260829152609_add_trailer_and_empty_return_to_route`). `Trailer`
      modeline karşılıklı `routes Route[]` ilişkisi eklendi.
      `updateRouteStatus` (ROUTE_STARTED/ROUTE_COMPLETED) artık rotanın
      trailer'ını çekip `payload`'a `capacityVolumeM3`, `volumeFillRate`
      (=toplam sevkiyat hacmi / trailer kapasitesi) ve `isEmptyReturn`
      ekliyor; event'e ayrıca `volumeM3` (toplam yüklenen hacim) kolonu
      taşınıyor. `distanceKm` zaten payload'da vardı — `isEmptyReturn=true`
      olan ROUTE_COMPLETED event'leri filtrelenip `distanceKm` toplanarak
      `empty_travel_distance_km`/`empty_return_trips`/`empty_return_rate`
      hesaplanabilir.
      Rota oluşturma/düzenleme formuna (ThirdRouteDialogStep) trailer seçim
      dropdown'ı ve "boş dönüş seferi" checkbox'ı eklendi, `useAddRoute`/
      `edit-route-dialog`/`createRoute`/`updateRoute` zinciri tamamlandı,
      TR/EN çevirileri eklendi.
      Gerçek DB'ye karşı doğrulandı: 2 ROUTE_COMPLETED event'i (biri normal
      teslimat, biri boş dönüş) yazıldı, `payload->>'isEmptyReturn'` ve
      `payload->>'volumeFillRate'` filtreleriyle doğru sonuçlar alındı
      (empty_return_trips=1, empty_travel_distance_km=45,
      avg_volume_utilization_rate=0.6).

- [x] **worst_n_rankings.top_return_customers.main_return_reason —
      TAMAMLANDI.** `deliveryFailureReasons.ts`'e benzer yeni bir sabit
      taxonomy dosyası (`app/lib/type/returnReasons.ts`): WRONG_ITEM_SHIPPED,
      CUSTOMER_CHANGED_MIND, DAMAGED_IN_TRANSIT, QUALITY_ISSUE,
      DUPLICATE_ORDER, OTHER. `updateShipmentStatus`'a `returnReasonCode`
      parametresi eklendi, RETURNED durumuna geçişte DELIVERY_FAILED ile aynı
      desende zorunlu kılındı (`isReturnReasonCode` kontrolü, hata fırlatma).
      `ORDER_RETURNED` event'i artık mevcut `reasonCode` kolonuna bu kodu
      yazıyor (aynı kolon DELIVERY_FAILED tarafından da kullanılıyor, event
      type'a göre ayrışıyor). `StatusUpdateDialog`'a status=RETURNED
      seçiliyken görünen zorunlu bir dropdown eklendi, UI→hook→controller
      zinciri tamamlandı, TR/EN çevirileri eklendi.
      Gerçek DB'ye karşı doğrulandı: 4 ORDER_RETURNED event'i yazıldı,
      `reasonCode` bazlı genel kırılım ve `GROUP BY customerId, reasonCode`
      ile müşteri bazlı `main_return_reason` (en sık görülen kod) sorgusu
      doğru çalıştı.

- [x] **carrierId** — kasıtlı olarak kapsam dışı bırakıldı (bkz. bölüm 3),
      weekly mock'tan da çıkarıldı, eklenmeyecek.

### Monthly report mock kontrolü — eklenen/kaldırılan alanlar

- [x] **carrier_scorecard — TAMAMEN KALDIRILDI.** carrierId gibi 3. parti
      taşıyıcı kavramı kapsam dışı olduğu için bu bölüm baştan sona mock'tan
      çıkarıldı, veri kaynağı eklenmeyecek.

- [x] **sla_performance.service_tier_breakdown (SAME_DAY/NEXT_DAY/STANDARD_48H)
      — TAMAMLANDI.** Mevcut `ShipmentServiceType` (kargo tipi: freight/
      express/hazmat) ile karıştırılmaması için ayrı yeni bir enum eklendi:
      `ServiceTier` (migration: `20260829154922_add_service_tier_to_shipment`,
      `Shipment.serviceTier` nullable). `report_events`'e de ayrı bir
      `serviceTier` kolonu eklendi (migration:
      `20260829155311_add_service_tier_to_report_events`, routeId/reasonCode
      ile aynı desen — payload JSON değil, GROUP BY için dedicated kolon).
      Sipariş oluşturma formuna (BasicInfoSection) "Service Tier" dropdown'ı
      eklendi. `updateShipmentStatus`'un ORDER_DELIVERED ve DELIVERY_FAILED
      event çağrılarına (hem `assign.ts` hem `routes/assignments.ts`'deki
      toplu rota tamamlama yolu) shipment'ın `serviceTier`'ı taşınıyor.
      TR/EN çevirileri eklendi (bu sırada `dict.shipments.fields` bloğunu
      yanlışlıkla `dict.shipments.dialogs.fields` ile karıştırıp silmiştim,
      fark edilip düzeltildi — iki ayrı `fields` objesi var, dikkat).
      Gerçek DB'ye karşı doğrulandı: SAME_DAY (2 committed/1 achieved),
      NEXT_DAY (1/1), STANDARD_48H (1 committed, DELIVERY_FAILED olduğu için
      isOnTime null → achieved=0) — committed_count/achieved_count/
      compliance_rate hesaplaması doğru.

- [x] **cost_efficiency.cost_breakdown — TAMAMLANDI (labor/warehouse/packaging
      kalemleri için).** fuel_cost (FUEL_LOGGED) ve
      vehicle_maintenance_and_fleet_cost (MAINTENANCE_COMPLETED) zaten
      vardı. driver_and_labor_cost, warehouse_operation_cost,
      packaging_and_supplies_cost için sevkiyat bazlı bir event doğal olarak
      yok (bordro/kira gibi periyodik giderler) — yeni bir model eklendi:
      `OperatingExpense` (migration: `20260829160416_add_operating_expenses`,
      kategori enum'u `OperatingExpenseCategory`: LABOR, WAREHOUSE_RENT,
      PACKAGING, OTHER) + `report_reader`'a SELECT grant'ı (migration:
      `20260829160730_grant_report_reader_operating_expenses`).
      Yeni controller: `app/lib/controllers/operatingExpense.ts`
      (getOperatingExpenses/createOperatingExpense/deleteOperatingExpense),
      her create'te `OPERATING_EXPENSE_LOGGED` event'i `amount` + `payload.category`
      ile yazılıyor. Yeni basit bir sayfa eklendi: `/expenses`
      (`app/[lang]/(pages)/(dashboard)/expenses/`) — kategori/tutar/tarih/not
      ile manuel gider girişi + liste + silme. `PROTECTED_ROUTES` ve
      `COMPANY_REQUIRED_ROUTES`'a `/expenses` eklendi. TR/EN çevirileri eklendi.
      third_party_carrier_cost carrier kapsam dışı olduğu için mock'ta
      anlamsız kalıyor — eklenmedi.
      Gerçek DB'ye karşı doğrulandı: 4 gider (LABOR×2, WAREHOUSE_RENT,
      PACKAGING) hem `operating_expenses` tablosunda hem
      `report_events.payload->>'category'` bazlı toplamda birebir eşleşti
      (LABOR=8000, WAREHOUSE_RENT=10000, PACKAGING=750).

- [x] **inventory_turnover.category_breakdown — TAMAMLANDI, ek şema
      değişikliği gerekmedi.** `Inventory.cargoType` alanı zaten vardı
      (oluşturma sırasında dolduruluyor, default "General Cargo") — ek iş
      gerekmeden `GROUP BY cargoType` ile kategori kırılımı çalışıyor.
      Gerçek DB'ye karşı doğrulandı: 3 farklı SKU (2 Electronics, 1
      Textiles) doğru gruplanıp toplam adet/SKU sayısı hesaplandı.

- [x] **loss_and_damage.claim_recovery — TAMAMLANDI.** `Issue` modeline üç
      yeni alan eklendi (migration: `20260829161957_add_claim_fields_to_issue`):
      `claimStatus` (yeni enum `ClaimStatus`: NONE/FILED/APPROVED/REJECTED,
      default NONE), `claimFiledAmount`, `claimRecoveredAmount` — sadece
      type=DAMAGE issue'larda anlamlı, diğerlerinde NONE/null kalıyor.
      `report_reader`'a `issues` tablosuna SELECT grant'ı verildi (migration:
      `20260829162200_grant_report_reader_issues` — bu tablo önceki
      public-şema grant migration'ında unutulmuştu). `updateIssue`
      controller'ına üç yeni opsiyonel parametre eklendi. `IssueDetailDialog`'a,
      issue tipi DAMAGE olduğunda görünen bir "Insurance Claim" bölümü
      eklendi (claim status dropdown + filed/recovered amount alanları).
      `Vehicle` sorgularının ikisinde de (queries.ts, crud.ts) Prisma
      `Decimal` → `Number()` dönüşümü `issues` için de eklendi (mevcut
      maintenanceRecords deseniyle aynı) — bu olmadan tip hatası veriyordu.
      TR/EN çevirileri eklendi.
      Gerçek DB'ye karşı doğrulandı: 4 issue (3 DAMAGE + 1 VEHICLE) yazıldı,
      claim_filed/recovered/success_rate hesaplaması doğru çıktı
      (total_claims_filed=3, total_recovered=4500, success_rate=1/3).
      **Not:** Test suite'inde bununla ilgisiz, pre-existing bir hata
      bulundu — bkz. bölüm 5.

- [ ] **capacity_projection'ın forecast kısmı** (forecasted_orders_count,
      projected_vehicles_needed, identified_bottlenecks) — bunlar
      istatistiksel tahmin/projeksiyon, mikroservisin işi. `warehouse_capacity`
      (Warehouse.capacityVolumeM3 var) ve `fleet_capacity`nin mevcut durum
      kısmı (aktif araç sayısı) zaten veri kaynağına sahip, ek iş gerekmedi.

### Üç mock'un (daily/weekly/monthly) son toplu kontrolü

Bu turda üç mock nesnesi tekrar baştan sona satır satır geçildi.
`yesterday_summary`/weekly `otd`.../monthly bölümleri önceki turlarda zaten
%100 tamamlanmıştı — bu turun asıl kazanımı, daha önce derinlemesine
incelenmemiş olan `today_actions` (canlı/anlık durum sorguları) alt
bölümüydü:

- [x] **today_actions — TAMAMLANDI (iki küçük enum/alan eksiği dışında).**
      `sla_monitoring`, `inactive_shipments`, `unassigned_jobs`,
      `pending_picking_queue`, `inventory_alerts`, `today_plan`'ın tamamı
      önceki oturumda açılan `report_reader`→`public` şema SELECT erişimiyle
      (`shipments`, `routes`, `vehicles`, `drivers`, `warehouse_tasks`,
      `inventory`) karşılanıyor — event log'dan değil, canlı sorgudan.

- [x] **today_plan.non_available_drivers.reason /
      non_available_vehicles.reason — TAMAMLANDI.** `DriverStatus`'a
      `SICK_LEAVE` eklendi (mevcut `ON_LEAVE` yıllık izin anlamında kalıyor),
      `VehicleStatus`'a `BREAKDOWN` eklendi (mevcut `MAINTENANCE`/
      `OUT_OF_ORDER`'dan ayrı: planlı bakım değil, sahada beklenmedik arıza)
      — migration: `20260829163253_add_availability_fields_to_driver_vehicle`.
      Aynı migration'da `Driver.returnDate` ve `Vehicle.estimatedAvailableDate`
      (ikisi de nullable `DateTime?`) eklendi — mock'taki `return_date`/
      `estimated_available_date` alanları için daha önce hiç kolon yoktu.
      Client-safe enum'lar (`app/lib/type/enums/enums.ts`) ve entity tipleri
      (`entities.ts`) güncellendi, enum genişlemesinin kırdığı üç
      exhaustive-map/union tipi düzeltildi (`driver/status.ts`'deki
      `statusMap`, `driverConsole.ts`/`driverConsoleClient.ts`'deki
      `DutyStatus` union'ı), TR/EN çevirileri eklendi.
      **UI formu eklenmedi (kullanıcı kararıyla ertelendi)** — DB/tip
      katmanı hazır, admin şimdilik bu iki alanı (SICK_LEAVE/BREAKDOWN
      seçimi + tarih) mevcut driver/vehicle update formları üzerinden
      giremiyor; formlara eklemek ayrı bir iş.
      Gerçek DB'ye karşı doğrulandı: `status='BREAKDOWN'` +
      `estimatedAvailableDate` bir Vehicle'a, `status='SICK_LEAVE'` +
      `returnDate` bir Driver'a yazılıp okunarak doğru döndüğü kanıtlandı.

- [x] **today_plan diğer alanlar (wave_id, urgency_level, vb.)** — bunlar
      `WarehouseTask`'ın mevcut alanlarından (createdAt→age, id) mikroservis
      tarafında türetilebilir, ek DB değişikliği gerekmiyor.

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
- `app/lib/controllers/vehicle.test.ts` → `should_ReturnVehicle_WhenVehicleExistsAndBelongsToCompany` (mock `documents`/`issues`/vs. alanlarını hiç döndürmüyor, `withLiveDocumentStatus` `documents.map` üzerinde patlıyor — claim alanları eklemeden önce de aynı hata vardı)

---

## 6. Genel Mimari Hatırlatma

- Event yazımı **her zaman aynı transaction içinde** (`db.$transaction`) yapılır — asıl domain yazımıyla atomik olması için.
- `reporting` şeması `public`'ten ayrı, `app_writer` sadece `report_events`'e INSERT atabilir (append-only), `report_reader` sadece `reporting` şemasında SELECT yapabilir.
- Rapor microservice'i (Express, ayrı, senin kuracağın) bu event log'u okuyup günlük/haftalık/aylık raporları hesaplayacak — cron/agregasyon mantığı Next.js'te değil, microservice'te.
