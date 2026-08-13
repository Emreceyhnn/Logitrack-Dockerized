import { getDictionary } from "@/app/lib/language/language";
import AdminSessionsPage from "@/app/components/admin/data/AdminSessionsPage";

export default async function AdminSessionsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminSessionsPage
      title={dict.admin.data.sessions.title}
      subtitle={dict.admin.data.sessions.subtitle}
    />
  );
}
