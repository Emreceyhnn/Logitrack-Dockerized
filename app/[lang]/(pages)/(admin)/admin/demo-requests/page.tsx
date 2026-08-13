import { getDictionary } from "@/app/lib/language/language";
import AdminDemoRequestsPage from "@/app/components/admin/data/AdminDemoRequestsPage";

export default async function AdminDemoRequestsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminDemoRequestsPage
      title={dict.admin.data.demoRequests.title}
      subtitle={dict.admin.data.demoRequests.subtitle}
    />
  );
}
