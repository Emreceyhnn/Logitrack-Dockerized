import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/app/lib/platform-admin";
import { getDictionary } from "@/app/lib/language/language";
import { buildAdminNav } from "@/app/lib/admin/nav";
import AdminShell from "@/app/components/admin/shell/AdminShell";

export const metadata: Metadata = {
  title: "Admin Console",
  // The console must never be indexed or previewed by a crawler.
  robots: { index: false, follow: false, nocache: true },
};

// The guard reads cookies and headers, so this subtree is dynamic by nature.
// Stating it explicitly stops a future build-time optimisation from
// accidentally prerendering an admin page without a session.
export const dynamic = "force-dynamic";

/**
 * tr-Yönetim konsolu düzeni. Her admin rotası bu guard'dan geçer.
 * en-Admin console layout. `requirePlatformAdmin` runs before anything renders,
 *    so no admin route can appear without passing the allowlist check — a page
 *    added later inherits the guard automatically.
 * input ({ children, params })
 * output (Promise<JSX.Element>)
 */
export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  // Redirects when the visitor is not a platform admin.
  const admin = await requirePlatformAdmin();

  const dict = await getDictionary(lang);
  const nav = buildAdminNav(dict);

  const adminName = [admin.name, admin.surname].filter(Boolean).join(" ").trim();

  return (
    <AdminShell
      nav={nav}
      adminName={adminName || "Admin"}
      adminEmail={null}
      avatarUrl={admin.avatarUrl}
      locale={lang}
    >
      {children}
    </AdminShell>
  );
}
