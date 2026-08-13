import { getDictionary } from "@/app/lib/language/language";
import StreamTesterPage from "@/app/components/admin/sandbox/StreamTesterPage";

export default async function SandboxStreamRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <StreamTesterPage
      title={dict.admin.sandbox.stream.title}
      subtitle={dict.admin.sandbox.stream.subtitle}
    />
  );
}
