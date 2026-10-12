export function PageLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6" aria-busy="true">
      <p className="sr-only">Loading page</p>
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded-md border bg-muted/40" />
    </main>
  );
}
