"use server";

import { z } from "zod";
import { db, ensureDefaultReferenceDataForUser } from "@/lib/db/server";
import { users, accounts, locations, rules, categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { err, ok, type Result } from "@/lib/types/result";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import { isUndefinedTableError } from "@/lib/db/postgres";
import { revalidatePath } from "next/cache";

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/** User-safe hints for common production failures (no connection strings). */
function mapKnownServerAuthError(e: unknown): string | null {
  const msg = errorMessage(e);

  if (msg.includes("DATABASE_URL is required")) {
    return "DATABASE_URL is not set for this Vercel environment. Add it under Project → Settings → Environment Variables (Production), then redeploy.";
  }
  if (msg.includes("JWT_SECRET is required")) {
    return "JWT_SECRET is not set. Add it under Project → Settings → Environment Variables (Production), then redeploy.";
  }
  if (/ECONNREFUSED|connect ECONNREFUSED/i.test(msg)) {
    return "Cannot connect to the database (connection refused). Check DATABASE_URL and that the database accepts public connections.";
  }
  if (/ENOTFOUND/i.test(msg)) {
    return "Database hostname in DATABASE_URL could not be resolved. Check for typos.";
  }
  if (/ETIMEDOUT|timeout/i.test(msg)) {
    return "Database connection timed out. Check the provider’s firewall / IP allow list and region.";
  }
  if (/28P01|password authentication failed/i.test(msg)) {
    return "The database rejected the username or password in DATABASE_URL.";
  }
  if (/self signed certificate|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(msg)) {
    return "Database TLS verification failed. Use your host’s recommended connection string (often with sslmode=require) or adjust SSL settings per provider docs.";
  }
  if (
    /argon2|@node-rs\/argon2/i.test(msg) ||
    /Cannot find module ['"]@node-rs\/argon2/i.test(msg)
  ) {
    return "Server could not load the password library. Ensure next.config.ts sets serverExternalPackages: [\"@node-rs/argon2\"] and redeploy.";
  }

  return null;
}

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(8).max(128);

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type AuthOk = { userId: string; email: string };

export async function signupAction(input: unknown): Promise<Result<AuthOk>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return err("Invalid signup details");

  const { email, password } = parsed.data;

  try {
    const exists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (exists.length > 0) return err("Email already registered");

    const passwordHash = await hashPassword(password);

    const created = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id, email: users.email });

    const user = created[0];
    if (!user) return err("Failed to create user");

    // Default account + locations + starter rules
    await db.insert(accounts).values({ userId: user.id, name: "Cash" });
    await db.insert(locations).values([
      { userId: user.id, name: "Hyderabad" },
      { userId: user.id, name: "Home" },
    ]);

    await ensureDefaultReferenceDataForUser(db, user.id);

    const salaryCat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, user.id),
          eq(categories.name, "Salary"),
          eq(categories.type, "INCOME"),
        ),
      )
      .limit(1);
    const rentCat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, user.id),
          eq(categories.name, "Rent"),
          eq(categories.type, "EXPENSE"),
        ),
      )
      .limit(1);

    await db.insert(rules).values([
      {
        userId: user.id,
        keyword: "salary",
        categoryId: salaryCat[0]?.id ?? null,
        contactId: null,
      },
      {
        userId: user.id,
        keyword: "rent",
        categoryId: rentCat[0]?.id ?? null,
        contactId: null,
      },
    ]);

    const session = await signSession({ sub: user.id, email: user.email });
    await setSessionCookie(session.token, session.expiresAt);

    revalidatePath("/dashboard");
    return ok({ userId: user.id, email: user.email });
  } catch (e) {
    if (isUndefinedTableError(e)) {
      console.error(e);
      return err(
        "Database tables are missing. Run: npm run db:migrate (or bun run db:migrate). Use the same DATABASE_URL as in .env.local.",
      );
    }
    const mapped = mapKnownServerAuthError(e);
    if (mapped) {
      console.error("signupAction:", e);
      return err(mapped);
    }
    console.error("signupAction:", e);
    return err(
      "Could not create an account. In Vercel: Deployments → latest → Logs (or Observability → Runtime Logs) and search for signupAction.",
    );
  }
}

export async function loginAction(input: unknown): Promise<Result<AuthOk>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return err("Invalid email or password");

  const { email, password } = parsed.data;

  try {
    const row = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = row[0];
    if (!user) return err("Invalid email or password");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return err("Invalid email or password");

    const session = await signSession({ sub: user.id, email: user.email });
    await setSessionCookie(session.token, session.expiresAt);

    revalidatePath("/dashboard");
    return ok({ userId: user.id, email: user.email });
  } catch (e) {
    if (isUndefinedTableError(e)) {
      console.error(e);
      return err(
        "Database tables are missing. Run: npm run db:migrate (or bun run db:migrate). Use the same DATABASE_URL as in .env.local.",
      );
    }
    const mapped = mapKnownServerAuthError(e);
    if (mapped) {
      console.error("loginAction:", e);
      return err(mapped);
    }
    console.error("loginAction:", e);
    return err(
      "Could not sign in. In Vercel: Deployments → latest → Logs (or Observability → Runtime Logs) and search for loginAction.",
    );
  }
}

export async function logoutAction(): Promise<Result<null>> {
  await clearSessionCookie();
  revalidatePath("/");
  return ok(null);
}

