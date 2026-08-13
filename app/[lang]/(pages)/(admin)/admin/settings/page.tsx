import { getDictionary } from "@/app/lib/language/language";
import AdminSettingsPage from "@/app/components/admin/data/AdminSettingsPage";

export default async function AdminSettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminSettingsPage
      title={dict.admin.data.env.title}
      subtitle={dict.admin.data.env.subtitle}
    />
  );
}
