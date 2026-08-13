import type { Metadata } from 'next';
import SmbLogisticsClient from './SmbLogisticsClient';
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
    title: dict.landing.pageMeta.smbLogistics.title,
    description: dict.landing.pageMeta.smbLogistics.description,
    alternates: buildSeoAlternates('/smb-logistics', lang),
  };
}

export default async function SmbLogisticsPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <SmbLogisticsClient dict={dict} />;
}
