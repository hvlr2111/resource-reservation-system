import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageLoading } from "@/components/page-loading";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  const user = await getCurrentUser();
  redirect(user ? "/resources" : "/login");
  return null;
}
