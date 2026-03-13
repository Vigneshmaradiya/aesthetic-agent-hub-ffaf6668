import type { NextAuthConfig } from "next-auth";
import ZendeskProvider from "./zendesk-provider";

export const authConfig: NextAuthConfig = {
  providers: [
    ...(process.env.ZENDESK_SUBDOMAIN &&
    process.env.ZENDESK_OAUTH_CLIENT_ID &&
    process.env.ZENDESK_OAUTH_CLIENT_SECRET
      ? [
          ZendeskProvider({
            subdomain: process.env.ZENDESK_SUBDOMAIN,
            clientId: process.env.ZENDESK_OAUTH_CLIENT_ID,
            clientSecret: process.env.ZENDESK_OAUTH_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Redirect logged-in users away from the login page
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true; // Allow unauthenticated access to login
      }

      // Protect all other matched routes
      if (!isLoggedIn) return false; // NextAuth redirects to pages.signIn
      return true;
    },
    async jwt({ token, account, user }) {
      // Persist the OAuth access_token and refresh_token to the JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;

        // Auto-configure ZENDESK_EMAIL from OAuth profile.
        // This removes the need for manual env var setup.
        // - Sets process.env for the current Next.js process (dev mode)
        // - Writes to shared Docker volume for the mcp-zendesk container
        const email = user?.email;
        if (email) {
          process.env.ZENDESK_EMAIL = email;
          try {
            // Dynamic require to avoid webpack static analysis of node:fs
            // This callback only runs server-side, so fs is always available
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fs = require("fs");
            const configDir = "/tmp/zendesk-config";
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(`${configDir}/zendesk-email`, email.trim());
          } catch {
            // Non-fatal — file write may fail outside Docker
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Make the access token available to the client (for MCP calls)
      session.accessToken = token.accessToken as string | undefined;
      session.provider = token.provider as string | undefined;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours - matches SESSION_TTL_MINUTES
  },
};
