import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

interface ZendeskProfile {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    photo: { content_url: string } | null;
  };
}

export interface ZendeskProviderConfig extends OAuthUserConfig<ZendeskProfile> {
  subdomain: string;
}

export default function ZendeskProvider(
  config: ZendeskProviderConfig,
): OAuthConfig<ZendeskProfile> {
  const baseUrl = `https://${config.subdomain}.zendesk.com`;

  return {
    id: "zendesk",
    name: "Zendesk",
    type: "oauth",
    authorization: {
      url: `${baseUrl}/oauth/authorizations/new`,
      params: {
        scope: "read write",
        response_type: "code",
      },
    },
    token: {
      url: `${baseUrl}/oauth/tokens`,
    },
    userinfo: {
      url: `${baseUrl}/api/v2/users/me.json`,
    },
    profile(profile: ZendeskProfile) {
      return {
        id: String(profile.user.id),
        name: profile.user.name,
        email: profile.user.email,
        image: profile.user.photo?.content_url ?? null,
      };
    },
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  };
}
