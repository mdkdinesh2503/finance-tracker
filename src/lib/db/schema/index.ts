import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const categoryTypeEnum = pgEnum("category_type", ["expense", "income"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "EXPENSE",
  "INCOME",
  "BORROW",
  "REPAYMENT",
  "LEND",
  "RECEIVE",
  "INVESTMENT",
  "ADJUSTMENT",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
    type: transactionTypeEnum("type").notNull(),
    isSelectable: boolean("is_selectable").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    userIdx: index("categories_user_id_idx").on(t.userId),
    userParentNameUq: uniqueIndex("categories_user_parent_name_uq").on(
      t.userId,
      sql`coalesce(${t.parentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      t.name,
    ),
  }),
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => ({
    userIdx: index("locations_user_id_idx").on(t.userId),
    userNameUq: uniqueIndex("locations_user_name_uq").on(t.userId, t.name),
  }),
);

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  keyword: text("keyword").notNull(),
  note: text("note"),
  categoryId: uuid("category_id").references(() => categories.id),
  locationId: uuid("location_id").references(() => locations.id),
  contactId: uuid("contact_id").references(() => contacts.id),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    parentCategoryId: uuid("parent_category_id").references(
      () => categories.id,
    ),
    locationId: uuid("location_id").references(() => locations.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id").references(() => accounts.id),
    note: text("note"),
    transactionDate: date("transaction_date").notNull(),
    transactionTime: time("transaction_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userDateIdx: index("transactions_user_date_idx").on(
      t.userId,
      t.transactionDate,
    ),
    userCatIdx: index("transactions_user_category_idx").on(
      t.userId,
      t.categoryId,
    ),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  locations: many(locations),
  contacts: many(contacts),
  rules: many(rules),
  transactions: many(transactions),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  user: one(users, { fields: [locations.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const rulesRelations = relations(rules, ({ one }) => ({
  user: one(users, { fields: [rules.userId], references: [users.id] }),
  category: one(categories, {
    fields: [rules.categoryId],
    references: [categories.id],
  }),
  location: one(locations, {
    fields: [rules.locationId],
    references: [locations.id],
  }),
  contact: one(contacts, { fields: [rules.contactId], references: [contacts.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  location: one(locations, {
    fields: [transactions.locationId],
    references: [locations.id],
  }),
  contact: one(contacts, {
    fields: [transactions.contactId],
    references: [contacts.id],
  }),
}));

export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];

