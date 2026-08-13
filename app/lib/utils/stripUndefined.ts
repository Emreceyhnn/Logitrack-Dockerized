/**
 * Returns a shallow copy of `obj` with every key whose value is `undefined`
 * removed. The result type also drops `undefined` from each property.
 *
 * Useful when building Prisma update inputs from parsed/partial data: an
 * omitted key means "leave unchanged", which is exactly what dropping the
 * `undefined`-valued keys preserves — and it satisfies
 * `exactOptionalPropertyTypes`, which rejects an explicit `undefined` on an
 * optional property.
 */
type NoUndefined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

/**
 * tr-"undefined" değeri olan tüm anahtarlar çıkarılmış `obj`'nin sığ bir kopyasını döndürür.
 * Sonuç türü ayrıca her özellikten "undefined" değerini çıkarır.
 * en-Returns a shallow copy of `obj` with every key whose value is "undefined"
 * removed. The result type also drops "undefined" from each property.
 * input (
  obj: T
)
 * output (NoUndefined<T>)
 */
export function stripUndefined<T extends object>(obj: T): NoUndefined<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as NoUndefined<T>;
}
