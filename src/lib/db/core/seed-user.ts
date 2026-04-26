import { z } from "zod";

/**
 * UUID for seeded default admin (`users.id`) and system category template
 * (`categories.user_id`). Env: `SEED_ADMIN_USER_ID`.
 *
 * When unset, runtime bootstrap uses the static category seed tree instead of cloning
 * from a template user (so production works without this env). CLI `db:seed` still
 * requires {@link seedUserId}.
 */
export function resolveSeedUserId(): string | null {
  const raw = process.env.SEED_ADMIN_USER_ID?.trim();
  if (!raw) return null;
  const parsed = z.string().uuid().safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function seedUserId(): string {
  const id = resolveSeedUserId();
  if (id) return id;
  const raw = process.env.SEED_ADMIN_USER_ID?.trim();
  if (!raw) {
    throw new Error("Set SEED_ADMIN_USER_ID to a UUID (seeded admin id).");
  }
  throw new Error(
    `SEED_ADMIN_USER_ID must be a valid UUID, got: ${JSON.stringify(raw)}`,
  );
}

