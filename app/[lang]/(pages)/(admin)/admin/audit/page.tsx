import { getDictionary } from "@/app/lib/language/language";
import AdminAuditPage from "@/app/components/admin/data/AdminAuditPage";

export default async function AdminAuditRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminAuditPage
      title={dict.admin.data.audit.title}
      subtitle={dict.admin.data.audit.subtitle}
    />
  );
}
