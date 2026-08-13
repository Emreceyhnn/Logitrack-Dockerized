import type { Metadata } from "next";
import TrackClient from "./TrackClient";
import { getDictionary } from "@/app/lib/language/language";
import { buildSeoAlternates } from "@/app/lib/language/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.landing.trackingPage.title,
    description: dict.landing.trackingPage.subtitle,
    alternates: buildSeoAlternates("/track", lang),
  };
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ trackingId?: string }>;
}) {
  const { lang } = await params;
  const { trackingId } = await searchParams;
  const dict = await getDictionary(lang);
  return (
    <TrackClient dict={dict} lang={lang} initialTrackingId={trackingId ?? ""} />
  );
}
