import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./cookies";
import { verifySession } from "./jwt";
import { db } from "@/lib/db/core/server";

export type AuthedUser = { id: string; email: string };

/**
 * One JWT verify + user row load per request, even when layout and nested RSCs
 * each call `getSessionUser` / `getSessionUserId` (avoids duplicate DB hits).
 */
export const getSessionUser = cache(async (): Promise<AuthedUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const [row] = await db`
    select id, email from users where id = ${payload.sub} limit 1
  `;

  return row
    ? { id: (row as { id: string; email: string }).id, email: (row as { id: string; email: string }).email }
    : null;
});

/** User id from JWT + DB session, or null (use instead of any external auth SDK). */
export async function getSessionUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

