import type { Metadata } from 'next';
import OurMissionClient from './OurMissionClient';
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
    title: dict.landing.pageMeta.ourMission.title,
    description: dict.landing.pageMeta.ourMission.description,
    alternates: buildSeoAlternates('/our-mission', lang),
  };
}

export default async function OurMissionPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <OurMissionClient dict={dict} />;
}
