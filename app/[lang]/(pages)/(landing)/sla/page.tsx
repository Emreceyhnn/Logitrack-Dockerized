import type { Metadata } from 'next';
import SlaClient from './SlaClient';
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
    title: dict.landing.pageMeta.sla.title,
    description: dict.landing.pageMeta.sla.description,
    alternates: buildSeoAlternates('/sla', lang),
  };
}

export default async function SlaPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <SlaClient dict={dict} />;
}
