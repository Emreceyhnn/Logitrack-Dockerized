import { getDictionary } from "@/app/lib/language/language";
import AdminDatabasePage from "@/app/components/admin/data/AdminDatabasePage";

export default async function AdminDatabaseRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminDatabasePage
      title={dict.admin.data.database.title}
      subtitle={dict.admin.data.database.subtitle}
    />
  );
}
