import type { Metadata } from 'next';
import GlobalTrackingClient from './GlobalTrackingClient';
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
    title: dict.landing.pageMeta.globalTracking.title,
    description: dict.landing.pageMeta.globalTracking.description,
    alternates: buildSeoAlternates('/global-tracking', lang),
  };
}

export default async function GlobalTrackingPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <GlobalTrackingClient dict={dict} lang={lang} />;
}
