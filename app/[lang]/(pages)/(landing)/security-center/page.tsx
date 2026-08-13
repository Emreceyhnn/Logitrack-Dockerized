import type { Metadata } from 'next';
import SecurityCenterClient from './SecurityCenterClient';
import { getDictionary } from '@/app/lib/language/language';
import { buildSeoAlternates } from '@/app/lib/language/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.landing.pageMeta.securityCenter.title,
    description: dict.landing.pageMeta.securityCenter.description,
    alternates: buildSeoAlternates('/security-center', lang),
  };
}

// Date of the last manual status/compliance review. A fixed constant on
// purpose: the status panel is a human-reviewed snapshot, not a live feed, so
// showing today's date would falsely imply automated real-time monitoring.
// Bump this when the posture is genuinely re-reviewed.
const LAST_REVIEWED = new Date("2026-07-01T00:00:00Z");

export default async function SecurityCenterPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  const lastReviewed = new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(LAST_REVIEWED);
  return (
    <SecurityCenterClient dict={dict} lang={lang} lastReviewed={lastReviewed} />
  );
}
