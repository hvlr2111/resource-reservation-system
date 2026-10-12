import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";
import { PageLoading } from "@/components/page-loading";

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RegisterGate />
    </Suspense>
  );
}

async function RegisterGate() {
  const user = await getCurrentUser();
  if (user) redirect("/resources");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <RegisterForm />
    </main>
  );
}
