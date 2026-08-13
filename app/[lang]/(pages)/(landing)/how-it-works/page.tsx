import type { Metadata } from "next";
import HowItWorksClient from "./HowItWorksClient";
import { getDictionary } from "@/app/lib/language/language";
import { buildSeoAlternates, buildBreadcrumbSchema } from "@/app/lib/language/navigation";
import { getBaseUrl } from "@/app/lib/utils/baseUrl";
import JsonLd from "@/app/components/seo/JsonLd";

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);

  return {
    title: dict.landing.pageMeta.howItWorks.title,
    description: dict.landing.pageMeta.howItWorks.description,
    alternates: buildSeoAlternates("/how-it-works", lang),
  };
}

export default async function HowItWorksPage(props: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang);
  const breadcrumbSchema = buildBreadcrumbSchema(
    "/how-it-works",
    dict.landing.pageMeta.howItWorks.title,
    lang,
    getBaseUrl()
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <HowItWorksClient dict={dict} lang={lang} />
    </>
  );
}
