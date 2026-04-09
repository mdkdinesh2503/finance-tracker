/** Synthetic user id for global category templates (`seed.ts`); no row in `users`. */
export const SYSTEM_CATEGORIES_USER_ID =
  "00000000-0000-0000-0000-000000000000" as const;

/** Namespace int for `pg_advisory_xact_lock` when bootstrapping categories per user. */
export const CATEGORY_BOOTSTRAP_LOCK_NS = 0x63_61_74_31; // "cat1"
