"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <main>
          <h1>Something went wrong</h1>
          <p>We couldn&apos;t load the application. Please try again.</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
