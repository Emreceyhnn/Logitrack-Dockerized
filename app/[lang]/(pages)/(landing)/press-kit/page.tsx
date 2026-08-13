import type { Metadata } from 'next';
import PressKitClient from './PressKitClient';
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
    title: dict.landing.pageMeta.pressKit.title,
    description: dict.landing.pageMeta.pressKit.description,
    alternates: buildSeoAlternates('/press-kit', lang),
  };
}

export default async function PressKitPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <PressKitClient dict={dict} />;
}
