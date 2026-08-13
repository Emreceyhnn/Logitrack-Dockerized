import { getDictionary } from "@/app/lib/language/language";
import QueueMonitorPage from "@/app/components/admin/sandbox/QueueMonitorPage";

export default async function SandboxQueueRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <QueueMonitorPage
      title={dict.admin.sandbox.queue.title}
      subtitle={dict.admin.sandbox.queue.subtitle}
    />
  );
}
