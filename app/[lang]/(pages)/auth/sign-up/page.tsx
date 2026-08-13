import RegisterForm from "@/app/components/forms/signUpForm";

export default function SignUpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  return <RegisterForm params={params} />;
}
