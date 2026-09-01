# Bilinen Test Hataları (Pre-existing)

Bu dosya, `npm run test` ile çalıştırılan tam test suite'inde başarısız olan
ama bu oturumdaki WarehouseTaskItem / reporting altyapısı değişiklikleriyle
**ilgisi olmayan**, önceden var olan hataları listeler. Her biri `git stash`
ile temiz ağaçta da doğrulandı — bu değişikliklerden bağımsız.

`npm run test` çıktısı 14 batch'i "FAILED" olarak işaretliyor; bunlardan
sadece bazıları gerçek test başarısızlığı, bazıları aynı batch içindeki
başka bir dosyanın hatası yüzünden batch'in tamamı başarısız görünüyor
(örn. `warehouseWorker.test.ts` kendi başına tamamen geçiyor ama aynı
batch'teki `vehicle.test.ts` fail ettiği için batch "FAILED" görünüyor).

---

## 1. Auth / API route testleri

- **`app/api/auth/refresh/route.test.ts`** → `should_RedirectToTarget_WhenSessionRefreshSucceeds`
  Beklenen: `http://localhost/dashboard`, Gelen: `http://localhost/dashboard?refreshed=1`.
  Route muhtemelen `?refreshed=1` query param'ı eklemeye başlamış, test güncellenmemiş.

- **`app/api/vehicles/dashboard/route.test.ts`** → `should_ReturnDashboardData_WhenAuthorized`
  1 subtest fail.

## 2. Component/dialog testleri (RTL)

- **`CustomerDetailDialog`** → `should_LoadAndRenderCustomerDetails_WhenIdProvided`
- **`CapacityUtilization`** → `should_RenderCapacityValues_WhenLoadingIsFalse`
- **`WarehouseListTable`** → `should_RenderColumns_Properly` (sayı formatı/locale sorunu olabilir)
- **`EditCompanyMemberDialog`** → `should_RenderMemberDetails_WhenDialogOpens`,
  `should_CallUpdateController_WhenSaveClicked` — ikisi de
  `Cannot read properties of undefined (reading 'noWarehouses')` hatası veriyor
  (çeviri/dictionary mock'u eksik bir alan).
- **`NotificationBell`** → `should_InitializeWithoutErrors_WhenUserIsProvided`,
  `should_HandleUnreadCount_WhenNotificationsExist`

## 3. `createWarehouseZone` export eksikliği

- **`addWarehouseDialog/index.test.tsx`**, **`editWarehouseDialog/index.test.tsx`**
  → `The requested module '@/app/lib/controllers/warehouse' does not provide
  an export named 'createWarehouseZone'`
  Mock modülü güncel değil — gerçek `warehouse` controller'ı muhtemelen bu
  fonksiyonu artık export ediyor/etmiyor, test mock'u senkronize değil.

## 4. `WarehouseDetailsDialog` — `next/navigation` mock eksikliği

- **`warehouseDetailsDialog/index.test.tsx`**
  → `The requested module 'next/navigation' does not provide an export
  named 'redirect'`
  Test mock'u `redirect`'i export etmiyor.

## 5. `useWarehouseWorker.test.ts` — `logInboundArrival` export eksikliği

- **`app/hooks/useWarehouseWorker.test.ts`** → tüm suite (`useWarehouseWorker Hook`)
  → `The requested module '@/app/lib/controllers/warehouseWorker' does not
  provide an export named 'logInboundArrival'`
  Dosyanın kendi `warehouseWorkerControllerMock` objesi (satır ~45-51) sadece
  5 fonksiyon mock'luyor (`logWarehouseMovement`, `adjustWarehouseStock`,
  `advanceWarehouseTask`, `requestRestock`, `reportWarehouseIssue`),
  `logInboundArrival` eksik. `useWarehouseWorker.ts` bu fonksiyonu gerçekten
  import ediyor (log-arrival mutation'ı için), mock modülü onu içermediği
  için import hatası veriyor.
  **Fix**: `warehouseWorkerControllerMock`'a `logInboundArrival: mock.fn()` eklemek yeterli.

- **`useWarehouses.test.ts`** benzer bir zincirleme etkiyle aynı batch içinde
  "cancelled" (`test did not finish before its parent and was cancelled`)
  olarak görünüyor — kök neden yukarıdaki mock eksikliği.

## 6. Controller testleri (daha önce de bilinen hatalar)

- **`inventory.test.ts`** → `should_CreateInventoryAndMovement_WhenValidDataProvided`
  (STOCK_IN/PUTAWAY movement type tutarsızlığı)
- **`fuel.test.ts`** → `should_CreateFuelLog_AndNormalizeCurrency`
  (kur çevirme kodu hiç yazılmamış)
- **`overview.test.ts`** → `should_ReturnDashboardData_WhenUserHasCompanyId`
  → `Cannot read properties of undefined (reading 'startOf')` (muhtemelen bir
  date/dayjs mock'u eksik)
- **`vehicle.test.ts`** → `should_ReturnVehicle_WhenVehicleExistsAndBelongsToCompany`
  → `Cannot read properties of undefined (reading 'map')` — mock,
  `documents`/`issues` gibi alanları döndürmüyor, `withLiveDocumentStatus`
  `documents.map` üzerinde patlıyor.
- **`warehouse.test.ts`** → `should_ReturnWarehousesList_WhenUserHasCompany`
  → `db.inventory.findMany is not a function` — mock objesinde
  `inventory.findMany` tanımlı değil.

---

## Doğrulama Yöntemi

Her madde için `git stash -u` ile bu oturumun tüm değişiklikleri (schema,
controller, hook, UI, migration, seed script dahil) geçici olarak kaldırılıp
ilgili test dosyası/batch'i tekrar çalıştırıldı; aynı hata temiz ağaçta da
üretildi. Bu, listedeki hiçbir maddenin WarehouseTaskItem/reporting
değişiklikleriyle ilişkili olmadığını doğrular.

## Öneri

Bu liste, ayrı bir temizlik turunda ele alınabilir. Öncelik sırası önerisi:
1. **`logInboundArrival` mock eksikliği** (madde 5) — tek satırlık fix, 2 test
   dosyasını (`useWarehouseWorker.test.ts`, dolaylı olarak `useWarehouses.test.ts`)
   düzeltir.
2. **`createWarehouseZone` / `next/navigation` mock eksiklikleri** (madde 3-4)
   — mock senkronizasyon sorunları, kod değişmeden test mock'u güncellenerek
   çözülür.
3. Geri kalanlar (madde 1, 2, 6) gerçek kod/mantık incelemesi gerektiriyor,
   ayrı ayrı değerlendirilmeli.
