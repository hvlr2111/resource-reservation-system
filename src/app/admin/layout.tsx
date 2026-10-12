import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageLoading } from "@/components/page-loading";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminAccess>{children}</AdminAccess>
    </Suspense>
  );
}

async function AdminAccess({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/resources");
  }
  return <>{children}</>;
}
