import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./cookies";
import { verifySession } from "./jwt";
import { db } from "@/lib/db/server";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthedUser = { id: string; email: string };

export async function getSessionUser(): Promise<AuthedUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const row = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return row[0] ?? null;
}

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

