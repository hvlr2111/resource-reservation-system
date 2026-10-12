import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { PageLoading } from "@/components/page-loading";

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginGate />
    </Suspense>
  );
}

async function LoginGate() {
  const user = await getCurrentUser();
  if (user) redirect("/resources");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
