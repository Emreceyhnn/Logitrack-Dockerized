import type { Metadata } from 'next';
import PricingClient from './PricingClient';
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
    title: dict.landing.pageMeta.pricing.title,
    description: dict.landing.pageMeta.pricing.description,
    alternates: buildSeoAlternates('/pricing', lang),
  };
}

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { lang } = await params;
  const { reason } = await searchParams;
  const dict = await getDictionary(lang);
  const breadcrumbSchema = buildBreadcrumbSchema(
    '/pricing',
    dict.landing.pageMeta.pricing.title,
    lang,
    getBaseUrl()
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <PricingClient lang={lang} showAccessNotice={reason === 'expired'} />
    </>
  );
}
