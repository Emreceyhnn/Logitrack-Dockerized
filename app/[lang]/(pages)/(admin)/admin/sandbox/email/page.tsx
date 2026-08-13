import { getDictionary } from "@/app/lib/language/language";
import EmailTesterPage from "@/app/components/admin/sandbox/EmailTesterPage";

export default async function SandboxEmailRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <EmailTesterPage
      title={dict.admin.sandbox.email.title}
      subtitle={dict.admin.sandbox.email.subtitle}
    />
  );
}
