/**
 * tr-Segmentsiz `/dashboard` isteğini panonun asıl giriş sayfasına yönlendirir.
 *    Ayrıntılar için bkz. [...slug]/page.tsx.
 * en-Redirects a bare `/dashboard` request to the dashboard's real landing page.
 *    See [...slug]/page.tsx for the full rationale.
 */

import { redirect } from "next/navigation";
import { DEFAULT_REDIRECT_AFTER_LOGIN } from "@/app/lib/constants";

export default async function LegacyDashboardRootRedirect({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}${DEFAULT_REDIRECT_AFTER_LOGIN}`);
}
