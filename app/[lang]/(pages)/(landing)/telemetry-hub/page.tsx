import type { Metadata } from 'next';
import TelemetryHubClient from './TelemetryHubClient';
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
    title: dict.landing.pageMeta.telemetryHub.title,
    description: dict.landing.pageMeta.telemetryHub.description,
    alternates: buildSeoAlternates('/telemetry-hub', lang),
  };
}

export default async function TelemetryHubPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <TelemetryHubClient dict={dict} />;
}
