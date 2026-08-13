import type { Metadata } from 'next';
import HelpCenterClient from './HelpCenterClient';
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
    title: dict.landing.pageMeta.helpCenter.title,
    description: dict.landing.pageMeta.helpCenter.description,
    alternates: buildSeoAlternates('/help-center', lang),
  };
}

export default async function HelpCenterPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <HelpCenterClient dict={dict} />;
}
