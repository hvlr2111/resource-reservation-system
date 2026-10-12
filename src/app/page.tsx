import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  return (
    <Suspense>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  const user = await getCurrentUser();
  redirect(user ? "/resources" : "/login");
  return null;
}
