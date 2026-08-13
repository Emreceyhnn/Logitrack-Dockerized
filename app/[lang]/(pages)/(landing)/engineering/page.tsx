import type { Metadata } from 'next';
import EngineeringClient from './EngineeringClient';
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
    title: dict.landing.pageMeta.engineering.title,
    description: dict.landing.pageMeta.engineering.description,
    alternates: buildSeoAlternates('/engineering', lang),
  };
}

export default async function EngineeringPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <EngineeringClient dict={dict} />;
}
