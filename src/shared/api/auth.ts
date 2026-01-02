export type AuthUserClaims = {
  sub: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeJwtPayload<T = unknown>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export function decodeUserFromToken(
  token: string | null
): AuthUserClaims | null {
  if (!token) return null;
  const payload = decodeJwtPayload<AuthUserClaims>(token);
  if (!payload || typeof payload.sub !== "string") {
    return null;
  }
  return payload;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const claims = decodeUserFromToken(token);
  if (!claims || typeof claims.exp !== "number") {
    // If no expiration claim, assume token is valid
    // This is safe because the API will still validate on calls
    return false;
  }
  // exp is in seconds, Date.now() is in milliseconds
  return claims.exp * 1000 < Date.now();
}
