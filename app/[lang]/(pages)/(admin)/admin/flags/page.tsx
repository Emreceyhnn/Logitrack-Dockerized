import { getDictionary } from "@/app/lib/language/language";
import AdminSettingsPage from "@/app/components/admin/data/AdminSettingsPage";

/**
 * Feature flags and the environment viewer share one screen and one payload —
 * both come from /api/admin/settings, and an operator toggling a flag usually
 * wants the surrounding config visible. /admin/settings renders the same page.
 */
export default async function AdminFlagsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminSettingsPage
      title={dict.admin.data.flags.title}
      subtitle={dict.admin.data.flags.subtitle}
    />
  );
}
