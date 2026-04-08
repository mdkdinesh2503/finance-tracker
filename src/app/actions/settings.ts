"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/server";
import {
  accounts,
  categories,
  contacts,
  locations,
  rules,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { err, ok, type Result } from "@/lib/result";

async function assertCategory(id: string | null): Promise<string | null> {
  if (!id) return null;
  const user = await requireUser();
  const row = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  return row[0] ? null : "Invalid category";
}

export async function createAccountAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db
    .insert(accounts)
    .values({ userId: user.id, name: parsed.data.name })
    .returning({ id: accounts.id });
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: row.id });
}

export async function createLocationAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db
    .insert(locations)
    .values({ userId: user.id, name: parsed.data.name })
    .returning({ id: locations.id });
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: row.id });
}

export async function createContactAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db
    .insert(contacts)
    .values({ userId: user.id, name: parsed.data.name })
    .returning({ id: contacts.id });
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: row.id });
}

const ruleSchema = z.object({
  keyword: z.string().trim().min(1).max(80).toLowerCase(),
  categoryId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
});

export async function createRuleAction(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return err("Invalid rule");

  const catErr = await assertCategory(parsed.data.categoryId ?? null);
  if (catErr) return err(catErr);

  if (parsed.data.contactId) {
    const con = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, parsed.data.contactId),
          eq(contacts.userId, user.id),
        ),
      )
      .limit(1);
    if (!con[0]) return err("Invalid contact");
  }

  const [row] = await db
    .insert(rules)
    .values({
      userId: user.id,
      keyword: parsed.data.keyword,
      categoryId: parsed.data.categoryId ?? null,
      contactId: parsed.data.contactId ?? null,
    })
    .returning({ id: rules.id });

  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: row.id });
}

export async function deleteRuleAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const del = await db
    .delete(rules)
    .where(and(eq(rules.id, uuid.data), eq(rules.userId, user.id)))
    .returning({ id: rules.id });
  if (!del.length) return err("Not found");
  revalidatePath("/settings");
  return ok(null);
}

export async function deleteLocationAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const del = await db
    .delete(locations)
    .where(
      and(eq(locations.id, uuid.data), eq(locations.userId, user.id)),
    )
    .returning({ id: locations.id });
  if (!del.length) return err("Not found");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok(null);
}

export async function deleteContactAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const del = await db
    .delete(contacts)
    .where(and(eq(contacts.id, uuid.data), eq(contacts.userId, user.id)))
    .returning({ id: contacts.id });
  if (!del.length) return err("Not found");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok(null);
}
