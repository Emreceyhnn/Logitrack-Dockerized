import type { Metadata } from 'next';
import DeveloperDocsClient from './DeveloperDocsClient';
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
    title: dict.landing.pageMeta.developerDocs.title,
    description: dict.landing.pageMeta.developerDocs.description,
    alternates: buildSeoAlternates('/developer-docs', lang),
  };
}

export default async function DeveloperDocsPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <DeveloperDocsClient dict={dict} />;
}
