import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/lib/env/server";

const ISSUER = "personal-finance";
const AUDIENCE = "personal-finance:web";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getKey(): Uint8Array {
  return new TextEncoder().encode(requireEnv("JWT_SECRET"));
}

export type SessionPayload = {
  sub: string; // user id
  email: string;
};

export async function signSession(payload: SessionPayload): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getKey());

  return { token, expiresAt: new Date(exp * 1000) };
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = payload.sub;
    const email = payload.email;
    if (typeof sub !== "string") return null;
    if (typeof email !== "string") return null;
    return { sub, email };
  } catch {
    return null;
  }
}

