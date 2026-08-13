import type { Metadata } from "next";
import ContactClient from "./ContactClient";
import { getDictionary } from "@/app/lib/language/language";
import {
  buildSeoAlternates,
  buildBreadcrumbSchema,
} from "@/app/lib/language/navigation";
import { getBaseUrl } from "@/app/lib/utils/baseUrl";
import JsonLd from "@/app/components/seo/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.landing.pageMeta.contact.title,
    description: dict.landing.pageMeta.contact.description,
    alternates: buildSeoAlternates("/contact", lang),
  };
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { lang } = await params;
  const { type } = await searchParams;
  const dict = await getDictionary(lang);
  const breadcrumbSchema = buildBreadcrumbSchema(
    "/contact",
    dict.landing.pageMeta.contact.title,
    lang,
    getBaseUrl()
  );

  // A "Request a Demo" CTA links here with ?type=demo so the DB row is tagged
  // DEMO; a visitor landing on /contact directly is a plain CONTACT message.
  const kind = type === "demo" ? "DEMO" : "CONTACT";

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <ContactClient kind={kind} lang={lang} />
    </>
  );
}
