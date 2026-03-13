"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0B",
          color: "#E8E8EC",
          fontFamily:
            '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: 32,
            textAlign: "center",
            border: "1px solid #2A2A2E",
            borderRadius: 8,
            backgroundColor: "#111113",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 8,
              color: "#FF4D6A",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#8B8B95",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              color: "#0A0A0B",
              backgroundColor: "#00F0FF",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
