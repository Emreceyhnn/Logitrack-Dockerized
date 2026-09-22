# Bilinen Test Hataları (Pre-existing)

Bu dosya, `npm run test` ile çalıştırılan tam test suite'inde başarısız olan
ama WarehouseTaskItem/reporting altyapısı değişiklikleriyle **ilgisi olmayan**,
önceden var olan hataları listeliyordu. Aşağıdaki maddelerin çoğu bir temizlik
turunda tek satırlık/mock-senkronizasyon düzeltmeleriyle kapatıldı — bkz.
"Çözülenler" bölümü. Kalan tek gerçek açık madde en altta.

---

## Çözülenler

Aşağıdakiler kapatıldı; her biri kendi test dosyasında yeşil.

1. **`logInboundArrival` mock eksikliği** — `useWarehouseWorker.test.ts` ve
   zincirleme olarak `useWarehouses.test.ts`. Fix: mock objesine
   `logInboundArrival: mock.fn()` eklendi.
2. **`createWarehouseZone` export eksikliği** — `addWarehouseDialog/index.test.tsx`,
   `editWarehouseDialog/index.test.tsx`. Fix: `getWarehouseZones`,
   `createWarehouseZone`, `updateWarehouseZone`, `deleteWarehouseZone` mock'a eklendi
   (gerçek `useWarehouses.ts` hook'u bunları da import ediyordu, mock eksikti).
3. **`next/navigation` mock eksikliği** — `warehouseDetailsDialog/index.test.tsx`
   (`redirect` eksikti), `customerDetailDialog.test.tsx` ve
   `NotificationBell.test.tsx` (`useRouter` eksikti — `CustomerActivityPanel`/
   `NotificationBell` içinde kullanılıyor, testte hiç mock'lanmamıştı).
4. **`@mui/material` mock eksikliği** — `warehouseDetailsDialog/index.test.tsx`
   (`Button`, `Grid`, `TextField`, `LinearProgress`, `CircularProgress` eksikti;
   alt component ağacı — `zonesTab`, `editWarehouseDialog` vb. — bunları kullanıyordu).
5. **`documents`/`issues`/`maintenanceRecords`/`fuelLogs`/`routes` mock eksikliği** —
   `vehicle.test.ts` (`getVehicleById`) ve `app/api/vehicles/dashboard/route.test.ts`.
   Gerçek kod bu alanlar üzerinde `.map()` çağırıyor (`withLiveDocumentStatus`,
   Decimal→number dönüşümleri); mock araç objesi bunları döndürmüyordu.
6. **`db.inventory.findMany` eksikliği** — `warehouse.test.ts`
   (`getWarehouses`). Gerçek kod artık `groupBy` değil `findMany` + yerel
   fold (`palletUsageByWarehouse`) kullanıyor; mock hâlâ eski `groupBy` API'sini
   taşıyordu.
7. **`dayjs` mock'unun zincirlenemez olması** — `overview.test.ts`. Mock
   `dayjs()` çağrısında `undefined` dönüyordu, gerçek kod
   `dayjs().startOf("day").diff(...)` zinciri kuruyordu
   (`deriveDocumentUrgency`). Ayrıca aynı dosyada `db.inventory.findMany`'in
   **iki farklı çağrı amacına** (pallet-sum satırları vs. low-stock liste)
   aynı `mockImplementationOnce` sırasıyla cevap verilmeye çalışılması bir
   `Promise.all` race'i yüzünden kırılgandı — `args.take` varlığına göre
   dallanan bir `mockImplementation`'a çevrildi.
8. **`?refreshed=1` query param'ı** — `app/api/auth/refresh/route.test.ts`.
   Route bilinçli olarak bunu ekliyor (proxy'nin redirect loop'unu önlemek
   için, route.ts'teki yorum); test eski beklenen URL'i kontrol ediyordu.
9. **Kur çevirme davranış varsayımı** — `fuel.test.ts`. `createFuelLog`
   **bilinçli olarak** kur çevirmiyor — cost/currency girildiği gibi saklanır,
   çevrim render zamanında `formatFrom()` ile yapılır (fuel.ts'teki yorum).
   Test, kodun yapmadığı bir davranışı (yazma zamanında USD'ye çevirme)
   bekliyordu; gerçek davranışa göre yeniden yazıldı.
10. **`STOCK_IN` vs `PUTAWAY` movement type** — `inventory.test.ts`. Yeni
    envanter kalemi oluşturma açılış bakiyesini `STOCK_IN` olarak loglar
    (`inventory/mutations.ts`); `PUTAWAY` ayrı bir warehouse-worker akışı.
    Test yanlış türü bekliyordu.
11. **`usedPallets`/`_count.inventory * 10` geçişi** — `capacityUtilization.test.tsx`,
    `warehouseList.test.tsx`. Kapasite hesaplaması artık server-derived
    `warehouse.usedPallets` alanını okuyor (quantity ÷ birim-per-pallet);
    `_count.inventory * 10` tahmini bilinçli olarak kaldırılmıştı
    (component'teki yorum: "multiplying the SKU count by a magic 10 reported
    a number unrelated to real rack usage"). Testler eski varsayıma göre
    mock veri kuruyordu.
12. **`dict.company.dialogs.*` eksikliği** — `EditCompanyMemberDialog.test.tsx`
    (`should_RenderMemberDetails_WhenDialogOpens`). Component `noWarehouses`,
    `assignWarehouse`, `selectWarehouse`, `warehouseManagerNote`,
    `warehouseStaffNote` okuyor; mock dictionary'de `company.dialogs` hiç
    yoktu.

---

## Açık kalan

### `EditCompanyMemberDialog.test.tsx` → `should_CallUpdateController_WhenSaveClicked`

Save butonuna tıklandığında `updateCompanyMemberMock` hiç çağrılmıyor
(`waitFor` timeout). Dictionary eksikliği (yukarıdaki madde 12) giderildikten
sonra da kalıyor — kök sebep farklı ve daha derin: form submit'i,
`editCompanyMemberValidationSchema` için kurulan mock
(`{ validate: async () => true }`) ile Formik'in gerçek yup-şeması
etkileşimi arasında bir yerde engelleniyor olabilir; `getWarehouses()`
component mount'ta çağrılıyor ve testte mock'lanmamış (gerçek server action,
test ortamında reddedilir — `catch` bloğu yakalıyor ama zamanlamayı
etkileyebilir). Tek satırlık bir düzeltme değil; form/mock etkileşiminin
adım adım izlenmesi gerekiyor. Ayrı ele alınmalı.

## Doğrulama Yöntemi (orijinal liste için)

Her madde `git stash -u` ile temiz ağaçta da doğrulanmıştı — WarehouseTaskItem/
reporting değişikliklerinden bağımsız olduklarını teyit etmek için. Yukarıdaki
düzeltmeler ise doğrudan hedefli test çalıştırmalarıyla (`npm run test:single --
<file>`) doğrulandı.
