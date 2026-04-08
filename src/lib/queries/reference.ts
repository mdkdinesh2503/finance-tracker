import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { accounts, categories, contacts, locations, rules } from "@/lib/db/schema";

export async function getAccountsForUser(userId: string) {
  return db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.name));
}

export async function getLocationsForUser(userId: string) {
  return db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.userId, userId))
    .orderBy(asc(locations.name));
}

export async function getContactsForUser(userId: string) {
  return db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(asc(contacts.name));
}

export async function getSelectableCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
    })
    .from(categories)
    .where(eq(categories.isSelectable, true))
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function getRulesForUser(userId: string) {
  return db
    .select({
      id: rules.id,
      keyword: rules.keyword,
      categoryId: rules.categoryId,
      contactId: rules.contactId,
    })
    .from(rules)
    .where(eq(rules.userId, userId))
    .orderBy(asc(rules.keyword));
}
