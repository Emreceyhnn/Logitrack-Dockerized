import type { Metadata } from 'next';
import RouteIntelligenceClient from './RouteIntelligenceClient';
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
    title: dict.landing.pageMeta.routeIntelligence.title,
    description: dict.landing.pageMeta.routeIntelligence.description,
    alternates: buildSeoAlternates('/route-intelligence', lang),
  };
}

export default async function RouteIntelligencePage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <RouteIntelligenceClient dict={dict} />;
}
