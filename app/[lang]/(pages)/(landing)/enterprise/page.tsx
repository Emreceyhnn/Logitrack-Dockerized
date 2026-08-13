import type { Metadata } from 'next';
import EnterpriseClient from './EnterpriseClient';
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
    title: dict.landing.pageMeta.enterprise.title,
    description: dict.landing.pageMeta.enterprise.description,
    alternates: buildSeoAlternates('/enterprise', lang),
  };
}

export default async function EnterprisePage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <EnterpriseClient dict={dict} />;
}
