import { getDictionary } from "@/app/lib/language/language";
import ApiTesterPage from "@/app/components/admin/sandbox/ApiTesterPage";

export default async function SandboxApiRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <ApiTesterPage
      title={dict.admin.sandbox.api.title}
      subtitle={dict.admin.sandbox.api.subtitle}
    />
  );
}
