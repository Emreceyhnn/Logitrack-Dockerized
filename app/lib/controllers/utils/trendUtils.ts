/**
 * tr-iki sayısal değer arasındaki dönemsel yüzde değişimini (trend) hesaplar
 * en-calculates the period-over-period percentage change between two numeric values
 * input (current: number, previous: number)
 * output ({ value: number; isUp: boolean } | undefined)
 */
export function calcTrend(
  current: number,
  previous: number
): { value: number; isUp: boolean } | undefined {
  // No previous data → cannot calculate trend
  if (previous === 0 && current === 0) return undefined;

  // Previous was 0 but current is not → treat as 100% increase
  if (previous === 0) return { value: 100, isUp: true };

  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), isUp: pct >= 0 };
}

/**
 * tr-bugünden N gün öncesine ait gün başlangıcı saatli (00:00:00) Date nesnesini döndürür
 * en-returns a Date object for N days ago at the start of the day (00:00:00)
 * input (n: number)
 * output (Date)
 */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
