import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
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
