import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesContent />
    </Suspense>
  );
}

async function ResourcesContent() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Resources</h1>
      <p className="mt-2 text-muted-foreground">
        Resource listing will go here.
      </p>
    </main>
  );
}
