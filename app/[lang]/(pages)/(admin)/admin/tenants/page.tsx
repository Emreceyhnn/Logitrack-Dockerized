import { getDictionary } from "@/app/lib/language/language";
import AdminTenantsPage from "@/app/components/admin/data/AdminTenantsPage";

export default async function AdminTenantsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminTenantsPage
      title={dict.admin.data.tenants.title}
      subtitle={dict.admin.data.tenants.subtitle}
    />
  );
}
