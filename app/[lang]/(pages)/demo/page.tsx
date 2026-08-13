import { redirect } from "next/navigation";

export default async function DemoRootPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/demo/overview`);
}
