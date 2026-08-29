import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { getDictionary } from "@/app/lib/language/language";
import ExpensesClient from "./expensesClient";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/en/auth/sign-in");
  }

  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <ExpensesClient dict={dict} />;
}
