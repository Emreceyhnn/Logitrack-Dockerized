import type { Metadata } from 'next';
import AboutClient from './AboutClient';
import { getDictionary } from '@/app/lib/language/language';
import { buildSeoAlternates, buildBreadcrumbSchema } from '@/app/lib/language/navigation';
import { getBaseUrl } from '@/app/lib/utils/baseUrl';
import JsonLd from '@/app/components/seo/JsonLd';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.landing.pageMeta.about.title,
    description: dict.landing.pageMeta.about.description,
    alternates: buildSeoAlternates('/about', lang),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const breadcrumbSchema = buildBreadcrumbSchema(
    '/about',
    dict.landing.pageMeta.about.title,
    lang,
    getBaseUrl()
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <AboutClient />
    </>
  );
}
