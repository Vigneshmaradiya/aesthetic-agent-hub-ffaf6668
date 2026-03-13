"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
}

export default function LoginPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAnyProvider, setHasAnyProvider] = useState(true);

  useEffect(() => {
    fetch("/api/auth/providers-config")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers ?? []);
        setHasAnyProvider(data.hasAnyProvider ?? false);
      })
      .catch(() => {
        setHasAnyProvider(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const configuredProviders = providers.filter((p) => p.configured);

  return (
    <div className="flex min-h-screen items-center justify-center bg-nexus-base">
      <div className="w-full max-w-sm space-y-8 rounded-lg border border-nexus-border bg-nexus-surface p-8">
        {/* Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-nexus-accent/10">
            <span className="text-2xl font-bold text-nexus-accent">N</span>
          </div>
          <h1 className="text-3xl font-bold text-nexus-accent">Nexus</h1>
          <p className="mt-2 text-sm text-nexus-text-muted">
            Agentic Support HUD
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-nexus-accent border-t-transparent" />
          </div>
        )}

        {/* Provider buttons */}
        {!loading && hasAnyProvider && (
          <div className="space-y-3">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-nexus-text-dim">
              Connect your ticketing system
            </p>

            {configuredProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-nexus-accent px-4 py-3 font-medium text-nexus-base transition-colors hover:bg-nexus-accent-muted"
              >
                Sign in with {provider.name}
              </button>
            ))}

            <p className="text-center text-xs text-nexus-text-dim">
              Your session uses OAuth &mdash; no passwords stored.
            </p>
          </div>
        )}

        {/* No provider configured */}
        {!loading && !hasAnyProvider && (
          <div className="space-y-4 rounded-md border border-nexus-warning/30 bg-nexus-warning/5 p-4">
            <p className="text-sm font-medium text-nexus-warning">
              No ticketing provider configured
            </p>
            <div className="space-y-2 text-xs text-nexus-text-muted">
              <p>
                Add the following to your{" "}
                <code className="rounded bg-nexus-surface-raised px-1 py-0.5 font-mono text-nexus-text">
                  .env.local
                </code>
                :
              </p>
              <pre className="overflow-x-auto rounded bg-nexus-surface-raised p-3 font-mono text-[11px] text-nexus-text-muted">
                {`ZENDESK_SUBDOMAIN=yourcompany
ZENDESK_OAUTH_CLIENT_ID=your_client_id
ZENDESK_OAUTH_CLIENT_SECRET=your_secret`}
              </pre>
              <p className="text-nexus-text-dim">
                Then restart the app with{" "}
                <code className="rounded bg-nexus-surface-raised px-1 py-0.5 font-mono">
                  docker compose up --build
                </code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
