import { getDictionary } from "@/app/lib/language/language";
import { requirePlatformAdmin } from "@/app/lib/platform-admin";
import AdminUsersPage from "@/app/components/admin/data/AdminUsersPage";

export default async function AdminUsersRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  // The layout already guards this route; the id is read here so the table can
  // disable actions that would target the signed-in admin's own account.
  const admin = await requirePlatformAdmin();

  return (
    <AdminUsersPage
      title={dict.admin.data.users.title}
      subtitle={dict.admin.data.users.subtitle}
      currentAdminId={admin.id}
    />
  );
}
