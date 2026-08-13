import { getDictionary } from "@/app/lib/language/language";
import AdminRestorePage from "@/app/components/admin/data/AdminRestorePage";

export default async function AdminDeletedRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminRestorePage
      title={dict.admin.data.deletion.restoreTitle}
      subtitle={dict.admin.data.deletion.restoreSubtitle}
    />
  );
}
