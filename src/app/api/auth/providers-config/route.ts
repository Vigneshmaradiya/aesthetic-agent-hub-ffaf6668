import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
}

/**
 * Returns which ticketing providers are configured.
 * No secrets exposed — just boolean flags.
 */
export async function GET() {
  const providers: ProviderInfo[] = [
    {
      id: "zendesk",
      name: "Zendesk",
      configured: !!(
        process.env.ZENDESK_SUBDOMAIN &&
        process.env.ZENDESK_OAUTH_CLIENT_ID &&
        process.env.ZENDESK_OAUTH_CLIENT_SECRET
      ),
    },
    // Future providers:
    // {
    //   id: "salesforce",
    //   name: "Salesforce Service Cloud",
    //   configured: !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET),
    // },
  ];

  return NextResponse.json({
    providers,
    hasAnyProvider: providers.some((p) => p.configured),
  });
}
