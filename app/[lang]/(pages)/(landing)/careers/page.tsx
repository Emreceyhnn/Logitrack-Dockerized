import type { Metadata } from 'next';
import CareersClient from './CareersClient';
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
    title: dict.landing.pageMeta.careers.title,
    description: dict.landing.pageMeta.careers.description,
    alternates: buildSeoAlternates('/careers', lang),
  };
}

export default async function CareersPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <CareersClient dict={dict} />;
}
