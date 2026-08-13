import { getDictionary } from "@/app/lib/language/language";
import AdminOverviewPage from "@/app/components/admin/overview/AdminOverviewPage";

/**
 * tr-Yönetim konsolu genel bakış sayfası.
 * en-Admin console overview route. The client component owns fetching so the
 *    range selector can refetch without a server round trip.
 * input ({ params })
 * output (Promise<JSX.Element>)
 */
export default async function AdminOverviewRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <AdminOverviewPage
      title={dict.admin.title}
      subtitle={dict.admin.subtitle}
    />
  );
}
