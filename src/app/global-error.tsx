"use client"; // Error boundaries must be Client Components

// Replaces the root layout when the layout itself fails, so it carries its
// own <html>/<body> and inline styles (global CSS is not loaded here).
export default function GlobalError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = () => {
    if (retry) retry();
    else if (reset) reset();
    else window.location.reload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        <title>Something went wrong | JThom Analytics</title>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h2>
        <p style={{ marginBottom: 24 }}>The site could not be loaded. It is usually temporary.</p>
        <button
          type="button"
          onClick={tryAgain}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
