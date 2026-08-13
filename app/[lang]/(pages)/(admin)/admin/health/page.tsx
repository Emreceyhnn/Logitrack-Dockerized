import { getDictionary } from "@/app/lib/language/language";
import AdminHealthPage from "@/app/components/admin/health/AdminHealthPage";

/**
 * tr-Sağlık kontrolleri rotası.
 * en-Health Check Matrix route.
 * input ({ params })
 * output (Promise<JSX.Element>)
 */
export default async function AdminHealthRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminHealthPage
      title={dict.admin.nav.health}
      subtitle={dict.admin.subtitle}
    />
  );
}
