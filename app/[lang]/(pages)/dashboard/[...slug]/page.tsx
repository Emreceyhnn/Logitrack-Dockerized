/**
 * tr-`/dashboard/...` altındaki eski bağlantıları gerçek sayfalarına yönlendirir.
 * en-Redirects legacy `/dashboard/...` links to the real pages.
 *
 * tr-Gerçek sayfalar `app/[lang]/(pages)/(dashboard)/...` altında yaşar. `(pages)` ve
 *    `(dashboard)` birer route group olduğu için URL'de görünmezler: çalışan adres
 *    `/tr/shipments`, `/tr/dashboard/shipments` değil. Bildirimler, e-postalar ve
 *    yer imleri uzun süre `/dashboard/...` biçiminde link ürettiğinden bu adresler
 *    404 veriyordu. Ayrıca bu sayfaların hiçbirinde `[id]` segmenti yok — bir kayıt
 *    `?id=` ile açılan detay dialog'u olarak gösterilir.
 * en-The real pages live under `app/[lang]/(pages)/(dashboard)/...`. Both `(pages)` and
 *    `(dashboard)` are route groups, so they never appear in the URL: the working path is
 *    `/tr/shipments`, not `/tr/dashboard/shipments`. Notifications, emails and bookmarks
 *    emitted `/dashboard/...` links for a long time, so those URLs 404'd. None of these
 *    pages has an `[id]` segment either — a record is surfaced as a detail dialog opened
 *    from the `?id=` query param.
 */

import { redirect, notFound } from "next/navigation";

/**
 * tr-Eski segment adlarını gerçek klasör adlarına eşler. Sağdaki değerler
 *    `app/[lang]/(pages)/(dashboard)/` altındaki klasör adlarıyla birebir aynı olmalı.
 *    "vehicles" tekil "vehicle" klasörüne bakar — eski linklerin bir kısmı çoğul yazıyordu.
 * en-Maps legacy segment names onto the real folder names. The values must match the folder
 *    names under `app/[lang]/(pages)/(dashboard)/` exactly. "vehicles" maps to the singular
 *    "vehicle" folder — some legacy links used the plural form.
 */
const SEGMENT_ALIASES: Record<string, string> = {
  shipments: "shipments",
  drivers: "drivers",
  vehicles: "vehicle",
  vehicle: "vehicle",
  warehouses: "warehouses",
  customers: "customers",
  inventory: "inventory",
  routes: "routes",
  users: "users",
  company: "company",
  analytics: "analytics",
  reports: "reports",
  overview: "overview",
  fuel: "fuel",
};

/**
 * tr-`?id=` ile detay dialog'u açabilen sayfalar. Yalnızca bunlarda kimlik query'ye taşınır;
 *    diğerlerinde kimlik atılıp liste sayfasına gidilir (ör. routes'ta detay dialog'u yok).
 * en-Pages that can open a detail dialog via `?id=`. Only for these is the id carried into
 *    the query; elsewhere it is dropped and we land on the list page (routes, for example,
 *    has no detail dialog).
 */
const SUPPORTS_DETAIL_DIALOG = new Set([
  "shipments",
  "drivers",
  "vehicle",
  "warehouses",
  "customers",
  "inventory",
]);

export default async function LegacyDashboardRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang, slug } = await params;
  const existingParams = await searchParams;

  const [rawSegment, id] = slug;
  const segment = rawSegment ? SEGMENT_ALIASES[rawSegment] : undefined;

  // tr-Tanımadığımız bir segmenti kök sayfaya yönlendirmek, yanlış yazılmış bir adresi
  //    sessizce "başarılı" göstermek olur; 404 doğru cevap.
  // en-Silently redirecting an unknown segment to a root page would make a mistyped URL look
  //    successful; 404 is the honest answer.
  if (!segment) notFound();

  // tr-Sorgu parametrelerini koru (ör. ?status=DELAYED gibi derin bağlantılar bozulmasın).
  // en-Preserve existing query params so deep links like ?status=DELAYED keep working.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(existingParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined)
      query.set(key, value[0]);
  }

  // tr-`temp-` kimlikler iyimser güncellemeden kalan sahte kimliklerdir; sunucuda karşılığı
  //    yok, sorgu boşuna hata döner. Kimliksiz liste sayfası doğru davranış.
  // en-`temp-` ids are placeholders left by optimistic updates; they don't exist server-side,
  //    so a lookup would just fail. Landing on the plain list page is the right behaviour.
  if (id && !id.startsWith("temp-") && SUPPORTS_DETAIL_DIALOG.has(segment)) {
    query.set("id", id);
  }

  const queryString = query.toString();
  redirect(`/${lang}/${segment}${queryString ? `?${queryString}` : ""}`);
}
