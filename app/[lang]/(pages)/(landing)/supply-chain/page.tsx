import type { Metadata } from 'next';
import SupplyChainClient from './SupplyChainClient';
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
    title: dict.landing.pageMeta.supplyChain.title,
    description: dict.landing.pageMeta.supplyChain.description,
    alternates: buildSeoAlternates('/supply-chain', lang),
  };
}

export default async function SupplyChainPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  return <SupplyChainClient dict={dict} />;
}
