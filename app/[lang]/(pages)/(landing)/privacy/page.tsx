import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';
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
    title: dict.landing.pageMeta.privacy.title,
    description: dict.landing.pageMeta.privacy.description,
    alternates: buildSeoAlternates('/privacy', lang),
  };
}

export default async function PrivacyPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <PrivacyClient dict={dict} />;
}
