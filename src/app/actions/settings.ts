"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/server";
import type { TransactionType } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { deleteContactIfUnused } from "@/lib/services/transactions";
import { err, ok, type Result } from "@/lib/types/result";

async function assertCategory(id: string): Promise<string | null> {
  const user = await requireUser();
  const [row] = await db`
    select id from categories where id = ${id} and user_id = ${user.id} limit 1
  `;
  return row ? null : "Invalid category";
}

const RULE_TYPES_REQUIRING_CONTACT = new Set<TransactionType>([
  "BORROW",
  "LEND",
  "RECEIVE",
  "REPAYMENT",
]);

async function assertRuleContactRequired(
  userId: string,
  categoryId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  const [row] = await db`
    select type from categories
    where id = ${categoryId} and user_id = ${userId}
    limit 1
  `;
  if (!row) return "Invalid category";
  const t = (row as { type: TransactionType }).type;
  if (RULE_TYPES_REQUIRING_CONTACT.has(t) && !contactId) {
    return "Contact is required for Borrow, Lend, Receive, and Repayment categories";
  }
  return null;
}

async function assertLocation(id: string): Promise<string | null> {
  const user = await requireUser();
  const [row] = await db`
    select id from locations where id = ${id} and user_id = ${user.id} limit 1
  `;
  return row ? null : "Invalid location";
}

export async function createAccountAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db`
    insert into accounts ${db({ user_id: user.id, name: parsed.data.name })}
    returning id
  `;
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: (row as { id: string }).id });
}

export async function createLocationAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db`
    insert into locations ${db({ user_id: user.id, name: parsed.data.name })}
    returning id
  `;
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: (row as { id: string }).id });
}

export async function createContactAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = z.object({ name: z.string().trim().min(1).max(120) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid name");

  const [row] = await db`
    insert into contacts ${db({ user_id: user.id, name: parsed.data.name })}
    returning id
  `;
  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: (row as { id: string }).id });
}

const ruleSchema = z.object({
  keyword: z.string().trim().min(1).max(80).toLowerCase(),
  note: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().uuid(),
  locationId: z.string().uuid(),
  contactId: z.string().uuid().nullable().optional(),
});

export async function createRuleAction(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return err("Invalid rule");

  const catErr = await assertCategory(parsed.data.categoryId);
  if (catErr) return err(catErr);

  const contactRuleErr = await assertRuleContactRequired(
    user.id,
    parsed.data.categoryId,
    parsed.data.contactId,
  );
  if (contactRuleErr) return err(contactRuleErr);

  const locErr = await assertLocation(parsed.data.locationId);
  if (locErr) return err(locErr);

  if (parsed.data.contactId) {
    const [con] = await db`
      select id from contacts
      where id = ${parsed.data.contactId} and user_id = ${user.id}
      limit 1
    `;
    if (!con) return err("Invalid contact");
  }

  const [row] = await db`
    insert into rules ${db({
      user_id: user.id,
      keyword: parsed.data.keyword,
      note: parsed.data.note ?? null,
      category_id: parsed.data.categoryId,
      location_id: parsed.data.locationId,
      contact_id: parsed.data.contactId ?? null,
    })}
    returning id
  `;

  if (!row) return err("Failed");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: (row as { id: string }).id });
}

export async function deleteRuleAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const del = await db`
    delete from rules
    where id = ${uuid.data} and user_id = ${user.id}
    returning id
  `;
  if (del.length === 0) return err("Not found");
  revalidatePath("/settings");
  return ok(null);
}

export async function updateRuleAction(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const schema = ruleSchema.extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("Invalid rule");

  const catErr = await assertCategory(parsed.data.categoryId);
  if (catErr) return err(catErr);

  const contactRuleErr = await assertRuleContactRequired(
    user.id,
    parsed.data.categoryId,
    parsed.data.contactId,
  );
  if (contactRuleErr) return err(contactRuleErr);

  const locErr = await assertLocation(parsed.data.locationId);
  if (locErr) return err(locErr);

  if (parsed.data.contactId) {
    const [con] = await db`
      select id from contacts
      where id = ${parsed.data.contactId} and user_id = ${user.id}
      limit 1
    `;
    if (!con) return err("Invalid contact");
  }

  const updated = await db`
    update rules set
      keyword = ${parsed.data.keyword},
      note = ${parsed.data.note ?? null},
      category_id = ${parsed.data.categoryId},
      location_id = ${parsed.data.locationId},
      contact_id = ${parsed.data.contactId ?? null}
    where id = ${parsed.data.id} and user_id = ${user.id}
    returning id
  `;

  if (updated.length === 0) return err("Not found");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok({ id: (updated[0] as { id: string }).id });
}

export async function deleteLocationAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const del = await db`
    delete from locations
    where id = ${uuid.data} and user_id = ${user.id}
    returning id
  `;
  if (del.length === 0) return err("Not found");
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok(null);
}

export async function deleteContactAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const uuid = z.string().uuid().safeParse(id);
  if (!uuid.success) return err("Invalid id");

  const result = await deleteContactIfUnused(db, user.id, uuid.data);
  if (!result.ok) return err(result.error);
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  return ok(null);
}
