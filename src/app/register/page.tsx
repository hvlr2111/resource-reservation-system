import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense>
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
