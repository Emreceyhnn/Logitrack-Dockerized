import AcceptInviteForm from "@/app/components/forms/acceptInviteForm";

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AcceptInviteForm params={params} token={token} />;
}
