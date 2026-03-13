import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";

/**
 * MCP Token Store — Encrypted cookie-based storage for per-agent MCP tokens.
 *
 * Each agent-configured MCP gets its own encrypted HTTP-only cookie:
 *   mcp_token_{mcpId} = JWE(accessToken)
 *
 * This satisfies the "no persistent storage" constraint — tokens live only
 * in cookies and expire with the session (8h, matching SESSION_TTL_MINUTES).
 */

const COOKIE_PREFIX = "mcp_token_";
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

/** Get the encryption key from NEXTAUTH_SECRET. */
function getEncryptionKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for MCP token encryption");
  }
  // Use first 32 bytes of the secret as AES-256 key
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  // Pad or truncate to 32 bytes
  const keyBuffer = new Uint8Array(32);
  keyBuffer.set(key.slice(0, 32));
  return keyBuffer;
}

/** Encrypt an access token into a JWE string. */
export async function encryptToken(token: string): Promise<string> {
  const key = getEncryptionKey();
  const jwe = await new EncryptJWT({ token })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .encrypt(key);
  return jwe;
}

/** Decrypt a JWE string back to the original access token. */
export async function decryptToken(jwe: string): Promise<string> {
  const key = getEncryptionKey();
  const { payload } = await jwtDecrypt(jwe, key);
  return payload.token as string;
}

/** Cookie name for a given MCP service. */
function cookieName(mcpId: string): string {
  return `${COOKIE_PREFIX}${mcpId}`;
}

/**
 * Store an MCP access token in an encrypted HTTP-only cookie.
 * Call this from API route handlers (server-side only).
 */
export async function setMCPToken(mcpId: string, token: string): Promise<void> {
  const encrypted = await encryptToken(token);
  const jar = await cookies();
  jar.set(cookieName(mcpId), encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Read and decrypt an MCP access token from cookies.
 * Returns null if the cookie doesn't exist or decryption fails.
 */
export async function getMCPToken(mcpId: string): Promise<string | null> {
  try {
    const jar = await cookies();
    const cookie = jar.get(cookieName(mcpId));
    if (!cookie?.value) return null;
    return await decryptToken(cookie.value);
  } catch {
    // Cookie expired, tampered, or decryption failed
    return null;
  }
}

/**
 * Clear an MCP token cookie (disconnect).
 */
export async function clearMCPToken(mcpId: string): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(mcpId));
}

/**
 * Get all connected agent MCP tokens as a service→token map.
 * Only returns tokens that successfully decrypt.
 */
export async function getAllMCPTokens(): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  try {
    const jar = await cookies();
    const allCookies = jar.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith(COOKIE_PREFIX)) {
        const mcpId = cookie.name.slice(COOKIE_PREFIX.length);
        try {
          const token = await decryptToken(cookie.value);
          tokens[mcpId] = token;
        } catch {
          // Skip invalid/expired tokens
        }
      }
    }
  } catch {
    // cookies() may throw outside of request context
  }
  return tokens;
}

/**
 * Check if an MCP token cookie exists (without decrypting).
 * Faster than getMCPToken for status checks.
 */
export async function hasMCPToken(mcpId: string): Promise<boolean> {
  try {
    const jar = await cookies();
    return !!jar.get(cookieName(mcpId))?.value;
  } catch {
    return false;
  }
}
